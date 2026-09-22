const fs = require("fs");
const vm = require("vm");
const assert = require("assert");
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync("live-search.js", "utf8"), context);
const api = context.window.RetailerSearch;

const items = [
  { name: "Gösser Märzen", description: "20 x 0,5 l" },
  { name: "Gösser Radler", description: "6 x 0,5 l" },
  { name: "Gösser", description: "0,5 l" },
  { name: "Lavazza", description: "1 kg" },
  { name: "Barilla", description: "500 g" },
  { name: "Vöslauer", description: "1,5 l" }
];
const rows = api.buildIndex(items);
const beer = rows.filter(row => api.score(row, "bier") < 999).map(row => row.item.name);
assert(beer.includes("Gösser Märzen"));
assert(beer.includes("Gösser Radler"));
assert(beer.includes("Gösser"));
assert(!beer.includes("Barilla"));

assert(rows.find(r => r.item.name === "Lavazza").searchHay.includes("kaffee"));
assert(rows.find(r => r.item.name === "Barilla").searchHay.includes("nudeln"));
assert(rows.find(r => r.item.name === "Vöslauer").searchHay.includes("wasser"));

const safetyItems = [
  { name: "Gösser Märzen", description: "20 x 0,5 l" },
  { name: "Gösser Radler", description: "6 x 0,5 l" },
  { name: "Gösser", description: "0,5 l" },
  { name: "Haas Stiegl Biersenf", description: "200 g" },
  { name: "NÖM Teebutter", description: "250 g" },
  { name: "Buttercroissant", description: "50 g" },
  { name: "Ölz Butter Pinze", description: "400 g" },
  { name: "Barilla Spaghetti", description: "500 g" },
  { name: "Barilla Risoni", description: "500 g" },
  { name: "Coca Cola Original", description: "1,5 l" },
  { name: "Coca Cola Zero", description: "1,5 l" }
];
const safetyRows = api.buildIndex(safetyItems);

const beerProfile = api.profileForProduct({
  name: "Bier", brand: "ohne Marke", matchingProfile: { query: "Bier" }
});
const beerMatches = safetyRows.filter(row => api.matchProfile(row, beerProfile).matched).map(row => row.item.name);
assert(beerMatches.includes("Gösser Märzen"));
assert(beerMatches.includes("Gösser"));
assert(!beerMatches.includes("Gösser Radler"));
assert(!beerMatches.includes("Haas Stiegl Biersenf"));

const butterProfile = api.profileForProduct({
  name: "Butter", brand: "Schärdinger / vergleichbar", matchingProfile: { query: "Butter" }
});
assert.strictEqual(butterProfile.requiredBrand, "");
const butterMatches = safetyRows.filter(row => api.matchProfile(row, butterProfile).matched).map(row => row.item.name);
assert(butterMatches.includes("NÖM Teebutter"));
assert(!butterMatches.includes("Buttercroissant"));
assert(!butterMatches.includes("Ölz Butter Pinze"));

const spaghettiProfile = api.profileForProduct({
  name: "Spaghetti", brand: "Barilla / vergleichbar", matchingProfile: { query: "Spaghetti" }
});
const spaghettiMatches = safetyRows.filter(row => api.matchProfile(row, spaghettiProfile).matched).map(row => row.item.name);
assert(spaghettiMatches.includes("Barilla Spaghetti"));
assert(!spaghettiMatches.includes("Barilla Risoni"));

const colaProfile = api.profileForProduct({
  name: "Coca-Cola Original", brand: "Coca-Cola", matchingProfile: { query: "Coca-Cola Original" }
});
const colaMatches = safetyRows.filter(row => api.matchProfile(row, colaProfile).matched).map(row => row.item.name);
assert(colaMatches.includes("Coca Cola Original"));
assert(!colaMatches.includes("Coca Cola Zero"));


// v12.2 regression: Descriptions may mention another product type without
// turning the item into an automatic candidate.
const regressionItems = [
  {
    name: "Wiener Feinkristallzucker",
    description: "Feiner Zucker, ideal zum Süßen von Kaffee und Tee"
  },
  {
    name: "TM BB Fruchtjoghurt Kaffee",
    description: "Joghurt mit Kaffeegeschmack"
  },
  {
    name: "Tirol Milch Joghurt Kaffee",
    description: "Joghurt, Sorte Kaffee"
  },
  {
    name: "Lavazza Caffè Crema",
    description: "Ganze Bohnen"
  },
  {
    name: "Dallmayr Crema d'Oro",
    description: "Kaffeebohnen"
  },
  {
    name: "S-BUDGET Apfelstrudel",
    description: "mit feiner Butter"
  },
  {
    name: "Butter-Topfengolatsche",
    description: "100 g"
  },
  {
    name: "Ölz Butter Madeleines",
    description: "200 g"
  },
  {
    name: "SPAR PREMIUM Danish Butter Cookies",
    description: "250 g"
  },
  {
    name: "Schärdinger Teebutter",
    description: "250 g"
  },
  {
    name: "Crafties Chips Puntigamer Bier",
    description: "Chips mit Biergeschmack"
  },
  {
    name: "Zipfer Märzen",
    description: "0,5 l"
  },
  {
    name: "Barilla Pesto Genovese",
    description: "190 g"
  }
];

const regressionRows = api.buildIndex(regressionItems);

const coffeeProfile = api.profileForProduct({
  name: "Caffè Crema Bohnen",
  brand: "verschiedene",
  matchingProfile: { query: "Caffè Crema Bohnen" }
});
const coffeeMatches = regressionRows
  .filter(row => api.matchProfile(row, coffeeProfile).matched)
  .map(row => row.item.name);
assert(coffeeMatches.includes("Lavazza Caffè Crema"));
assert(coffeeMatches.includes("Dallmayr Crema d'Oro"));
assert(!coffeeMatches.includes("Wiener Feinkristallzucker"));
assert(!coffeeMatches.includes("TM BB Fruchtjoghurt Kaffee"));
assert(!coffeeMatches.includes("Tirol Milch Joghurt Kaffee"));

const butterRegressionMatches = regressionRows
  .filter(row => api.matchProfile(row, butterProfile).matched)
  .map(row => row.item.name);
assert(butterRegressionMatches.includes("Schärdinger Teebutter"));
assert(!butterRegressionMatches.includes("S-BUDGET Apfelstrudel"));
assert(!butterRegressionMatches.includes("Butter-Topfengolatsche"));
assert(!butterRegressionMatches.includes("Ölz Butter Madeleines"));
assert(!butterRegressionMatches.includes("SPAR PREMIUM Danish Butter Cookies"));

const beerRegressionMatches = regressionRows
  .filter(row => api.matchProfile(row, beerProfile).matched)
  .map(row => row.item.name);
assert(beerRegressionMatches.includes("Zipfer Märzen"));
assert(!beerRegressionMatches.includes("Crafties Chips Puntigamer Bier"));

// Broad brands must not classify unrelated product ranges.
const spaghettiRegressionMatches = regressionRows
  .filter(row => api.matchProfile(row, spaghettiProfile).matched)
  .map(row => row.item.name);
assert(!spaghettiRegressionMatches.includes("Barilla Pesto Genovese"));

assert.strictEqual(api.version, 2);

console.log("Search alias/profile safety tests OK");
