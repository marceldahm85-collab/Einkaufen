(() => {
  "use strict";

  const STORAGE_KEY = "preispilot-osttirol-v1";

  const retailers = {
    mpreis: { id: "mpreis", name: "MPREIS", color: "#d50057", text: "#fff" },
    hofer:  { id: "hofer", name: "HOFER", color: "#0057a8", text: "#fff" },
    lidl:   { id: "lidl", name: "Lidl", color: "#0050aa", text: "#fff" },
    spar:   { id: "spar", name: "SPAR", color: "#00843d", text: "#fff" },
    billa:  { id: "billa", name: "BILLA", color: "#e30613", text: "#fff" },
    tg:     { id: "tg", name: "T&G", color: "#ef7d00", text: "#fff" }
  };

  const categories = [
    "Milchprodukte", "Obst & Gemüse", "Getränke", "Brot & Gebäck",
    "Fleisch & Wurst", "Vorrat", "Tiefkühl", "Haushalt", "Drogerie", "Sonstiges"
  ];

  const todayISO = () => new Date().toISOString().slice(0, 10);

  const initialState = {
    schemaVersion: 3,
    settings: { theme: "system", region: "osttirol", shoppingSort: "added", shoppingStrategy: "cheapest" },
    live: {
      mpreis: { enabled: true, lastSync: null, lastError: null },
      spar: { enabled: true, lastSync: null, lastError: null },
      tg: { enabled: true, lastSync: null, lastError: null }
    },
    shopping: [
      { id: "s1", productId: "p_milk", quantity: 2, checked: false, preferredStore: "auto", addedAt: 1 },
      { id: "s2", productId: "p_pasta", quantity: 1, checked: false, preferredStore: "auto", addedAt: 2 }
    ],
    customShopping: [],
    products: [
      {
        id: "p_milk", name: "Vollmilch 3,5 %", brand: "Milfina / vergleichbar",
        category: "Milchprodukte", amount: 1, unit: "l", favorite: true,
        offers: [
          { store: "hofer", regularPrice: 1.39, salePrice: 1.19, unitPrice: 1.19, unitPriceUnit: "l", validUntil: "2026-09-12", updatedAt: "2026-09-08" },
          { store: "lidl", regularPrice: 1.35, salePrice: null, unitPrice: 1.35, unitPriceUnit: "l", validUntil: null, updatedAt: "2026-09-08" },
          { store: "mpreis", regularPrice: 1.49, salePrice: null, unitPrice: 1.49, unitPriceUnit: "l", validUntil: null, updatedAt: "2026-09-08" },
          { store: "spar", regularPrice: 1.55, salePrice: null, unitPrice: 1.55, unitPriceUnit: "l", validUntil: null, updatedAt: "2026-09-08" }
        ]
      },
      {
        id: "p_butter", name: "Butter", brand: "Schärdinger / vergleichbar",
        category: "Milchprodukte", amount: 250, unit: "g", favorite: true,
        offers: [
          { store: "billa", regularPrice: 2.69, salePrice: 1.59, unitPrice: 6.36, unitPriceUnit: "kg", validUntil: "2026-09-10", updatedAt: "2026-09-08" },
          { store: "lidl", regularPrice: 2.49, salePrice: 1.69, unitPrice: 6.76, unitPriceUnit: "kg", validUntil: "2026-09-12", updatedAt: "2026-09-08" },
          { store: "mpreis", regularPrice: 2.59, salePrice: 1.79, unitPrice: 7.16, unitPriceUnit: "kg", validUntil: "2026-09-12", updatedAt: "2026-09-08" },
          { store: "spar", regularPrice: 2.69, salePrice: null, unitPrice: 10.76, unitPriceUnit: "kg", validUntil: null, updatedAt: "2026-09-08" }
        ]
      },
      {
        id: "p_cola", name: "Coca-Cola Original", brand: "Coca-Cola",
        category: "Getränke", amount: 1.5, unit: "l", favorite: false,
        offers: [
          { store: "lidl", regularPrice: 1.89, salePrice: 1.49, unitPrice: 0.99, unitPriceUnit: "l", validUntil: "2026-09-10", updatedAt: "2026-09-08" },
          { store: "mpreis", regularPrice: 1.99, salePrice: 1.69, unitPrice: 1.13, unitPriceUnit: "l", validUntil: "2026-09-12", updatedAt: "2026-09-08" },
          { store: "spar", regularPrice: 1.99, salePrice: 1.79, unitPrice: 1.19, unitPriceUnit: "l", validUntil: "2026-09-12", updatedAt: "2026-09-08" },
          { store: "billa", regularPrice: 1.99, salePrice: null, unitPrice: 1.33, unitPriceUnit: "l", validUntil: null, updatedAt: "2026-09-08" }
        ]
      },
      {
        id: "p_pasta", name: "Spaghetti", brand: "Barilla / vergleichbar",
        category: "Vorrat", amount: 500, unit: "g", favorite: true,
        offers: [
          { store: "hofer", regularPrice: 1.19, salePrice: 0.99, unitPrice: 1.98, unitPriceUnit: "kg", validUntil: "2026-09-12", updatedAt: "2026-09-08" },
          { store: "tg", regularPrice: 1.29, salePrice: null, unitPrice: 2.58, unitPriceUnit: "kg", validUntil: null, updatedAt: "2026-09-08" },
          { store: "mpreis", regularPrice: 1.49, salePrice: null, unitPrice: 2.98, unitPriceUnit: "kg", validUntil: null, updatedAt: "2026-09-08" }
        ]
      },
      {
        id: "p_tomato", name: "Dattelcherrytomaten", brand: "verschiedene",
        category: "Obst & Gemüse", amount: 500, unit: "g", favorite: false,
        offers: [
          { store: "lidl", regularPrice: 2.66, salePrice: 1.79, unitPrice: 3.58, unitPriceUnit: "kg", validUntil: "2026-09-09", updatedAt: "2026-09-08" },
          { store: "hofer", regularPrice: 2.39, salePrice: 1.89, unitPrice: 3.78, unitPriceUnit: "kg", validUntil: "2026-09-12", updatedAt: "2026-09-08" },
          { store: "spar", regularPrice: 2.59, salePrice: null, unitPrice: 5.18, unitPriceUnit: "kg", validUntil: null, updatedAt: "2026-09-08" }
        ]
      },
      {
        id: "p_coffee", name: "Caffè Crema Bohnen", brand: "verschiedene",
        category: "Getränke", amount: 1, unit: "kg", favorite: false,
        offers: [
          { store: "tg", regularPrice: 10.99, salePrice: 8.99, unitPrice: 8.99, unitPriceUnit: "kg", validUntil: "2026-09-12", updatedAt: "2026-09-08" },
          { store: "mpreis", regularPrice: 11.99, salePrice: 9.99, unitPrice: 9.99, unitPriceUnit: "kg", validUntil: "2026-09-12", updatedAt: "2026-09-08" }
        ]
      }
    ]
  };

  let state = loadState();
  let currentView = "shopping";
  let currentCategory = "Alle";
  let currentMarket = "all";
  let currentArticleMode = "personal";
  let currentCatalogRetailer = "mpreis";
  let catalogPromotionsOnly = false;
  let catalogSearchTimer = null;
  let catalogRequestSerial = 0;
  let catalogQueryKey = "";
  let catalogItems = [];
  let catalogTotal = 0;
  let catalogHasMore = false;
  let catalogLoading = false;
  let selectedCatalogItem = null;
  const CATALOG_PAGE_SIZE = 50;
  let currentMpreisLinkProductId = null;
  let currentSparLinkProductId = null;
  let currentTgLinkProductId = null;
  let mpreisSearchTimer = null;
  let sparSearchTimer = null;
  let tgSearchTimer = null;
  let mpreisPublicStatus = null;
  let sparPublicStatus = null;
  let tgPublicStatus = null;

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => [...root.querySelectorAll(sel)];

  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : deepClone(initialState);
      return migrateState(parsed);
    } catch {
      return migrateState(deepClone(initialState));
    }
  }

  function migrateState(input) {
    const migrated = {
      schemaVersion: 3,
      settings: { ...initialState.settings, ...(input.settings || {}) },
      live: {
        mpreis: {
          ...initialState.live.mpreis,
          ...(input.live?.mpreis || {})
        },
        spar: {
          ...initialState.live.spar,
          ...(input.live?.spar || {})
        },
        tg: {
          ...initialState.live.tg,
          ...(input.live?.tg || {})
        }
      },
      shopping: Array.isArray(input.shopping) ? input.shopping : [],
      customShopping: Array.isArray(input.customShopping) ? input.customShopping : [],
      products: Array.isArray(input.products) ? input.products : deepClone(initialState.products)
    };

    migrated.products = migrated.products.map(product => ({
      ...product,
      liveLinks: product.liveLinks || {},
      offers: (product.offers || []).map(offer => enrichOffer(product, offer))
    }));

    return migrated;
  }

  function enrichOffer(product, offer) {
    const current = offer.salePrice != null ? Number(offer.salePrice) : Number(offer.regularPrice);
    const updated = offer.updatedAt || todayISO();
    const source = offer.source || `${offer.store || "unknown"}.at`;

    let promotion = offer.promotion || null;

    // Reine Demo-Bedingungen, damit die Aktionslogik vor dem Live-Import getestet werden kann.
    if (!promotion && product.id === "p_butter" && offer.store === "billa" && offer.salePrice != null) {
      promotion = { type: "quantity", requiredQuantity: 2, label: "ab 2 Stück" };
    }
    if (!promotion && product.id === "p_cola" && offer.store === "lidl" && offer.salePrice != null) {
      promotion = { type: "loyalty", loyaltyProgram: "Lidl Plus", label: "nur mit Lidl Plus" };
    }

    const history = Array.isArray(offer.history) && offer.history.length
      ? offer.history
      : buildDemoHistory(product, offer, current, updated);

    return {
      retailerProductId: offer.retailerProductId || `${offer.store || "store"}_${product.id}`,
      source,
      retrievedAt: offer.retrievedAt || `${updated}T08:00:00`,
      promotion,
      history,
      ...offer
    };
  }

  function buildDemoHistory(product, offer, current, updated) {
    if (!Number.isFinite(current)) return [];
    const base = Number(offer.regularPrice || current);
    const d = new Date(updated + "T12:00:00");
    const samples = [
      { days: 28, price: +(base * 1.04).toFixed(2) },
      { days: 14, price: +base.toFixed(2) },
      { days: 0, price: +current.toFixed(2) }
    ];
    return samples.map(sample => {
      const date = new Date(d);
      date.setDate(date.getDate() - sample.days);
      return { date: date.toISOString().slice(0,10), price: sample.price };
    });
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function money(value) {
    if (value == null || Number.isNaN(Number(value))) return "—";
    return new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(Number(value));
  }

  function fmtAmount(p) {
    return `${String(p.amount).replace(".", ",")} ${p.unit}`;
  }

  function offerPrice(o) {
    return o.salePrice != null ? Number(o.salePrice) : Number(o.regularPrice);
  }

  function offerPricingForQuantity(offer, quantity = 1) {
    if (!offer) return null;

    const o = normalizedOffer(offer);
    const qty = Math.max(1, Number(quantity || 1));
    const regular = o.regularPrice != null && Number.isFinite(Number(o.regularPrice))
      ? Number(o.regularPrice)
      : null;
    const sale = o.salePrice != null && Number.isFinite(Number(o.salePrice))
      ? Number(o.salePrice)
      : null;

    if (sale == null) {
      if (regular == null) return null;
      return {
        unitPrice: regular,
        lineTotal: regular * qty,
        activeSale: false,
        conditionMet: true
      };
    }

    const promotion = o.promotion || {};
    const required = Math.max(1, Number(promotion.requiredQuantity || 1));
    const conditional = ["quantity", "bundle"].includes(promotion.type) && required > 1;

    if (conditional && qty < required) {
      if (regular == null) return null;
      return {
        unitPrice: regular,
        lineTotal: regular * qty,
        activeSale: false,
        conditionMet: false
      };
    }

    if (promotion.type === "bundle" && required > 1) {
      const fullGroups = Math.floor(qty / required);
      const remainder = qty % required;

      // The retailer feed stores the printed effective "je" price as salePrice.
      // Complete promotion groups can therefore be valued directly from it.
      let lineTotal = fullGroups * required * sale;

      if (remainder) {
        if (regular == null) return null;
        lineTotal += remainder * regular;
      }

      return {
        unitPrice: lineTotal / qty,
        lineTotal,
        activeSale: true,
        conditionMet: true
      };
    }

    return {
      unitPrice: sale,
      lineTotal: sale * qty,
      activeSale: true,
      conditionMet: true
    };
  }

  function pricedOfferForStore(product, storeId, quantity = 1) {
    const offer = offerForStore(product, storeId);
    if (!offer) return null;

    const pricing = offerPricingForQuantity(offer, quantity);
    return pricing ? { offer, pricing } : null;
  }

  function cheapestPricedOffer(product, quantity = 1) {
    const candidates = validOffers(product)
      .map(normalizedOffer)
      .map(offer => ({ offer, pricing: offerPricingForQuantity(offer, quantity) }))
      .filter(candidate => candidate.pricing)
      .sort((a, b) =>
        (a.pricing.lineTotal - b.pricing.lineTotal) ||
        (a.pricing.unitPrice - b.pricing.unitPrice)
      );

    return candidates[0] || null;
  }

  function validOffers(product) {
    const today = todayISO();
    return (product.offers || []).filter(o => {
      if (o.salePrice != null && o.validUntil && o.validUntil < today) {
        return o.regularPrice != null;
      }
      return o.regularPrice != null || o.salePrice != null;
    });
  }

  function normalizedOffer(o) {
    const copy = { ...o };
    if (copy.salePrice != null && copy.validUntil && copy.validUntil < todayISO()) copy.salePrice = null;
    return copy;
  }


  function offerForStore(product, storeId) {
    return validOffers(product)
      .map(normalizedOffer)
      .filter(o => o.store === storeId)
      .sort((a,b) => String(b.retrievedAt || b.updatedAt || "").localeCompare(String(a.retrievedAt || a.updatedAt || "")))[0] || null;
  }

  function offerConditionLabel(offer) {
    const p = offer?.promotion;
    if (!p) return "";
    if (p.label) return p.label;
    if (p.type === "quantity" && p.requiredQuantity) return `ab ${p.requiredQuantity} Stück`;
    if (p.type === "loyalty" && p.loyaltyProgram) return `nur mit ${p.loyaltyProgram}`;
    if (p.type === "percentage" && p.discountPercent) return `-${p.discountPercent} %`;
    return "Aktionsbedingung";
  }

  function freshnessInfo(offer) {
    const dateStr = offer?.retrievedAt?.slice(0,10) || offer?.updatedAt;
    if (!dateStr) return { label: "Datum unbekannt", current: false, days: null };
    const start = new Date(dateStr + "T12:00:00");
    const now = new Date(todayISO() + "T12:00:00");
    const days = Math.max(0, Math.round((now - start) / 86400000));
    if (days === 0) return { label: "heute aktualisiert", current: true, days };
    if (days === 1) return { label: "gestern aktualisiert", current: true, days };
    if (days <= 3) return { label: `vor ${days} Tagen`, current: true, days };
    return { label: `vor ${days} Tagen`, current: false, days };
  }

  function productHistory(product) {
    const rows = [];
    (product.offers || []).forEach(offer => {
      (offer.history || []).forEach(h => rows.push({
        store: offer.store,
        date: h.date,
        price: Number(h.price)
      }));
    });
    return rows
      .filter(r => Number.isFinite(r.price))
      .sort((a,b) => b.date.localeCompare(a.date));
  }

  function productPriceStats(product) {
    const history = productHistory(product);
    if (!history.length) return null;
    const prices = history.map(h => h.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a,b) => a + b, 0) / prices.length
    };
  }

  function cheapestOffer(product) {
    const offers = validOffers(product).map(normalizedOffer);
    if (!offers.length) return null;
    return offers.sort((a,b) => offerPrice(a) - offerPrice(b))[0];
  }

  function retailer(storeId) { return retailers[storeId] || { name: "Unbekannt", color: "#777", text: "#fff" }; }

  function productById(id) { return state.products.find(p => p.id === id); }

  function showToast(text) {
    const toast = $("#toast");
    toast.textContent = text;
    toast.classList.add("show");
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => toast.classList.remove("show"), 1700);
  }

  function applyTheme() {
    const choice = state.settings.theme || "system";
    const dark = choice === "dark" || (choice === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    document.querySelector('meta[name="theme-color"]').setAttribute("content", dark ? "#111210" : "#f6f3ee");
    $$("#themeSegmented button").forEach(b => b.classList.toggle("is-active", b.dataset.themeValue === choice));
  }

  function setTheme(theme) {
    state.settings.theme = theme;
    saveState();
    applyTheme();
  }

  function renderAll() {
    renderShopping();
    renderArticles();
    renderMarkets();
    renderMore();
    populateForms();
    applyTheme();
  }

  function renderShopping() {
    const items = state.shopping.map(item => ({...item, product: productById(item.productId)})).filter(x => x.product);
    const custom = state.customShopping.map(item => ({...item, custom: true}));
    let combined = [...items, ...custom];

    const sort = state.settings.shoppingSort || "added";
    combined.sort((a,b) => {
      // Abgehakte Artikel immer ans Listenende verschieben.
      if (Boolean(a.checked) !== Boolean(b.checked)) return a.checked ? 1 : -1;

      if (sort === "store") return shoppingStoreName(a).localeCompare(shoppingStoreName(b), "de");
      if (sort === "category") return (a.product?.category || "Sonstiges").localeCompare(b.product?.category || "Sonstiges", "de");
      if (sort === "price") return shoppingItemTotal(a) - shoppingItemTotal(b);
      return (a.addedAt || 0) - (b.addedAt || 0);
    });

    const list = $("#shoppingList");
    list.innerHTML = combined.map(renderShoppingCard).join("");

    $("#shoppingEmpty").classList.toggle("hidden", combined.length > 0);
    $("#shoppingList").classList.toggle("hidden", combined.length === 0);

    const openItems = combined.filter(i => !i.checked);
    const total = openItems.reduce((sum, i) => sum + shoppingItemTotal(i), 0);
    $("#shoppingCount").textContent = `${openItems.length} ${openItems.length === 1 ? "Artikel" : "Artikel"}`;
    $("#shoppingEstimate").textContent = openItems.length ? `Geschätzt ${money(total)}` : "Noch keine Preise";

    renderOptimizer(openItems);
    $("#shoppingSort").value = sort;
  }

  function shoppingStoreId(item) {
    if (item.custom) return item.store || "auto";
    if (item.preferredStore && item.preferredStore !== "auto") return item.preferredStore;
    return cheapestPricedOffer(item.product, item.quantity)?.offer.store || "auto";
  }

  function shoppingStoreName(item) {
    const id = shoppingStoreId(item);
    return id === "auto" ? "Ohne Markt" : retailer(id).name;
  }

  function shoppingUnitPrice(item) {
    if (item.custom) return Number(item.price || 0);

    const quantity = Number(item.quantity || 1);
    const candidate = item.preferredStore && item.preferredStore !== "auto"
      ? pricedOfferForStore(item.product, item.preferredStore, quantity)
      : cheapestPricedOffer(item.product, quantity);

    return candidate?.pricing.unitPrice || 0;
  }

  function shoppingItemTotal(item) {
    if (item.custom) return Number(item.price || 0) * Number(item.quantity || 1);

    const quantity = Number(item.quantity || 1);
    const candidate = item.preferredStore && item.preferredStore !== "auto"
      ? pricedOfferForStore(item.product, item.preferredStore, quantity)
      : cheapestPricedOffer(item.product, quantity);

    return candidate?.pricing.lineTotal || 0;
  }

  function renderShoppingCard(item) {
    const storeId = shoppingStoreId(item);
    const store = retailer(storeId);
    const name = item.custom ? item.name : item.product.name;
    const meta = item.custom
      ? `${storeId === "auto" ? "Kein Markt" : store.name} · freier Artikel`
      : `${item.product.brand || "ohne Marke"} · ${fmtAmount(item.product)}`;
    const price = shoppingUnitPrice(item);
    const selectedOffer = !item.custom && storeId !== "auto"
      ? offerForStore(item.product, storeId)
      : null;
    const condition = selectedOffer ? offerConditionLabel(selectedOffer) : "";
    const idAttr = item.custom ? `c:${item.id}` : `p:${item.id}`;
    return `
      <article class="product-card shopping-card ${item.checked ? "is-checked" : ""}">
        <button class="check-btn" data-shopping-check="${idAttr}" aria-label="Abhaken">${item.checked ? "✓" : ""}</button>
        <div class="product-main" ${item.custom ? "" : `data-open-product="${item.product.id}"`}>
          <div class="product-name">${escapeHtml(name)}</div>
          <div class="product-meta"><span>${escapeHtml(meta)}</span></div>
          ${condition ? `<div class="product-meta"><span>${escapeHtml(condition)}</span></div>` : ""}
          ${storeId !== "auto" ? `<div class="market-label"><span class="market-dot" style="background:${store.color}"></span>${store.name}</div>` : ""}
        </div>
        <div class="product-price-wrap">
          <div class="product-price">${price ? money(price) : "—"}</div>
          <div class="qty-control">
            <button data-qty-change="${idAttr}" data-delta="-1">−</button>
            <span>${item.quantity}</span>
            <button data-qty-change="${idAttr}" data-delta="1">+</button>
          </div>
          <button class="delete-link" data-shopping-delete="${idAttr}">Entfernen</button>
        </div>
      </article>`;
  }

  function renderOptimizer(openItems) {
    const card = $("#optimizerCard");
    const productItems = openItems.filter(i => !i.custom && i.product);
    const customItems = openItems.filter(i => i.custom);

    if (!productItems.length && !customItems.length) {
      card.classList.add("hidden");
      card.innerHTML = "";
      return;
    }

    const strategy = state.settings.shoppingStrategy || "cheapest";
    const result = productItems.length
      ? optimizeShopping(productItems, strategy)
      : { assignments: [], covered: 0, complete: true, total: 0, usedStores: [] };

    if (!result) {
      card.classList.add("hidden");
      card.innerHTML = "";
      return;
    }

    const groups = {};
    result.assignments.forEach(a => {
      if (!groups[a.store]) groups[a.store] = { total: 0, count: 0 };
      groups[a.store].total += a.lineTotal;
      groups[a.store].count += 1;
    });

    const markets = Object.entries(groups).sort((a,b) => b[1].total - a[1].total);

    const pricedCustomItems = customItems.filter(i => Number(i.price || 0) > 0);
    const unpricedCustomItems = customItems.filter(i => Number(i.price || 0) <= 0);
    const customTotal = pricedCustomItems.reduce((sum, item) => sum + shoppingItemTotal(item), 0);

    const calculatedPartialTotal = result.total + customTotal;
    const fullCoverage =
      result.covered === productItems.length &&
      unpricedCustomItems.length === 0;

    const missingProducts = productItems.length - result.covered;
    const missingTotal = missingProducts + unpricedCustomItems.length;

    const titles = {
      cheapest: "GÜNSTIGSTER EINKAUF",
      max2: "MAXIMAL 2 MÄRKTE",
      one: "NUR EIN MARKT"
    };

    card.innerHTML = `
      <div class="optimizer-title">
        <div>
          <div class="eyebrow">${titles[strategy]}</div>
          <strong>${markets.length} ${markets.length === 1 ? "Markt" : "Märkte"}</strong>
          <div class="optimizer-meta">
            <span class="optimizer-badge">${result.covered}/${productItems.length} Datenbank-Artikel bepreist</span>
            ${customItems.length ? `<span class="optimizer-badge">${pricedCustomItems.length}/${customItems.length} freie Artikel bepreist</span>` : ""}
          </div>
        </div>
        <div class="optimizer-total-wrap">
          <div class="optimizer-total">${fullCoverage ? money(calculatedPartialTotal) : "—"}</div>
          ${!fullCoverage ? `<div class="optimizer-partial">Teilbetrag ${money(calculatedPartialTotal)}</div>` : ""}
        </div>
      </div>

      <div class="optimizer-markets">
        ${markets.map(([id, g]) => `
          <div class="optimizer-market">
            <span><span class="market-dot" style="background:${retailer(id).color}"></span> ${retailer(id).name} · ${g.count} ${g.count === 1 ? "Artikel" : "Artikel"}</span>
            <strong>${money(g.total)}</strong>
          </div>`).join("")}

        ${pricedCustomItems.length ? `
          <div class="optimizer-market">
            <span>Freie Artikel mit Preis · ${pricedCustomItems.length}</span>
            <strong>${money(customTotal)}</strong>
          </div>` : ""}
      </div>

      ${!fullCoverage ? `
        <div class="optimizer-warning">
          Keine vergleichbare Gesamtsumme: Für ${missingTotal} ${missingTotal === 1 ? "Artikel fehlt" : "Artikel fehlen"} in dieser Strategie Preisdaten.
          Angezeigt wird deshalb nur der Teilbetrag der bepreisten Artikel.
        </div>` : ""}
    `;

    card.classList.remove("hidden");
  }

  function optimizeShopping(productItems, strategy) {
    const storeIds = Object.keys(retailers);
    const itemCount = productItems.length;

    if (strategy === "cheapest") {
      const assignments = [];

      productItems.forEach(item => {
        const quantity = Number(item.quantity || 1);
        const candidate = item.preferredStore && item.preferredStore !== "auto"
          ? pricedOfferForStore(item.product, item.preferredStore, quantity)
          : cheapestPricedOffer(item.product, quantity);

        if (!candidate) return;

        assignments.push({
          item,
          store: candidate.offer.store,
          offer: candidate.offer,
          pricing: candidate.pricing,
          lineTotal: candidate.pricing.lineTotal
        });
      });

      return finalizeOptimizationResult({
        stores: [...new Set(assignments.map(a => a.store))],
        assignments
      }, itemCount);
    }

    const candidateSets = [];

    // "1 Markt": exakt ein Markt.
    if (strategy === "one") {
      storeIds.forEach(id => candidateSets.push([id]));
    }

    // "Max. 2": ausdrücklich ALLE Ein-Markt-Lösungen UND alle Marktpaare.
    // Damit kann diese Strategie bei vollständiger Abdeckung niemals teurer
    // sein als die beste Ein-Markt-Lösung.
    if (strategy === "max2") {
      storeIds.forEach(id => candidateSets.push([id]));

      for (let i = 0; i < storeIds.length; i++) {
        for (let j = i + 1; j < storeIds.length; j++) {
          candidateSets.push([storeIds[i], storeIds[j]]);
        }
      }
    }

    const evaluated = candidateSets.map(set => evaluateStoreSet(productItems, set));
    let best = selectBestOptimization(evaluated, itemCount);

    // Defensive Invariante:
    // Wenn "Max. 2" und "1 Markt" beide die komplette Liste abdecken,
    // darf Max. 2 niemals teurer als die beste Ein-Markt-Lösung sein.
    if (strategy === "max2") {
      const oneStoreResults = evaluated.filter(r => r.stores.length === 1);
      const bestOne = selectBestOptimization(oneStoreResults, itemCount);

      if (
        best &&
        bestOne &&
        best.complete &&
        bestOne.complete &&
        best.total > bestOne.total + 0.000001
      ) {
        best = { ...bestOne, invariantFallback: true };
      }
    }

    return best;
  }

  function evaluateStoreSet(productItems, stores) {
    const assignments = [];

    productItems.forEach(item => {
      const allowedStores = item.preferredStore && item.preferredStore !== "auto"
        ? (stores.includes(item.preferredStore) ? [item.preferredStore] : [])
        : stores;

      const quantity = Number(item.quantity || 1);
      const choices = allowedStores
        .map(store => pricedOfferForStore(item.product, store, quantity))
        .filter(Boolean)
        .sort((a,b) =>
          (a.pricing.lineTotal - b.pricing.lineTotal) ||
          (a.pricing.unitPrice - b.pricing.unitPrice)
        );

      const candidate = choices[0];
      if (!candidate) return;

      assignments.push({
        item,
        store: candidate.offer.store,
        offer: candidate.offer,
        pricing: candidate.pricing,
        lineTotal: candidate.pricing.lineTotal
      });
    });

    return finalizeOptimizationResult({ stores, assignments }, productItems.length);
  }

  function finalizeOptimizationResult(result, itemCount) {
    const assignments = result.assignments || [];
    const usedStores = [...new Set(assignments.map(a => a.store))];

    return {
      ...result,
      assignments,
      usedStores,
      covered: assignments.length,
      missing: Math.max(0, itemCount - assignments.length),
      complete: assignments.length === itemCount,
      total: assignments.reduce((sum, assignment) => sum + assignment.lineTotal, 0)
    };
  }

  function selectBestOptimization(results, itemCount) {
    if (!results.length) return null;

    // Vollständige Lösungen sind immer vorzuziehen.
    // Unter vollständigen Lösungen entscheidet ausschließlich der niedrigste Preis,
    // bei Preisgleichheit die geringere tatsächlich genutzte Marktanzahl.
    const complete = results.filter(r => r.covered === itemCount);

    if (complete.length) {
      complete.sort((a,b) =>
        (a.total - b.total) ||
        (a.usedStores.length - b.usedStores.length) ||
        (a.stores.length - b.stores.length)
      );
      return complete[0];
    }

    // Gibt es keine vollständige Lösung, wird NICHT so getan, als wäre
    // die Teilsumme ein Gesamtpreis. Wir wählen nur die beste Teilabdeckung.
    const partial = [...results];
    partial.sort((a,b) =>
      (b.covered - a.covered) ||
      (a.total - b.total) ||
      (a.usedStores.length - b.usedStores.length) ||
      (a.stores.length - b.stores.length)
    );
    return partial[0];
  }

  function renderArticles() {
    const personalPanel = $("#personalArticlesPanel");
    const catalogPanel = $("#retailerCatalogPanel");

    if (personalPanel) personalPanel.classList.toggle("hidden", currentArticleMode !== "personal");
    if (catalogPanel) catalogPanel.classList.toggle("hidden", currentArticleMode !== "catalog");

    $$("#articleModeSegmented [data-article-mode]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.articleMode === currentArticleMode);
    });

    if (currentArticleMode === "catalog") {
      renderCatalogTabs();
      renderCatalogView();
      return;
    }

    const q = ($("#articleSearch")?.value || "").trim().toLowerCase();
    const filtered = state.products.filter(p =>
      (currentCategory === "Alle" || p.category === currentCategory) &&
      (!q || `${p.name} ${p.brand || ""} ${p.category}`.toLowerCase().includes(q))
    );

    $("#articleCountLabel").textContent = `${filtered.length} von ${state.products.length} Artikeln`;
    $("#articleList").innerHTML = filtered.map(renderArticleCard).join("");

    const cats = ["Alle", ...categories.filter(c => state.products.some(p => p.category === c))];
    $("#categoryChips").innerHTML = cats.map(c =>
      `<button class="chip ${c === currentCategory ? "is-active" : ""}" data-category="${escapeAttr(c)}">${escapeHtml(c)}</button>`
    ).join("");
  }

  function setArticleMode(mode) {
    if (!["personal", "catalog"].includes(mode)) return;
    if (currentArticleMode === mode) return;

    currentArticleMode = mode;
    renderArticles();

    if (mode === "catalog") {
      resetAndLoadCatalog();
    }
  }

  function catalogLiveModule(store = currentCatalogRetailer) {
    if (store === "mpreis") return window.MPreisLive;
    if (store === "spar") return window.SparLive;
    if (store === "tg") return window.TgLive;
    return null;
  }

  function renderCatalogTabs() {
    const store = retailer(currentCatalogRetailer);

    $$("#catalogStoreTabs [data-catalog-store]").forEach(button => {
      button.classList.toggle(
        "is-active",
        button.dataset.catalogStore === currentCatalogRetailer
      );
    });

    const input = $("#retailerCatalogSearch");
    if (input) input.placeholder = `${store.name}-Produkte suchen …`;

    const eyebrow = $("#catalogEyebrow");
    if (eyebrow) eyebrow.textContent = `${store.name.toUpperCase()} KATALOG`;

    const promoButton = $("#catalogPromotionFilter");
    if (promoButton) {
      promoButton.classList.toggle("is-active", catalogPromotionsOnly);
      promoButton.setAttribute("aria-pressed", catalogPromotionsOnly ? "true" : "false");
    }
  }

  function setCatalogRetailer(store) {
    if (!["mpreis", "spar", "tg"].includes(store)) return;
    if (currentCatalogRetailer === store) return;

    currentCatalogRetailer = store;
    catalogPromotionsOnly = false;

    const input = $("#retailerCatalogSearch");
    if (input) input.value = "";

    renderCatalogTabs();
    resetAndLoadCatalog();
  }

  function catalogCurrentQuery() {
    return ($("#retailerCatalogSearch")?.value || "").trim();
  }

  function catalogKey() {
    return [
      currentCatalogRetailer,
      catalogCurrentQuery().toLowerCase(),
      catalogPromotionsOnly ? "promo" : "all"
    ].join("|");
  }

  function resetCatalogState() {
    catalogQueryKey = catalogKey();
    catalogItems = [];
    catalogTotal = 0;
    catalogHasMore = false;
    catalogLoading = false;
    renderCatalogView();
  }

  function resetAndLoadCatalog() {
    resetCatalogState();
    loadCatalogPage();
  }

  async function loadCatalogPage() {
    if (catalogLoading) return;

    const module = catalogLiveModule();
    const stateEl = $("#retailerCatalogState");

    if (!module?.browse) {
      if (stateEl) stateEl.textContent = "Der Händlerkatalog konnte nicht geladen werden.";
      return;
    }

    const requestKey = catalogKey();

    if (requestKey !== catalogQueryKey) {
      resetCatalogState();
    }

    const serial = ++catalogRequestSerial;
    catalogLoading = true;
    renderCatalogView();

    try {
      const page = await module.browse({
        query: catalogCurrentQuery(),
        offset: catalogItems.length,
        limit: CATALOG_PAGE_SIZE,
        promotionsOnly: catalogPromotionsOnly
      });

      if (serial !== catalogRequestSerial || requestKey !== catalogKey()) return;

      const seen = new Set(
        catalogItems.map(item =>
          String(item.retailerProductId || item.remoteObjectId || "")
        )
      );

      page.items.forEach(item => {
        const key = String(item.retailerProductId || item.remoteObjectId || "");
        if (!key || seen.has(key)) return;
        seen.add(key);
        catalogItems.push(item);
      });

      catalogTotal = Number(page.total) || 0;
      catalogHasMore = Boolean(page.hasMore);
    } catch (error) {
      if (serial !== catalogRequestSerial) return;
      if (stateEl) {
        stateEl.textContent = `Katalog konnte nicht geladen werden: ${error.message}`;
      }
      catalogHasMore = false;
    } finally {
      if (serial === catalogRequestSerial) {
        catalogLoading = false;
        renderCatalogView();
      }
    }
  }

  function catalogItemId(item) {
    return String(item?.retailerProductId || item?.remoteObjectId || "");
  }

  function catalogLinkedProductsMap(store) {
    const map = new Map();

    state.products.forEach(product => {
      const link = product.liveLinks?.[store];
      if (!link) return;

      [link.retailerProductId, link.remoteObjectId]
        .filter(Boolean)
        .forEach(id => map.set(String(id), product));
    });

    return map;
  }

  function catalogDisplayPrice(item) {
    if (item?.salePrice != null) return Number(item.salePrice);
    if (item?.currentPrice != null) return Number(item.currentPrice);
    if (item?.displayPrice != null) return Number(item.displayPrice);
    return null;
  }

  function catalogAmountText(item) {
    if (currentCatalogRetailer === "tg" && item?.amountText) {
      return String(item.amountText);
    }
    return formatLiveAmount(item);
  }

  function renderCatalogView() {
    if (currentArticleMode !== "catalog") return;

    renderCatalogTabs();

    const countEl = $("#retailerCatalogCount");
    const stateEl = $("#retailerCatalogState");
    const listEl = $("#retailerCatalogList");
    const moreBtn = $("#retailerCatalogMoreBtn");

    if (!countEl || !stateEl || !listEl || !moreBtn) return;

    const store = retailer(currentCatalogRetailer);
    const query = catalogCurrentQuery();
    const linkedMap = catalogLinkedProductsMap(currentCatalogRetailer);

    if (catalogLoading && !catalogItems.length) {
      countEl.textContent = `${store.name}: Produkte werden geladen …`;
      stateEl.textContent = query
        ? `Suche nach „${query}“ …`
        : "Gesamten Produktbestand laden …";
      listEl.innerHTML = "";
    } else {
      countEl.textContent = catalogTotal
        ? `${catalogTotal.toLocaleString("de-AT")} Produkte · ${catalogItems.length.toLocaleString("de-AT")} angezeigt`
        : (catalogItems.length ? `${catalogItems.length} Produkte` : "Keine Produkte");

      if (catalogItems.length) {
        stateEl.textContent = catalogPromotionsOnly
          ? "Nur aktuell erkannte Aktionsartikel"
          : (query ? "Treffer im vollständigen Händlerbestand" : "Alphabetisch · jeweils 50 Produkte nachladen");
      } else if (!catalogLoading) {
        stateEl.textContent = query
          ? `Keine Produkte für „${query}“ gefunden.`
          : "Keine Produkte verfügbar.";
      }

      listEl.innerHTML = catalogItems.map((item, index) => {
        const linked = linkedMap.get(catalogItemId(item)) || null;
        const price = catalogDisplayPrice(item);
        const sale = item.salePrice != null;
        const promotion = item.promotion?.label;
        const displayOnly = currentCatalogRetailer === "tg" && item.optimizerEligible === false;

        return `
          <article class="product-card catalog-product-card"
                   style="--catalog-accent:${store.color}">
            <div class="product-main catalog-product-main">
              <div class="product-name">
                ${escapeHtml(item.name)}
                ${item.bio ? `<span class="live-result-bio">BIO</span>` : ""}
              </div>
              <div class="product-meta catalog-product-meta">
                <span>${escapeHtml(catalogAmountText(item))}</span>
                ${item.unitPrice
                  ? `<span>·</span><span>${money(item.unitPrice)}/${escapeHtml(item.unitPriceUnit || "")}</span>`
                  : ""}
              </div>
              <div class="offer-extra catalog-badges">
                ${promotion
                  ? `<span class="offer-badge condition">${escapeHtml(promotion)}</span>`
                  : ""}
                ${displayOnly
                  ? `<span class="offer-badge tg-display-only">nur Anzeige</span>`
                  : ""}
                ${linked
                  ? `<span class="catalog-linked-label">✓ ${escapeHtml(linked.name)}</span>`
                  : ""}
              </div>
            </div>

            <div class="product-price-wrap catalog-price-wrap">
              <div class="product-price ${sale ? "sale" : ""}">${money(price)}</div>
              ${sale && item.regularPrice != null
                ? `<div class="old-price">${money(item.regularPrice)}</div>`
                : ""}
              <button class="catalog-link-btn ${linked ? "is-linked" : ""}"
                      data-catalog-link-index="${index}">
                ${linked ? "Verknüpfung" : "Verknüpfen"}
              </button>
            </div>
          </article>`;
      }).join("");
    }

    moreBtn.classList.toggle(
      "hidden",
      !catalogHasMore || catalogLoading || !catalogItems.length
    );
    moreBtn.disabled = catalogLoading;
    moreBtn.textContent = catalogLoading
      ? "Lädt …"
      : `Weitere ${Math.min(CATALOG_PAGE_SIZE, Math.max(0, catalogTotal - catalogItems.length))} laden`;
  }

  function openCatalogLinkSheet(index) {
    const item = catalogItems[Number(index)];
    if (!item) return;

    selectedCatalogItem = {
      store: currentCatalogRetailer,
      item
    };

    const store = retailer(currentCatalogRetailer);
    const price = catalogDisplayPrice(item);

    $("#catalogLinkEyebrow").textContent = `${store.name.toUpperCase()} PRODUKT`;
    $("#catalogLinkTitle").textContent = item.name;

    $("#catalogLinkSummary").innerHTML = `
      <div class="catalog-link-product" style="--catalog-accent:${store.color}">
        <div>
          <strong>${escapeHtml(item.name)}</strong>
          <div class="product-meta">
            <span>${escapeHtml(catalogAmountText(item))}</span>
            ${item.unitPrice
              ? `<span>·</span><span>${money(item.unitPrice)}/${escapeHtml(item.unitPriceUnit || "")}</span>`
              : ""}
          </div>
        </div>
        <div class="catalog-link-price">${money(price)}</div>
      </div>`;

    $("#catalogPersonalSearch").value = "";
    renderCatalogPersonalTargets();
    openSheet("catalogLinkSheet");
  }

  function renderCatalogPersonalTargets() {
    const resultEl = $("#catalogPersonalResults");
    const stateEl = $("#catalogPersonalState");

    if (!resultEl || !stateEl || !selectedCatalogItem) return;

    const q = ($("#catalogPersonalSearch")?.value || "").trim().toLowerCase();
    const store = selectedCatalogItem.store;
    const liveItem = selectedCatalogItem.item;
    const liveId = catalogItemId(liveItem);

    const rows = state.products
      .filter(product =>
        !q ||
        `${product.name} ${product.brand || ""} ${product.category}`
          .toLowerCase()
          .includes(q)
      )
      .sort((a, b) => a.name.localeCompare(b.name, "de", {
        sensitivity: "base",
        numeric: true
      }))
      .slice(0, 40);

    stateEl.textContent = rows.length
      ? `${rows.length}${state.products.length > 40 && !q ? " von " + state.products.length : ""} persönliche Artikel`
      : "Kein passender persönlicher Artikel gefunden.";

    resultEl.innerHTML = rows.map(product => {
      const link = product.liveLinks?.[store];
      const linkedId = String(
        link?.retailerProductId || link?.remoteObjectId || ""
      );
      const current = Boolean(liveId && linkedId === liveId);
      const replaces = Boolean(link && !current);

      return `
        <article class="catalog-target-card ${current ? "is-current" : ""}">
          <div>
            <strong>${escapeHtml(product.name)}</strong>
            <div class="muted small">
              ${escapeHtml(product.brand || "ohne Marke")} ·
              ${escapeHtml(fmtAmount(product))} ·
              ${escapeHtml(product.category)}
            </div>
          </div>
          <button class="catalog-target-btn ${current ? "is-current" : ""}"
                  data-catalog-target-product="${product.id}"
                  ${current ? "disabled" : ""}>
            ${current ? "Aktuell" : (replaces ? "Ersetzen" : "Verknüpfen")}
          </button>
        </article>`;
    }).join("");
  }

  function sameCatalogLiveItem(linkOrOffer, liveItem) {
    if (!linkOrOffer || !liveItem) return false;

    const liveIds = new Set(
      [liveItem.retailerProductId, liveItem.remoteObjectId]
        .filter(Boolean)
        .map(String)
    );

    return [linkOrOffer.retailerProductId, linkOrOffer.remoteObjectId]
      .filter(Boolean)
      .map(String)
      .some(id => liveIds.has(id));
  }

  function detachCatalogItemFromOtherProducts(store, liveItem, targetProductId) {
    state.products.forEach(product => {
      if (product.id === targetProductId) return;

      const link = product.liveLinks?.[store];
      if (!sameCatalogLiveItem(link, liveItem)) return;

      delete product.liveLinks[store];

      product.offers = (product.offers || []).filter(offer =>
        !(
          offer.store === store &&
          sameCatalogLiveItem(offer, liveItem)
        )
      );
    });
  }

  function linkSelectedCatalogItem(productId) {
    if (!selectedCatalogItem) return;

    const { store, item } = selectedCatalogItem;
    detachCatalogItemFromOtherProducts(store, item, productId);

    if (store === "mpreis") linkMpreisResult(productId, item);
    else if (store === "spar") linkSparResult(productId, item);
    else if (store === "tg") linkTgResult(productId, item);
    else return;

    selectedCatalogItem = null;
  }

  function createPersonalFromCatalog() {
    if (!selectedCatalogItem) return;

    const { store, item } = selectedCatalogItem;

    const amountValue = Array.isArray(item.amount)
      ? Number(item.amount[0]) || 1
      : Number(item.amount);

    const product = {
      id: `p_${cryptoId()}`,
      name: String(item.name || "Neuer Artikel").trim(),
      brand: "",
      category: "Sonstiges",
      amount: Number.isFinite(amountValue) && amountValue > 0 ? amountValue : 1,
      unit: item.unit || "Stk",
      favorite: false,
      offers: [],
      liveLinks: {}
    };

    state.products.push(product);
    detachCatalogItemFromOtherProducts(store, item, product.id);

    if (store === "mpreis") linkMpreisResult(product.id, item);
    else if (store === "spar") linkSparResult(product.id, item);
    else if (store === "tg") linkTgResult(product.id, item);

    selectedCatalogItem = null;
    showToast("Persönlicher Artikel übernommen und verknüpft");
  }

  function renderArticleCard(product) {
    const offer = cheapestOffer(product);
    const store = offer ? retailer(offer.store) : null;
    const sale = offer && normalizedOffer(offer).salePrice != null;
    return `
      <article class="product-card">
        <div class="product-main" data-open-product="${product.id}">
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="product-meta">
            <span>${escapeHtml(product.brand || "ohne Marke")}</span>
            <span>·</span><span>${fmtAmount(product)}</span>
            <span>·</span><span>${escapeHtml(product.category)}</span>
          </div>
          ${store ? `<div class="market-label"><span class="market-dot" style="background:${store.color}"></span>${store.name}</div>` : ""}
        </div>
        <div class="product-price-wrap">
          ${offer ? `<div class="product-price ${sale ? "sale" : ""}">${money(offerPrice(normalizedOffer(offer)))}</div>
          ${sale ? `<div class="old-price">${money(offer.regularPrice)}</div>` : ""}
          <div class="product-meta" style="justify-content:flex-end">${offer.unitPrice ? `${money(offer.unitPrice)}/${offer.unitPriceUnit}` : ""}</div>` : `<div class="product-price">—</div>`}
          <div class="card-actions" style="justify-content:flex-end">
            <button class="mini-add" data-add-product="${product.id}" aria-label="Zur Einkaufsliste hinzufügen">＋</button>
          </div>
        </div>
      </article>`;
  }

  function renderMarkets() {
    const ids = ["all", ...Object.keys(retailers)];
    $("#marketChips").innerHTML = ids.map(id => {
      if (id === "all") return `<button class="chip market-chip ${currentMarket === "all" ? "is-active" : ""}" data-market="all">Alle</button>`;
      const r = retailer(id);
      return `<button class="chip market-chip ${currentMarket === id ? "is-active" : ""}" data-market="${id}" style="--market-color:${r.color};--chip-text:${r.text}">${r.name}</button>`;
    }).join("");

    if (currentMarket === "all") {
      $("#marketOverview").style.setProperty("--market-color", "var(--primary)");
      $("#marketOverview").innerHTML = `<div class="eyebrow">OSTTIROL</div><h2>Alle Märkte</h2><p class="muted">Aktuelle bekannte Preise aus ${Object.keys(retailers).length} Märkten · Demo-Datenbestand</p>`;
      const rows = state.products
        .map(p => ({ p, o: cheapestOffer(p) }))
        .filter(x => x.o)
        .sort((a,b) => offerPrice(a.o) - offerPrice(b.o));
      $("#marketProductList").innerHTML = rows.map(({p}) => renderArticleCard(p)).join("");
      return;
    }

    const r = retailer(currentMarket);
    const rows = state.products
      .map(p => ({ p, o: validOffers(p).map(normalizedOffer).find(o => o.store === currentMarket) }))
      .filter(x => x.o)
      .sort((a,b) => offerPrice(a.o) - offerPrice(b.o));

    $("#marketOverview").style.setProperty("--market-color", r.color);
    $("#marketOverview").innerHTML = `<div class="eyebrow">MARKT</div><h2>${r.name}</h2><p class="muted">${rows.length} bekannte Artikel für Osttirol</p>`;

    $("#marketProductList").innerHTML = rows.map(({p,o}) => {
      const sale = o.salePrice != null;
      return `
      <article class="product-card">
        <div class="product-main" data-open-product="${p.id}">
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-meta"><span>${escapeHtml(p.brand || "")}</span><span>·</span><span>${fmtAmount(p)}</span></div>
          ${o.validUntil ? `<div class="product-meta"><span>${sale ? "Aktion" : "Preis"} bis ${formatDate(o.validUntil)}</span></div>` : ""}
        </div>
        <div class="product-price-wrap">
          <div class="product-price ${sale ? "sale" : ""}">${money(offerPrice(o))}</div>
          ${sale ? `<div class="old-price">${money(o.regularPrice)}</div>` : ""}
          <div class="product-meta" style="justify-content:flex-end">${o.unitPrice ? `${money(o.unitPrice)}/${o.unitPriceUnit}` : ""}</div>
          <div class="card-actions" style="justify-content:flex-end"><button class="mini-add" data-add-product="${p.id}" data-preferred-store="${currentMarket}">＋</button></div>
        </div>
      </article>`;
    }).join("");
  }

  function renderMpreisLiveStatus() {
    const live = state.live?.mpreis || {};
    const linked = state.products.filter(p => p.liveLinks?.mpreis).length;

    const linkedEl = $("#mpreisLinkedCount");
    const lastEl = $("#mpreisLastSync");
    const statusEl = $("#mpreisLiveStatus");
    const promoBtn = $("#showMpreisPromotionsBtn");
    if (!linkedEl || !lastEl || !statusEl) return;

    linkedEl.textContent = `${linked} Artikel verknüpft`;
    statusEl.className = "status-badge";

    if (live.lastError) {
      statusEl.textContent = "Fehler";
      statusEl.classList.add("live-error");
    } else if (mpreisPublicStatus?.updatedAt) {
      statusEl.textContent = "Aktuell";
      statusEl.classList.add("live-ok");
    } else {
      statusEl.textContent = "Bereit";
    }

    if (mpreisPublicStatus?.updatedAt) {
      const date = new Date(mpreisPublicStatus.updatedAt);
      lastEl.textContent = `GitHub-Datenstand: ${date.toLocaleString("de-AT", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      })} · ${mpreisPublicStatus.productCount || 0} Produkte · ${mpreisPublicStatus.promotionCount || 0} Aktionen`;
    } else {
      lastEl.textContent = "Noch keine importierten MPREIS-Daten vorhanden";
    }

    if (promoBtn) {
      const count = mpreisPublicStatus?.promotionCount || 0;
      promoBtn.textContent = count
        ? `🔥 ${count} Aktionsartikel anzeigen`
        : "🔥 Aktionsartikel anzeigen";
    }
  }

  async function refreshMpreisPublicStatus(force = false) {
    try {
      if (!window.MPreisLive?.status) throw new Error("MPREIS-Datenmodul fehlt");
      mpreisPublicStatus = await window.MPreisLive.status(force);
      state.live.mpreis.lastError = null;
    } catch (error) {
      mpreisPublicStatus = null;
      state.live.mpreis.lastError = error.message;
    }

    saveState();
    renderMpreisLiveStatus();
  }

  async function openMpreisPromotions() {
    const stateEl = $("#mpreisPromotionsState");
    const listEl = $("#mpreisPromotionsList");

    if (!stateEl || !listEl) return;

    openSheet("mpreisPromotionsSheet");
    stateEl.textContent = "Aktionsartikel werden geladen …";
    listEl.innerHTML = "";

    if (!window.MPreisLive?.promotions) {
      stateEl.textContent = "Die MPREIS-Aktionsansicht konnte nicht geladen werden.";
      return;
    }

    try {
      const items = await window.MPreisLive.promotions();

      stateEl.textContent = items.length
        ? `${items.length} verifizierte Aktionsartikel`
        : "Aktuell wurden keine verifizierten MPREIS-Aktionen gefunden.";

      listEl.innerHTML = items.map(item => {
        const promotion = item.promotion || {};
        const salePrice = item.salePrice ?? item.currentPrice;
        const regularPrice = item.regularPrice;
        const appOnly = promotion.loyaltyRequired === true;
        const condition = promotion.label || "Aktion";

        return `
          <article class="product-card mpreis-promo-card">
            <div class="product-main mpreis-promo-main">
              <div class="product-name">
                ${escapeHtml(item.name)}
                ${item.bio ? `<span class="live-result-bio">BIO</span>` : ""}
              </div>
              <div class="product-meta">
                <span>${escapeHtml(formatLiveAmount(item))}</span>
                ${item.unitPrice ? `<span>·</span><span>${money(item.unitPrice)}/${escapeHtml(item.unitPriceUnit || "")}</span>` : ""}
              </div>
              <div class="offer-extra">
                <span class="offer-badge condition">${escapeHtml(condition)}</span>
                ${appOnly ? `<span class="offer-badge app-only">NUR MIT APP</span>` : ""}
              </div>
            </div>

            <div class="product-price-wrap">
              <div class="product-price sale">${money(salePrice)}</div>
              ${regularPrice != null && Number(regularPrice) !== Number(salePrice)
                ? `<div class="old-price">${money(regularPrice)}</div>`
                : ""}
            </div>
          </article>`;
      }).join("");
    } catch (error) {
      stateEl.textContent = `Aktionsartikel konnten nicht geladen werden: ${error.message}`;
      listEl.innerHTML = "";
    }
  }

  function openMpreisLink(productId) {
    const product = productById(productId);
    if (!product) return;

    currentMpreisLinkProductId = productId;
    $("#mpreisLinkTitle").textContent = product.name;
    $("#mpreisSearchInput").value = product.name;
    renderMpreisCurrentLink(product);
    $("#mpreisSearchResults").innerHTML = "";
    $("#mpreisSearchState").textContent = "";
    openSheet("mpreisLinkSheet");
    searchMpreisProducts(product.name);
  }

  function renderMpreisCurrentLink(product) {
    const target = $("#mpreisCurrentLink");
    if (!target) return;

    const link = product?.liveLinks?.mpreis;
    if (!link) {
      target.innerHTML = "";
      return;
    }

    target.innerHTML = `
      <div class="live-link-card">
        <strong>Verknüpft mit: ${escapeHtml(link.name || "MPREIS-Produkt")}</strong>
        Produkt-ID: ${escapeHtml(link.retailerProductId || link.remoteObjectId || "—")}
        <button class="live-unlink-btn" data-unlink-mpreis="${product.id}">Verknüpfung lösen</button>
      </div>`;
  }

  async function searchMpreisProducts(query) {
    const stateEl = $("#mpreisSearchState");
    const resultEl = $("#mpreisSearchResults");
    if (!stateEl || !resultEl) return;

    const q = String(query || "").trim();
    if (q.length < 2) {
      stateEl.textContent = "Mindestens 2 Zeichen eingeben.";
      resultEl.innerHTML = "";
      return;
    }

    if (!window.MPreisLive) {
      stateEl.textContent = "MPREIS-Datenmodul konnte nicht geladen werden.";
      return;
    }

    stateEl.textContent = "Suche bei MPREIS …";
    resultEl.innerHTML = "";

    try {
      const results = await window.MPreisLive.search(q, 20);
      stateEl.textContent = results.length
        ? `${results.length} Treffer – passenden Artikel antippen`
        : "Keine passenden MPREIS-Produkte gefunden.";

      resultEl.innerHTML = results.map((item, index) => `
        <article class="product-card live-result" data-mpreis-result-index="${index}">
          <div class="product-main">
            <div class="product-name">
              ${escapeHtml(item.name)}
              ${item.bio ? `<span class="live-result-bio">BIO</span>` : ""}
            </div>
            <div class="product-meta">
              <span>${escapeHtml(formatLiveAmount(item))}</span>
              <span>·</span>
              <span>ID ${escapeHtml(item.retailerProductId || item.remoteObjectId)}</span>
            </div>
          </div>
          <div class="product-price-wrap">
            <div class="product-price ${item.salePrice != null ? "sale" : ""}">${money(item.salePrice ?? item.currentPrice)}</div>
            ${item.salePrice != null && item.regularPrice != null ? `<div class="old-price">${money(item.regularPrice)}</div>` : ""}
            <div class="product-meta" style="justify-content:flex-end">
              ${item.unitPrice ? `${money(item.unitPrice)}/${item.unitPriceUnit}` : ""}
            </div>
            ${item.promotion?.label ? `<div class="offer-extra" style="justify-content:flex-end"><span class="offer-badge condition">${escapeHtml(item.promotion.label)}</span></div>` : ""}
          </div>
        </article>`).join("");

      resultEl._mpreisResults = results;
    } catch (error) {
      stateEl.textContent = `Live-Suche nicht möglich: ${error.message}`;
      resultEl.innerHTML = "";
    }
  }

  function formatLiveAmount(item) {
    const amount = item.amount;
    const unit = item.unit || "Stk";
    return `${String(amount).replace(".", ",")} ${unit}`;
  }

  function linkMpreisResult(productId, liveItem) {
    const product = productById(productId);
    if (!product || !liveItem) return;

    product.liveLinks = product.liveLinks || {};
    product.liveLinks.mpreis = {
      remoteObjectId: liveItem.remoteObjectId,
      retailerProductId: liveItem.retailerProductId,
      name: liveItem.name,
      linkedAt: new Date().toISOString()
    };

    applyMpreisLivePrice(product, liveItem);
    state.live.mpreis.lastSync = new Date().toISOString();
    state.live.mpreis.lastError = null;

    saveState();
    renderAll();
    showToast("MPREIS-Produkt verknüpft");
    closeSheets();
  }

  function unlinkMpreis(productId) {
    const product = productById(productId);
    if (!product?.liveLinks?.mpreis) return;

    delete product.liveLinks.mpreis;
    saveState();
    renderAll();
    showToast("MPREIS-Verknüpfung entfernt");
    closeSheets();
  }

  function applyMpreisLivePrice(product, liveItem) {
    const now = liveItem.retrievedAt || new Date().toISOString();
    const date = now.slice(0,10);
    let offer = (product.offers || []).find(o => o.store === "mpreis");

    if (!offer) {
      offer = { store: "mpreis", history: [] };
      product.offers = product.offers || [];
      product.offers.push(offer);
    }

    const historyMap = new Map();

    (Array.isArray(offer.history) ? offer.history : []).forEach(h => {
      if (h?.date && Number.isFinite(Number(h.price))) {
        historyMap.set(h.date, { date: h.date, price: Number(h.price) });
      }
    });

    (Array.isArray(liveItem.history) ? liveItem.history : []).forEach(h => {
      if (h?.date && Number.isFinite(Number(h.price))) {
        historyMap.set(h.date, { date: h.date, price: Number(h.price) });
      }
    });

    historyMap.set(date, { date, price: liveItem.currentPrice });

    const history = [...historyMap.values()]
      .sort((a,b) => b.date.localeCompare(a.date))
      .slice(0, 250);

    Object.assign(offer, {
      retailerProductId: liveItem.retailerProductId,
      remoteObjectId: liveItem.remoteObjectId,
      regularPrice: liveItem.regularPrice ?? liveItem.currentPrice,
      salePrice: liveItem.salePrice ?? null,
      unitPrice: liveItem.unitPrice,
      unitPriceUnit: liveItem.unitPriceUnit,
      validUntil: liveItem.validUntil ?? null,
      updatedAt: date,
      source: liveItem.promotionVerified ? "mpreis.at" : (liveItem.source || "heisse-preise.io (MPREIS)"),
      retrievedAt: now,
      promotion: liveItem.promotion ?? null,
      promotionVerified: Boolean(liveItem.promotionVerified),
      history
    });
  }

  async function syncLinkedMpreis({ silent = false } = {}) {
    const linkedProducts = state.products.filter(p => p.liveLinks?.mpreis);

    if (!linkedProducts.length) {
      if (!silent) showToast("Noch keine MPREIS-Produkte verknüpft");
      return;
    }

    if (!window.MPreisLive) {
      state.live.mpreis.lastError = "Live-Modul fehlt";
      saveState();
      renderMpreisLiveStatus();
      if (!silent) showToast("MPREIS-Datenmodul fehlt");
      return;
    }

    const button = $("#syncMpreisBtn");
    const status = $("#mpreisLiveStatus");

    if (button) {
      button.disabled = true;
      button.textContent = "Lädt …";
    }
    if (status) {
      status.textContent = "Lädt";
      status.className = "status-badge live-working";
    }

    let updated = 0;
    const errors = [];

    for (let i = 0; i < linkedProducts.length; i += 4) {
      const batch = linkedProducts.slice(i, i + 4);

      const results = await Promise.allSettled(batch.map(async product => {
        const link = product.liveLinks.mpreis;
        let item;

        try {
          item = await window.MPreisLive.getObject(link.remoteObjectId);
        } catch {
          const candidates = await window.MPreisLive.search(link.name || product.name, 10);
          item = candidates.find(c =>
            c.remoteObjectId === link.remoteObjectId ||
            c.retailerProductId === link.retailerProductId
          );
          if (!item) throw new Error(`${product.name}: Produkt nicht mehr gefunden`);
        }

        applyMpreisLivePrice(product, item);
        product.liveLinks.mpreis = {
          ...product.liveLinks.mpreis,
          remoteObjectId: item.remoteObjectId,
          retailerProductId: item.retailerProductId,
          name: item.name
        };
      }));

      results.forEach(result => {
        if (result.status === "fulfilled") updated += 1;
        else errors.push(String(result.reason?.message || result.reason || "Unbekannter Fehler"));
      });
    }

    state.live.mpreis.lastSync = new Date().toISOString();
    state.live.mpreis.lastError = errors.length ? errors.join(" | ") : null;
    saveState();
    renderAll();

    if (button) {
      button.disabled = false;
      button.textContent = "Neu laden";
    }

    if (!silent) {
      showToast(errors.length
        ? `${updated} aktualisiert · ${errors.length} Fehler`
        : `${updated} MPREIS-Preise aktualisiert`
      );
    }
  }

  async function reloadAndSyncMpreis() {
    const button = $("#syncMpreisBtn");
    if (button) {
      button.disabled = true;
      button.textContent = "Lädt …";
    }

    try {
      if (!window.MPreisLive?.reload) throw new Error("MPREIS-Datenmodul fehlt");
      mpreisPublicStatus = await window.MPreisLive.reload();
      state.live.mpreis.lastError = null;
      saveState();
      renderMpreisLiveStatus();
      await syncLinkedMpreis({ silent: false });
    } catch (error) {
      state.live.mpreis.lastError = error.message;
      saveState();
      renderMpreisLiveStatus();
      showToast("MPREIS-Daten konnten nicht neu geladen werden");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Neu laden";
      }
    }
  }

  function shouldAutoSyncMpreis() {
    const linked = state.products.some(p => p.liveLinks?.mpreis);
    if (!linked || !navigator.onLine) return false;

    const last = state.live?.mpreis?.lastSync;
    if (!last) return true;

    return (Date.now() - new Date(last).getTime()) > 6 * 60 * 60 * 1000;
  }

  function renderSparLiveStatus() {
    const live = state.live?.spar || {};
    const linked = state.products.filter(p => p.liveLinks?.spar).length;

    const linkedEl = $("#sparLinkedCount");
    const lastEl = $("#sparLastSync");
    const statusEl = $("#sparLiveStatus");
    const promoBtn = $("#showSparPromotionsBtn");
    if (!linkedEl || !lastEl || !statusEl) return;

    linkedEl.textContent = `${linked} Artikel verknüpft`;
    statusEl.className = "status-badge";

    if (live.lastError) {
      statusEl.textContent = "Fehler";
      statusEl.classList.add("live-error");
    } else if (sparPublicStatus?.updatedAt) {
      statusEl.textContent = "Aktuell";
      statusEl.classList.add("live-ok");
    } else {
      statusEl.textContent = "Bereit";
    }

    if (sparPublicStatus?.updatedAt) {
      const date = new Date(sparPublicStatus.updatedAt);
      lastEl.textContent = `GitHub-Datenstand: ${date.toLocaleString("de-AT", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      })} · ${sparPublicStatus.productCount || 0} Produkte`;
    } else {
      lastEl.textContent = "Noch keine importierten SPAR-Daten vorhanden";
    }

    if (promoBtn) {
      const count = sparPublicStatus?.promotionCount || 0;
      promoBtn.textContent = count
        ? `🔥 ${count} SPAR-Aktionsartikel anzeigen`
        : "🔥 SPAR-Aktionsartikel anzeigen";
    }
  }

  async function refreshSparPublicStatus(force = false) {
    try {
      if (!window.SparLive?.status) throw new Error("SPAR-Datenmodul fehlt");
      sparPublicStatus = await window.SparLive.status(force);
      state.live.spar.lastError = null;
    } catch (error) {
      sparPublicStatus = null;
      state.live.spar.lastError = error.message;
    }

    saveState();
    renderSparLiveStatus();
  }

  async function openSparPromotions() {
    const stateEl = $("#sparPromotionsState");
    const listEl = $("#sparPromotionsList");

    if (!stateEl || !listEl) return;

    openSheet("sparPromotionsSheet");
    stateEl.textContent = "Aktionsartikel werden geladen …";
    listEl.innerHTML = "";

    if (!window.SparLive?.promotions) {
      stateEl.textContent = "Die SPAR-Aktionsansicht konnte nicht geladen werden.";
      return;
    }

    try {
      const items = await window.SparLive.promotions();

      stateEl.textContent = items.length
        ? `${items.length} verifizierte SPAR-Aktionsartikel`
        : "Aktuell wurden keine verifizierten SPAR-Aktionen gefunden.";

      listEl.innerHTML = items.map(item => {
        const promotion = item.promotion || {};
        const salePrice = item.salePrice ?? item.currentPrice;
        const regularPrice = item.regularPrice;
        const condition = promotion.label || promotion.officialLabel || "Im Angebot";
        const appOnly = promotion.loyaltyRequired === true;

        return `
          <article class="product-card spar-promo-card">
            <div class="product-main spar-promo-main">
              <div class="product-name">
                ${escapeHtml(item.name)}
                ${item.bio ? `<span class="live-result-bio">BIO</span>` : ""}
              </div>
              <div class="product-meta">
                <span>${escapeHtml(formatLiveAmount(item))}</span>
                ${item.unitPrice ? `<span>·</span><span>${money(item.unitPrice)}/${escapeHtml(item.unitPriceUnit || "")}</span>` : ""}
              </div>
              <div class="offer-extra">
                <span class="offer-badge condition">${escapeHtml(condition)}</span>
                ${appOnly ? `<span class="offer-badge app-only">NUR MIT APP</span>` : ""}
              </div>
            </div>

            <div class="product-price-wrap">
              <div class="product-price sale">${money(salePrice)}</div>
              ${regularPrice != null && Number(regularPrice) !== Number(salePrice)
                ? `<div class="old-price">${money(regularPrice)}</div>`
                : ""}
            </div>
          </article>`;
      }).join("");
    } catch (error) {
      stateEl.textContent = `SPAR-Aktionsartikel konnten nicht geladen werden: ${error.message}`;
      listEl.innerHTML = "";
    }
  }

  function openSparLink(productId) {
    const product = productById(productId);
    if (!product) return;

    currentSparLinkProductId = productId;
    $("#sparLinkTitle").textContent = product.name;
    $("#sparSearchInput").value = product.name;
    renderSparCurrentLink(product);
    $("#sparSearchResults").innerHTML = "";
    $("#sparSearchState").textContent = "";
    openSheet("sparLinkSheet");
    searchSparProducts(product.name);
  }

  function renderSparCurrentLink(product) {
    const target = $("#sparCurrentLink");
    if (!target) return;

    const link = product?.liveLinks?.spar;
    if (!link) {
      target.innerHTML = "";
      return;
    }

    target.innerHTML = `
      <div class="live-link-card spar-link-card">
        <strong>Verknüpft mit: ${escapeHtml(link.name || "SPAR-Produkt")}</strong>
        Produkt-ID: ${escapeHtml(link.retailerProductId || link.remoteObjectId || "—")}
        <button class="live-unlink-btn" data-unlink-spar="${product.id}">Verknüpfung lösen</button>
      </div>`;
  }

  async function searchSparProducts(query) {
    const stateEl = $("#sparSearchState");
    const resultEl = $("#sparSearchResults");
    if (!stateEl || !resultEl) return;

    const q = String(query || "").trim();
    if (q.length < 2) {
      stateEl.textContent = "Mindestens 2 Zeichen eingeben.";
      resultEl.innerHTML = "";
      return;
    }

    if (!window.SparLive) {
      stateEl.textContent = "SPAR-Datenmodul konnte nicht geladen werden.";
      return;
    }

    stateEl.textContent = "Suche bei SPAR …";
    resultEl.innerHTML = "";

    try {
      const results = await window.SparLive.search(q, 20);
      stateEl.textContent = results.length
        ? `${results.length} Treffer – passenden Artikel antippen`
        : "Keine passenden SPAR-Produkte gefunden.";

      resultEl.innerHTML = results.map((item, index) => `
        <article class="product-card live-result spar-live-result" data-spar-result-index="${index}">
          <div class="product-main">
            <div class="product-name">
              ${escapeHtml(item.name)}
              ${item.bio ? `<span class="live-result-bio">BIO</span>` : ""}
            </div>
            <div class="product-meta">
              <span>${escapeHtml(formatLiveAmount(item))}</span>
              <span>·</span>
              <span>ID ${escapeHtml(item.retailerProductId || item.remoteObjectId)}</span>
            </div>
          </div>
          <div class="product-price-wrap">
            <div class="product-price ${item.salePrice != null ? "sale" : ""}">${money(item.salePrice ?? item.currentPrice)}</div>
            ${item.salePrice != null && item.regularPrice != null ? `<div class="old-price">${money(item.regularPrice)}</div>` : ""}
            <div class="product-meta" style="justify-content:flex-end">
              ${item.unitPrice ? `${money(item.unitPrice)}/${item.unitPriceUnit}` : ""}
            </div>
            ${item.promotion?.label ? `<div class="offer-extra" style="justify-content:flex-end"><span class="offer-badge condition">${escapeHtml(item.promotion.label)}</span></div>` : ""}
          </div>
        </article>`).join("");

      resultEl._sparResults = results;
    } catch (error) {
      stateEl.textContent = `SPAR-Suche nicht möglich: ${error.message}`;
      resultEl.innerHTML = "";
    }
  }

  function linkSparResult(productId, liveItem) {
    const product = productById(productId);
    if (!product || !liveItem) return;

    product.liveLinks = product.liveLinks || {};
    product.liveLinks.spar = {
      remoteObjectId: liveItem.remoteObjectId,
      retailerProductId: liveItem.retailerProductId,
      name: liveItem.name,
      linkedAt: new Date().toISOString()
    };

    applySparLivePrice(product, liveItem);
    state.live.spar.lastSync = new Date().toISOString();
    state.live.spar.lastError = null;

    saveState();
    renderAll();
    showToast("SPAR-Produkt verknüpft");
    closeSheets();
  }

  function unlinkSpar(productId) {
    const product = productById(productId);
    if (!product?.liveLinks?.spar) return;

    delete product.liveLinks.spar;
    saveState();
    renderAll();
    showToast("SPAR-Verknüpfung entfernt");
    closeSheets();
  }

  function applySparLivePrice(product, liveItem) {
    const now = liveItem.retrievedAt || new Date().toISOString();
    const date = now.slice(0, 10);
    let offer = (product.offers || []).find(o => o.store === "spar");

    if (!offer) {
      offer = { store: "spar", history: [] };
      product.offers = product.offers || [];
      product.offers.push(offer);
    }

    const historyMap = new Map();

    (Array.isArray(offer.history) ? offer.history : []).forEach(h => {
      if (h?.date && Number.isFinite(Number(h.price))) {
        historyMap.set(h.date, { date: h.date, price: Number(h.price) });
      }
    });

    (Array.isArray(liveItem.history) ? liveItem.history : []).forEach(h => {
      if (h?.date && Number.isFinite(Number(h.price))) {
        historyMap.set(h.date, { date: h.date, price: Number(h.price) });
      }
    });

    historyMap.set(date, { date, price: liveItem.currentPrice });

    const history = [...historyMap.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 250);

    Object.assign(offer, {
      retailerProductId: liveItem.retailerProductId,
      remoteObjectId: liveItem.remoteObjectId,
      regularPrice: liveItem.regularPrice ?? liveItem.currentPrice,
      salePrice: liveItem.salePrice ?? null,
      unitPrice: liveItem.unitPrice,
      unitPriceUnit: liveItem.unitPriceUnit,
      validUntil: liveItem.validUntil ?? null,
      updatedAt: date,
      source: liveItem.promotionVerified ? "spar.at" : (liveItem.source || "heisse-preise.io (SPAR)"),
      retrievedAt: now,
      promotion: liveItem.promotion ?? null,
      promotionVerified: Boolean(liveItem.promotionVerified),
      history
    });
  }

  async function syncLinkedSpar({ silent = false } = {}) {
    const linkedProducts = state.products.filter(p => p.liveLinks?.spar);

    if (!linkedProducts.length) {
      if (!silent) showToast("Noch keine SPAR-Produkte verknüpft");
      return;
    }

    if (!window.SparLive) {
      state.live.spar.lastError = "Live-Modul fehlt";
      saveState();
      renderSparLiveStatus();
      if (!silent) showToast("SPAR-Datenmodul fehlt");
      return;
    }

    const button = $("#syncSparBtn");
    const status = $("#sparLiveStatus");

    if (button) {
      button.disabled = true;
      button.textContent = "Lädt …";
    }
    if (status) {
      status.textContent = "Lädt";
      status.className = "status-badge live-working";
    }

    let updated = 0;
    const errors = [];

    for (let i = 0; i < linkedProducts.length; i += 4) {
      const batch = linkedProducts.slice(i, i + 4);

      const results = await Promise.allSettled(batch.map(async product => {
        const link = product.liveLinks.spar;
        let item;

        try {
          item = await window.SparLive.getObject(link.remoteObjectId);
        } catch {
          const candidates = await window.SparLive.search(link.name || product.name, 10);
          item = candidates.find(c =>
            c.remoteObjectId === link.remoteObjectId ||
            c.retailerProductId === link.retailerProductId
          );
          if (!item) throw new Error(`${product.name}: SPAR-Produkt nicht mehr gefunden`);
        }

        applySparLivePrice(product, item);
        product.liveLinks.spar = {
          ...product.liveLinks.spar,
          remoteObjectId: item.remoteObjectId,
          retailerProductId: item.retailerProductId,
          name: item.name
        };
      }));

      results.forEach(result => {
        if (result.status === "fulfilled") updated += 1;
        else errors.push(String(result.reason?.message || result.reason || "Unbekannter Fehler"));
      });
    }

    state.live.spar.lastSync = new Date().toISOString();
    state.live.spar.lastError = errors.length ? errors.join(" | ") : null;
    saveState();
    renderAll();

    if (button) {
      button.disabled = false;
      button.textContent = "Neu laden";
    }

    if (!silent) {
      showToast(errors.length
        ? `${updated} aktualisiert · ${errors.length} Fehler`
        : `${updated} SPAR-Preise aktualisiert`
      );
    }
  }

  async function reloadAndSyncSpar() {
    const button = $("#syncSparBtn");
    if (button) {
      button.disabled = true;
      button.textContent = "Lädt …";
    }

    try {
      if (!window.SparLive?.reload) throw new Error("SPAR-Datenmodul fehlt");
      sparPublicStatus = await window.SparLive.reload();
      state.live.spar.lastError = null;
      saveState();
      renderSparLiveStatus();
      await syncLinkedSpar({ silent: false });
    } catch (error) {
      state.live.spar.lastError = error.message;
      saveState();
      renderSparLiveStatus();
      showToast("SPAR-Daten konnten nicht neu geladen werden");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Neu laden";
      }
    }
  }

  function shouldAutoSyncSpar() {
    const linked = state.products.some(p => p.liveLinks?.spar);
    if (!linked || !navigator.onLine) return false;

    const last = state.live?.spar?.lastSync;
    if (!last) return true;

    return (Date.now() - new Date(last).getTime()) > 6 * 60 * 60 * 1000;
  }

  function renderTgLiveStatus() {
    const live = state.live?.tg || {};
    const linked = state.products.filter(p => p.liveLinks?.tg).length;

    const linkedEl = $("#tgLinkedCount");
    const lastEl = $("#tgLastSync");
    const statusEl = $("#tgLiveStatus");
    const promoBtn = $("#showTgPromotionsBtn");
    const flyerBtn = $("#openTgFlyerBtn");

    if (!linkedEl || !lastEl || !statusEl) return;

    linkedEl.textContent = `${linked} Artikel verknüpft`;
    statusEl.className = "status-badge";

    if (live.lastError) {
      statusEl.textContent = "Fehler";
      statusEl.classList.add("live-error");
    } else if (tgPublicStatus?.updatedAt) {
      statusEl.textContent = "Aktuell";
      statusEl.classList.add("live-ok");
    } else {
      statusEl.textContent = "Bereit";
    }

    if (tgPublicStatus?.updatedAt) {
      const updated = new Date(tgPublicStatus.updatedAt);
      const period = tgPublicStatus.validUntil
        ? ` · Aktionen bis ${formatDate(tgPublicStatus.validUntil)}`
        : "";

      const flyerCount = tgPublicStatus.flyerProductCount || 0;
      const linkable = tgPublicStatus.linkableCount || 0;
      const textLinked = tgPublicStatus.flyerTextLinkableCount || 0;
      const spatialLinked = tgPublicStatus.flyerSpatialLinkableCount || 0;
      const spatialInfo = spatialLinked
        ? ` · Flyer-Zuordnung ${textLinked}+${spatialLinked}`
        : "";

      lastEl.textContent = `Datenstand: ${updated.toLocaleString("de-AT", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      })} · ${flyerCount || tgPublicStatus.productCount || 0} Flugblatt-Angebote · ${linkable} sicher verknüpfbar${spatialInfo}${period}`;
    } else {
      lastEl.textContent = "Noch keine importierten T&G-Aktionsdaten vorhanden";
    }

    if (promoBtn) {
      const count = tgPublicStatus?.promotionCount || 0;
      promoBtn.textContent = count
        ? `🔥 ${count} T&G-Aktionen anzeigen`
        : "🔥 T&G-Aktionen anzeigen";
    }

    if (flyerBtn) {
      const url = tgPublicStatus?.flyer?.url;
      flyerBtn.disabled = !url;
      flyerBtn.dataset.flyerUrl = url || "";
    }
  }

  async function refreshTgPublicStatus(force = false) {
    try {
      if (!window.TgLive?.status) throw new Error("T&G-Datenmodul fehlt");
      tgPublicStatus = await window.TgLive.status(force);
      state.live.tg.lastError = null;
    } catch (error) {
      tgPublicStatus = null;
      state.live.tg.lastError = error.message;
    }

    saveState();
    renderTgLiveStatus();
  }

  function tgAmountText(item) {
    return item.amountText || formatLiveAmount(item);
  }

  async function openTgPromotions() {
    const stateEl = $("#tgPromotionsState");
    const listEl = $("#tgPromotionsList");

    if (!stateEl || !listEl) return;

    openSheet("tgPromotionsSheet");
    stateEl.textContent = "T&G-Aktionen werden geladen …";
    listEl.innerHTML = "";

    if (!window.TgLive?.promotions) {
      stateEl.textContent = "Die T&G-Aktionsansicht konnte nicht geladen werden.";
      return;
    }

    try {
      const items = await window.TgLive.promotions();

      const until = tgPublicStatus?.validUntil
        ? ` · gültig bis ${formatDate(tgPublicStatus.validUntil)}`
        : "";

      stateEl.textContent = items.length
        ? `${items.length} offizielle T&G-Spezialaktionen${until}`
        : "Aktuell wurden keine T&G-Spezialaktionen gefunden.";

      listEl.innerHTML = items.map(item => {
        const promotion = item.promotion || {};
        const condition = promotion.label || "Spezialaktion";
        const displayPrice = item.salePrice ?? item.displayPrice ?? null;
        const hasPrice = displayPrice != null;
        const displayOnly = item.optimizerEligible === false && item.displayPrice != null;

        return `
          <article class="product-card tg-promo-card">
            <div class="product-main tg-promo-main">
              <div class="product-name">${escapeHtml(item.name)}</div>
              ${item.description ? `<div class="product-meta"><span>${escapeHtml(item.description)}</span></div>` : ""}
              <div class="offer-extra">
                <span class="offer-badge condition">${escapeHtml(condition)}</span>
                ${displayOnly
                  ? `<span class="offer-badge tg-display-only">nur Anzeige</span>`
                  : ""}
              </div>
            </div>

            <div class="product-price-wrap">
              ${hasPrice
                ? `<div class="product-price sale">${money(displayPrice)}</div>
                   ${item.regularPrice != null && Number(item.regularPrice) !== Number(displayPrice)
                     ? `<div class="old-price">${money(item.regularPrice)}</div>`
                     : ""}
                   <div class="product-meta" style="justify-content:flex-end">
                     ${item.unitPriceText
                       ? escapeHtml(item.unitPriceText)
                       : (item.unitPrice ? `${money(item.unitPrice)}/${escapeHtml(item.unitPriceUnit || "")}` : "")}
                   </div>`
                : `<div class="tg-no-price">ohne Fixpreis</div>`}
            </div>
          </article>`;
      }).join("");
    } catch (error) {
      stateEl.textContent = `T&G-Aktionen konnten nicht geladen werden: ${error.message}`;
      listEl.innerHTML = "";
    }
  }

  function openTgLink(productId) {
    const product = productById(productId);
    if (!product) return;

    currentTgLinkProductId = productId;
    $("#tgLinkTitle").textContent = product.name;
    $("#tgSearchInput").value = product.name;
    renderTgCurrentLink(product);
    $("#tgSearchResults").innerHTML = "";
    $("#tgSearchState").textContent = "";
    openSheet("tgLinkSheet");
    searchTgProducts(product.name);
  }

  function renderTgCurrentLink(product) {
    const target = $("#tgCurrentLink");
    if (!target) return;

    const link = product?.liveLinks?.tg;
    if (!link) {
      target.innerHTML = "";
      return;
    }

    target.innerHTML = `
      <div class="live-link-card tg-link-card">
        <strong>Verknüpft mit: ${escapeHtml(link.name || "T&G-Aktion")}</strong>
        Diese Verknüpfung gilt für den aktuell erkannten T&G-Aktionsartikel.
        <button class="live-unlink-btn" data-unlink-tg="${product.id}">Verknüpfung lösen</button>
      </div>`;
  }

  async function searchTgProducts(query) {
    const stateEl = $("#tgSearchState");
    const resultEl = $("#tgSearchResults");
    if (!stateEl || !resultEl) return;

    const q = String(query || "").trim();
    if (q.length < 2) {
      stateEl.textContent = "Mindestens 2 Zeichen eingeben.";
      resultEl.innerHTML = "";
      return;
    }

    if (!window.TgLive) {
      stateEl.textContent = "T&G-Datenmodul konnte nicht geladen werden.";
      return;
    }

    stateEl.textContent = "Suche in aktuellen T&G-Spezialaktionen …";
    resultEl.innerHTML = "";

    try {
      const results = await window.TgLive.search(q, 20);

      stateEl.textContent = results.length
        ? `${results.length} aktuelle Treffer – passenden Aktionsartikel antippen`
        : "Keine passende aktuell bepreiste T&G-Aktion gefunden.";

      resultEl.innerHTML = results.map((item, index) => `
        <article class="product-card live-result tg-live-result" data-tg-result-index="${index}">
          <div class="product-main">
            <div class="product-name">${escapeHtml(item.name)}</div>
            <div class="product-meta">
              <span>${escapeHtml(tgAmountText(item))}</span>
            </div>
          </div>
          <div class="product-price-wrap">
            <div class="product-price sale">${money(item.salePrice)}</div>
            ${item.regularPrice != null ? `<div class="old-price">${money(item.regularPrice)}</div>` : ""}
            <div class="product-meta" style="justify-content:flex-end">
              ${item.unitPriceText
                ? escapeHtml(item.unitPriceText)
                : (item.unitPrice ? `${money(item.unitPrice)}/${escapeHtml(item.unitPriceUnit || "")}` : "")}
            </div>
          </div>
        </article>`).join("");

      resultEl._tgResults = results;
    } catch (error) {
      stateEl.textContent = `T&G-Suche nicht möglich: ${error.message}`;
      resultEl.innerHTML = "";
    }
  }

  function linkTgResult(productId, liveItem) {
    const product = productById(productId);
    if (!product || !liveItem) return;

    product.liveLinks = product.liveLinks || {};
    product.liveLinks.tg = {
      remoteObjectId: liveItem.remoteObjectId,
      retailerProductId: liveItem.retailerProductId,
      name: liveItem.name,
      linkedAt: new Date().toISOString()
    };

    applyTgLivePrice(product, liveItem);
    state.live.tg.lastSync = new Date().toISOString();
    state.live.tg.lastError = null;

    saveState();
    renderAll();
    showToast("T&G-Aktionsartikel verknüpft");
    closeSheets();
  }

  function unlinkTg(productId) {
    const product = productById(productId);
    if (!product?.liveLinks?.tg) return;

    delete product.liveLinks.tg;
    saveState();
    renderAll();
    showToast("T&G-Verknüpfung entfernt");
    closeSheets();
  }

  function applyTgLivePrice(product, liveItem) {
    const now = liveItem.retrievedAt || new Date().toISOString();
    const date = now.slice(0, 10);
    let offer = (product.offers || []).find(o => o.store === "tg");

    if (!offer) {
      offer = { store: "tg", history: [] };
      product.offers = product.offers || [];
      product.offers.push(offer);
    }

    const historyMap = new Map();

    (Array.isArray(offer.history) ? offer.history : []).forEach(h => {
      if (h?.date && Number.isFinite(Number(h.price))) {
        historyMap.set(h.date, { date: h.date, price: Number(h.price) });
      }
    });

    (Array.isArray(liveItem.history) ? liveItem.history : []).forEach(h => {
      if (h?.date && Number.isFinite(Number(h.price))) {
        historyMap.set(h.date, { date: h.date, price: Number(h.price) });
      }
    });

    if (liveItem.salePrice != null) {
      historyMap.set(date, { date, price: Number(liveItem.salePrice) });
    }

    const history = [...historyMap.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 250);

    Object.assign(offer, {
      retailerProductId: liveItem.retailerProductId,
      remoteObjectId: liveItem.remoteObjectId,
      regularPrice: liveItem.regularPrice ?? null,
      salePrice: liveItem.salePrice ?? null,
      unitPrice: liveItem.unitPrice,
      unitPriceUnit: liveItem.unitPriceUnit,
      validUntil: liveItem.validUntil ?? null,
      updatedAt: date,
      source: "tundg.at Spezialaktionen",
      retrievedAt: now,
      promotion: liveItem.promotion ?? null,
      promotionVerified: Boolean(liveItem.promotionVerified),
      history
    });
  }

  async function syncLinkedTg({ silent = false } = {}) {
    const linkedProducts = state.products.filter(p => p.liveLinks?.tg);

    if (!linkedProducts.length) {
      if (!silent) showToast("Noch keine T&G-Aktionsartikel verknüpft");
      return;
    }

    if (!window.TgLive) {
      state.live.tg.lastError = "Live-Modul fehlt";
      saveState();
      renderTgLiveStatus();
      if (!silent) showToast("T&G-Datenmodul fehlt");
      return;
    }

    const button = $("#syncTgBtn");
    const status = $("#tgLiveStatus");

    if (button) {
      button.disabled = true;
      button.textContent = "Lädt …";
    }
    if (status) {
      status.textContent = "Lädt";
      status.className = "status-badge live-working";
    }

    let updated = 0;
    let expired = 0;

    for (const product of linkedProducts) {
      const link = product.liveLinks.tg;

      try {
        const item = await window.TgLive.getObject(link.remoteObjectId);
        applyTgLivePrice(product, item);
        product.liveLinks.tg = {
          ...product.liveLinks.tg,
          remoteObjectId: item.remoteObjectId,
          retailerProductId: item.retailerProductId,
          name: item.name
        };
        updated += 1;
      } catch {
        expired += 1;
      }
    }

    state.live.tg.lastSync = new Date().toISOString();
    state.live.tg.lastError = null;

    saveState();
    renderAll();

    if (button) {
      button.disabled = false;
      button.textContent = "Neu laden";
    }

    if (!silent) {
      showToast(
        expired
          ? `${updated} T&G-Aktionen aktualisiert · ${expired} nicht mehr aktiv`
          : `${updated} T&G-Aktionen aktualisiert`
      );
    }
  }

  async function reloadAndSyncTg() {
    const button = $("#syncTgBtn");
    if (button) {
      button.disabled = true;
      button.textContent = "Lädt …";
    }

    try {
      if (!window.TgLive?.reload) throw new Error("T&G-Datenmodul fehlt");
      tgPublicStatus = await window.TgLive.reload();
      state.live.tg.lastError = null;
      saveState();
      renderTgLiveStatus();
      await syncLinkedTg({ silent: false });
    } catch (error) {
      state.live.tg.lastError = error.message;
      saveState();
      renderTgLiveStatus();
      showToast("T&G-Aktionsdaten konnten nicht neu geladen werden");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Neu laden";
      }
    }
  }

  function shouldAutoSyncTg() {
    const linked = state.products.some(p => p.liveLinks?.tg);
    if (!linked || !navigator.onLine) return false;

    const last = state.live?.tg?.lastSync;
    if (!last) return true;

    return (Date.now() - new Date(last).getTime()) > 6 * 60 * 60 * 1000;
  }

  function openTgFlyer() {
    const url = tgPublicStatus?.flyer?.url || $("#openTgFlyerBtn")?.dataset.flyerUrl;
    if (!url) {
      showToast("Osttirol-Flugblatt-Link ist derzeit nicht verfügbar");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function renderMore() {
    $("#databaseList").innerHTML = state.products.map(p => `
      <div class="database-item">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <div class="muted">${escapeHtml(p.category)} · ${fmtAmount(p)} · ${(p.offers || []).length} Preise</div>
        </div>
        <div class="database-actions">
          <button class="database-live-btn ${p.liveLinks?.mpreis ? "is-linked" : ""}" data-link-mpreis="${p.id}">
            ${p.liveLinks?.mpreis ? "MPREIS ✓" : "MPREIS"}
          </button>
          <button class="database-live-btn spar-live-btn ${p.liveLinks?.spar ? "is-linked" : ""}" data-link-spar="${p.id}">
            ${p.liveLinks?.spar ? "SPAR ✓" : "SPAR"}
          </button>
          <button class="database-live-btn tg-live-btn ${p.liveLinks?.tg ? "is-linked" : ""}" data-link-tg="${p.id}">
            ${p.liveLinks?.tg ? "T&G ✓" : "T&G"}
          </button>
          <button class="database-delete" data-delete-product="${p.id}">Löschen</button>
        </div>
      </div>`).join("");

    renderMpreisLiveStatus();
    renderSparLiveStatus();
    renderTgLiveStatus();

    $$("#themeSegmented button").forEach(b => b.classList.toggle("is-active", b.dataset.themeValue === state.settings.theme));
    $$("#shoppingStrategySegmented button").forEach(b => b.classList.toggle("is-active", b.dataset.strategyValue === state.settings.shoppingStrategy));

    const hints = {
      cheapest: "Jeder Artikel wird beim günstigsten bekannten Markt eingeplant – unabhängig davon, wie viele Märkte nötig sind.",
      max2: "Höchstens zwei Märkte: Ein-Markt-Lösungen werden ausdrücklich mitgeprüft. Bei vollständiger Abdeckung kann dieser Modus daher nie teurer als „1 Markt“ sein.",
      one: "Die App sucht den günstigsten einzelnen Markt, der die komplette Liste abdeckt. Ist das nicht möglich, wird nur ein klar gekennzeichneter Teilbetrag gezeigt."
    };
    $("#strategyHint").textContent = hints[state.settings.shoppingStrategy] || hints.cheapest;
  }

  function renderProductDetail(productId) {
    const p = productById(productId);
    if (!p) return;

    $("#detailTitle").textContent = p.name;
    const offers = validOffers(p).map(normalizedOffer).sort((a,b) => offerPrice(a) - offerPrice(b));
    const history = productHistory(p);
    const stats = productPriceStats(p);

    $("#productDetailContent").innerHTML = `
      <div class="product-meta" style="margin-bottom:8px">${escapeHtml(p.brand || "")} · ${fmtAmount(p)} · ${escapeHtml(p.category)}</div>

      ${stats ? `<div class="price-stat-grid">
        <div class="price-stat"><span>Tiefst</span><strong>${money(stats.min)}</strong></div>
        <div class="price-stat"><span>Ø Verlauf</span><strong>${money(stats.avg)}</strong></div>
        <div class="price-stat"><span>Höchst</span><strong>${money(stats.max)}</strong></div>
      </div>` : ""}

      <div>
        ${offers.length ? offers.map((o, idx) => {
          const r = retailer(o.store);
          const fresh = freshnessInfo(o);
          const condition = offerConditionLabel(o);

          return `<div class="detail-offer">
            <div>
              <div class="market-label"><span class="market-dot" style="background:${r.color}"></span>${r.name}${idx === 0 ? " · günstigster Preis" : ""}</div>
              <div class="product-meta">${o.unitPrice ? `${money(o.unitPrice)}/${o.unitPriceUnit}` : ""}${o.validUntil ? ` · gültig bis ${formatDate(o.validUntil)}` : ""}</div>
              <div class="offer-extra">
                ${o.salePrice != null ? `<span class="offer-badge">Aktion</span>` : ""}
                ${condition ? `<span class="offer-badge condition">${escapeHtml(condition)}</span>` : ""}
                <span class="freshness-badge ${fresh.current ? "current" : ""}">${escapeHtml(fresh.label)}</span>
              </div>
              <div class="offer-source">Quelle: ${escapeHtml(o.source || "unbekannt")} · Abruf ${escapeHtml((o.retrievedAt || o.updatedAt || "").replace("T", " ").slice(0,16))}</div>
            </div>
            <div>
              <div class="price ${o.salePrice != null ? "sale" : ""}">${money(offerPrice(o))}</div>
              ${o.salePrice != null ? `<div class="old-price">${money(o.regularPrice)}</div>` : ""}
            </div>
          </div>`;
        }).join("") : `<div class="empty-state"><p>Für diesen Artikel sind noch keine Preise hinterlegt.</p></div>`}
      </div>

      ${history.length ? `
        <details class="history-panel">
          <summary>Preisverlauf · ${history.length} Einträge</summary>
          <div class="history-list">
            ${history.slice(0,18).map(h => `
              <div class="history-row">
                <div class="history-market"><span class="market-dot" style="background:${retailer(h.store).color}"></span><strong>${retailer(h.store).name}</strong></div>
                <span class="history-date">${formatDate(h.date)}</span>
                <strong>${money(h.price)}</strong>
              </div>`).join("")}
          </div>
        </details>` : ""}

      <div class="detail-actions">
        <button class="primary-btn full" data-add-product="${p.id}">Zur Einkaufsliste hinzufügen</button>
      </div>`;
  }

  function populateForms() {
    const options = state.products
      .slice().sort((a,b) => a.name.localeCompare(b.name, "de"))
      .map(p => `<option value="${p.id}">${escapeHtml(p.name)} · ${fmtAmount(p)}</option>`).join("");
    $("#existingProductSelect").innerHTML = options;

    const marketOptions = `<option value="auto">Automatisch günstigster</option>` +
      Object.values(retailers).map(r => `<option value="${r.id}">${r.name}</option>`).join("");
    $("#existingStoreSelect").innerHTML = marketOptions;
    $("#customStoreSelect").innerHTML = `<option value="auto">Kein fester Markt</option>` + Object.values(retailers).map(r => `<option value="${r.id}">${r.name}</option>`).join("");
    $("#newProductStore").innerHTML = `<option value="">Kein Startpreis</option>` + Object.values(retailers).map(r => `<option value="${r.id}">${r.name}</option>`).join("");
    $("#newProductCategory").innerHTML = categories.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
  }

  function openSheet(id) {
    closeSheets();
    const sheet = document.getElementById(id);
    if (!sheet) return;
    sheet.classList.add("is-open");
    sheet.setAttribute("aria-hidden", "false");
    $("#sheetBackdrop").classList.add("is-open");
    document.body.style.overflow = "hidden";
  }

  function closeSheets() {
    $$(".bottom-sheet").forEach(s => {
      s.classList.remove("is-open");
      s.setAttribute("aria-hidden", "true");
    });
    $("#sheetBackdrop").classList.remove("is-open");
    document.body.style.overflow = "";
  }

  function openAddShopping(productId=null, preferredStore="auto") {
    populateForms();
    if (productId) $("#existingProductSelect").value = productId;
    $("#existingStoreSelect").value = preferredStore || "auto";
    setAddMode("existing");
    openSheet("addShoppingSheet");
  }

  function setAddMode(mode) {
    $$("[data-add-mode]").forEach(b => b.classList.toggle("is-active", b.dataset.addMode === mode));
    $("#addExistingForm").classList.toggle("hidden", mode !== "existing");
    $("#addCustomForm").classList.toggle("hidden", mode !== "custom");
  }

  function addExistingProduct(productId, quantity=1, preferredStore="auto") {
    const existing = state.shopping.find(i => i.productId === productId && i.preferredStore === preferredStore && !i.checked);
    if (existing) existing.quantity += Number(quantity);
    else state.shopping.push({
      id: cryptoId(), productId, quantity: Number(quantity), checked: false,
      preferredStore, addedAt: Date.now()
    });
    saveState(); renderAll(); showToast("Zur Einkaufsliste hinzugefügt");
  }

  function addCustomItem(name, quantity, price, store) {
    state.customShopping.push({
      id: cryptoId(), name, quantity: Number(quantity), price: price ? Number(price) : 0,
      store: store || "auto", checked: false, addedAt: Date.now()
    });
    saveState(); renderAll(); showToast("Freier Artikel hinzugefügt");
  }

  function changeQty(key, delta) {
    const [kind, id] = key.split(":");
    const arr = kind === "c" ? state.customShopping : state.shopping;
    const item = arr.find(i => i.id === id);
    if (!item) return;
    item.quantity = Math.max(1, Number(item.quantity || 1) + Number(delta));
    saveState(); renderShopping();
  }

  function toggleChecked(key) {
    const [kind, id] = key.split(":");
    const arr = kind === "c" ? state.customShopping : state.shopping;
    const item = arr.find(i => i.id === id);
    if (!item) return;
    item.checked = !item.checked;
    saveState(); renderShopping();
  }

  function deleteShopping(key) {
    const [kind, id] = key.split(":");
    if (kind === "c") state.customShopping = state.customShopping.filter(i => i.id !== id);
    else state.shopping = state.shopping.filter(i => i.id !== id);
    saveState(); renderAll();
  }

  function addDatabaseProduct(formData) {
    const id = "p_" + cryptoId();
    const product = {
      id,
      name: formData.name,
      brand: formData.brand || "",
      category: formData.category,
      amount: Number(formData.amount),
      unit: formData.unit,
      favorite: false,
      offers: []
    };
    if (formData.store && formData.regularPrice) {
      const unitPrice = calculateUnitPrice(Number(formData.salePrice || formData.regularPrice), product.amount, product.unit);
      const priceNow = Number(formData.salePrice || formData.regularPrice);
      product.offers.push({
        retailerProductId: `${formData.store}_${id}`,
        store: formData.store,
        regularPrice: Number(formData.regularPrice),
        salePrice: formData.salePrice ? Number(formData.salePrice) : null,
        unitPrice: unitPrice.value,
        unitPriceUnit: unitPrice.unit,
        validUntil: null,
        updatedAt: todayISO(),
        source: "manuell",
        retrievedAt: new Date().toISOString().slice(0,16),
        promotion: null,
        history: [{ date: todayISO(), price: priceNow }]
      });
    }
    state.products.push(product);
    saveState(); renderAll(); showToast("Artikel gespeichert");
  }

  function calculateUnitPrice(price, amount, unit) {
    if (!amount || !price) return { value: null, unit: "" };
    if (unit === "g") return { value: +(price / (amount / 1000)).toFixed(2), unit: "kg" };
    if (unit === "ml") return { value: +(price / (amount / 1000)).toFixed(2), unit: "l" };
    if (unit === "kg") return { value: +(price / amount).toFixed(2), unit: "kg" };
    if (unit === "l") return { value: +(price / amount).toFixed(2), unit: "l" };
    return { value: +(price / amount).toFixed(2), unit: "Stk" };
  }

  function deleteProduct(productId) {
    state.products = state.products.filter(p => p.id !== productId);
    state.shopping = state.shopping.filter(i => i.productId !== productId);
    saveState(); renderAll(); showToast("Artikel gelöscht");
  }

  function navigate(view) {
    currentView = view;
    $$(".view").forEach(v => v.classList.toggle("is-active", v.dataset.view === view));
    $$(".nav-item").forEach(n => n.classList.toggle("is-active", n.dataset.nav === view));

    if (view === "articles") {
      renderArticles();
      if (currentArticleMode === "catalog" && !catalogItems.length && !catalogLoading) {
        loadCatalogPage();
      }
    }

    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function formatDate(iso) {
    if (!iso) return "";
    const [y,m,d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  function cryptoId() {
    if (crypto?.randomUUID) return crypto.randomUUID().slice(0, 8);
    return Math.random().toString(36).slice(2, 10);
  }

  function escapeHtml(s="") {
    return String(s).replace(/[&<>"']/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[ch]));
  }
  function escapeAttr(s="") { return escapeHtml(s); }

  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) return navigate(nav.dataset.nav);

    const openAdd = e.target.closest('[data-action="open-add-shopping"]');
    if (openAdd) return openAddShopping();

    const close = e.target.closest('[data-action="close-sheets"]');
    if (close) return closeSheets();

    const openProduct = e.target.closest("[data-open-product]");
    if (openProduct) {
      renderProductDetail(openProduct.dataset.openProduct);
      return openSheet("productDetailSheet");
    }

    const addProduct = e.target.closest("[data-add-product]");
    if (addProduct) return openAddShopping(addProduct.dataset.addProduct, addProduct.dataset.preferredStore || "auto");

    const check = e.target.closest("[data-shopping-check]");
    if (check) return toggleChecked(check.dataset.shoppingCheck);

    const qty = e.target.closest("[data-qty-change]");
    if (qty) return changeQty(qty.dataset.qtyChange, qty.dataset.delta);

    const del = e.target.closest("[data-shopping-delete]");
    if (del) return deleteShopping(del.dataset.shoppingDelete);

    const articleMode = e.target.closest("[data-article-mode]");
    if (articleMode) return setArticleMode(articleMode.dataset.articleMode);

    const catalogStore = e.target.closest("[data-catalog-store]");
    if (catalogStore) return setCatalogRetailer(catalogStore.dataset.catalogStore);

    const catalogFilter = e.target.closest("#catalogPromotionFilter");
    if (catalogFilter) {
      catalogPromotionsOnly = !catalogPromotionsOnly;
      renderCatalogTabs();
      return resetAndLoadCatalog();
    }

    const catalogLink = e.target.closest("[data-catalog-link-index]");
    if (catalogLink) return openCatalogLinkSheet(catalogLink.dataset.catalogLinkIndex);

    const catalogTarget = e.target.closest("[data-catalog-target-product]");
    if (catalogTarget) return linkSelectedCatalogItem(catalogTarget.dataset.catalogTargetProduct);

    const cat = e.target.closest("[data-category]");
    if (cat) { currentCategory = cat.dataset.category; return renderArticles(); }

    const market = e.target.closest("[data-market]");
    if (market) { currentMarket = market.dataset.market; return renderMarkets(); }

    const theme = e.target.closest("[data-theme-value]");
    if (theme) return setTheme(theme.dataset.themeValue);

    const strategy = e.target.closest("[data-strategy-value]");
    if (strategy) {
      state.settings.shoppingStrategy = strategy.dataset.strategyValue;
      saveState();
      renderShopping();
      renderMore();
      showToast("Einkaufsstrategie geändert");
      return;
    }

    const addMode = e.target.closest("[data-add-mode]");
    if (addMode) return setAddMode(addMode.dataset.addMode);

    const addDb = e.target.closest('[data-action="open-add-product"]');
    if (addDb) return openSheet("addProductSheet");

    const showPromotions = e.target.closest("#showMpreisPromotionsBtn");
    if (showPromotions) return openMpreisPromotions();

    const liveLink = e.target.closest("[data-link-mpreis]");
    if (liveLink) return openMpreisLink(liveLink.dataset.linkMpreis);

    const showSparPromotions = e.target.closest("#showSparPromotionsBtn");
    if (showSparPromotions) return openSparPromotions();

    const sparLink = e.target.closest("[data-link-spar]");
    if (sparLink) return openSparLink(sparLink.dataset.linkSpar);

    const showTgPromotions = e.target.closest("#showTgPromotionsBtn");
    if (showTgPromotions) return openTgPromotions();

    const tgFlyer = e.target.closest("#openTgFlyerBtn");
    if (tgFlyer) return openTgFlyer();

    const tgLink = e.target.closest("[data-link-tg]");
    if (tgLink) return openTgLink(tgLink.dataset.linkTg);

    const liveResult = e.target.closest("[data-mpreis-result-index]");
    if (liveResult) {
      const results = $("#mpreisSearchResults")._mpreisResults || [];
      const item = results[Number(liveResult.dataset.mpreisResultIndex)];
      if (item && currentMpreisLinkProductId) {
        return linkMpreisResult(currentMpreisLinkProductId, item);
      }
    }

    const unlinkLive = e.target.closest("[data-unlink-mpreis]");
    if (unlinkLive) return unlinkMpreis(unlinkLive.dataset.unlinkMpreis);

    const sparResult = e.target.closest("[data-spar-result-index]");
    if (sparResult) {
      const results = $("#sparSearchResults")._sparResults || [];
      const item = results[Number(sparResult.dataset.sparResultIndex)];
      if (item && currentSparLinkProductId) {
        return linkSparResult(currentSparLinkProductId, item);
      }
    }

    const unlinkSparLive = e.target.closest("[data-unlink-spar]");
    if (unlinkSparLive) return unlinkSpar(unlinkSparLive.dataset.unlinkSpar);

    const tgResult = e.target.closest("[data-tg-result-index]");
    if (tgResult) {
      const results = $("#tgSearchResults")._tgResults || [];
      const item = results[Number(tgResult.dataset.tgResultIndex)];
      if (item && currentTgLinkProductId) {
        return linkTgResult(currentTgLinkProductId, item);
      }
    }

    const unlinkTgLive = e.target.closest("[data-unlink-tg]");
    if (unlinkTgLive) return unlinkTg(unlinkTgLive.dataset.unlinkTg);

    const delProduct = e.target.closest("[data-delete-product]");
    if (delProduct) {
      if (confirm("Diesen Artikel wirklich aus der Datenbank löschen?")) deleteProduct(delProduct.dataset.deleteProduct);
    }
  });

  $("#sheetBackdrop").addEventListener("click", closeSheets);

  $("#articleSearch").addEventListener("input", renderArticles);

  $("#retailerCatalogSearch").addEventListener("input", () => {
    clearTimeout(catalogSearchTimer);
    catalogSearchTimer = setTimeout(() => {
      catalogRequestSerial += 1;
      resetAndLoadCatalog();
    }, 260);
  });

  $("#catalogPersonalSearch").addEventListener("input", renderCatalogPersonalTargets);

  $("#retailerCatalogMoreBtn").addEventListener("click", loadCatalogPage);
  $("#catalogCreatePersonalBtn").addEventListener("click", createPersonalFromCatalog);

  $("#mpreisSearchInput").addEventListener("input", (e) => {
    clearTimeout(mpreisSearchTimer);
    const query = e.target.value;
    mpreisSearchTimer = setTimeout(() => searchMpreisProducts(query), 320);
  });

  $("#sparSearchInput").addEventListener("input", (e) => {
    clearTimeout(sparSearchTimer);
    const query = e.target.value;
    sparSearchTimer = setTimeout(() => searchSparProducts(query), 320);
  });

  $("#tgSearchInput").addEventListener("input", (e) => {
    clearTimeout(tgSearchTimer);
    const query = e.target.value;
    tgSearchTimer = setTimeout(() => searchTgProducts(query), 320);
  });

  $("#syncMpreisBtn").addEventListener("click", reloadAndSyncMpreis);
  $("#syncSparBtn").addEventListener("click", reloadAndSyncSpar);
  $("#syncTgBtn").addEventListener("click", reloadAndSyncTg);
  $("#shoppingSort").addEventListener("change", (e) => {
    state.settings.shoppingSort = e.target.value;
    saveState(); renderShopping();
  });

  $("#clearShoppingBtn").addEventListener("click", () => {
    if (!state.shopping.length && !state.customShopping.length) return;
    if (confirm("Die komplette Einkaufsliste leeren?")) {
      state.shopping = [];
      state.customShopping = [];
      saveState(); renderAll(); showToast("Liste geleert");
    }
  });

  $("#addExistingForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addExistingProduct($("#existingProductSelect").value, $("#existingQty").value, $("#existingStoreSelect").value);
    e.target.reset();
    $("#existingQty").value = 1;
    closeSheets();
  });

  $("#addCustomForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addCustomItem($("#customName").value.trim(), $("#customQty").value, $("#customPrice").value, $("#customStoreSelect").value);
    e.target.reset();
    $("#customQty").value = 1;
    closeSheets();
  });

  $("#addProductForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addDatabaseProduct({
      name: $("#newProductName").value.trim(),
      brand: $("#newProductBrand").value.trim(),
      category: $("#newProductCategory").value,
      amount: $("#newProductAmount").value,
      unit: $("#newProductUnit").value,
      store: $("#newProductStore").value,
      regularPrice: $("#newProductRegularPrice").value,
      salePrice: $("#newProductSalePrice").value
    });
    e.target.reset();
    $("#newProductAmount").value = 1;
    closeSheets();
  });

  $("#resetDataBtn").addEventListener("click", () => {
    if (confirm("Alle lokalen Daten wirklich zurücksetzen?")) {
      state = migrateState(deepClone(initialState));
      saveState();
      currentCategory = "Alle";
      currentMarket = "all";
      renderAll();
      navigate("shopping");
      showToast("Demo-Daten zurückgesetzt");
    }
  });

  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    if (state.settings.theme === "system") applyTheme();
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  renderAll();
  navigate("shopping");

  refreshMpreisPublicStatus().then(() => {
    if (shouldAutoSyncMpreis()) {
      setTimeout(() => syncLinkedMpreis({ silent: true }).catch(() => {}), 400);
    }
  });

  refreshSparPublicStatus().then(() => {
    if (shouldAutoSyncSpar()) {
      setTimeout(() => syncLinkedSpar({ silent: true }).catch(() => {}), 550);
    }
  });

  refreshTgPublicStatus().then(() => {
    if (shouldAutoSyncTg()) {
      setTimeout(() => syncLinkedTg({ silent: true }).catch(() => {}), 700);
    }
  });
})();