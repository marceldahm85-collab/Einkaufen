const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

const source = fs.readFileSync("app.js", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Funktion ${name} nicht gefunden`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;
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
    if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error(`Funktion ${name} konnte nicht extrahiert werden`);
}

const context = { console };
vm.createContext(context);
vm.runInContext(`
const todayISO = () => "2026-09-10";
${extractFunction("promotionDateStatus")}
${extractFunction("normalizedOffer")}
${extractFunction("offerPricingForQuantity")}
this.api = { promotionDateStatus, normalizedOffer, offerPricingForQuantity };
`, context);

const { normalizedOffer, offerPricingForQuantity } = context.api;
const close = (actual, expected, eps = 1e-9) => assert(Math.abs(actual - expected) <= eps, `${actual} != ${expected}`);

// Standardpreis
let p = offerPricingForQuantity({ regularPrice: 3, salePrice: null }, 2);
close(p.lineTotal, 6);
assert.strictEqual(p.promotionApplied, false);

// Direkte Aktion / prozentuelle Aktion mit bereits aufgelöstem Aktionspreis
p = offerPricingForQuantity({ regularPrice: 2, salePrice: 1.5, promotion: { type: "price_drop" } }, 3);
close(p.lineTotal, 4.5);
assert.strictEqual(p.activeSale, true);

p = offerPricingForQuantity({ regularPrice: 4, salePrice: 3, promotion: { type: "percentage", discountPercent: 25 } }, 2);
close(p.lineTotal, 6);

// Mengenaktion
p = offerPricingForQuantity({ regularPrice: 2, salePrice: 1, promotion: { type: "quantity", requiredQuantity: 2 } }, 1);
close(p.lineTotal, 2);
assert.strictEqual(p.conditionMet, false);

p = offerPricingForQuantity({ regularPrice: 2, salePrice: 1, promotion: { type: "quantity", requiredQuantity: 2 } }, 2);
close(p.lineTotal, 2);
assert.strictEqual(p.conditionMet, true);

// 1+1 / Bundle inkl. Restmenge
p = offerPricingForQuantity({ regularPrice: 29.8, salePrice: 14.9, promotion: { type: "bundle", requiredQuantity: 2, paidQuantity: 1, freeQuantity: 1 } }, 2);
close(p.lineTotal, 29.8);
assert.strictEqual(p.promotionApplied, true);

p = offerPricingForQuantity({ regularPrice: 29.8, salePrice: 14.9, promotion: { type: "bundle", requiredQuantity: 2, paidQuantity: 1, freeQuantity: 1 } }, 3);
close(p.lineTotal, 59.6);

// 2+1, 4+2, 12+12
p = offerPricingForQuantity({ regularPrice: 0.99, salePrice: 0.66, promotion: { type: "bundle", requiredQuantity: 3, paidQuantity: 2, freeQuantity: 1 } }, 3);
close(p.lineTotal, 1.98);

p = offerPricingForQuantity({ regularPrice: 2.59, salePrice: 1.72, promotion: { type: "bundle", requiredQuantity: 6, paidQuantity: 4, freeQuantity: 2 } }, 6);
close(p.lineTotal, 10.32);

p = offerPricingForQuantity({ regularPrice: 1.39, salePrice: 0.69, promotion: { type: "bundle", requiredQuantity: 24, paidQuantity: 12, freeQuantity: 12 } }, 24);
close(p.lineTotal, 16.56);

// Unter Mindestmenge ohne Normalpreis darf nicht geschätzt werden.
p = offerPricingForQuantity({ regularPrice: null, salePrice: 1, promotion: { type: "quantity", requiredQuantity: 2 } }, 1);
assert.strictEqual(p, null);

// Datumslogik: abgelaufene und zukünftige Aktionen dürfen nicht gerechnet werden.
let o = normalizedOffer({ regularPrice: 29.8, salePrice: 14.9, validUntil: "2026-09-09", promotion: { type: "bundle", requiredQuantity: 2 } });
assert.strictEqual(o.salePrice, null);
assert.strictEqual(o.promotion, null);
assert.strictEqual(o.promotionInactiveReason, "expired");

p = offerPricingForQuantity({ regularPrice: 29.8, salePrice: 14.9, validUntil: "2026-09-09", promotion: { type: "bundle", requiredQuantity: 2 } }, 2);
close(p.lineTotal, 59.6);
assert.strictEqual(p.activeSale, false);

o = normalizedOffer({ regularPrice: 10, salePrice: 5, validFrom: "2026-09-11", promotion: { type: "price_drop" } });
assert.strictEqual(o.salePrice, null);
assert.strictEqual(o.promotionInactiveReason, "future");

// App-/Treueaktion: Preis wird gerechnet, Bedingung bleibt Metadatum.
p = offerPricingForQuantity({ regularPrice: 2.99, salePrice: 1.49, promotion: { type: "price_drop", loyaltyRequired: true, loyaltyProgram: "MPREIS App" } }, 2);
close(p.lineTotal, 2.98);

console.log("Promotion quantity/date tests OK");
