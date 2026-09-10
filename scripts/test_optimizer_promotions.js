const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const source = fs.readFileSync("app.js", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Funktion ${name} nicht gefunden`);
  const braceStart = source.indexOf("{", start);
  let depth = 0, quote = null, escaped = false;
  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    if (ch === "}" && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Funktion ${name} konnte nicht extrahiert werden`);
}

const names = [
  "normalizeMeasureUnit", "normalizeMeasure", "packageMeasureForOffer",
  "promotionDateStatus", "normalizedOffer", "offerPricingForQuantity",
  "promotionCandidatePackageCounts", "offerPricingForTarget",
  "validOffers", "offerForStore", "pricedOfferForStore", "cheapestPricedOffer",
  "optimizeShopping", "evaluateStoreSet", "finalizeOptimizationResult", "selectBestOptimization"
];

const context = { console };
vm.createContext(context);
vm.runInContext(`
const todayISO = () => "2026-09-10";
const retailers = { mpreis: {}, spar: {}, tg: {}, hofer: {}, lidl: {}, billa: {} };
${names.map(extractFunction).join("\n")}
this.api = { optimizeShopping };
`, context);

const { optimizeShopping } = context.api;

let seed = 0x5a17b00b;
function rnd() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 0x100000000;
}
function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
function price(min=0.5,max=20) { return Math.round((min + rnd() * (max-min))*100)/100; }

const stores = ["mpreis","spar","tg","hofer","lidl","billa"];
const promoKinds = ["none","price_drop","quantity","bundle11","bundle21","bundle42"];

function makeOffer(store) {
  const regular = price();
  const kind = pick(promoKinds);
  const offer = {
    store,
    regularPrice: regular,
    salePrice: null,
    packageAmount: pick([0.25,0.33,0.5,1,1.5,2,3,5,10]),
    packageUnit: "l",
    packageAmountKnown: true,
    validFrom: "2026-09-01",
    validUntil: "2026-09-30"
  };

  if (kind === "price_drop") {
    offer.salePrice = Math.max(0.1, Math.round(regular * (0.55 + rnd()*0.35) * 100)/100);
    offer.promotion = { type: "price_drop" };
  } else if (kind === "quantity") {
    const required = pick([2,3,4,6,12]);
    offer.salePrice = Math.max(0.1, Math.round(regular * (0.55 + rnd()*0.35) * 100)/100);
    offer.promotion = { type: "quantity", requiredQuantity: required };
  } else if (kind.startsWith("bundle")) {
    const [paid, free] = kind === "bundle11" ? [1,1] : kind === "bundle21" ? [2,1] : [4,2];
    const required = paid + free;
    offer.salePrice = Math.max(0.1, Math.round((regular * paid / required) * 100)/100);
    offer.promotion = { type: "bundle", requiredQuantity: required, paidQuantity: paid, freeQuantity: free };
  }

  // A small percentage of stale/future promos must safely fall back to regular price.
  if (offer.salePrice != null && rnd() < 0.05) offer.validUntil = "2026-09-09";
  if (offer.salePrice != null && rnd() < 0.05) offer.validFrom = "2026-09-11";
  return offer;
}

let comparable = 0;
for (let run = 0; run < 5000; run++) {
  const itemCount = 1 + Math.floor(rnd() * 7);
  const items = [];

  for (let i = 0; i < itemCount; i++) {
    const offers = stores.filter(() => rnd() < 0.75).map(makeOffer);
    if (!offers.length) offers.push(makeOffer(pick(stores)));
    items.push({
      id: `i${i}`,
      quantity: 1 + Math.floor(rnd() * 5),
      preferredStore: "auto",
      product: {
        amount: pick([0.5,1,2,3,5,10]),
        unit: "l",
        offers
      }
    });
  }

  const cheapest = optimizeShopping(items, "cheapest");
  const max2 = optimizeShopping(items, "max2");
  const one = optimizeShopping(items, "one");

  for (const result of [cheapest,max2,one]) {
    if (result) {
      assert(Number.isFinite(result.total));
      assert(result.total >= 0);
      assert(result.covered <= itemCount);
    }
  }

  if (cheapest?.complete && max2?.complete && one?.complete) {
    comparable++;
    assert(cheapest.total <= max2.total + 1e-7,
      `Cheapest ${cheapest.total} > Max2 ${max2.total}`);
    assert(max2.total <= one.total + 1e-7,
      `Max2 ${max2.total} > One ${one.total}`);
  }
}

assert(comparable > 1000, `Zu wenige komplette Vergleichsfälle: ${comparable}`);
console.log(`Promotion optimizer randomized tests OK (${comparable} vollständig vergleichbare Fälle)`);
