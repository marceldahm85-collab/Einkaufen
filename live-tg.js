(() => {
  "use strict";

  const DATA_URL = "data/tg.json";
  let payloadCache = null;
  let loadPromise = null;
  let lookup = null;
  let browseIndex = null;

  async function load(force = false) {
    if (!force && payloadCache) return payloadCache;
    if (!force && loadPromise) return loadPromise;

    const url = force ? `${DATA_URL}?v=${Date.now()}` : DATA_URL;

    loadPromise = fetch(url, { cache: force ? "reload" : "default" })
      .then(async response => {
        if (!response.ok) throw new Error(`T&G-Daten nicht verfügbar (${response.status})`);

        const payload = await response.json();
        if (!payload || !Array.isArray(payload.products)) {
          throw new Error("Ungültiges T&G-Datenformat.");
        }

        payloadCache = payload;
        lookup = new Map();

        payload.products.forEach(item => {
          if (item.remoteObjectId) lookup.set(String(item.remoteObjectId), item);
          if (item.retailerProductId) lookup.set(String(item.retailerProductId), item);
        });

        return payload;
      })
      .finally(() => { loadPromise = null; });

    return loadPromise;
  }

  async function search(query, limit = 60) {
    const q = normalize(query);
    if (!q) return [];

    const payload = await load(false);
    const rows = ensureBrowseIndex(payload);

    return rows
      .map(entry => ({ entry, score: searchScore(entry, q) }))
      .filter(row => row.score < 999)
      .sort((a, b) =>
        (a.score - b.score) ||
        (a.entry.name.length - b.entry.name.length) ||
        a.entry.originalName.localeCompare(b.entry.originalName, "de", {
          sensitivity: "base",
          numeric: true
        })
      )
      .slice(0, Math.min(100, Math.max(1, Number(limit) || 60)))
      .map(row => enrich(row.entry.item, payload));
  }

  async function getObject(id) {
    if (!id) throw new Error("T&G-Aktions-ID fehlt.");

    const payload = await load(false);
    const item = lookup?.get(String(id));

    if (!item || item.salePrice == null) {
      throw new Error("T&G-Aktionsartikel im aktuellen Datenstand nicht gefunden.");
    }

    return enrich(item, payload);
  }

  async function promotions() {
    const payload = await load(false);

    return payload.products
      .filter(item => item.promotionVerified === true)
      .slice()
      .sort((a, b) => {
        const aPriced = a.salePrice != null ? 0 : 1;
        const bPriced = b.salePrice != null ? 0 : 1;
        return (
          (aPriced - bPriced) ||
          String(a.name || "").localeCompare(String(b.name || ""), "de", {
            sensitivity: "base",
            numeric: true
          })
        );
      })
      .map(item => enrich(item, payload));
  }


  function ensureBrowseIndex(payload) {
    if (browseIndex) return browseIndex;

    const tools = window.RetailerSearch;
    browseIndex = tools?.buildIndex
      ? tools.buildIndex(payload.products)
      : payload.products.map(item => ({
          item,
          name: normalize(item.name),
          description: normalize(item.description),
          baseHay: `${normalize(item.name)} ${normalize(item.description)}`,
          searchHay: `${normalize(item.name)} ${normalize(item.description)}`,
          originalName: String(item.name || "")
        }));

    browseIndex.sort((a, b) =>
      a.originalName.localeCompare(b.originalName, "de", {
        sensitivity: "base",
        numeric: true
      })
    );

    return browseIndex;
  }

  function searchScore(entry, query) {
    const tools = window.RetailerSearch;
    if (tools?.score) return tools.score(entry, query);

    const q = normalize(query);
    const tokens = q.split(/\s+/).filter(Boolean);
    const name = entry.name;
    const hay = `${entry.name} ${entry.description}`;

    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q)) return 2;
    if (tokens.every(token => hay.includes(token))) return 3;

    const matches = tokens.filter(token => hay.includes(token)).length;
    return matches ? 10 - Math.min(matches, 6) : 999;
  }

  function browseScore(entry, query) {
    if (!query) return 0;
    return searchScore(entry, query);
  }

  async function browse(options = {}) {
    const payload = await load(false);
    const query = normalize(options.query || "");
    const tokens = query.split(/\s+/).filter(Boolean);
    const offset = Math.max(0, Number(options.offset) || 0);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 50));
    const promotionsOnly = Boolean(options.promotionsOnly);

    let rows = ensureBrowseIndex(payload);

    if (promotionsOnly) {
      rows = rows.filter(entry => entry.item.promotionVerified === true);
    }

    if (query) {
      rows = rows
        .map(entry => ({
          entry,
          score: browseScore(entry, query, tokens)
        }))
        .filter(row => row.score < 999)
        .sort((a, b) =>
          (a.score - b.score) ||
          a.entry.originalName.localeCompare(
            b.entry.originalName,
            "de",
            { sensitivity: "base", numeric: true }
          )
        )
        .map(row => row.entry);
    }

    const total = rows.length;
    const page = rows
      .slice(offset, offset + limit)
      .map(entry => enrich(entry.item, payload));

    return {
      items: page,
      total,
      offset,
      limit,
      hasMore: offset + page.length < total
    };
  }

  async function status(force = false) {
    const payload = await load(force);

    return {
      ok: true,
      updatedAt: payload.updatedAt || null,
      productCount: payload.productCount || 0,
      promotionCount: payload.promotionCount || payload.products.length,
      linkableCount: payload.linkableCount || 0,
      flyerProductCount: payload.flyerProductCount || 0,
      flyerLinkableCount: payload.flyerLinkableCount || 0,
      flyerTextLinkableCount: payload.flyerTextLinkableCount || 0,
      flyerSpatialLinkableCount: payload.flyerSpatialLinkableCount || 0,
      validFrom: payload.validFrom || null,
      validUntil: payload.validUntil || null,
      flyer: payload.flyer || null,
      scope: payload.scope || null,
      region: payload.region || "Osttirol"
    };
  }

  async function reload() {
    payloadCache = null;
    lookup = null;
    browseIndex = null;
    loadPromise = null;
    return status(true);
  }

  function enrich(item, payload) {
    return {
      ...item,
      source: item.source || "tundg.at Spezialaktionen",
      retrievedAt: payload.updatedAt || new Date().toISOString()
    };
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  window.TgLive = { search, browse, getObject, promotions, status, reload };
})();
