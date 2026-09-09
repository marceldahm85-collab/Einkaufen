(() => {
  "use strict";

  const DATA_URL = "data/mpreis.json";
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
        if (!response.ok) throw new Error(`MPREIS-Daten nicht verfügbar (${response.status})`);

        const payload = await response.json();
        if (!payload || !Array.isArray(payload.products)) {
          throw new Error("Ungültiges MPREIS-Datenformat.");
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

  async function search(query, limit = 20) {
    const q = normalize(query);
    if (!q) return [];

    const payload = await load(false);
    const tokens = q.split(/\s+/).filter(Boolean);

    return payload.products
      .map(item => {
        const name = normalize(item.name);
        const description = normalize(item.description);
        const hay = `${name} ${description}`;
        let score = 999;

        if (name === q) score = 0;
        else if (name.startsWith(q)) score = 1;
        else if (name.includes(q)) score = 2;
        else if (tokens.every(t => hay.includes(t))) score = 3;
        else {
          const matches = tokens.filter(t => hay.includes(t)).length;
          if (matches) score = 10 - Math.min(matches, 6);
        }

        return { item, score, nameLength: name.length };
      })
      .filter(x => x.score < 999)
      .sort((a,b) =>
        (a.score - b.score) ||
        (a.nameLength - b.nameLength) ||
        String(a.item.name).localeCompare(String(b.item.name), "de")
      )
      .slice(0, Math.min(40, Math.max(1, Number(limit) || 20)))
      .map(x => enrich(x.item, payload));
  }

  async function getObject(id) {
    if (!id) throw new Error("MPREIS-Produkt-ID fehlt.");
    const payload = await load(false);
    const item = lookup?.get(String(id));
    if (!item) throw new Error("MPREIS-Produkt im aktuellen Datenstand nicht gefunden.");
    return enrich(item, payload);
  }

  async function promotions() {
    const payload = await load(false);

    return payload.products
      .filter(item => item.promotionVerified === true)
      .slice()
      .sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""), "de", {
          sensitivity: "base",
          numeric: true
        })
      )
      .map(item => enrich(item, payload));
  }


  function ensureBrowseIndex(payload) {
    if (browseIndex) return browseIndex;

    browseIndex = payload.products
      .map(item => ({
        item,
        name: normalize(item.name),
        description: normalize(item.description),
        originalName: String(item.name || "")
      }))
      .sort((a, b) =>
        a.originalName.localeCompare(b.originalName, "de", {
          sensitivity: "base",
          numeric: true
        })
      );

    return browseIndex;
  }

  function browseScore(entry, query, tokens) {
    if (!query) return 0;

    const name = entry.name;
    const hay = `${entry.name} ${entry.description}`;

    if (name === query) return 0;
    if (name.startsWith(query)) return 1;
    if (name.includes(query)) return 2;
    if (tokens.every(token => hay.includes(token))) return 3;

    const matches = tokens.filter(token => hay.includes(token)).length;
    if (matches) return 10 - Math.min(matches, 6);

    return 999;
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
      productCount: payload.productCount ?? payload.products.length,
      promotionCount: payload.promotionCount || 0,
      promotionUpdatedAt: payload.promotionUpdatedAt || null,
      scope: payload.scope || null
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
      source: item.source || "mpreis.at",
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

  window.MPreisLive = { search, browse, getObject, promotions, status, reload };
})();
