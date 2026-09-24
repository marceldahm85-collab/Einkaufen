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

  const todayISO = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const initialState = {
    schemaVersion: 5,
    settings: { theme: "system", region: "osttirol", shoppingSort: "added", shoppingStrategy: "cheapest", autoOptionSort: "unit" },
    live: {
      mpreis: { enabled: true, lastSync: null, lastError: null },
      spar: { enabled: true, lastSync: null, lastError: null },
      tg: { enabled: true, lastSync: null, lastError: null },
      billa: { enabled: true, lastSync: null, lastError: null },
      hofer: { enabled: true, lastSync: null, lastError: null }
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
  const OFFICIAL_FLYER_URLS = {
    mpreis: "https://www.mpreis.at/aktionen/flugblatt?region=osttirol",
    spar: "https://www.interspar.at/aktionen/osttirol",
    billa: "https://www.billa.at/unsere-aktionen/flugblatt",
    hofer: "https://www.hofer.at/flugblatt"
  };

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
  const AUTO_MATCH_STORES = ["mpreis", "spar", "tg", "billa", "hofer"];
  const AUTO_MATCH_ENGINE_VERSION = 4;
  const AUTO_MATCH_LIMIT_PER_STORE = 40;
  const AUTO_MATCH_SEARCH_LIMIT = 400;
  const AUTO_MATCH_MAX_AGE_MS = 6 * 60 * 60 * 1000;
  let autoMatchRefreshing = false;
  let currentAutoMatchProductId = null;
  let currentAutoMatchQuantity = 1;
  let currentAutoMatchStore = "all";
  let currentAutoMatchSort = ["unit", "total", "fit"].includes(state.settings.autoOptionSort)
    ? state.settings.autoOptionSort
    : "unit";
  let currentMpreisLinkProductId = null;
  let currentSparLinkProductId = null;
  let currentTgLinkProductId = null;
  let currentComparisonProductId = null;
  let currentEditProductId = null;
  let mpreisSearchTimer = null;
  let sparSearchTimer = null;
  let tgSearchTimer = null;
  let mpreisPublicStatus = null;
  let sparPublicStatus = null;
  let tgPublicStatus = null;
  let billaPublicStatus = null;
  let hoferPublicStatus = null;

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
      schemaVersion: 5,
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
        },
        billa: {
          ...initialState.live.billa,
          ...(input.live?.billa || {})
        },
        hofer: {
          ...initialState.live.hofer,
          ...(input.live?.hofer || {})
        }
      },
      shopping: Array.isArray(input.shopping) ? input.shopping : [],
      customShopping: Array.isArray(input.customShopping) ? input.customShopping : [],
      products: Array.isArray(input.products) ? input.products : deepClone(initialState.products)
    };

    migrated.products = migrated.products.map(product => {
      const cleanAmount = cleanComparisonAmount(product.amount, product.unit);
      const matchingProfile = product.matchingProfile || {};
      const migratedProduct = {
        ...product,
        amount: Number.isFinite(cleanAmount) && cleanAmount > 0 ? cleanAmount : product.amount,
        unit: normalizeMeasureUnit(product.unit) || product.unit,
        liveLinks: product.liveLinks || {},
        matchingProfile: {
          mode: matchingProfile.mode === "fixed" ? "fixed" : "auto",
          query: String(matchingProfile.query || product.name || "").trim(),
          queryAuto: matchingProfile.queryAuto !== false,
          fixedCandidateId: matchingProfile.fixedCandidateId || null,
          exclusions: Array.isArray(matchingProfile.exclusions) ? matchingProfile.exclusions : [],
          excludedIds: Array.isArray(matchingProfile.excludedIds) ? matchingProfile.excludedIds : []
        },
        autoMatches: product.autoMatches && typeof product.autoMatches === "object"
          ? product.autoMatches
          : { engineVersion: 0, updatedAt: null, query: null, stores: {}, counts: {} }
      };

      migratedProduct.offers = (product.offers || []).map(offer =>
        enrichOffer(migratedProduct, offer)
      );

      return migratedProduct;
    });

    return migrated;
  }

  function enrichOffer(product, offer) {
    const current = offer.salePrice != null ? Number(offer.salePrice) : Number(offer.regularPrice);
    const linkedLiveOffer = Boolean(product?.liveLinks?.[offer.store]);
    const explicitPackageAmount = Number(offer.packageAmount);
    const packageAmountKnown = offer.packageAmountKnown != null
      ? Boolean(offer.packageAmountKnown)
      : (Number.isFinite(explicitPackageAmount) && explicitPackageAmount > 0) || !linkedLiveOffer;
    const packageAmount = Number.isFinite(explicitPackageAmount) && explicitPackageAmount > 0
      ? explicitPackageAmount
      : (!linkedLiveOffer ? Number(product.amount) : null);
    const packageUnit = offer.packageUnit || (!linkedLiveOffer ? product.unit : null);
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
      packageAmount,
      packageUnit,
      packageAmountKnown,
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

  function fmtNumber(value, maximumFractionDigits = 3) {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value ?? "");
    return new Intl.NumberFormat("de-AT", { maximumFractionDigits }).format(n);
  }

  function cleanComparisonAmount(value, unit) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return n;

    const normalizedUnit = normalizeMeasureUnit(unit);
    if (!["l", "kg", "ml", "g", "Stk"].includes(normalizedUnit)) return n;

    // Imported pack sizes can contain tiny reverse-calculation artefacts
    // (e.g. 9.998 l although the intended pack/target is 10 l).
    // Snap only values very close to a coarser, human-meaningful value.
    const candidates = normalizedUnit === "Stk"
      ? [1]
      : [1, 0.5, 0.25, 0.1, 0.05, 0.01];

    for (const step of candidates) {
      const snapped = Math.round(n / step) * step;
      const tolerance = Math.min(0.005, Math.max(0.0005, Math.abs(snapped) * 0.0005));
      if (Math.abs(n - snapped) <= tolerance) {
        return Number(snapped.toFixed(6));
      }
    }

    return n;
  }

  function fmtAmount(p) {
    const unit = normalizeMeasureUnit(p.unit);
    const amount = cleanComparisonAmount(p.amount, unit);
    const decimals = ["l", "kg"].includes(unit) && Math.abs(amount) >= 1 ? 2 : 3;
    return `${fmtNumber(amount, decimals)} ${unit || p.unit}`;
  }

  function normalizeMeasureUnit(unit) {
    const value = String(unit || "").trim().toLowerCase();
    if (["l", "liter", "litre"].includes(value)) return "l";
    if (["ml", "milliliter"].includes(value)) return "ml";
    if (["kg", "kilogramm"].includes(value)) return "kg";
    if (["g", "gramm"].includes(value)) return "g";
    if (["stk", "stk.", "stück", "stueck", "piece", "pieces"].includes(value)) return "Stk";
    return String(unit || "").trim();
  }

  function normalizeMeasure(amount, unit) {
    const value = Number(amount);
    const normalizedUnit = normalizeMeasureUnit(unit);
    if (!Number.isFinite(value) || value <= 0) return null;

    if (normalizedUnit === "l") return { dimension: "volume", baseUnit: "l", baseAmount: value };
    if (normalizedUnit === "ml") return { dimension: "volume", baseUnit: "l", baseAmount: value / 1000 };
    if (normalizedUnit === "kg") return { dimension: "mass", baseUnit: "kg", baseAmount: value };
    if (normalizedUnit === "g") return { dimension: "mass", baseUnit: "kg", baseAmount: value / 1000 };
    if (normalizedUnit === "Stk") return { dimension: "count", baseUnit: "Stk", baseAmount: value };
    return null;
  }

  function measureToDisplay(baseAmount, dimension) {
    if (!Number.isFinite(Number(baseAmount))) return "—";
    const amount = Number(baseAmount);
    if (dimension === "volume") {
      if (amount < 1 && amount * 1000 >= 1) return `${fmtNumber(amount * 1000)} ml`;
      return `${fmtNumber(amount)} l`;
    }
    if (dimension === "mass") {
      if (amount < 1 && amount * 1000 >= 1) return `${fmtNumber(amount * 1000)} g`;
      return `${fmtNumber(amount)} kg`;
    }
    if (dimension === "count") return `${fmtNumber(amount)} Stk`;
    return fmtNumber(amount);
  }

  function packageMeasureForOffer(product, offer) {
    if (!offer) return null;

    if (offer.packageAmountKnown === false) return null;

    const hasExplicit = Number.isFinite(Number(offer.packageAmount)) && Number(offer.packageAmount) > 0 && offer.packageUnit;
    const amount = hasExplicit ? Number(offer.packageAmount) : Number(product?.amount);
    const unit = hasExplicit ? offer.packageUnit : product?.unit;
    return normalizeMeasure(amount, unit);
  }

  function offerPackageLabel(product, offer) {
    if (offer?.packageLabel) return String(offer.packageLabel);
    const amount = Number(offer?.packageAmount);
    if (Number.isFinite(amount) && amount > 0 && offer?.packageUnit) {
      return `${fmtNumber(amount)} ${normalizeMeasureUnit(offer.packageUnit)}`;
    }
    if (offer?.packageAmountKnown === false) return "Gebinde unbekannt";
    return product ? fmtAmount(product) : "Gebinde unbekannt";
  }

  function offerPrice(o) {
    return o.salePrice != null ? Number(o.salePrice) : Number(o.regularPrice);
  }

  function promotionDateStatus(offer, today = todayISO()) {
    const validFrom = offer?.validFrom ? String(offer.validFrom).slice(0, 10) : null;
    const validUntil = offer?.validUntil ? String(offer.validUntil).slice(0, 10) : null;

    if (validFrom && today < validFrom) {
      return { active: false, reason: "future", label: `gültig ab ${validFrom}` };
    }

    if (validUntil && today > validUntil) {
      return { active: false, reason: "expired", label: `abgelaufen am ${validUntil}` };
    }

    return { active: true, reason: null, label: "" };
  }

  function normalizedOffer(o) {
    const copy = { ...o };
    const status = promotionDateStatus(copy);

    copy.promotionActive = status.active;
    copy.promotionInactiveReason = status.reason;

    if (copy.salePrice != null && !status.active) {
      copy.inactivePromotion = copy.promotion || null;
      copy.salePrice = null;
      copy.promotion = null;
      copy.promotionVerified = false;
    }

    return copy;
  }

  function offerPricingForQuantity(offer, quantity = 1) {
    if (!offer) return null;

    const o = normalizedOffer(offer);
    const qty = Math.max(1, Math.ceil(Number(quantity || 1)));
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
        conditionMet: true,
        promotionApplied: false
      };
    }

    const promotion = o.promotion || {};
    const required = Math.max(1, Math.ceil(Number(promotion.requiredQuantity || 1)));
    const conditional = ["quantity", "bundle"].includes(promotion.type) && required > 1;

    if (conditional && qty < required) {
      if (regular == null) return null;
      return {
        unitPrice: regular,
        lineTotal: regular * qty,
        activeSale: false,
        conditionMet: false,
        promotionApplied: false
      };
    }

    if (promotion.type === "bundle" && required > 1) {
      const fullGroups = Math.floor(qty / required);
      const remainder = qty % required;
      let lineTotal = fullGroups * required * sale;

      if (remainder) {
        if (regular == null) return null;
        lineTotal += remainder * regular;
      }

      return {
        unitPrice: lineTotal / qty,
        lineTotal,
        activeSale: fullGroups > 0,
        conditionMet: fullGroups > 0,
        promotionApplied: fullGroups > 0,
        promotionGroups: fullGroups,
        remainderPackages: remainder
      };
    }

    return {
      unitPrice: sale,
      lineTotal: sale * qty,
      activeSale: true,
      conditionMet: true,
      promotionApplied: true
    };
  }

  function promotionCandidatePackageCounts(offer, minimumPackageCount) {
    const minimum = Math.max(1, Math.ceil(Number(minimumPackageCount || 1)));
    const normalized = normalizedOffer(offer);
    const promotion = normalized.promotion || {};
    const required = Math.max(1, Math.ceil(Number(promotion.requiredQuantity || 1)));
    const counts = new Set([minimum]);

    if (normalized.salePrice != null && required > 1) {
      if (promotion.type === "quantity" && minimum < required) {
        counts.add(required);
      }

      if (promotion.type === "bundle") {
        const nextFullGroup = Math.ceil(minimum / required) * required;
        if (nextFullGroup >= minimum) counts.add(nextFullGroup);
      }
    }

    return [...counts].sort((a, b) => a - b);
  }

  function offerPricingForTarget(product, offer, shoppingQuantity = 1) {
    if (!product || !offer) return null;

    const targetUnit = normalizeMeasure(product.amount, product.unit);
    const packageUnit = packageMeasureForOffer(product, offer);
    if (!targetUnit || !packageUnit || targetUnit.dimension !== packageUnit.dimension) return null;

    const multiplier = Math.max(1, Number(shoppingQuantity || 1));
    const targetBase = targetUnit.baseAmount * multiplier;
    const packageBase = packageUnit.baseAmount;
    if (!(packageBase > 0)) return null;

    const minimumPackageCount = Math.max(
      1,
      Math.ceil((targetBase / packageBase) - 1e-10)
    );

    const candidates = promotionCandidatePackageCounts(offer, minimumPackageCount)
      .map(packageCount => {
        const packagePricing = offerPricingForQuantity(offer, packageCount);
        if (!packagePricing) return null;

        const deliveredBase = packageCount * packageBase;
        const normalizedTargetPrice = packagePricing.lineTotal * (targetBase / deliveredBase);

        return {
          ...packagePricing,
          packageCount,
          minimumPackageCount,
          targetBase,
          deliveredBase,
          baseUnit: targetUnit.baseUnit,
          dimension: targetUnit.dimension,
          packageBase,
          overbuyBase: Math.max(0, deliveredBase - targetBase),
          normalizedTargetPrice,
          effectiveBaseUnitPrice: deliveredBase > 0
            ? packagePricing.lineTotal / deliveredBase
            : null
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const totalDiff = a.lineTotal - b.lineTotal;
        if (Math.abs(totalDiff) > 0.000001) return totalDiff;

        if (Boolean(a.promotionApplied) !== Boolean(b.promotionApplied)) {
          return a.promotionApplied ? -1 : 1;
        }

        const unitDiff =
          Number(a.effectiveBaseUnitPrice ?? Infinity) -
          Number(b.effectiveBaseUnitPrice ?? Infinity);
        if (Math.abs(unitDiff) > 0.000001) return unitDiff;

        return a.packageCount - b.packageCount;
      });

    return candidates[0] || null;
  }

  function offerPricingForTargetSortMode(product, offer, shoppingQuantity = 1, sortMode = "unit") {
    const mode = ["unit", "total", "fit"].includes(sortMode) ? sortMode : "unit";

    // The real optimizer continues to use offerPricingForTarget(), which
    // minimizes checkout cost. In the alternatives browser we deliberately
    // allow a different plan: e.g. buying the action minimum can have the
    // best €/l even when the immediate checkout total is slightly higher.
    if (mode === "total") return offerPricingForTarget(product, offer, shoppingQuantity);

    const targetUnit = normalizeMeasure(product?.amount, product?.unit);
    const packageUnit = packageMeasureForOffer(product, offer);
    if (!targetUnit || !packageUnit || targetUnit.dimension !== packageUnit.dimension) return null;

    const multiplier = Math.max(1, Number(shoppingQuantity || 1));
    const targetBase = targetUnit.baseAmount * multiplier;
    const packageBase = packageUnit.baseAmount;
    if (!(packageBase > 0)) return null;

    const minimumPackageCount = Math.max(1, Math.ceil((targetBase / packageBase) - 1e-10));
    const plans = promotionCandidatePackageCounts(offer, minimumPackageCount)
      .map(packageCount => {
        const packagePricing = offerPricingForQuantity(offer, packageCount);
        if (!packagePricing) return null;
        const deliveredBase = packageCount * packageBase;
        return {
          ...packagePricing,
          packageCount,
          minimumPackageCount,
          targetBase,
          deliveredBase,
          baseUnit: targetUnit.baseUnit,
          dimension: targetUnit.dimension,
          packageBase,
          overbuyBase: Math.max(0, deliveredBase - targetBase),
          normalizedTargetPrice: packagePricing.lineTotal * (targetBase / deliveredBase),
          effectiveBaseUnitPrice: deliveredBase > 0 ? packagePricing.lineTotal / deliveredBase : null
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aUnit = Number(a.effectiveBaseUnitPrice ?? Infinity);
        const bUnit = Number(b.effectiveBaseUnitPrice ?? Infinity);
        const aTotal = Number(a.lineTotal ?? Infinity);
        const bTotal = Number(b.lineTotal ?? Infinity);
        const aOver = Number(a.overbuyBase ?? Infinity);
        const bOver = Number(b.overbuyBase ?? Infinity);

        const comparisons = mode === "fit"
          ? [aOver - bOver, aTotal - bTotal, aUnit - bUnit]
          : [aUnit - bUnit, aOver - bOver, aTotal - bTotal];

        for (const diff of comparisons) {
          if (Number.isFinite(diff) && Math.abs(diff) > 0.000001) return diff;
        }
        return a.packageCount - b.packageCount;
      });

    return plans[0] || null;
  }

  function pricingPackageSummary(product, offer, pricing) {
    if (!pricing) return "nicht vergleichbar";
    const packageLabel = offerPackageLabel(product, offer);
    const delivered = measureToDisplay(pricing.deliveredBase, pricing.dimension);
    const target = measureToDisplay(pricing.targetBase, pricing.dimension);

    if (
      pricing.packageCount === 1 &&
      Math.abs(pricing.deliveredBase - pricing.targetBase) < 1e-8
    ) {
      return `${packageLabel} · exakt ${target}`;
    }

    const overbuy = pricing.overbuyBase > 1e-8
      ? ` · Kaufmenge ${delivered}`
      : "";

    const promoExtra = (
      pricing.promotionApplied &&
      pricing.packageCount > pricing.minimumPackageCount
    )
      ? " · Aktionsmenge gewählt"
      : "";

    return `${pricing.packageCount} × ${packageLabel}${overbuy}${promoExtra}`;
  }

  function autoCandidateKey(store, itemOrOffer) {
    const id = itemOrOffer?.retailerProductId || itemOrOffer?.remoteObjectId || itemOrOffer?.id;
    return id ? `${store}:${String(id)}` : "";
  }

  function autoLiveModule(store) {
    if (store === "mpreis") return window.MPreisLive;
    if (store === "spar") return window.SparLive;
    if (store === "tg") return window.TgLive;
    if (store === "billa") return window.BillaLive;
    if (store === "hofer") return window.HoferLive;
    return null;
  }

  function autoOfferFromLiveItem(store, liveItem) {
    if (!liveItem || liveItem.optimizerEligible === false) return null;

    const packageFields = livePackageFields(liveItem);
    if (!packageFields.packageAmountKnown) return null;

    const current = liveItem.currentPrice ?? liveItem.displayPrice ?? liveItem.salePrice ?? liveItem.regularPrice;
    const regular = liveItem.regularPrice ?? (liveItem.salePrice == null ? current : null);
    const sale = liveItem.salePrice ?? null;

    if (regular == null && sale == null) return null;

    return {
      store,
      retailerProductId: liveItem.retailerProductId || liveItem.remoteObjectId,
      remoteObjectId: liveItem.remoteObjectId || liveItem.retailerProductId,
      candidateName: liveItem.name || "Händlerprodukt",
      automaticMatch: true,
      ...packageFields,
      regularPrice: regular != null ? Number(regular) : null,
      salePrice: sale != null ? Number(sale) : null,
      unitPrice: liveItem.unitPrice ?? null,
      unitPriceUnit: liveItem.unitPriceUnit ?? null,
      validFrom: liveItem.validFrom ?? null,
      validUntil: liveItem.validUntil ?? null,
      promotion: liveItem.promotion ?? null,
      promotionVerified: Boolean(liveItem.promotionVerified),
      updatedAt: String(liveItem.retrievedAt || new Date().toISOString()).slice(0, 10),
      retrievedAt: liveItem.retrievedAt || new Date().toISOString(),
      source: liveItem.source || `${store}.at`
    };
  }

  function matchingProfile(product) {
    const stored = product?.matchingProfile || {};
    const profile = window.RetailerSearch?.profileForProduct
      ? window.RetailerSearch.profileForProduct(product)
      : { query: stored.query || product?.name || "", excludedIds: stored.excludedIds || [] };

    return {
      ...profile,
      mode: stored.mode === "fixed" ? "fixed" : "auto",
      fixedCandidateId: stored.fixedCandidateId || null,
      excludedIds: Array.isArray(stored.excludedIds) ? stored.excludedIds.map(String) : []
    };
  }

  function storedAutoCandidates(product, options) {
    options = options || {};
    const includeExcluded = Boolean(options.includeExcluded);
    const stores = product?.autoMatches?.stores || {};
    const profile = matchingProfile(product);
    const excluded = new Set(profile.excludedIds || []);
    const rows = [];

    AUTO_MATCH_STORES.forEach(store => {
      (Array.isArray(stores[store]) ? stores[store] : []).forEach(candidate => {
        if (!candidate?.offer) return;
        const id = candidate.id || autoCandidateKey(store, candidate.offer);
        if (!includeExcluded && id && excluded.has(id)) return;
        rows.push({ ...candidate, id, store });
      });
    });

    return rows;
  }

  function activeAutoCandidates(product) {
    const profile = matchingProfile(product);
    const rows = storedAutoCandidates(product);

    if (profile.mode === "fixed" && profile.fixedCandidateId) {
      const fixed = rows.find(row => row.id === profile.fixedCandidateId);
      return fixed ? [fixed] : [];
    }

    return rows;
  }

  function baseOffersForProduct(product) {
    const offers = Array.isArray(product?.offers) ? product.offers : [];
    const storesWithAutoData = new Set(
      AUTO_MATCH_STORES.filter(store =>
        Array.isArray(product?.autoMatches?.stores?.[store]) &&
        product.autoMatches.stores[store].length > 0
      )
    );

    return offers.filter(offer => {
      if (!AUTO_MATCH_STORES.includes(offer.store)) return true;
      if (offer.source === "manuell") return true;
      return !storesWithAutoData.has(offer.store);
    });
  }

  function validOffers(product) {
    const combined = [
      ...baseOffersForProduct(product),
      ...activeAutoCandidates(product).map(candidate => ({
        ...candidate.offer,
        autoCandidateId: candidate.id,
        candidateName: candidate.name || candidate.offer.candidateName,
        automaticMatch: true
      }))
    ];

    const seen = new Set();
    return combined.filter(offer => {
      const normalized = normalizedOffer(offer);
      if (normalized.regularPrice == null && normalized.salePrice == null) return false;

      const key = [
        offer.store,
        offer.retailerProductId || offer.remoteObjectId || "",
        offer.packageAmount || "",
        offer.packageUnit || ""
      ].join("|");

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function pricedOfferForStore(product, storeId, quantity = 1) {
    const candidates = validOffers(product)
      .filter(offer => offer.store === storeId)
      .map(normalizedOffer)
      .map(offer => ({ offer, pricing: offerPricingForTarget(product, offer, quantity) }))
      .filter(candidate => candidate.pricing)
      .sort((a, b) =>
        (a.pricing.lineTotal - b.pricing.lineTotal) ||
        (a.pricing.effectiveBaseUnitPrice - b.pricing.effectiveBaseUnitPrice)
      );

    return candidates[0] || null;
  }

  function cheapestPricedOffer(product, quantity = 1) {
    const candidates = validOffers(product)
      .map(normalizedOffer)
      .map(offer => ({ offer, pricing: offerPricingForTarget(product, offer, quantity) }))
      .filter(candidate => candidate.pricing)
      .sort((a, b) =>
        (a.pricing.lineTotal - b.pricing.lineTotal) ||
        (a.pricing.effectiveBaseUnitPrice - b.pricing.effectiveBaseUnitPrice)
      );

    return candidates[0] || null;
  }

  function offerForStore(product, storeId) {
    return pricedOfferForStore(product, storeId, 1)?.offer || null;
  }

  function rankedAutoOptions(product, quantity = 1, storeFilter = "all", limit = 10, sortMode = "unit") {
    const mode = ["unit", "total", "fit"].includes(sortMode) ? sortMode : "unit";

    const rows = storedAutoCandidates(product)
      .filter(candidate => storeFilter === "all" || candidate.store === storeFilter)
      .map(candidate => {
        const offer = normalizedOffer({
          ...candidate.offer,
          autoCandidateId: candidate.id,
          candidateName: candidate.name || candidate.offer?.candidateName,
          automaticMatch: true
        });
        const pricing = offerPricingForTargetSortMode(product, offer, quantity, mode);
        return pricing ? { ...candidate, offer, pricing } : null;
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aUnit = Number(a.pricing.effectiveBaseUnitPrice ?? Infinity);
        const bUnit = Number(b.pricing.effectiveBaseUnitPrice ?? Infinity);
        const aTotal = Number(a.pricing.lineTotal ?? Infinity);
        const bTotal = Number(b.pricing.lineTotal ?? Infinity);
        const aOver = Number(a.pricing.overbuyBase ?? Infinity);
        const bOver = Number(b.pricing.overbuyBase ?? Infinity);

        let comparisons;
        if (mode === "total") {
          comparisons = [aTotal - bTotal, aOver - bOver, aUnit - bUnit];
        } else if (mode === "fit") {
          comparisons = [aOver - bOver, aTotal - bTotal, aUnit - bUnit];
        } else {
          // Default for browsing/selection: compare what one litre, kilogram
          // or piece effectively costs after package sizes and promotions.
          comparisons = [aUnit - bUnit, aOver - bOver, aTotal - bTotal];
        }

        for (const diff of comparisons) {
          if (Number.isFinite(diff) && Math.abs(diff) > 0.000001) return diff;
        }

        return String(a.name || "").localeCompare(String(b.name || ""), "de");
      });

    return rows.slice(0, Math.max(1, Number(limit) || 10));
  }

  function autoOptionQuantityDetails(pricing) {
    if (!pricing) return "";

    const target = measureToDisplay(pricing.targetBase, pricing.dimension);
    const delivered = measureToDisplay(pricing.deliveredBase, pricing.dimension);
    const overbuy = Number(pricing.overbuyBase || 0);
    const overbuyText = overbuy > 1e-8
      ? `+${measureToDisplay(overbuy, pricing.dimension)} Übermenge`
      : "keine Übermenge";

    return `Vergleich ${target} · Kauf ${delivered} · ${overbuyText}`;
  }

  function autoOptionSortHint(sortMode, product) {
    const target = normalizeMeasure(product?.amount, product?.unit);
    const unit = target?.baseUnit || "Einheit";

    if (sortMode === "total") {
      return "Sortiert nach dem tatsächlichen Betrag an der Kassa.";
    }
    if (sortMode === "fit") {
      return "Bevorzugt Angebote mit möglichst wenig Übermenge.";
    }
    return `Sortiert nach dem effektiven Preis pro ${unit} – inklusive Gebinde und Aktionen.`;
  }

  function autoMatchCount(product) {
    return storedAutoCandidates(product).length;
  }

  function autoMatchCountsByStore(product) {
    const rows = storedAutoCandidates(product);
    return AUTO_MATCH_STORES.reduce((result, store) => {
      result[store] = rows.filter(row => row.store === store).length;
      return result;
    }, {});
  }


  function offerConditionLabel(offer) {
    const p = offer?.promotion;
    if (!p) return "";

    const loyalty = p.loyaltyRequired && p.loyaltyProgram
      ? ` · nur mit ${p.loyaltyProgram}`
      : "";

    if (p.label) return `${p.label}${loyalty}`;
    if (p.type === "quantity" && p.requiredQuantity) {
      return `ab ${p.requiredQuantity} Stück${loyalty}`;
    }
    if (p.type === "bundle" && p.paidQuantity != null && p.freeQuantity != null) {
      return `${p.paidQuantity}+${p.freeQuantity} gratis${loyalty}`;
    }
    if (p.type === "loyalty" && p.loyaltyProgram) return `nur mit ${p.loyaltyProgram}`;
    if (p.type === "percentage" && p.discountPercent) return `-${p.discountPercent} %${loyalty}`;
    return `Aktionsbedingung${loyalty}`;
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
    const target = normalizeMeasure(product.amount, product.unit);

    (product.offers || []).forEach(offer => {
      const packageMeasure = packageMeasureForOffer(product, offer);
      (offer.history || []).forEach(h => {
        const rawPrice = Number(h.price);
        let normalizedPrice = null;

        if (
          Number.isFinite(rawPrice) &&
          target &&
          packageMeasure &&
          target.dimension === packageMeasure.dimension &&
          packageMeasure.baseAmount > 0
        ) {
          normalizedPrice = rawPrice * target.baseAmount / packageMeasure.baseAmount;
        }

        rows.push({
          store: offer.store,
          date: h.date,
          price: rawPrice,
          normalizedPrice,
          packageLabel: offerPackageLabel(product, offer)
        });
      });
    });

    return rows
      .filter(r => Number.isFinite(r.price))
      .sort((a,b) => b.date.localeCompare(a.date));
  }

  function productPriceStats(product) {
    const history = productHistory(product);
    const prices = history
      .map(h => h.normalizedPrice)
      .filter(price => Number.isFinite(price));
    if (!prices.length) return null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a,b) => a + b, 0) / prices.length
    };
  }

  function cheapestOffer(product) {
    return cheapestPricedOffer(product, 1)?.offer || null;
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

  function shoppingCandidate(item) {
    if (item.custom) return null;
    const quantity = Number(item.quantity || 1);
    return item.preferredStore && item.preferredStore !== "auto"
      ? pricedOfferForStore(item.product, item.preferredStore, quantity)
      : cheapestPricedOffer(item.product, quantity);
  }

  function shoppingUnitPrice(item) {
    if (item.custom) return Number(item.price || 0);
    const quantity = Math.max(1, Number(item.quantity || 1));
    const candidate = shoppingCandidate(item);
    return candidate?.pricing?.lineTotal != null
      ? candidate.pricing.lineTotal / quantity
      : 0;
  }

  function shoppingItemTotal(item) {
    if (item.custom) return Number(item.price || 0) * Number(item.quantity || 1);
    return shoppingCandidate(item)?.pricing?.lineTotal || 0;
  }

  function renderShoppingCard(item) {
    const storeId = shoppingStoreId(item);
    const store = retailer(storeId);
    const name = item.custom ? item.name : item.product.name;
    const meta = item.custom
      ? `${storeId === "auto" ? "Kein Markt" : store.name} · freier Artikel`
      : `${item.product.brand || "ohne Marke"} · Vergleich ${fmtAmount(item.product)}`;
    const price = shoppingUnitPrice(item);
    const candidate = !item.custom ? shoppingCandidate(item) : null;
    const selectedOffer = candidate?.offer || null;
    const condition = selectedOffer ? offerConditionLabel(selectedOffer) : "";
    const packageInfo = candidate
      ? pricingPackageSummary(item.product, candidate.offer, candidate.pricing)
      : "";
    const candidateName = selectedOffer?.candidateName || "";
    const idAttr = item.custom ? `c:${item.id}` : `p:${item.id}`;
    return `
      <article class="product-card shopping-card ${item.checked ? "is-checked" : ""}">
        <button class="check-btn" data-shopping-check="${idAttr}" aria-label="Abhaken">${item.checked ? "✓" : ""}</button>
        <div class="product-main" ${item.custom ? "" : `data-open-product="${item.product.id}"`}>
          <div class="product-name">${escapeHtml(name)}</div>
          <div class="product-meta"><span>${escapeHtml(meta)}</span></div>
          ${candidateName ? `<div class="product-meta auto-selected-product"><span>${escapeHtml(candidateName)}</span></div>` : ""}
          ${packageInfo ? `<div class="product-meta comparison-package-meta"><span>${escapeHtml(packageInfo)}</span></div>` : ""}
          ${condition ? `<div class="product-meta"><span>${escapeHtml(condition)}</span></div>` : ""}
          ${!item.custom ? `<button class="auto-options-link" data-auto-options-product="${item.product.id}" data-auto-options-quantity="${item.quantity}" type="button">${autoMatchCount(item.product) ? "Alternativen" : "Auto-Treffer"}</button>` : ""}
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
    if (store === "billa") return window.BillaLive;
    if (store === "hofer") return window.HoferLive;
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
      const promotionsSupported = ["mpreis", "spar", "tg", "billa", "hofer"].includes(currentCatalogRetailer);
      if (!promotionsSupported) catalogPromotionsOnly = false;
      promoButton.disabled = !promotionsSupported;
      promoButton.textContent = "🔥 Aktionen";
      promoButton.classList.toggle("is-active", promotionsSupported && catalogPromotionsOnly);
      promoButton.setAttribute("aria-pressed", promotionsSupported && catalogPromotionsOnly ? "true" : "false");
      promoButton.title = promotionsSupported ? "" : "Aktionsfilter nicht verfügbar.";
    }
  }

  function setCatalogRetailer(store) {
    if (!["mpreis", "spar", "tg", "billa", "hofer"].includes(store)) return;
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
    else if (store === "billa") linkBillaResult(productId, item);
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
      amount: Number.isFinite(amountValue) && amountValue > 0
        ? cleanComparisonAmount(amountValue, item.unit || "Stk")
        : 1,
      unit: normalizeMeasureUnit(item.unit) || "Stk",
      favorite: false,
      offers: [],
      liveLinks: {},
      matchingProfile: {
        mode: "auto",
        query: String(item.name || "Neuer Artikel").trim(),
        queryAuto: true,
        fixedCandidateId: null,
        exclusions: [],
        excludedIds: []
      },
      autoMatches: { engineVersion: 0, updatedAt: null, query: null, stores: {}, counts: {} }
    };

    state.products.push(product);
    detachCatalogItemFromOtherProducts(store, item, product.id);

    if (store === "mpreis") linkMpreisResult(product.id, item);
    else if (store === "spar") linkSparResult(product.id, item);
    else if (store === "tg") linkTgResult(product.id, item);
    else if (store === "billa") linkBillaResult(product.id, item);

    selectedCatalogItem = null;
    showToast("Persönlicher Artikel übernommen und verknüpft");
  }

  function renderArticleCard(product) {
    const candidate = cheapestPricedOffer(product, 1);
    const offer = candidate?.offer || null;
    const pricing = candidate?.pricing || null;
    const store = offer ? retailer(offer.store) : null;
    const sale = offer && normalizedOffer(offer).salePrice != null && pricing?.activeSale;
    const packageInfo = candidate ? pricingPackageSummary(product, offer, pricing) : "";
    const candidateName = offer?.candidateName || "";
    const matchCount = autoMatchCount(product);
    const fixedMode = matchingProfile(product).mode === "fixed";

    return `
      <article class="product-card comparison-product-card">
        <div class="product-main" data-open-product="${product.id}">
          <div class="product-name">${escapeHtml(product.name)}</div>
          <div class="product-meta">
            <span>${escapeHtml(product.brand || "ohne Marke")}</span>
            <span>·</span><span>${escapeHtml(product.category)}</span>
          </div>
          <div class="article-edit-row">
            <button class="comparison-amount-btn" data-edit-comparison="${product.id}" type="button">
              Vergleich: <strong>${fmtAmount(product)}</strong> ✎
            </button>
            <button class="article-edit-btn" data-edit-product="${product.id}" type="button">
              ✎ Bearbeiten
            </button>
          </div>
          ${candidateName ? `<div class="product-meta auto-selected-product"><span>${escapeHtml(candidateName)}</span></div>` : ""}
          ${packageInfo ? `<div class="product-meta comparison-package-meta"><span>${escapeHtml(packageInfo)}</span></div>` : ""}
          <div class="auto-match-card-row">
            <button class="auto-options-link" data-auto-options-product="${product.id}" data-auto-options-quantity="1" type="button">
              ${fixedMode ? "Fest gewählt" : (matchCount ? `${Math.min(10, matchCount)} Optionen` : "Auto-Treffer")}
            </button>
            ${matchCount ? `<span class="auto-match-count">${matchCount} Kandidaten</span>` : `<span class="auto-match-count">noch nicht gesucht</span>`}
          </div>
          ${store ? `<div class="market-label"><span class="market-dot" style="background:${store.color}"></span>${store.name}</div>` : ""}
        </div>
        <div class="product-price-wrap">
          ${candidate ? `<div class="product-price ${sale ? "sale" : ""}">${money(pricing.lineTotal)}</div>
          <div class="product-meta comparison-price-label" style="justify-content:flex-end">für ${fmtAmount(product)}</div>
          ${pricing.effectiveBaseUnitPrice ? `<div class="product-meta" style="justify-content:flex-end">${money(pricing.effectiveBaseUnitPrice)}/${pricing.baseUnit}</div>` : ""}` : `<div class="product-price">—</div><div class="product-meta comparison-price-label">Gebinde prüfen</div>`}
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
      $("#marketOverview").innerHTML = `<div class="eyebrow">OSTTIROL</div><h2>Alle Märkte</h2><p class="muted">Preise auf die persönliche Vergleichsmenge normiert</p>`;
      const rows = state.products
        .map(p => ({ p, candidate: cheapestPricedOffer(p, 1) }))
        .filter(x => x.candidate)
        .sort((a,b) => a.candidate.pricing.lineTotal - b.candidate.pricing.lineTotal);
      $("#marketProductList").innerHTML = rows.map(({p}) => renderArticleCard(p)).join("");
      return;
    }

    const r = retailer(currentMarket);
    const rows = state.products
      .map(p => ({ p, candidate: pricedOfferForStore(p, currentMarket, 1) }))
      .filter(x => x.candidate)
      .sort((a,b) => a.candidate.pricing.lineTotal - b.candidate.pricing.lineTotal);

    $("#marketOverview").style.setProperty("--market-color", r.color);
    $("#marketOverview").innerHTML = `<div class="eyebrow">MARKT</div><h2>${r.name}</h2><p class="muted">${rows.length} vergleichbare Artikel für Osttirol</p>`;

    $("#marketProductList").innerHTML = rows.map(({p,candidate}) => {
      const o = candidate.offer;
      const pricing = candidate.pricing;
      const sale = o.salePrice != null && pricing.activeSale;
      const packageInfo = pricingPackageSummary(p, o, pricing);
      return `
      <article class="product-card">
        <div class="product-main" data-open-product="${p.id}">
          <div class="product-name">${escapeHtml(p.name)}</div>
          <div class="product-meta"><span>${escapeHtml(p.brand || "")}</span><span>·</span><span>Vergleich ${fmtAmount(p)}</span></div>
          <div class="product-meta comparison-package-meta"><span>${escapeHtml(packageInfo)}</span></div>
          ${o.validUntil ? `<div class="product-meta"><span>${sale ? "Aktion" : "Preis"} bis ${formatDate(o.validUntil)}</span></div>` : ""}
        </div>
        <div class="product-price-wrap">
          <div class="product-price ${sale ? "sale" : ""}">${money(pricing.lineTotal)}</div>
          <div class="product-meta comparison-price-label" style="justify-content:flex-end">für ${fmtAmount(p)}</div>
          ${pricing.effectiveBaseUnitPrice ? `<div class="product-meta" style="justify-content:flex-end">${money(pricing.effectiveBaseUnitPrice)}/${pricing.baseUnit}</div>` : ""}
          <div class="card-actions" style="justify-content:flex-end"><button class="mini-add" data-add-product="${p.id}" data-preferred-store="${currentMarket}">＋</button></div>
        </div>
      </article>`;
    }).join("");
  }

  function renderMpreisLiveStatus() {
    const live = state.live?.mpreis || {};
    const linked = state.products.filter(p => p.liveLinks?.mpreis).length;
    const autoLinked = state.products.filter(p => Array.isArray(p.autoMatches?.stores?.mpreis) && p.autoMatches.stores.mpreis.length).length;

    const linkedEl = $("#mpreisLinkedCount");
    const lastEl = $("#mpreisLastSync");
    const statusEl = $("#mpreisLiveStatus");
    const promoBtn = $("#showMpreisPromotionsBtn");
    if (!linkedEl || !lastEl || !statusEl) return;

    linkedEl.textContent = autoLinked
      ? `${autoLinked} Artikel automatisch${linked ? ` · ${linked} manuell` : ""}`
      : `${linked} Artikel manuell verknüpft`;
    statusEl.className = "status-badge";

    if (live.lastError) {
      statusEl.textContent = "Fehler";
      statusEl.classList.add("live-error");
    } else if (mpreisPublicStatus?.promotionStale) {
      statusEl.textContent = "Preisstand ok · Aktionen pausiert";
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
      const page = await window.MPreisLive.browse({ query: q, offset: 0, limit: 60 });
      const results = page.items;
      stateEl.textContent = results.length
        ? `${page.total.toLocaleString("de-AT")} Treffer · ${results.length} angezeigt – passenden Artikel antippen`
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

  function livePackageFields(liveItem) {
    const rawAmount = Array.isArray(liveItem?.amount) ? null : Number(liveItem?.amount);
    const known = Number.isFinite(rawAmount) && rawAmount > 0 && Boolean(liveItem?.unit);
    return {
      packageAmount: known ? rawAmount : null,
      packageUnit: known ? normalizeMeasureUnit(liveItem.unit) : null,
      packageAmountKnown: known,
      packageLabel: known ? formatLiveAmount({ amount: rawAmount, unit: normalizeMeasureUnit(liveItem.unit) }) : null
    };
  }


  function compactAutoCandidate(store, liveItem, offer) {
    const id = autoCandidateKey(store, liveItem);
    return {
      id,
      store,
      name: String(liveItem.name || "Händlerprodukt"),
      description: String(liveItem.description || "").slice(0, 180),
      matchScore: Number(liveItem.matchScore ?? 999),
      matchCategories: Array.isArray(liveItem.matchCategories)
        ? liveItem.matchCategories.slice(0, 6)
        : [],
      offer
    };
  }

  async function refreshAutoMatchesForProduct(product, { silent = true } = {}) {
    if (!product) return { updated: 0, errors: [] };

    const profile = matchingProfile(product);
    const nextStores = {};
    const nextCounts = {};
    const errors = [];
    let updated = 0;

    for (const store of AUTO_MATCH_STORES) {
      const module = autoLiveModule(store);
      if (!module?.matchCandidates) {
        nextStores[store] = [];
        nextCounts[store] = 0;
        errors.push(`${retailer(store).name}: Matching-Modul fehlt`);
        continue;
      }

      try {
        const storeProfile = {
          ...profile,
          excludedIds: (profile.excludedIds || [])
            .filter(id => String(id).startsWith(`${store}:`))
            .map(id => String(id).slice(store.length + 1))
        };

        const result = await module.matchCandidates(storeProfile, AUTO_MATCH_SEARCH_LIMIT);
        const candidates = [];

        for (const liveItem of result.items || []) {
          const candidateId = autoCandidateKey(store, liveItem);
          if (!candidateId || (profile.excludedIds || []).includes(candidateId)) continue;

          const offer = autoOfferFromLiveItem(store, liveItem);
          if (!offer) continue;

          const pricing = offerPricingForTarget(product, offer, 1);
          if (!pricing) continue;

          candidates.push({
            candidate: compactAutoCandidate(store, liveItem, offer),
            pricing
          });
        }

        candidates.sort((a, b) =>
          (a.pricing.lineTotal - b.pricing.lineTotal) ||
          (a.pricing.effectiveBaseUnitPrice - b.pricing.effectiveBaseUnitPrice) ||
          (a.candidate.matchScore - b.candidate.matchScore)
        );

        nextStores[store] = candidates
          .slice(0, AUTO_MATCH_LIMIT_PER_STORE)
          .map(row => row.candidate);
        nextCounts[store] = candidates.length;
        updated += nextStores[store].length;
      } catch (error) {
        nextStores[store] = [];
        nextCounts[store] = 0;
        errors.push(`${retailer(store).name}: ${error.message}`);
      }
    }

    product.autoMatches = {
      engineVersion: AUTO_MATCH_ENGINE_VERSION,
      updatedAt: new Date().toISOString(),
      query: profile.query,
      stores: nextStores,
      counts: nextCounts,
      error: errors.length ? errors.join(" | ") : null
    };

    const fixedId = product.matchingProfile?.fixedCandidateId;
    if (
      product.matchingProfile?.mode === "fixed" &&
      fixedId &&
      !storedAutoCandidates(product).some(candidate => candidate.id === fixedId)
    ) {
      product.matchingProfile.mode = "auto";
      product.matchingProfile.fixedCandidateId = null;
    }

    if (!silent && errors.length) {
      showToast(`Treffer aktualisiert · ${errors.length} Händler mit Fehler`);
    }

    return { updated, errors };
  }

  function autoMatchesNeedRefresh(product) {
    const profile = matchingProfile(product);
    const cache = product?.autoMatches || {};
    if (!cache.updatedAt) return true;
    if (Number(cache.engineVersion || 0) !== AUTO_MATCH_ENGINE_VERSION) return true;
    if (String(cache.query || "") !== String(profile.query || "")) return true;

    const age = Date.now() - new Date(cache.updatedAt).getTime();
    return !Number.isFinite(age) || age > AUTO_MATCH_MAX_AGE_MS;
  }

  async function refreshAllAutoMatches({ force = false, silent = true } = {}) {
    if (autoMatchRefreshing || !navigator.onLine) return;
    autoMatchRefreshing = true;
    renderMore();

    const targets = state.products.filter(product => force || autoMatchesNeedRefresh(product));
    let updated = 0;
    const errors = [];

    try {
      // Small batches keep mobile devices responsive while the retailer index
      // scans tens of thousands of public products.
      for (let i = 0; i < targets.length; i += 2) {
        const batch = targets.slice(i, i + 2);
        const results = await Promise.all(
          batch.map(product => refreshAutoMatchesForProduct(product, { silent: true }))
        );
        results.forEach(result => {
          updated += result.updated;
          errors.push(...result.errors);
        });
        saveState();
        renderAll();
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      if (!silent) {
        showToast(errors.length
          ? `${updated} Auto-Treffer · ${errors.length} Fehler`
          : `${updated} Auto-Treffer aktualisiert`
        );
      }
    } finally {
      autoMatchRefreshing = false;
      saveState();
      renderAll();
    }
  }

  function linkMpreisResult(productId, liveItem) {
    const product = productById(productId);
    if (!product || !liveItem) return;

    product.liveLinks = product.liveLinks || {};
    product.liveLinks.mpreis = {
      remoteObjectId: liveItem.remoteObjectId,
      retailerProductId: liveItem.retailerProductId,
      name: liveItem.name,
      amount: Array.isArray(liveItem.amount) ? null : (Number(liveItem.amount) || null),
      unit: liveItem.unit || null,
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
      ...livePackageFields(liveItem),
      regularPrice: liveItem.regularPrice ?? liveItem.currentPrice,
      salePrice: liveItem.salePrice ?? null,
      unitPrice: liveItem.unitPrice,
      unitPriceUnit: liveItem.unitPriceUnit,
      validFrom: liveItem.validFrom ?? null,
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
    const autoLinked = state.products.filter(p => Array.isArray(p.autoMatches?.stores?.spar) && p.autoMatches.stores.spar.length).length;

    const linkedEl = $("#sparLinkedCount");
    const lastEl = $("#sparLastSync");
    const statusEl = $("#sparLiveStatus");
    const promoBtn = $("#showSparPromotionsBtn");
    if (!linkedEl || !lastEl || !statusEl) return;

    linkedEl.textContent = autoLinked
      ? `${autoLinked} Artikel automatisch${linked ? ` · ${linked} manuell` : ""}`
      : `${linked} Artikel manuell verknüpft`;
    statusEl.className = "status-badge";

    if (live.lastError) {
      statusEl.textContent = "Fehler";
      statusEl.classList.add("live-error");
    } else if (sparPublicStatus?.promotionStale) {
      statusEl.textContent = "Preisstand ok · Aktionen pausiert";
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
      const page = await window.SparLive.browse({ query: q, offset: 0, limit: 60 });
      const results = page.items;
      stateEl.textContent = results.length
        ? `${page.total.toLocaleString("de-AT")} Treffer · ${results.length} angezeigt – passenden Artikel antippen`
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
      amount: Array.isArray(liveItem.amount) ? null : (Number(liveItem.amount) || null),
      unit: liveItem.unit || null,
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
      ...livePackageFields(liveItem),
      regularPrice: liveItem.regularPrice ?? liveItem.currentPrice,
      salePrice: liveItem.salePrice ?? null,
      unitPrice: liveItem.unitPrice,
      unitPriceUnit: liveItem.unitPriceUnit,
      validFrom: liveItem.validFrom ?? null,
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
    const autoLinked = state.products.filter(p => Array.isArray(p.autoMatches?.stores?.tg) && p.autoMatches.stores.tg.length).length;

    const linkedEl = $("#tgLinkedCount");
    const lastEl = $("#tgLastSync");
    const statusEl = $("#tgLiveStatus");
    const promoBtn = $("#showTgPromotionsBtn");
    const flyerBtn = $("#openTgFlyerBtn");

    if (!linkedEl || !lastEl || !statusEl) return;

    linkedEl.textContent = autoLinked
      ? `${autoLinked} Artikel automatisch${linked ? ` · ${linked} manuell` : ""}`
      : `${linked} Artikel manuell verknüpft`;
    statusEl.className = "status-badge";

    if (live.lastError) {
      statusEl.textContent = "Fehler";
      statusEl.classList.add("live-error");
    } else if (tgPublicStatus?.flyerCurrent === false && !(tgPublicStatus?.promotionCount > 0)) {
      statusEl.textContent = "Ausgabe abgelaufen";
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

      lastEl.textContent = tgPublicStatus.flyerCurrent === false
        ? `Datenstand: ${updated.toLocaleString("de-AT", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })} · Letzte Flugblattausgabe abgelaufen · aktuelle Aktionen werden erst nach erfolgreichem Datenlauf verwendet`
        : `Datenstand: ${updated.toLocaleString("de-AT", {
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
      const usable = Boolean(url) && tgPublicStatus?.flyerCurrent !== false;
      flyerBtn.disabled = !usable;
      flyerBtn.dataset.flyerUrl = usable ? url : "";
      flyerBtn.textContent = usable ? "📄 Flugblatt" : "📄 Flugblatt wird aktualisiert";
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
      const page = await window.TgLive.browse({ query: q, offset: 0, limit: 60 });
      const results = page.items;

      stateEl.textContent = results.length
        ? `${page.total.toLocaleString("de-AT")} Treffer · ${results.length} angezeigt – passenden Aktionsartikel antippen`
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
      amount: Array.isArray(liveItem.amount) ? null : (Number(liveItem.amount) || null),
      unit: liveItem.unit || null,
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
      ...livePackageFields(liveItem),
      regularPrice: liveItem.regularPrice ?? null,
      salePrice: liveItem.salePrice ?? null,
      unitPrice: liveItem.unitPrice,
      unitPriceUnit: liveItem.unitPriceUnit,
      validFrom: liveItem.validFrom ?? null,
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


  function renderBillaLiveStatus() {
    const live = state.live?.billa || {};
    const linked = state.products.filter(p => p.liveLinks?.billa).length;
    const autoLinked = state.products.filter(p => Array.isArray(p.autoMatches?.stores?.billa) && p.autoMatches.stores.billa.length).length;

    const linkedEl = $("#billaLinkedCount");
    const lastEl = $("#billaLastSync");
    const statusEl = $("#billaLiveStatus");
    const promoBtn = $("#showBillaPromotionsBtn");
    const flyerBtn = $("#openBillaFlyerBtn");
    if (!linkedEl || !lastEl || !statusEl) return;

    linkedEl.textContent = autoLinked
      ? `${autoLinked} Artikel automatisch${linked ? ` · ${linked} manuell` : ""}`
      : `${linked} Artikel manuell verknüpft`;
    statusEl.className = "status-badge";

    if (live.lastError) {
      statusEl.textContent = "Fehler";
      statusEl.classList.add("live-error");
    } else if (billaPublicStatus?.updatedAt) {
      statusEl.textContent = "Aktuell";
      statusEl.classList.add("live-ok");
    } else {
      statusEl.textContent = "Bereit";
    }

    if (billaPublicStatus?.updatedAt) {
      const date = new Date(billaPublicStatus.updatedAt);
      const promoText = billaPublicStatus.promotionStale
        ? "Aktionsdaten veraltet"
        : `${billaPublicStatus.promotionCount || 0} Aktionen`;
      lastEl.textContent = `GitHub-Datenstand: ${date.toLocaleString("de-AT", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit"
      })} · ${billaPublicStatus.productCount || 0} Produkte · ${promoText}`;
    } else {
      lastEl.textContent = "Noch keine importierten BILLA-Daten vorhanden";
    }

    if (promoBtn) {
      const count = billaPublicStatus?.promotionCount || 0;
      const stale = billaPublicStatus?.promotionStale === true;
      promoBtn.disabled = stale || count === 0;
      promoBtn.textContent = stale
        ? "🔥 Aktionen derzeit nicht verfügbar"
        : (count ? `🔥 ${count} BILLA-Aktionen anzeigen` : "🔥 BILLA-Aktionen anzeigen");
    }

    if (flyerBtn) {
      const url = OFFICIAL_FLYER_URLS.billa;
      flyerBtn.disabled = !url;
      flyerBtn.dataset.flyerUrl = url || "";
      flyerBtn.textContent = url ? "📄 Flugblatt" : "📄 Flugblatt nicht verfügbar";
    }
  }

  async function openBillaPromotions() {
    const stateEl = $("#billaPromotionsState");
    const listEl = $("#billaPromotionsList");
    if (!stateEl || !listEl) return;

    openSheet("billaPromotionsSheet");
    stateEl.textContent = "BILLA-Aktionen werden geladen …";
    listEl.innerHTML = "";

    if (!window.BillaLive?.promotions) {
      stateEl.textContent = "Die BILLA-Aktionsansicht konnte nicht geladen werden.";
      return;
    }

    try {
      const items = await window.BillaLive.promotions();
      const updated = billaPublicStatus?.promotionUpdatedAt
        ? ` · Datenstand ${new Date(billaPublicStatus.promotionUpdatedAt).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}`
        : "";

      stateEl.textContent = items.length
        ? `${items.length} aktuelle BILLA-Aktionsartikel${updated}`
        : "Aktuell wurden keine verifizierten BILLA-Aktionen gefunden.";

      listEl.innerHTML = items.map(item => {
        const promotion = item.promotion || {};
        const condition = promotion.label || promotion.officialLabel || "Aktion";
        const salePrice = item.salePrice ?? item.currentPrice;
        const regularPrice = item.regularPrice;

        return `
          <article class="product-card billa-promo-card">
            <div class="product-main billa-promo-main">
              <div class="product-name">${escapeHtml(item.name)}</div>
              <div class="product-meta">
                <span>${escapeHtml(formatLiveAmount(item))}</span>
                ${item.unitPrice ? `<span>·</span><span>${money(item.unitPrice)}/${escapeHtml(item.unitPriceUnit || "")}</span>` : ""}
              </div>
              <div class="offer-extra">
                <span class="offer-badge condition">${escapeHtml(condition)}</span>
                ${promotion.loyaltyRequired === true ? `<span class="offer-badge app-only">NUR MIT JÖ</span>` : ""}
              </div>
              ${item.promotionOfficialLabel && item.promotionOfficialLabel !== condition
                ? `<div class="product-meta">${escapeHtml(item.promotionOfficialLabel)}</div>`
                : ""}
            </div>

            <div class="product-price-wrap">
              ${salePrice != null
                ? `<div class="product-price sale">${money(salePrice)}</div>
                   ${regularPrice != null && Number(regularPrice) !== Number(salePrice)
                     ? `<div class="old-price">${money(regularPrice)}</div>` : ""}`
                : `<div class="tg-no-price">ohne Fixpreis</div>`}
            </div>
          </article>`;
      }).join("");
    } catch (error) {
      stateEl.textContent = `BILLA-Aktionen konnten nicht geladen werden: ${error.message}`;
      listEl.innerHTML = "";
    }
  }

  async function refreshBillaPublicStatus(force = false) {
    try {
      if (!window.BillaLive?.status) throw new Error("BILLA-Datenmodul fehlt");
      billaPublicStatus = await window.BillaLive.status(force);
      state.live.billa.lastError = null;
    } catch (error) {
      billaPublicStatus = null;
      state.live.billa.lastError = error.message;
    }
    saveState();
    renderBillaLiveStatus();
  }

  function linkBillaResult(productId, liveItem) {
    const product = productById(productId);
    if (!product || !liveItem) return;

    product.liveLinks = product.liveLinks || {};
    product.liveLinks.billa = {
      remoteObjectId: liveItem.remoteObjectId,
      retailerProductId: liveItem.retailerProductId,
      name: liveItem.name,
      amount: Array.isArray(liveItem.amount) ? null : (Number(liveItem.amount) || null),
      unit: liveItem.unit || null,
      linkedAt: new Date().toISOString()
    };

    applyBillaLivePrice(product, liveItem);
    state.live.billa.lastSync = new Date().toISOString();
    state.live.billa.lastError = null;

    saveState();
    renderAll();
    showToast("BILLA-Produkt verknüpft");
    closeSheets();
  }

  function applyBillaLivePrice(product, liveItem) {
    const now = liveItem.retrievedAt || new Date().toISOString();
    const date = now.slice(0,10);
    let offer = (product.offers || []).find(o => o.store === "billa");

    if (!offer) {
      offer = { store: "billa", history: [] };
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

    const currentPrice = liveItem.currentPrice ?? liveItem.displayPrice ?? liveItem.regularPrice ?? liveItem.salePrice;
    if (Number.isFinite(Number(currentPrice))) {
      historyMap.set(date, { date, price: Number(currentPrice) });
    }

    const history = [...historyMap.values()]
      .sort((a,b) => b.date.localeCompare(a.date))
      .slice(0, 250);

    Object.assign(offer, {
      retailerProductId: liveItem.retailerProductId,
      remoteObjectId: liveItem.remoteObjectId,
      ...livePackageFields(liveItem),
      regularPrice: liveItem.regularPrice ?? liveItem.currentPrice,
      salePrice: liveItem.salePrice ?? null,
      unitPrice: liveItem.unitPrice,
      unitPriceUnit: liveItem.unitPriceUnit,
      validFrom: liveItem.validFrom ?? null,
      validUntil: liveItem.validUntil ?? null,
      updatedAt: date,
      source: liveItem.promotionVerified ? "billa.at" : (liveItem.source || "heisse-preise.io (BILLA)"),
      retrievedAt: now,
      promotion: liveItem.promotion ?? null,
      promotionVerified: Boolean(liveItem.promotionVerified),
      history
    });
  }

  async function syncLinkedBilla({ silent = false } = {}) {
    const linkedProducts = state.products.filter(p => p.liveLinks?.billa);

    if (!linkedProducts.length) {
      if (!silent) showToast("Noch keine BILLA-Produkte manuell verknüpft");
      return;
    }

    if (!window.BillaLive) {
      state.live.billa.lastError = "Live-Modul fehlt";
      saveState();
      renderBillaLiveStatus();
      if (!silent) showToast("BILLA-Datenmodul fehlt");
      return;
    }

    const button = $("#syncBillaBtn");
    if (button) {
      button.disabled = true;
      button.textContent = "Lädt …";
    }

    let updated = 0;
    const errors = [];

    for (let i = 0; i < linkedProducts.length; i += 4) {
      const batch = linkedProducts.slice(i, i + 4);
      const results = await Promise.allSettled(batch.map(async product => {
        const link = product.liveLinks.billa;
        let item;
        try {
          item = await window.BillaLive.getObject(link.remoteObjectId || link.retailerProductId);
        } catch {
          const candidates = await window.BillaLive.search(link.name || product.name, 10);
          item = candidates.find(c =>
            c.remoteObjectId === link.remoteObjectId ||
            c.retailerProductId === link.retailerProductId
          );
          if (!item) throw new Error(`${product.name}: Produkt nicht mehr gefunden`);
        }

        applyBillaLivePrice(product, item);
        product.liveLinks.billa = {
          ...product.liveLinks.billa,
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

    state.live.billa.lastSync = new Date().toISOString();
    state.live.billa.lastError = errors.length ? errors.join(" | ") : null;
    saveState();
    renderAll();

    if (button) {
      button.disabled = false;
      button.textContent = "Neu laden";
    }

    if (!silent) {
      showToast(errors.length
        ? `${updated} aktualisiert · ${errors.length} Fehler`
        : `${updated} BILLA-Preise aktualisiert`
      );
    }
  }

  async function reloadAndSyncBilla() {
    const button = $("#syncBillaBtn");
    if (button) {
      button.disabled = true;
      button.textContent = "Lädt …";
    }

    try {
      if (!window.BillaLive?.reload) throw new Error("BILLA-Datenmodul fehlt");
      billaPublicStatus = await window.BillaLive.reload();
      state.live.billa.lastError = null;
      saveState();
      renderBillaLiveStatus();
      await syncLinkedBilla({ silent: true });
      await refreshAllAutoMatches({ force: true, silent: true });
      showToast("BILLA-Daten und Auto-Treffer aktualisiert");
    } catch (error) {
      state.live.billa.lastError = error.message;
      saveState();
      renderBillaLiveStatus();
      showToast("BILLA-Daten konnten nicht neu geladen werden");
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Neu laden";
      }
    }
  }

  function shouldAutoSyncBilla() {
    const linked = state.products.some(p => p.liveLinks?.billa);
    if (!linked || !navigator.onLine) return false;

    const last = state.live?.billa?.lastSync;
    if (!last) return true;
    return (Date.now() - new Date(last).getTime()) > 6 * 60 * 60 * 1000;
  }

  function renderHoferLiveStatus() {
    const live = state.live?.hofer || {};
    const autoLinked = state.products.filter(p => Array.isArray(p.autoMatches?.stores?.hofer) && p.autoMatches.stores.hofer.length).length;
    const linkedEl = $("#hoferLinkedCount");
    const lastEl = $("#hoferLastSync");
    const statusEl = $("#hoferLiveStatus");
    const promoBtn = $("#showHoferPromotionsBtn");
    const flyerBtn = $("#openHoferFlyerBtn");
    if (!linkedEl || !lastEl || !statusEl) return;
    linkedEl.textContent = autoLinked + " Artikel automatisch";
    statusEl.className = "status-badge";
    if (live.lastError) { statusEl.textContent = "Fehler"; statusEl.classList.add("live-error"); }
    else if (hoferPublicStatus?.promotionStale) { statusEl.textContent = "Preisstand ok · Aktionen pausiert"; statusEl.classList.add("live-error"); }
    else if (hoferPublicStatus?.updatedAt) { statusEl.textContent = "Aktuell"; statusEl.classList.add("live-ok"); }
    else { statusEl.textContent = "Bereit"; }
    if (hoferPublicStatus?.updatedAt) {
      const date = new Date(hoferPublicStatus.updatedAt);
      const promoText = hoferPublicStatus.promotionStale ? "Aktionsdaten veraltet" : String(hoferPublicStatus.promotionCount || 0) + " Aktionen";
      lastEl.textContent = "GitHub-Datenstand: " + date.toLocaleString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) + " · " + String(hoferPublicStatus.productCount || 0) + " Produkte · " + promoText;
    } else { lastEl.textContent = "Noch keine importierten HOFER-Daten vorhanden"; }
    if (promoBtn) {
      const count = hoferPublicStatus?.promotionCount || 0;
      const stale = hoferPublicStatus?.promotionStale === true;
      promoBtn.disabled = stale || count === 0;
      promoBtn.textContent = stale ? "🔥 Aktionen derzeit nicht verfügbar" : (count ? "🔥 " + count + " HOFER-Aktionen anzeigen" : "🔥 HOFER-Aktionen anzeigen");
    }
    if (flyerBtn) {
      const url = OFFICIAL_FLYER_URLS.hofer;
      flyerBtn.disabled = !url;
      flyerBtn.dataset.flyerUrl = url || "";
      flyerBtn.textContent = url ? "📄 Flugblatt" : "📄 Flugblatt nicht verfügbar";
    }
  }

  async function openHoferPromotions() {
    const stateEl = $("#hoferPromotionsState");
    const listEl = $("#hoferPromotionsList");
    if (!stateEl || !listEl) return;
    openSheet("hoferPromotionsSheet");
    stateEl.textContent = "HOFER-Aktionen werden geladen …";
    listEl.innerHTML = "";
    if (!window.HoferLive?.promotions) { stateEl.textContent = "Die HOFER-Aktionsansicht konnte nicht geladen werden."; return; }
    try {
      const items = await window.HoferLive.promotions();
      const updated = hoferPublicStatus?.promotionUpdatedAt ? " · Datenstand " + new Date(hoferPublicStatus.promotionUpdatedAt).toLocaleString("de-AT",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "";
      stateEl.textContent = items.length ? items.length + " aktuelle HOFER-Aktionsartikel" + updated : "Aktuell wurden keine verifizierten HOFER-Aktionen gefunden.";
      listEl.innerHTML = items.map(item => {
        const promotion = item.promotion || {};
        const condition = promotion.label || promotion.officialLabel || "Aktionsartikel";
        const displayPrice = item.salePrice ?? item.currentPrice ?? item.regularPrice ?? null;
        const regularPrice = item.regularPrice;
        return '<article class="product-card hofer-promo-card"><div class="product-main hofer-promo-main">' +
          '<div class="product-name">' + escapeHtml(item.name) + '</div>' +
          '<div class="product-meta"><span>' + escapeHtml(formatLiveAmount(item)) + '</span>' + (item.unitPrice ? '<span>·</span><span>' + money(item.unitPrice) + '/' + escapeHtml(item.unitPriceUnit || "") + '</span>' : "") + '</div>' +
          '<div class="offer-extra"><span class="offer-badge condition">' + escapeHtml(condition) + '</span></div>' +
          (item.validFrom ? '<div class="product-meta">Verfügbar seit ' + formatDate(String(item.validFrom).slice(0,10)) + '</div>' : "") +
          '</div><div class="product-price-wrap">' +
          (displayPrice != null ? '<div class="product-price ' + (item.salePrice != null ? "sale" : "") + '">' + money(displayPrice) + '</div>' + (item.salePrice != null && regularPrice != null && Number(regularPrice) !== Number(item.salePrice) ? '<div class="old-price">' + money(regularPrice) + '</div>' : "") : '<div class="product-price">—</div>') +
          '</div></article>';
      }).join("");
    } catch (error) { stateEl.textContent = "HOFER-Aktionen konnten nicht geladen werden: " + error.message; listEl.innerHTML = ""; }
  }

  async function refreshHoferPublicStatus(force = false) {
    try { if (!window.HoferLive?.status) throw new Error("HOFER-Datenmodul fehlt"); hoferPublicStatus = await window.HoferLive.status(force); state.live.hofer.lastError = null; }
    catch (error) { hoferPublicStatus = null; state.live.hofer.lastError = error.message; }
    saveState(); renderHoferLiveStatus();
  }

  async function reloadAndSyncHofer() {
    const button = $("#syncHoferBtn");
    if (button) { button.disabled = true; button.textContent = "Lädt …"; }
    try {
      if (!window.HoferLive?.reload) throw new Error("HOFER-Datenmodul fehlt");
      hoferPublicStatus = await window.HoferLive.reload();
      state.live.hofer.lastError = null; saveState(); renderHoferLiveStatus();
      await refreshAllAutoMatches({force:true,silent:true});
      showToast("HOFER-Daten und Auto-Treffer aktualisiert");
    } catch (error) {
      state.live.hofer.lastError = error.message; saveState(); renderHoferLiveStatus(); showToast("HOFER-Daten konnten nicht neu geladen werden");
    } finally { if (button) { button.disabled = false; button.textContent = "Neu laden"; } }
  }
  function openOfficialFlyer(store) {
    const url = OFFICIAL_FLYER_URLS[store];

    if (!url) {
      showToast("Flugblatt-Link ist derzeit nicht verfügbar");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openTgFlyer() {
    const url = tgPublicStatus?.flyer?.url || $("#openTgFlyerBtn")?.dataset.flyerUrl;
    if (!url) {
      showToast("Osttirol-Flugblatt-Link ist derzeit nicht verfügbar");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openAutoMatchSheet(productId, quantity = 1, store = "all") {
    const product = productById(productId);
    if (!product) return;

    currentAutoMatchProductId = productId;
    currentAutoMatchQuantity = Math.max(1, Number(quantity || 1));
    currentAutoMatchStore = AUTO_MATCH_STORES.includes(store) ? store : "all";

    $("#autoMatchTitle").textContent = product.name;
    $("#autoMatchQuery").value = matchingProfile(product).query || product.name;
    renderAutoMatchSheet();
    openSheet("autoMatchSheet");

    if (autoMatchesNeedRefresh(product)) {
      setTimeout(() => refreshCurrentAutoMatchProduct({ silent: true }), 80);
    }
  }

  function renderAutoMatchSheet() {
    const product = productById(currentAutoMatchProductId);
    if (!product) return;

    const profile = matchingProfile(product);
    const counts = autoMatchCountsByStore(product);
    const total = autoMatchCount(product);
    const options = rankedAutoOptions(product, currentAutoMatchQuantity, currentAutoMatchStore, 10, currentAutoMatchSort);
    const fixed = profile.fixedCandidateId
      ? storedAutoCandidates(product).find(candidate => candidate.id === profile.fixedCandidateId)
      : null;

    $("#autoMatchSummary").innerHTML = `
      <div class="auto-match-summary-main">
        <div><strong>${total}</strong><span> passende Kandidaten</span></div>
        <div class="muted small">Vergleich: ${escapeHtml(fmtAmount(product))}${currentAutoMatchQuantity > 1 ? ` × ${currentAutoMatchQuantity}` : ""}</div>
      </div>
      <div class="auto-match-store-counts">
        <span><i style="background:${retailer("mpreis").color}"></i>MPREIS ${counts.mpreis || 0}</span>
        <span><i style="background:${retailer("spar").color}"></i>SPAR ${counts.spar || 0}</span>
        <span><i style="background:${retailer("tg").color}"></i>T&G ${counts.tg || 0}</span>
        <span><i style="background:${retailer("billa").color}"></i>BILLA ${counts.billa || 0}</span>
        <span><i style="background:${retailer("hofer").color}"></i>HOFER ${counts.hofer || 0}</span>
      </div>
      ${fixed ? `<div class="auto-fixed-note">Fest gewählt: <strong>${escapeHtml(fixed.name)}</strong> · ${retailer(fixed.store).name}</div>` : ""}
    `;

    const autoModeButton = $("#useAutoMatchModeBtn");
    autoModeButton.classList.toggle("is-active", profile.mode !== "fixed");

    const resetExclusionsButton = $("#resetAutoMatchExclusionsBtn");
    if (resetExclusionsButton) {
      const excludedCount = (profile.excludedIds || []).length;
      resetExclusionsButton.disabled = excludedCount === 0;
      resetExclusionsButton.textContent = excludedCount
        ? `Ausblendungen zurücksetzen (${excludedCount})`
        : "Keine Ausblendungen";
    }
    autoModeButton.textContent = profile.mode === "fixed"
      ? "Automatisch günstigsten Einkauf verwenden"
      : "✓ Automatisch günstigster Einkauf";

    $$("#autoMatchStoreFilter [data-auto-match-store]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.autoMatchStore === currentAutoMatchStore);
    });

    $$("#autoMatchSortRow [data-auto-match-sort]").forEach(button => {
      button.classList.toggle("is-active", button.dataset.autoMatchSort === currentAutoMatchSort);
    });
    $("#autoMatchSortHint").textContent = autoOptionSortHint(currentAutoMatchSort, product);

    const stateEl = $("#autoMatchState");
    const updatedAt = product.autoMatches?.updatedAt;
    if (autoMatchRefreshing) {
      stateEl.textContent = "Passende Händlerprodukte werden gesucht …";
    } else if (product.autoMatches?.error) {
      stateEl.textContent = `Letzte Suche mit Hinweis: ${product.autoMatches.error}`;
    } else if (updatedAt) {
      const date = new Date(updatedAt);
      stateEl.textContent = `Letzte automatische Suche: ${date.toLocaleString("de-AT", {
        day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
      })}`;
    } else {
      stateEl.textContent = "Noch keine automatische Suche durchgeführt.";
    }

    const resultsEl = $("#autoMatchResults");
    if (!options.length) {
      resultsEl.innerHTML = `
        <div class="empty-state compact-auto-empty">
          <strong>Keine vergleichbaren Treffer</strong>
          <p>Suchprofil prüfen oder die Händlerdaten neu durchsuchen.</p>
        </div>`;
      return;
    }

    resultsEl.innerHTML = options.map((candidate, index) => {
      const store = retailer(candidate.store);
      const condition = offerConditionLabel(candidate.offer);
      const packageInfo = pricingPackageSummary(product, candidate.offer, candidate.pricing);
      const selected = profile.mode === "fixed" && profile.fixedCandidateId === candidate.id;

      return `
        <article class="auto-option-card" style="--auto-store:${store.color}">
          <div class="auto-option-rank">${index + 1}</div>
          <div class="auto-option-main">
            <div class="auto-option-store"><span class="market-dot" style="background:${store.color}"></span>${store.name}</div>
            <strong>${escapeHtml(candidate.name)}</strong>
            <div class="muted small">${escapeHtml(packageInfo)}</div>
            <div class="auto-option-quantity-detail">${escapeHtml(autoOptionQuantityDetails(candidate.pricing))}</div>
            ${condition ? `<div class="offer-extra"><span class="offer-badge condition">${escapeHtml(condition)}</span></div>` : ""}
          </div>
          <div class="auto-option-price">
            <strong class="${currentAutoMatchSort === "total" ? "is-sort-primary" : ""}">${money(candidate.pricing.lineTotal)}</strong>
            <span class="${currentAutoMatchSort === "unit" ? "is-sort-primary" : ""}">${candidate.pricing.effectiveBaseUnitPrice != null ? `${money(candidate.pricing.effectiveBaseUnitPrice)}/${candidate.pricing.baseUnit}` : ""}</span>
            <button class="auto-select-btn ${selected ? "is-selected" : ""}" data-auto-select-candidate="${escapeAttr(candidate.id)}" type="button" ${selected ? "disabled" : ""}>
              ${selected ? "Gewählt" : "Fest wählen"}
            </button>
            <button class="auto-exclude-btn" data-auto-exclude-candidate="${escapeAttr(candidate.id)}" type="button">Ausblenden</button>
          </div>
        </article>`;
    }).join("");
  }

  async function refreshCurrentAutoMatchProduct({ silent = false } = {}) {
    const product = productById(currentAutoMatchProductId);
    if (!product || autoMatchRefreshing) return;

    autoMatchRefreshing = true;
    renderAutoMatchSheet();
    renderMore();

    try {
      const result = await refreshAutoMatchesForProduct(product, { silent: true });
      saveState();
      renderAll();
      renderAutoMatchSheet();
      if (!silent) {
        showToast(result.errors.length
          ? `${result.updated} Treffer · ${result.errors.length} Fehler`
          : `${result.updated} Treffer aktualisiert`
        );
      }
    } finally {
      autoMatchRefreshing = false;
      renderAll();
      renderAutoMatchSheet();
    }
  }

  function useAutomaticMatching(productId = currentAutoMatchProductId) {
    const product = productById(productId);
    if (!product) return;
    product.matchingProfile = product.matchingProfile || {};
    product.matchingProfile.mode = "auto";
    product.matchingProfile.fixedCandidateId = null;
    saveState();
    renderAll();
    renderAutoMatchSheet();
    showToast("Automatisch günstigster Treffer aktiviert");
  }

  function selectFixedAutoCandidate(candidateId) {
    const product = productById(currentAutoMatchProductId);
    if (!product) return;
    const candidate = storedAutoCandidates(product).find(row => row.id === candidateId);
    if (!candidate) return;

    product.matchingProfile = product.matchingProfile || {};
    product.matchingProfile.mode = "fixed";
    product.matchingProfile.fixedCandidateId = candidate.id;
    saveState();
    renderAll();
    renderAutoMatchSheet();
    showToast(`${candidate.name} fest gewählt`);
  }

  function excludeAutoCandidate(candidateId) {
    const product = productById(currentAutoMatchProductId);
    if (!product) return;
    product.matchingProfile = product.matchingProfile || {};
    product.matchingProfile.excludedIds = Array.isArray(product.matchingProfile.excludedIds)
      ? product.matchingProfile.excludedIds
      : [];

    if (!product.matchingProfile.excludedIds.includes(candidateId)) {
      product.matchingProfile.excludedIds.push(candidateId);
    }

    if (product.matchingProfile.fixedCandidateId === candidateId) {
      product.matchingProfile.mode = "auto";
      product.matchingProfile.fixedCandidateId = null;
    }

    saveState();
    renderAll();
    renderAutoMatchSheet();
  }

  function resetAutoMatchExclusions() {
    const product = productById(currentAutoMatchProductId);
    if (!product) return;
    product.matchingProfile = product.matchingProfile || {};
    product.matchingProfile.excludedIds = [];
    saveState();
    renderAll();
    renderAutoMatchSheet();
    showToast("Ausblendungen zurückgesetzt");
  }

  function saveAutoMatchQuery() {
    const product = productById(currentAutoMatchProductId);
    if (!product) return;
    const query = String($("#autoMatchQuery")?.value || "").trim();
    if (query.length < 2) {
      showToast("Suchprofil benötigt mindestens 2 Zeichen");
      return;
    }

    product.matchingProfile = product.matchingProfile || {};
    product.matchingProfile.query = query;
    product.matchingProfile.queryAuto = false;
    product.matchingProfile.mode = "auto";
    product.matchingProfile.fixedCandidateId = null;
    product.autoMatches = { engineVersion: 0, updatedAt: null, query: null, stores: {}, counts: {} };
    saveState();
    renderAll();
    refreshCurrentAutoMatchProduct({ silent: false });
  }

  function renderMore() {
    $("#databaseList").innerHTML = state.products.map(p => {
      const counts = autoMatchCountsByStore(p);
      const total = autoMatchCount(p);
      const profile = matchingProfile(p);
      const autoState = p.autoMatches?.updatedAt ? "aktuell" : "noch nicht gesucht";

      return `
      <div class="database-item database-auto-item">
        <div class="database-auto-main">
          <strong>${escapeHtml(p.name)}</strong>
          <div class="muted">${escapeHtml(p.category)} · ${fmtAmount(p)}</div>
          <div class="auto-database-status">
            <span class="auto-database-badge ${profile.mode === "fixed" ? "is-fixed" : ""}">${profile.mode === "fixed" ? "Fest gewählt" : "Automatisch"}</span>
            <span>MPREIS ${counts.mpreis || 0}</span>
            <span>SPAR ${counts.spar || 0}</span>
            <span>T&G ${counts.tg || 0}</span>
            <span>BILLA ${counts.billa || 0}</span>
            <span>HOFER ${counts.hofer || 0}</span>
          </div>
          <div class="muted small">${total} passende Kandidaten · ${autoState}</div>
        </div>
        <div class="database-actions database-auto-actions">
          <button class="database-auto-review" data-auto-options-product="${p.id}" data-auto-options-quantity="1">Treffer prüfen</button>
          <button class="database-edit" data-edit-product="${p.id}">Bearbeiten</button>
          <button class="database-delete" data-delete-product="${p.id}">Löschen</button>
        </div>
        <details class="manual-links-details">
          <summary>Manuelle Verknüpfung (optional)</summary>
          <div class="manual-links-row">
            <button class="database-live-btn ${p.liveLinks?.mpreis ? "is-linked" : ""}" data-link-mpreis="${p.id}">${p.liveLinks?.mpreis ? "MPREIS ✓" : "MPREIS"}</button>
            <button class="database-live-btn spar-live-btn ${p.liveLinks?.spar ? "is-linked" : ""}" data-link-spar="${p.id}">${p.liveLinks?.spar ? "SPAR ✓" : "SPAR"}</button>
            <button class="database-live-btn tg-live-btn ${p.liveLinks?.tg ? "is-linked" : ""}" data-link-tg="${p.id}">${p.liveLinks?.tg ? "T&G ✓" : "T&G"}</button>
          </div>
        </details>
      </div>`;
    }).join("");

    const autoRefreshButton = $("#refreshAutoMatchesBtn");
    if (autoRefreshButton) {
      autoRefreshButton.disabled = autoMatchRefreshing;
      autoRefreshButton.textContent = autoMatchRefreshing ? "Sucht …" : "Neu suchen";
    }

    renderMpreisLiveStatus();
    renderSparLiveStatus();
    renderTgLiveStatus();
    renderBillaLiveStatus();
    renderHoferLiveStatus();

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
    const offerRows = validOffers(p).map(normalizedOffer).map(offer => ({
      offer,
      pricing: offerPricingForTarget(p, offer, 1)
    })).sort((a,b) => {
      if (a.pricing && !b.pricing) return -1;
      if (!a.pricing && b.pricing) return 1;
      if (!a.pricing && !b.pricing) return offerPrice(a.offer) - offerPrice(b.offer);
      return a.pricing.lineTotal - b.pricing.lineTotal;
    });
    const comparableRows = offerRows.filter(row => row.pricing);
    const visibleOfferRows = offerRows.slice(0, 12);
    const history = productHistory(p);
    const stats = productPriceStats(p);

    $("#productDetailContent").innerHTML = `
      <div class="product-meta" style="margin-bottom:6px">${escapeHtml(p.brand || "")} · ${escapeHtml(p.category)}</div>
      <div class="detail-product-edit-row">
        <button class="comparison-amount-btn detail-comparison-btn" data-edit-comparison="${p.id}" type="button">
          Vergleichsmenge: <strong>${fmtAmount(p)}</strong> ✎
        </button>
        <button class="article-edit-btn detail-edit-product-btn" data-edit-product="${p.id}" type="button">
          ✎ Artikel bearbeiten
        </button>
        <button class="article-edit-btn detail-edit-product-btn" data-auto-options-product="${p.id}" data-auto-options-quantity="1" type="button">
          ${autoMatchCount(p) ? "10 Alternativen" : "Auto-Treffer"}
        </button>
      </div>

      ${stats ? `<div class="price-stat-grid">
        <div class="price-stat"><span>Tiefst</span><strong>${money(stats.min)}</strong></div>
        <div class="price-stat"><span>Ø Verlauf</span><strong>${money(stats.avg)}</strong></div>
        <div class="price-stat"><span>Höchst</span><strong>${money(stats.max)}</strong></div>
      </div><div class="muted small comparison-stat-note">Preisverlauf auf ${fmtAmount(p)} normiert</div>` : ""}

      <div>
        ${visibleOfferRows.length ? visibleOfferRows.map((row) => {
          const o = row.offer;
          const pricing = row.pricing;
          const r = retailer(o.store);
          const fresh = freshnessInfo(o);
          const condition = offerConditionLabel(o);
          const cheapest = pricing && comparableRows[0]?.offer === o;

          return `<div class="detail-offer ${pricing ? "" : "not-comparable"}">
            <div>
              <div class="market-label"><span class="market-dot" style="background:${r.color}"></span>${r.name}${cheapest ? " · günstigster Vergleich" : ""}</div>
              <div class="product-meta">Gebinde: ${escapeHtml(offerPackageLabel(p, o))}${o.unitPrice ? ` · ${money(o.unitPrice)}/${escapeHtml(o.unitPriceUnit || "")}` : ""}</div>
              ${pricing ? `<div class="product-meta comparison-package-meta">${escapeHtml(pricingPackageSummary(p, o, pricing))}</div>` : `<div class="product-meta comparison-incompatible">Nicht mit ${fmtAmount(p)} vergleichbar – Gebindeangabe fehlt oder Einheit passt nicht.</div>`}
              <div class="offer-extra">
                ${o.salePrice != null && pricing?.activeSale ? `<span class="offer-badge">Aktion</span>` : ""}
                ${condition ? `<span class="offer-badge condition">${escapeHtml(condition)}</span>` : ""}
                <span class="freshness-badge ${fresh.current ? "current" : ""}">${escapeHtml(fresh.label)}</span>
              </div>
              <div class="offer-source">Quelle: ${escapeHtml(o.source || "unbekannt")} · Abruf ${escapeHtml((o.retrievedAt || o.updatedAt || "").replace("T", " ").slice(0,16))}</div>
            </div>
            <div>
              <div class="price ${pricing?.activeSale ? "sale" : ""}">${pricing ? money(pricing.lineTotal) : money(offerPrice(o))}</div>
              <div class="product-meta comparison-price-label">${pricing ? `für ${fmtAmount(p)}` : "Gebindepreis"}</div>
              ${pricing?.effectiveBaseUnitPrice ? `<div class="product-meta">${money(pricing.effectiveBaseUnitPrice)}/${pricing.baseUnit}</div>` : ""}
            </div>
          </div>`;
        }).join("") : `<div class="empty-state"><p>Für diesen Artikel sind noch keine Preise hinterlegt.</p></div>`}
        ${offerRows.length > visibleOfferRows.length ? `<button class="secondary-btn full detail-more-options" data-auto-options-product="${p.id}" data-auto-options-quantity="1">Weitere automatische Alternativen anzeigen</button>` : ""}
      </div>

      ${history.length ? `
        <details class="history-panel">
          <summary>Preisverlauf · ${history.length} Einträge</summary>
          <div class="history-list">
            ${history.slice(0,18).map(h => `
              <div class="history-row">
                <div class="history-market"><span class="market-dot" style="background:${retailer(h.store).color}"></span><strong>${retailer(h.store).name}</strong><small>${escapeHtml(h.packageLabel || "")}</small></div>
                <span class="history-date">${formatDate(h.date)}</span>
                <strong>${h.normalizedPrice != null ? money(h.normalizedPrice) : money(h.price)}</strong>
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
    const categoryOptions = categories.map(c => `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`).join("");
    $("#newProductCategory").innerHTML = categoryOptions;
    if ($("#editProductCategory")) $("#editProductCategory").innerHTML = categoryOptions;
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
      offers: [],
      liveLinks: {},
      matchingProfile: {
        mode: "auto",
        query: formData.name,
        queryAuto: true,
        fixedCandidateId: null,
        exclusions: [],
        excludedIds: []
      },
      autoMatches: { engineVersion: 0, updatedAt: null, query: null, stores: {}, counts: {} }
    };
    if (formData.store && formData.regularPrice) {
      const unitPrice = calculateUnitPrice(Number(formData.salePrice || formData.regularPrice), product.amount, product.unit);
      const priceNow = Number(formData.salePrice || formData.regularPrice);
      product.offers.push({
        retailerProductId: `${formData.store}_${id}`,
        store: formData.store,
        packageAmount: product.amount,
        packageUnit: product.unit,
        packageAmountKnown: true,
        packageLabel: fmtAmount(product),
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
    setTimeout(() => refreshAutoMatchesForProduct(product, { silent: true })
      .then(() => { saveState(); renderAll(); })
      .catch(() => {}), 100);
  }

  function calculateUnitPrice(price, amount, unit) {
    if (!amount || !price) return { value: null, unit: "" };
    if (unit === "g") return { value: +(price / (amount / 1000)).toFixed(2), unit: "kg" };
    if (unit === "ml") return { value: +(price / (amount / 1000)).toFixed(2), unit: "l" };
    if (unit === "kg") return { value: +(price / amount).toFixed(2), unit: "kg" };
    if (unit === "l") return { value: +(price / amount).toFixed(2), unit: "l" };
    return { value: +(price / amount).toFixed(2), unit: "Stk" };
  }


  function openEditProduct(productId) {
    const product = productById(productId);
    if (!product) return;

    populateForms();
    currentEditProductId = productId;

    $("#editProductId").value = product.id;
    $("#editProductTitle").textContent = product.name;
    $("#editProductName").value = product.name || "";
    $("#editProductBrand").value = product.brand || "";
    $("#editProductCategory").value = product.category || "Sonstiges";
    $("#editProductAmount").value = Number(product.amount) || 1;
    $("#editProductUnit").value = normalizeMeasureUnit(product.unit) || "Stk";

    const linkCount = Object.values(product.liveLinks || {}).filter(Boolean).length;
    const offerCount = (product.offers || []).length;
    const shoppingCount = state.shopping
      .filter(item => item.productId === product.id)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

    const parts = [];
    if (linkCount) parts.push(`${linkCount} Händler-Verknüpfung${linkCount === 1 ? "" : "en"}`);
    if (offerCount) parts.push(`${offerCount} Preis${offerCount === 1 ? "" : "e"}`);
    if (shoppingCount) parts.push(`${shoppingCount}× auf der Einkaufsliste`);

    $("#editProductPreserveNote").innerHTML = parts.length
      ? `<strong>Bleibt erhalten:</strong> ${escapeHtml(parts.join(" · "))}`
      : `<strong>Bleibt erhalten:</strong> Artikel-ID und alle bestehenden Zuordnungen`;

    openSheet("editProductSheet");
  }

  function updateProductCore(product, values) {
    if (!product) return false;

    const previousIdentity = `${product.name || ""}|${product.brand || ""}|${product.category || ""}|${normalizeMeasureUnit(product.unit) || ""}`;
    const name = String(values.name || "").trim();
    const brand = String(values.brand || "").trim();
    const category = String(values.category || "").trim();
    const amount = Number(values.amount);
    const unit = normalizeMeasureUnit(values.unit);

    if (!name || !categories.includes(category)) return false;
    if (!Number.isFinite(amount) || amount <= 0 || !unit) return false;
    if (!normalizeMeasure(amount, unit)) return false;

    // Intentionally update only editable core fields.
    // ID, liveLinks, offers, history, favorite and shopping references stay intact.
    product.name = name;
    product.brand = brand;
    product.category = category;
    product.amount = cleanComparisonAmount(amount, unit);
    product.unit = unit;

    product.matchingProfile = product.matchingProfile || {};
    if (product.matchingProfile.queryAuto !== false) {
      product.matchingProfile.query = name;
      product.matchingProfile.queryAuto = true;
    }

    const nextIdentity = `${name}|${brand}|${category}|${unit}`;
    if (previousIdentity !== nextIdentity) {
      product.matchingProfile.mode = "auto";
      product.matchingProfile.fixedCandidateId = null;
      product.autoMatches = { engineVersion: 0, updatedAt: null, query: null, stores: {}, counts: {} };
    }

    return true;
  }

  function saveEditedProduct() {
    const productId = currentEditProductId || $("#editProductId")?.value;
    const product = productById(productId);
    if (!product) {
      showToast("Artikel wurde nicht gefunden");
      return;
    }

    const ok = updateProductCore(product, {
      name: $("#editProductName").value,
      brand: $("#editProductBrand").value,
      category: $("#editProductCategory").value,
      amount: $("#editProductAmount").value,
      unit: $("#editProductUnit").value
    });

    if (!ok) {
      showToast("Bitte gültige Artikeldaten eingeben");
      return;
    }

    const editedProduct = product;
    currentEditProductId = null;
    saveState();
    renderAll();
    closeSheets();
    showToast("Artikel aktualisiert");

    if (autoMatchesNeedRefresh(editedProduct)) {
      setTimeout(() => refreshAutoMatchesForProduct(editedProduct, { silent: true })
        .then(() => { saveState(); renderAll(); })
        .catch(() => {}), 100);
    }
  }

  function deleteProduct(productId) {
    state.products = state.products.filter(p => p.id !== productId);
    state.shopping = state.shopping.filter(i => i.productId !== productId);
    saveState(); renderAll(); showToast("Artikel gelöscht");
  }

  function openComparisonAmount(productId) {
    const product = productById(productId);
    if (!product) return;

    currentComparisonProductId = productId;
    $("#comparisonProductId").value = productId;
    $("#comparisonAmountTitle").textContent = product.name;
    $("#comparisonAmount").value = Number(product.amount);
    $("#comparisonUnit").value = normalizeMeasureUnit(product.unit) || "Stk";
    renderComparisonPreview();
    openSheet("comparisonAmountSheet");
  }

  function renderComparisonPreview() {
    const product = productById(currentComparisonProductId);
    const preview = $("#comparisonPreview");
    if (!product || !preview) return;

    const amount = Number($("#comparisonAmount")?.value);
    const unit = $("#comparisonUnit")?.value;
    const target = normalizeMeasure(amount, unit);
    if (!target) {
      preview.textContent = "Bitte eine gültige Vergleichsmenge eingeben.";
      return;
    }

    const draft = { ...product, amount, unit };
    const rows = validOffers(product).map(normalizedOffer).map(offer => {
      const pricing = offerPricingForTarget(draft, offer, 1);
      return pricing ? { offer, pricing } : null;
    }).filter(Boolean).sort((a,b) => a.pricing.lineTotal - b.pricing.lineTotal);

    if (!rows.length) {
      preview.innerHTML = `<strong>${escapeHtml(fmtAmount(draft))}</strong><span>Für die vorhandenen Händlerverknüpfungen ist diese Einheit derzeit nicht vergleichbar.</span>`;
      return;
    }

    preview.innerHTML = `
      <strong>${escapeHtml(fmtAmount(draft))}</strong>
      <span>${rows.length} Markt${rows.length === 1 ? "" : "e"} direkt vergleichbar · günstigster bekannter Einkauf ${money(rows[0].pricing.lineTotal)}</span>`;
  }

  function saveComparisonAmount() {
    const product = productById(currentComparisonProductId || $("#comparisonProductId")?.value);
    if (!product) return;

    const amount = Number($("#comparisonAmount").value);
    const unit = $("#comparisonUnit").value;
    if (!Number.isFinite(amount) || amount <= 0 || !normalizeMeasure(amount, unit)) {
      showToast("Ungültige Vergleichsmenge");
      return;
    }

    product.amount = cleanComparisonAmount(amount, unit);
    product.unit = unit;
    saveState();
    renderAll();
    closeSheets();
    showToast(`Vergleichsmenge: ${fmtAmount(product)}`);
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

    const editComparison = e.target.closest("[data-edit-comparison]");
    if (editComparison) return openComparisonAmount(editComparison.dataset.editComparison);

    const editProduct = e.target.closest("[data-edit-product]");
    if (editProduct) return openEditProduct(editProduct.dataset.editProduct);

    const autoOptions = e.target.closest("[data-auto-options-product]");
    if (autoOptions) {
      return openAutoMatchSheet(
        autoOptions.dataset.autoOptionsProduct,
        autoOptions.dataset.autoOptionsQuantity || 1
      );
    }

    const autoStoreFilter = e.target.closest("[data-auto-match-store]");
    if (autoStoreFilter) {
      currentAutoMatchStore = autoStoreFilter.dataset.autoMatchStore;
      return renderAutoMatchSheet();
    }

    const autoSort = e.target.closest("[data-auto-match-sort]");
    if (autoSort) {
      const mode = autoSort.dataset.autoMatchSort;
      if (["unit", "total", "fit"].includes(mode)) {
        currentAutoMatchSort = mode;
        state.settings.autoOptionSort = mode;
        saveState();
        return renderAutoMatchSheet();
      }
    }

    const autoSelect = e.target.closest("[data-auto-select-candidate]");
    if (autoSelect) return selectFixedAutoCandidate(autoSelect.dataset.autoSelectCandidate);

    const autoExclude = e.target.closest("[data-auto-exclude-candidate]");
    if (autoExclude) return excludeAutoCandidate(autoExclude.dataset.autoExcludeCandidate);

    const autoMode = e.target.closest("#useAutoMatchModeBtn");
    if (autoMode) return useAutomaticMatching();

    const refreshAutoProduct = e.target.closest("#refreshAutoMatchProductBtn");
    if (refreshAutoProduct) return refreshCurrentAutoMatchProduct({ silent: false });

    const saveAutoQuery = e.target.closest("#saveAutoMatchQueryBtn");
    if (saveAutoQuery) return saveAutoMatchQuery();

    const resetAutoExclusions = e.target.closest("#resetAutoMatchExclusionsBtn");
    if (resetAutoExclusions) return resetAutoMatchExclusions();

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

    const showBillaPromotions = e.target.closest("#showBillaPromotionsBtn");
    if (showBillaPromotions) return openBillaPromotions();

    const showHoferPromotions = e.target.closest("#showHoferPromotionsBtn");
    if (showHoferPromotions) return openHoferPromotions();

    const mpreisFlyer = e.target.closest("#openMpreisFlyerBtn");
    if (mpreisFlyer) return openOfficialFlyer("mpreis");

    const sparFlyer = e.target.closest("#openSparFlyerBtn");
    if (sparFlyer) return openOfficialFlyer("spar");

    const tgFlyer = e.target.closest("#openTgFlyerBtn");
    if (tgFlyer) return openTgFlyer();

    const billaFlyer = e.target.closest("#openBillaFlyerBtn");
    if (billaFlyer) return openOfficialFlyer("billa");

    const hoferFlyer = e.target.closest("#openHoferFlyerBtn");
    if (hoferFlyer) return openOfficialFlyer("hofer");

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

  $("#comparisonAmount").addEventListener("input", renderComparisonPreview);
  $("#comparisonUnit").addEventListener("change", renderComparisonPreview);
  $("#comparisonAmountForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveComparisonAmount();
  });

  $("#editProductForm").addEventListener("submit", (e) => {
    e.preventDefault();
    saveEditedProduct();
  });

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

  $("#refreshAutoMatchesBtn").addEventListener("click", () => {
    refreshAllAutoMatches({ force: true, silent: false });
  });

  $("#syncMpreisBtn").addEventListener("click", reloadAndSyncMpreis);
  $("#syncSparBtn").addEventListener("click", reloadAndSyncSpar);
  $("#syncTgBtn").addEventListener("click", reloadAndSyncTg);
  $("#syncBillaBtn").addEventListener("click", reloadAndSyncBilla);
  $("#syncHoferBtn").addEventListener("click", reloadAndSyncHofer);
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

  refreshBillaPublicStatus().then(() => {
    if (shouldAutoSyncBilla()) {
      setTimeout(() => syncLinkedBilla({ silent: true }).catch(() => {}), 850);
    }
  });

  refreshHoferPublicStatus();

  // Automatic candidate pools are local/private and refreshed independently
  // from the old 1:1 live links. Existing cached candidates render instantly;
  // stale/missing pools are rebuilt in the background.
  setTimeout(() => {
    refreshAllAutoMatches({ force: false, silent: true }).catch(() => {});
  }, 1100);
})();
