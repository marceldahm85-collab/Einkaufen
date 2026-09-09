const fs = require("fs");
const source = fs.readFileSync("app.js", "utf8");

function extractFunction(name) {
  const marker = `function ${name}(`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Funktion ${name} nicht gefunden`);

  const braceStart = source.indexOf("{", start);
  let depth = 0;
  let inString = null;
  let escaped = false;

  for (let i = braceStart; i < source.length; i++) {
    const ch = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === inString) {
        inString = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }

  throw new Error(`Funktion ${name} konnte nicht extrahiert werden`);
}

function todayISO() { return "2026-09-09"; }

eval(extractFunction("normalizedOffer"));
eval(extractFunction("offerPricingForQuantity"));

function close(actual, expected, epsilon = 1e-9) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`Erwartet ${expected}, erhalten ${actual}`);
  }
}

let p = offerPricingForQuantity({ regularPrice: 2, salePrice: 1, promotion: { type: "quantity", requiredQuantity: 2 } }, 1);
close(p.lineTotal, 2);
if (p.activeSale !== false || p.conditionMet !== false) throw new Error("Mengenbedingung unter Mindestmenge falsch");

p = offerPricingForQuantity({ regularPrice: 2, salePrice: 1, promotion: { type: "quantity", requiredQuantity: 2 } }, 2);
close(p.lineTotal, 2);
if (p.activeSale !== true || p.conditionMet !== true) throw new Error("Mengenbedingung ab Mindestmenge falsch");

p = offerPricingForQuantity({ regularPrice: null, salePrice: 1, promotion: { type: "quantity", requiredQuantity: 2 } }, 1);
if (p !== null) throw new Error("Unbekannter Normalpreis unter Mindestmenge darf nicht geschätzt werden");

p = offerPricingForQuantity({ regularPrice: null, salePrice: 1, promotion: { type: "quantity", requiredQuantity: 2 } }, 2);
close(p.lineTotal, 2);

p = offerPricingForQuantity({ regularPrice: 2, salePrice: 1, promotion: { type: "bundle", requiredQuantity: 2, paidQuantity: 1, freeQuantity: 1 } }, 3);
close(p.lineTotal, 4);
close(p.unitPrice, 4 / 3);

p = offerPricingForQuantity({ regularPrice: null, salePrice: 1, promotion: { type: "bundle", requiredQuantity: 2, paidQuantity: 1, freeQuantity: 1 } }, 3);
if (p !== null) throw new Error("Bundle-Restmenge ohne Normalpreis darf nicht geschätzt werden");

p = offerPricingForQuantity({ regularPrice: 3, salePrice: null, promotion: null }, 2);
close(p.lineTotal, 6);

p = offerPricingForQuantity({ regularPrice: 2, salePrice: 1.5, promotion: { type: "price_drop" } }, 3);
close(p.lineTotal, 4.5);

console.log("OK");
