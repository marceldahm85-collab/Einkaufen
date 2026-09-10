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
  "promotionCandidatePackageCounts", "offerPricingForTarget"
];
const context = { console };
vm.createContext(context);
vm.runInContext(`
const todayISO = () => "2026-09-10";
${names.map(extractFunction).join("\n")}
this.api = { offerPricingForTarget };
`, context);
const { offerPricingForTarget } = context.api;
const close = (a,b,eps=1e-9) => assert(Math.abs(a-b)<=eps, `${a} != ${b}`);

const beer10l = { amount: 10, unit: "l" };

// Unterschiedliche Gebinde: 10-l-Kiste vs. 3-l-Pack.
let p = offerPricingForTarget(beer10l, {
  regularPrice: 15, packageAmount: 10, packageUnit: "l", packageAmountKnown: true
}, 1);
assert.strictEqual(p.packageCount, 1);
close(p.lineTotal, 15);

p = offerPricingForTarget(beer10l, {
  regularPrice: 5, packageAmount: 3, packageUnit: "l", packageAmountKnown: true
}, 1);
assert.strictEqual(p.packageCount, 4);
close(p.lineTotal, 20);
close(p.deliveredBase, 12);

// T&G 1+1: Für 20 l müssen zwei 10-l-Kisten insgesamt nur 29,80 kosten.
const tgOnePlusOne = {
  regularPrice: 29.8,
  salePrice: 14.9,
  validFrom: "2026-09-10",
  validUntil: "2026-09-23",
  packageAmount: 10,
  packageUnit: "l",
  packageAmountKnown: true,
  promotion: { type: "bundle", requiredQuantity: 2, paidQuantity: 1, freeQuantity: 1, label: "1+1 gratis" }
};
p = offerPricingForTarget(beer10l, tgOnePlusOne, 2);
assert.strictEqual(p.packageCount, 2);
close(p.lineTotal, 29.8);
assert.strictEqual(p.promotionApplied, true);

// Auch bei Ziel 10 l soll 1+1 gewählt werden, wenn zwei Kisten gleich viel
// kosten wie eine einzelne Kiste: mehr Ware, kein höherer Kassenbetrag.
p = offerPricingForTarget(beer10l, tgOnePlusOne, 1);
assert.strictEqual(p.minimumPackageCount, 1);
assert.strictEqual(p.packageCount, 2);
close(p.lineTotal, 29.8);
assert.strictEqual(p.promotionApplied, true);
close(p.deliveredBase, 20);

// Nach Ablauf darf dieselbe Aktion nicht mehr greifen.
p = offerPricingForTarget(beer10l, { ...tgOnePlusOne, validFrom: "2026-08-27", validUntil: "2026-09-09" }, 2);
assert.strictEqual(p.packageCount, 2);
close(p.lineTotal, 59.6);
assert.strictEqual(p.promotionApplied, false);

// Ab-2-Aktion: nur aufstocken, wenn das an der Kasse tatsächlich nicht teurer ist.
const ab2 = {
  regularPrice: 10, salePrice: 6,
  packageAmount: 1, packageUnit: "l", packageAmountKnown: true,
  promotion: { type: "quantity", requiredQuantity: 2 }
};
const oneLiter = { amount: 1, unit: "l" };
p = offerPricingForTarget(oneLiter, ab2, 1);
assert.strictEqual(p.packageCount, 1);
close(p.lineTotal, 10);
assert.strictEqual(p.promotionApplied, false);

const veryStrongAb2 = { ...ab2, salePrice: 4 };
p = offerPricingForTarget(oneLiter, veryStrongAb2, 1);
assert.strictEqual(p.packageCount, 2);
close(p.lineTotal, 8);
assert.strictEqual(p.promotionApplied, true);

// Mengenaktion ohne Normalpreis kann trotzdem verwendet werden, wenn die App
// die benötigte Aktionsmenge hinzukauft.
p = offerPricingForTarget(oneLiter, {
  regularPrice: null, salePrice: 4,
  packageAmount: 1, packageUnit: "l", packageAmountKnown: true,
  promotion: { type: "quantity", requiredQuantity: 2 }
}, 1);
assert.strictEqual(p.packageCount, 2);
close(p.lineTotal, 8);
assert.strictEqual(p.promotionApplied, true);

// Falsche Dimension und unbekanntes Händlergebinde bleiben unvergleichbar.
assert.strictEqual(offerPricingForTarget(beer10l, {
  regularPrice: 2, packageAmount: 500, packageUnit: "g", packageAmountKnown: true
}, 1), null);
assert.strictEqual(offerPricingForTarget(beer10l, {
  regularPrice: 2, packageAmount: null, packageUnit: null, packageAmountKnown: false
}, 1), null);

console.log("Package/action comparison tests OK");
