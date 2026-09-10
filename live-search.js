(() => {
  "use strict";

  const CATEGORY_DEFINITIONS = [
    {
      id: "bier",
      aliases: ["bier", "biere", "bierkasten", "bierkiste", "kiste bier"],
      markers: [" bier ", " märzen ", " pils ", " pilsner ", " radler ", " weizenbier ", " weissbier ", " weißbier ", " helles ", " goldbräu ", " zwickl ", " bockbier "],
      brands: ["gösser", "stiegl", "zipfer", "puntigamer", "ottakringer", "schwechater", "wieselburger", "hirter", "villacher", "egger", "kaiser", "murauer", "mohren", "trumer", "zillertal bier", "augustiner", "hacker pschorr", "corona", "heineken", "budweiser", "budvar", "pilsner urquell", "bitburger", "warsteiner", "krombacher", "erdinger", "paulaner", "franziskaner", "guinness", "bierol"]
    },
    {
      id: "kaffee",
      aliases: ["kaffee", "kaffeebohnen", "espresso", "caffe", "café"],
      markers: [" kaffee ", " espresso ", " caffè ", " caffe ", " kaffeebohnen ", " cappuccino "],
      brands: ["lavazza", "illy", "segafredo", "dallmayr", "jacobs", "tchibo", "meinl", "alps coffee"]
    },
    {
      id: "milch",
      aliases: ["milch", "vollmilch", "haltbarmilch", "h milch"],
      markers: [" vollmilch ", " h vollmilch ", " haltbarmilch ", " frischmilch "],
      brands: []
    },
    {
      id: "käse",
      aliases: ["käse", "kaese", "gouda", "emmentaler"],
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
      aliases: ["nudeln", "pasta", "teigwaren", "spaghetti", "penne"],
      markers: [" nudeln ", " pasta ", " spaghetti ", " penne ", " fusilli ", " tagliatelle ", " macaroni "],
      brands: ["barilla", "de cecco"]
    },
    {
      id: "wasser",
      aliases: ["wasser", "mineralwasser"],
      markers: [" mineralwasser ", " wasser still ", " wasser prickelnd "],
      brands: ["vöslauer", "romerquelle", "römerquelle", "silberquelle", "alpquell"]
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
      aliases: ["saft", "fruchtsaft", "fruchtsäfte", "smoothie"],
      markers: [" saft ", " fruchtsaft ", " smoothie ", " nektar "],
      brands: ["rauch", "pfanner"]
    },
    {
      id: "wein",
      aliases: ["wein", "rotwein", "weißwein", "weisswein", "rosewein", "roséwein"],
      markers: [" rotwein ", " weißwein ", " weisswein ", " roséwein ", " rosewein ", " zweigelt ", " grüner veltliner ", " chardonnay ", " lugana "],
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
      brands: ["whiskas", "dreamies"]
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
    "mpreis", "s budget", "s-budget", "t&g", "t", "m"
  ]);

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

  function directCategories(item) {
    const text = padded(`${item?.name || ""} ${item?.description || ""}`);
    const name = normalize(item?.name || "");
    const result = [];

    for (const def of prepared) {
      const markerMatch = def.normalizedMarkers.some(marker =>
        text.includes(` ${marker} `) || text.includes(` ${marker}`) || text.includes(`${marker} `)
      );
      const brandMatch = def.normalizedBrands.some(brand =>
        name === brand || name.startsWith(`${brand} `)
      );
      if (markerMatch || brandMatch) result.push(def.id);
    }

    return [...new Set(result)];
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
      propagated.set(brand, ranked[0][0]);
    });

    rows.forEach(row => {
      const inferred = propagated.get(row.brandKey);
      if (inferred && !row.categories.includes(inferred)) row.categories.push(inferred);

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

  window.RetailerSearch = { normalize, buildIndex, score };
})();
