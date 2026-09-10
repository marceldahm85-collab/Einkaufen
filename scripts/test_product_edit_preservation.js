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
const categories = [
  "Milchprodukte", "Obst & Gemüse", "Getränke", "Brot & Gebäck",
  "Fleisch & Wurst", "Vorrat", "Tiefkühl", "Haushalt", "Drogerie", "Sonstiges"
];
${extract("normalizeMeasureUnit", "normalizeMeasure")}
${extract("normalizeMeasure", "measureToDisplay")}
${extract("updateProductCore", "saveEditedProduct")}
this.result = { updateProductCore };
`;

const context = {};
vm.createContext(context);
vm.runInContext(code, context);

const { updateProductCore } = context.result;

const offers = [{
  store: "mpreis",
  retailerProductId: "abc",
  regularPrice: 12.99,
  history: [{ date: "2026-09-01", price: 12.99 }]
}];

const liveLinks = {
  mpreis: { retailerProductId: "abc" },
  spar: { retailerProductId: "def" }
};

const product = {
  id: "p_beer",
  name: "Bier",
  brand: "",
  category: "Getränke",
  amount: 10,
  unit: "l",
  favorite: true,
  offers,
  liveLinks
};

const idBefore = product.id;
const offersBefore = product.offers;
const linksBefore = product.liveLinks;
const favoriteBefore = product.favorite;

assert.strictEqual(updateProductCore(product, {
  name: "Märzen Bier",
  brand: "verschiedene",
  category: "Getränke",
  amount: 20,
  unit: "l"
}), true);

assert.strictEqual(product.id, idBefore);
assert.strictEqual(product.offers, offersBefore);
assert.strictEqual(product.liveLinks, linksBefore);
assert.strictEqual(product.favorite, favoriteBefore);

assert.strictEqual(product.name, "Märzen Bier");
assert.strictEqual(product.brand, "verschiedene");
assert.strictEqual(product.amount, 20);
assert.strictEqual(product.unit, "l");

assert.strictEqual(updateProductCore(product, {
  name: "",
  brand: "",
  category: "Getränke",
  amount: 1,
  unit: "l"
}), false);

console.log("Product edit preservation tests OK");
