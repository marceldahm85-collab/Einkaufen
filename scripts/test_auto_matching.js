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
  "autoCandidateKey", "matchingProfile", "storedAutoCandidates",
  "activeAutoCandidates", "baseOffersForProduct", "validOffers",
  "pricedOfferForStore", "cheapestPricedOffer", "rankedAutoOptions"
];

const context = {
  console,
  window: {
    RetailerSearch: {
      profileForProduct(product) {
        return {
          query: product.matchingProfile?.query || product.name,
          excludedIds: product.matchingProfile?.excludedIds || []
        };
      }
    }
  }
};

vm.createContext(context);
vm.runInContext(`
const AUTO_MATCH_STORES = ["mpreis", "spar", "tg"];
const todayISO = () => "2026-09-21";
${names.map(extractFunction).join("\n")}
this.api = { validOffers, pricedOfferForStore, cheapestPricedOffer, rankedAutoOptions };
`, context);

const { validOffers, pricedOfferForStore, cheapestPricedOffer, rankedAutoOptions } = context.api;
const close = (a,b,eps=1e-9) => assert(Math.abs(a-b)<=eps, `${a} != ${b}`);

function candidate(store, id, name, offer) {
  return { id: `${store}:${id}`, store, name, offer: {
    store, retailerProductId: id, remoteObjectId: id, candidateName: name,
    automaticMatch: true, ...offer
  }};
}

const product = {
  id: "beer",
  name: "Bier",
  amount: 10,
  unit: "l",
  matchingProfile: {
    mode: "auto",
    query: "Bier",
    fixedCandidateId: null,
    excludedIds: []
  },
  // This stale old 1:1 MPREIS link must no longer beat the automatic pool.
  offers: [{
    store: "mpreis",
    retailerProductId: "old",
    regularPrice: 1,
    packageAmount: 10,
    packageUnit: "l",
    packageAmountKnown: true,
    source: "heisse-preise.io (MPREIS)"
  }],
  autoMatches: {
    stores: {
      mpreis: [
        candidate("mpreis", "m1", "MPREIS Kiste", {
          regularPrice: 18,
          packageAmount: 10, packageUnit: "l", packageAmountKnown: true
        })
      ],
      spar: [
        candidate("spar", "s-small", "SPAR 3-l-Pack", {
          regularPrice: 5,
          packageAmount: 3, packageUnit: "l", packageAmountKnown: true
        }),
        candidate("spar", "s-best", "SPAR Kiste", {
          regularPrice: 16,
          packageAmount: 10, packageUnit: "l", packageAmountKnown: true
        })
      ],
      tg: [
        candidate("tg", "t1", "T&G 1+1 Kiste", {
          regularPrice: 29.8,
          salePrice: 14.9,
          packageAmount: 10, packageUnit: "l", packageAmountKnown: true,
          validFrom: "2026-09-10", validUntil: "2026-09-23",
          promotion: {
            type: "bundle", requiredQuantity: 2,
            paidQuantity: 1, freeQuantity: 1, label: "1+1 gratis"
          }
        })
      ]
    }
  }
};

let p = pricedOfferForStore(product, "mpreis", 1);
close(p.pricing.lineTotal, 18);
assert.strictEqual(p.offer.retailerProductId, "m1");

p = pricedOfferForStore(product, "spar", 1);
close(p.pricing.lineTotal, 16);
assert.strictEqual(p.offer.retailerProductId, "s-best");

p = pricedOfferForStore(product, "tg", 1);
close(p.pricing.lineTotal, 29.8);
assert.strictEqual(p.pricing.packageCount, 2);
assert.strictEqual(p.pricing.promotionApplied, true);

let cheapest = cheapestPricedOffer(product, 1);
assert.strictEqual(cheapest.offer.store, "spar");
close(cheapest.pricing.lineTotal, 16);

let top = rankedAutoOptions(product, 1, "all", 10);
assert.strictEqual(top[0].id, "spar:s-best");
assert.strictEqual(top[1].id, "mpreis:m1");

// A user can lock one of the top candidates.
product.matchingProfile.mode = "fixed";
product.matchingProfile.fixedCandidateId = "mpreis:m1";
cheapest = cheapestPricedOffer(product, 1);
assert.strictEqual(cheapest.offer.store, "mpreis");
close(cheapest.pricing.lineTotal, 18);

// Returning to auto and excluding one wrong match removes it from selection.
product.matchingProfile.mode = "auto";
product.matchingProfile.fixedCandidateId = null;
product.matchingProfile.excludedIds = ["spar:s-best"];
cheapest = cheapestPricedOffer(product, 1);
assert.strictEqual(cheapest.offer.store, "mpreis");
close(cheapest.pricing.lineTotal, 18);

// Quantity on the shopping list is still respected across automatic candidates.
product.matchingProfile.excludedIds = [];
p = pricedOfferForStore(product, "mpreis", 2);
close(p.pricing.lineTotal, 36);
assert.strictEqual(p.pricing.packageCount, 2);

console.log("Automatic matching/selection tests OK");
