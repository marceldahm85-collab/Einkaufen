const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync("app.js", "utf8");
function extract(name, nextName) {
  const start = source.indexOf(`  function ${name}`);
  const end = source.indexOf(`  function ${nextName}`, start + 1);
  if (start < 0 || end < 0) throw new Error(`extract ${name}`);
  return source.slice(start, end);
}

const code = `
const todayISO = () => "2026-09-10";
${extract("normalizeMeasureUnit", "normalizeMeasure")}
${extract("normalizeMeasure", "measureToDisplay")}
${extract("packageMeasureForOffer", "offerPackageLabel")}
${extract("normalizedOffer", "offerForStore")}
${extract("offerPricingForQuantity", "offerPricingForTarget")}
${extract("offerPricingForTarget", "pricingPackageSummary")}
this.result = { normalizeMeasure, offerPricingForQuantity, offerPricingForTarget };
`;
const context = {};
vm.createContext(context);
vm.runInContext(code, context);
const { offerPricingForTarget } = context.result;

const beer = { amount: 10, unit: "l" };
const crate = { regularPrice: 15, salePrice: null, packageAmount: 10, packageUnit: "l", packageAmountKnown: true };
const sixpack = { regularPrice: 5, salePrice: null, packageAmount: 3, packageUnit: "l", packageAmountKnown: true };

let p = offerPricingForTarget(beer, crate, 1);
assert.strictEqual(p.packageCount, 1);
assert.strictEqual(p.lineTotal, 15);
assert.strictEqual(p.deliveredBase, 10);

p = offerPricingForTarget(beer, sixpack, 1);
assert.strictEqual(p.packageCount, 4);
assert.strictEqual(p.lineTotal, 20);
assert.strictEqual(p.deliveredBase, 12);

const cans = {
  regularPrice: 1.20,
  salePrice: 0.69,
  packageAmount: 330,
  packageUnit: "ml",
  packageAmountKnown: true,
  promotion: { type: "bundle", requiredQuantity: 24, label: "12+12" }
};
p = offerPricingForTarget(beer, cans, 1);
assert.strictEqual(p.packageCount, 31);
assert(Math.abs(p.lineTotal - 24.96) < 1e-9);

const massOffer = { regularPrice: 2, packageAmount: 500, packageUnit: "g", packageAmountKnown: true };
assert.strictEqual(offerPricingForTarget(beer, massOffer, 1), null);

const unknown = { regularPrice: 2, packageAmount: null, packageUnit: null, packageAmountKnown: false };
assert.strictEqual(offerPricingForTarget(beer, unknown, 1), null);

console.log("Package comparison tests OK");
