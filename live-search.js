(() => {
  "use strict";

  const CATEGORY_DEFINITIONS = [
    {
      id: "bier",
      aliases: ["bier", "biere", "bierkasten", "bierkiste", "kiste bier", "maerzen", "märzen", "pils", "lager"],
      markers: [" bier ", " märzen ", " maerzen ", " pils ", " pilsner ", " radler ", " weizenbier ", " weissbier ", " weißbier ", " helles ", " goldbräu ", " goldbraeu ", " zwickl ", " bockbier "],
      brands: ["gösser", "goesser", "stiegl", "zipfer", "puntigamer", "ottakringer", "schwechater", "wieselburger", "hirter", "villacher", "egger", "kaiser", "murauer", "mohren", "trumer", "zillertal bier", "augustiner", "hacker pschorr", "corona", "heineken", "budweiser", "budvar", "pilsner urquell", "bitburger", "warsteiner", "krombacher", "erdinger", "paulaner", "franziskaner", "guinness", "bierol"]
    },
    {
      id: "kaffee",
      aliases: ["kaffee", "kaffeebohnen", "espresso", "caffe", "café", "cafe", "bohnenkaffee"],
      markers: [" kaffee ", " espresso ", " caffè ", " caffe ", " kaffeebohnen ", " cappuccino "],
      brands: ["lavazza", "illy", "segafredo", "dallmayr", "jacobs", "tchibo", "meinl", "alps coffee"]
    },
    {
      id: "milch",
      aliases: ["milch", "vollmilch", "haltbarmilch", "h milch", "frischmilch"],
      markers: [" vollmilch ", " h vollmilch ", " haltbarmilch ", " frischmilch "],
      brands: []
    },
    {
      id: "käse",
      aliases: ["käse", "kaese", "gouda", "emmentaler", "mozzarella", "parmesan"],
      markers: [" käse ", " kaese ", " gouda ", " emmentaler ", " mozzarella ", " parmesan "],
      brands: []
    },
    {
      id: "joghurt",
      aliases: ["joghurt", "jogurt", "yoghurt"],
      markers: [" joghurt ", " jogurt ", " yoghurt "],
      brands: ["danone"]
    },
    {
      id: "nudeln",
      aliases: ["nudeln", "pasta", "teigwaren", "spaghetti", "penne", "fusilli", "tagliatelle"],
      markers: [" nudeln ", " pasta ", " spaghetti ", " penne ", " fusilli ", " tagliatelle ", " macaroni "],
      brands: ["barilla", "de cecco", "divella"]
    },
    {
      id: "wasser",
      aliases: ["wasser", "mineralwasser"],
      markers: [" mineralwasser ", " wasser still ", " wasser prickelnd "],
      brands: ["vöslauer", "voeslauer", "romerquelle", "römerquelle", "silberquelle", "alpquell"]
    },
    {
      id: "limonade",
      aliases: ["limonade", "limo", "cola", "softdrink", "softdrinks"],
      markers: [" cola ", " limonade ", " cola mix ", " softdrink "],
      brands: ["coca cola", "coca-cola", "pepsi", "almdudler", "schweppes"]
    },
    {
      id: "energy",
      aliases: ["energy", "energydrink", "energy drink"],
      markers: [" energy ", " energydrink ", " energy drink "],
      brands: ["red bull", "monster"]
    },
    {
      id: "saft",
      aliases: ["saft", "fruchtsaft", "fruchtsäfte", "smoothie", "nektar"],
      markers: [" saft ", " fruchtsaft ", " smoothie ", " nektar "],
      brands: ["rauch", "pfanner"]
    },
    {
      id: "wein",
      aliases: ["wein", "rotwein", "weißwein", "weisswein", "rosewein", "roséwein"],
      markers: [" rotwein ", " weißwein ", " weisswein ", " roséwein ", " rosewein ", " zweigelt ", " grüner veltliner ", " gruener veltliner ", " chardonnay ", " lugana "],
      brands: []
    },
    {
      id: "sekt",
      aliases: ["sekt", "prosecco", "schaumwein", "champagner"],
      markers: [" sekt ", " prosecco ", " schaumwein ", " champagner "],
      brands: ["valdo"]
    },
    {
      id: "schokolade",
      aliases: ["schokolade", "schoko", "tafel schokolade"],
      markers: [" schokolade ", " schoko ", " pralinen "],
      brands: ["milka", "lindt", "ritter sport"]
    },
    {
      id: "chips",
      aliases: ["chips", "snacks", "knabbergebäck", "knabberzeug"],
      markers: [" chips ", " tortillas ", " tortilla chips ", " knabbergebäck "],
      brands: ["kellys", "kelly's", "pringles", "lorenz", "amica"]
    },
    {
      id: "butter",
      aliases: ["butter", "teebutter"],
      markers: [" butter ", " teebutter "],
      brands: []
    },
    {
      id: "toilettenpapier",
      aliases: ["toilettenpapier", "klopapier", "wc papier"],
      markers: [" toilettenpapier ", " wc papier "],
      brands: ["cosy"]
    },
    {
      id: "waschmittel",
      aliases: ["waschmittel", "waschpulver", "waschgel"],
      markers: [" waschmittel ", " waschpulver ", " waschgel "],
      brands: ["ariel", "persil", "fewa"]
    },
    {
      id: "katzenfutter",
      aliases: ["katzenfutter", "katze", "katzen"],
      markers: [" katzenfutter ", " katzensnack "],
      brands: ["whiskas", "dreamies", "felix"]
    },
    {
      id: "hundefutter",
      aliases: ["hundefutter", "hund", "hunde"],
      markers: [" hundefutter ", " hundesnack "],
      brands: ["pedigree"]
    }
  ];

  const BRAND_STOP = new Set([
    "bio", "premium", "classic", "original", "natur", "jeden", "meine",
    "mein", "unsere", "unser", "fresh", "best", "selection", "spar",
    "mpreis", "s budget", "s-budget", "t&g", "t", "m", "verschiedene",
    "vergleichbar", "ohne", "marke"
  ]);

  const GENERIC_BRANDS = new Set([
    "verschiedene", "vergleichbar", "ohne marke", "diverse", "eigenmarke"
  ]);

  const MATCH_ENGINE_VERSION = 2;

  const TRUSTED_BRAND_CATEGORIES = {
    bier: [
      "gösser", "goesser", "stiegl", "zipfer", "puntigamer", "ottakringer",
      "schwechater", "wieselburger", "hirter", "villacher", "egger", "kaiser",
      "murauer", "mohren", "trumer", "zillertal bier", "augustiner",
      "hacker pschorr", "corona", "heineken", "budweiser", "budvar",
      "pilsner urquell", "bitburger", "warsteiner", "krombacher", "erdinger",
      "paulaner", "franziskaner", "guinness", "bierol"
    ],
    kaffee: [
      "lavazza", "illy", "segafredo", "dallmayr", "jacobs",
      "julius meinl", "meinl", "alps coffee"
    ],
    wasser: [
      "vöslauer", "voeslauer", "römerquelle", "romerquelle",
      "silberquelle", "alpquell"
    ],
    limonade: ["coca cola", "coca-cola", "pepsi", "almdudler", "schweppes"],
    energy: ["red bull", "monster"],
    sekt: ["valdo"],
    schokolade: ["milka", "lindt", "ritter sport"],
    toilettenpapier: ["cosy"],
    waschmittel: ["ariel", "persil", "fewa"],
    katzenfutter: ["whiskas", "dreamies"],
    hundefutter: ["pedigree"]
  };

  const TRUSTED_BRANDS_PREPARED = Object.fromEntries(
    Object.entries(TRUSTED_BRAND_CATEGORIES).map(([category, brands]) => [
      category,
      brands.map(normalize)
    ])
  );

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim();
  }

  function padded(value) {
    return ` ${normalize(value)} `;
  }

  const prepared = CATEGORY_DEFINITIONS.map(def => ({
    ...def,
    normalizedAliases: [...new Set(def.aliases.map(normalize))],
    normalizedMarkers: [...new Set(def.markers.map(normalize).filter(Boolean))],
    normalizedBrands: [...new Set(def.brands.map(normalize).filter(Boolean))]
  }));

  function nameHasMarker(name, marker) {
    const paddedName = ` ${name} `;
    return paddedName.includes(` ${marker} `);
  }

  function trustedBrandCategoriesForName(name) {
    const normalizedName = normalize(name);
    const result = [];

    Object.entries(TRUSTED_BRANDS_PREPARED).forEach(([category, brands]) => {
      const hit = brands.some(brand =>
        normalizedName === brand ||
        normalizedName.startsWith(`${brand} `)
      );
      if (hit) result.push(category);
    });

    return result;
  }

  function exactKnownBrandCategories(name) {
    const normalizedName = normalize(name);
    const result = [];

    prepared.forEach(def => {
      const exact = def.normalizedBrands.some(brand => normalizedName === brand);
      if (exact) result.push(def.id);
    });

    return result;
  }

  function directCategories(item) {
    const name = normalize(item?.name || "");
    const result = [];

    for (const def of prepared) {
      const aliasMatch = def.normalizedAliases.some(alias =>
        name === alias || nameHasMarker(name, alias)
      );
      const markerMatch = def.normalizedMarkers.some(marker =>
        nameHasMarker(name, marker)
      );
      if (aliasMatch || markerMatch) result.push(def.id);
    }

    result.push(...exactKnownBrandCategories(name));
    result.push(...trustedBrandCategoriesForName(name));

    return [...new Set(result)];
  }

  function conflictingCategories(entryCategories, profileCategories) {
    if (!Array.isArray(entryCategories) || entryCategories.length <= 1) return [];
    const allowed = new Set(profileCategories || []);
    return entryCategories.filter(category => !allowed.has(category));
  }

  function brandKey(item) {
    const name = normalize(item?.name || "");
    if (!name) return "";
    const words = name.split(/\s+/).filter(Boolean);
    if (!words.length) return "";

    const first = words[0];
    if (first.length < 4 || BRAND_STOP.has(first)) return "";
    return first;
  }

  function buildIndex(items) {
    const rows = (items || []).map(item => {
      const name = normalize(item?.name || "");
      const description = normalize(item?.description || "");
      return {
        item,
        name,
        description,
        baseHay: `${name} ${description}`.trim(),
        originalName: String(item?.name || ""),
        brandKey: brandKey(item),
        categories: directCategories(item)
      };
    });

    // Generalisierung für marken-only Datensätze: Wenn Produkte einer Marke
    // sehr deutlich einer Kategorie zuzuordnen sind, bekommt auch ein Eintrag,
    // der nur den Markennamen trägt, diese Suchkategorie.
    const stats = new Map();
    rows.forEach(row => {
      if (!row.brandKey || !row.categories.length) return;
      if (!stats.has(row.brandKey)) stats.set(row.brandKey, new Map());
      const map = stats.get(row.brandKey);
      row.categories.forEach(category => map.set(category, (map.get(category) || 0) + 1));
    });

    const propagated = new Map();
    stats.forEach((map, brand) => {
      const ranked = [...map.entries()].sort((a, b) => b[1] - a[1]);
      const total = ranked.reduce((sum, [, count]) => sum + count, 0);
      if (!ranked.length || ranked[0][1] < 2 || ranked[0][1] / total < 0.65) return;

      // Only propagate category knowledge for brands explicitly known for that
      // category. This avoids broad manufacturers such as Schärdinger turning
      // "Butterkäse" or "Buttermilch" into Butter candidates merely because
      // many products of the same manufacturer are butter.
      const category = ranked[0][0];
      const def = prepared.find(entry => entry.id === category);
      if (!def?.normalizedBrands?.includes(brand)) return;

      propagated.set(brand, category);
    });

    rows.forEach(row => {
      const inferred = propagated.get(row.brandKey);
      const brandOnly = Boolean(
        inferred &&
        row.categories.length === 0 &&
        row.name === row.brandKey
      );

      if (brandOnly && !row.categories.includes(inferred)) {
        row.categories.push(inferred);
      }

      const aliases = row.categories.flatMap(category => {
        const def = prepared.find(entry => entry.id === category);
        return def ? [def.id, ...def.normalizedAliases] : [category];
      });

      row.searchHay = `${row.baseHay} ${[...new Set(aliases)].join(" ")}`.trim();
    });

    return rows;
  }

  function score(entry, query) {
    const q = normalize(query);
    if (!q) return 0;
    const tokens = q.split(/\s+/).filter(Boolean);
    const name = entry?.name || "";
    const baseHay = entry?.baseHay || `${entry?.name || ""} ${entry?.description || ""}`;
    const searchHay = entry?.searchHay || baseHay;

    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q)) return 2;
    if (tokens.every(token => baseHay.includes(token))) return 3;
    if (tokens.every(token => searchHay.includes(token))) return 4;

    const directMatches = tokens.filter(token => baseHay.includes(token)).length;
    if (directMatches) return 10 - Math.min(directMatches, 6);

    const enrichedMatches = tokens.filter(token => searchHay.includes(token)).length;
    if (enrichedMatches) return 20 - Math.min(enrichedMatches, 6);

    return 999;
  }

  function categoryIdsForText(value) {
    const text = padded(value);
    const compact = normalize(value);
    const result = [];

    prepared.forEach(def => {
      const aliasMatch = def.normalizedAliases.some(alias =>
        compact === alias || text.includes(` ${alias} `)
      );
      const brandMatch = def.normalizedBrands.some(brand =>
        compact === brand || compact.startsWith(`${brand} `) || text.includes(` ${brand} `)
      );
      const markerMatch = def.normalizedMarkers.some(marker =>
        text.includes(` ${marker} `)
      );
      if (aliasMatch || brandMatch || markerMatch) result.push(def.id);
    });

    return [...new Set(result)];
  }

  function specificBrand(product) {
    const full = normalize(product?.brand || "");
    if (!full || /\b(vergleichbar|verschiedene|diverse|ohne marke)\b/.test(full)) return "";

    const raw = String(product?.brand || "").split("/")[0].trim();
    const brand = normalize(raw);
    if (!brand || GENERIC_BRANDS.has(brand)) return "";
    return brand;
  }

  function automaticExclusions(query, categoryIds) {
    const q = padded(query);
    const exclusions = [];

    if (categoryIds.includes("bier")) {
      if (!q.includes(" radler ")) exclusions.push("radler");
      if (!q.includes(" alkoholfrei ") && !q.includes(" 0 0 ")) {
        exclusions.push("alkoholfrei", "alkfrei", "alkfr", "alk fr", "0 0");
      }
      exclusions.push(
        "biersenf", "bierkase", "bierkäse", "dosenadapter", "preisel",
        "af"
      );
    }

    if (categoryIds.includes("butter")) {
      exclusions.push(
        "croissant", "toast", "zopf", "stollen", "brioche", "breze",
        "brezel", "laugenspitz", "pinze", "keks", "kekse", "gebäck", "geback",
        "popcorn", "strudel", "nusskrone", "krone", "marillenspitz",
        "baguette", "flutes", "schnecke", "brille", "kipferl",
        "madeleine", "sables", "waffel", "waffeln", "cracker", "chicken",
        "gemüse", "gemuse", "buttermilch", "butterkase", "butterkäse",
        "butterschmalz", "butterdose", "peanut", "truffel", "trüffel",
        "krauter", "kräuter", "knoblauch", "margarine", "rama",
        "skin", "lip", "lotion", "balsam", "dusch", "topfengolatsche",
        "khorasan", "brot", "spekulatius", "rosinen", "cookies",
        "kohlrabi", "aroma", "vanille", "spargel", "sandwich", "salami",
        "honigzopf", "mürbteig", "murbteig", "shortbread", "backstube",
        "plunder", "protein bar", "germteig", "blätterteig", "blatterteig",
        "porridge", "body", "toilettentücher", "toilettentucher", "shea",
        "kakao", "streichgenuss", "rapsöl", "rapsol", "olivenöl", "olivenol",
        "halbfett", "fettreduziert", "florentiner", "linzeraugen"
      );
    }

    if (categoryIds.includes("limonade") && q.includes(" original ")) {
      exclusions.push("zero", "light", "cherry", "vanilla", "koffeinfrei");
    }

    if (categoryIds.includes("kaffee") && (q.includes(" bohnen ") || q.includes(" crema "))) {
      exclusions.push(
        "kapsel", "kapseln", "pads", "instant", "löslich", "loeslich",
        "gemahlen", "filterkaffee", "tassimo", "nespresso", "dolce gusto"
      );
    }

    if (categoryIds.includes("nudeln") && q.includes(" spaghetti ")) {
      exclusions.push(
        "fix", "sauce", "bolognese", "carbonara", "napoli",
        "fertiggericht", "snack", "suppe"
      );
    }

    if (categoryIds.includes("milch") && q.includes(" vollmilch ")) {
      exclusions.push("hafer", "soja", "mandel", "kokos");
    }

    return [...new Set(exclusions.map(normalize).filter(Boolean))];
  }

  function profileForProduct(product) {
    const stored = product?.matchingProfile || {};
    const query = String(stored.query || product?.name || "").trim();
    const combined = `${query} ${product?.brand || ""}`;
    const categoryIds = Array.isArray(stored.categoryIds) && stored.categoryIds.length
      ? stored.categoryIds.map(normalize)
      : categoryIdsForText(combined);

    const explicitExclusions = Array.isArray(stored.exclusions)
      ? stored.exclusions.map(normalize).filter(Boolean)
      : [];

    const normalizedQuery = normalize(query);
    let requiredAny = [];

    if (normalizedQuery.includes("spaghetti")) {
      requiredAny = ["spaghetti", "spaghettini", "spaghettoni"];
    } else if (normalizedQuery.includes("vollmilch")) {
      requiredAny = ["vollmilch"];
    } else if (normalizedQuery.includes("teebutter")) {
      requiredAny = ["teebutter"];
    } else if (
      categoryIds.includes("kaffee") &&
      /\b(bohne|bohnen|crema)\b/.test(normalizedQuery)
    ) {
      requiredAny = [
        "bohne", "bohnen", "kaffeebohnen",
        "crema", "espresso", "caffe", "cafe"
      ];
    }

    return {
      query,
      normalizedQuery,
      categoryIds,
      requiredAny,
      requiredBrand: stored.requiredBrand != null
        ? normalize(stored.requiredBrand)
        : specificBrand(product),
      exclusions: [...new Set([
        ...automaticExclusions(query, categoryIds),
        ...explicitExclusions
      ])],
      excludedIds: Array.isArray(stored.excludedIds)
        ? stored.excludedIds.map(String)
        : []
    };
  }

  function matchProfile(entry, profile) {
    const p = profile || {};
    const nameHay = entry?.name || "";
    const categories = Array.isArray(entry?.categories) ? entry.categories : [];

    if (Array.isArray(p.categoryIds) && p.categoryIds.length) {
      if (!p.categoryIds.some(id => categories.includes(id))) {
        return { matched: false, score: 999, reason: "category" };
      }

      const conflicts = conflictingCategories(categories, p.categoryIds);
      if (conflicts.length) {
        return {
          matched: false,
          score: 999,
          reason: `category-conflict:${conflicts.join(",")}`
        };
      }
    }

    if (Array.isArray(p.requiredAny) && p.requiredAny.length) {
      const requiredHit = p.requiredAny.some(term =>
        nameHay.includes(normalize(term))
      );
      if (!requiredHit) return { matched: false, score: 999, reason: "subtype" };
    }

    if (p.requiredBrand && !nameHay.includes(normalize(p.requiredBrand))) {
      return { matched: false, score: 999, reason: "brand" };
    }

    if (Array.isArray(p.exclusions)) {
      const hit = p.exclusions.find(term => {
        const normalizedTerm = normalize(term);
        if (!normalizedTerm) return false;
        return normalizedTerm.length >= 5
          ? nameHay.includes(normalizedTerm)
          : nameHasMarker(nameHay, normalizedTerm);
      });
      if (hit) return { matched: false, score: 999, reason: `exclude:${hit}` };
    }

    const queryText = normalize(p.query || p.normalizedQuery || "");
    const meaningfulTokens = queryText
      .split(/\s+/)
      .filter(token => token.length >= 3);

    // Ohne bekannten Produkttyp darf eine Beschreibung allein niemals eine
    // automatische Zuordnung erzeugen.
    if (
      (!Array.isArray(p.categoryIds) || p.categoryIds.length === 0) &&
      meaningfulTokens.length &&
      !meaningfulTokens.some(token => nameHasMarker(nameHay, token))
    ) {
      return { matched: false, score: 999, reason: "name-evidence" };
    }

    let resultScore = score(entry, p.query || p.normalizedQuery || "");

    if (resultScore >= 999 && Array.isArray(p.categoryIds) && p.categoryIds.length) {
      resultScore = p.requiredBrand ? 24 : 28;
    }

    return {
      matched: resultScore < 999,
      score: resultScore,
      reason: resultScore < 999 ? "match" : "query"
    };
  }

  window.RetailerSearch = {
    version: MATCH_ENGINE_VERSION,
    normalize,
    buildIndex,
    score,
    directCategories,
    categoryIdsForText,
    profileForProduct,
    matchProfile
  };
})();
