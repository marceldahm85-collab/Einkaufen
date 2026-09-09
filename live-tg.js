(() => {
  "use strict";

  const DATA_URL = "data/tg.json";
  let payloadCache = null;
  let loadPromise = null;
  let lookup = null;

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

  async function search(query, limit = 20) {
    const q = normalize(query);
    if (!q) return [];

    const payload = await load(false);
    const tokens = q.split(/\s+/).filter(Boolean);

    return payload.products
      .filter(item => item.salePrice != null)
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

  window.TgLive = { search, getObject, promotions, status, reload };
})();
