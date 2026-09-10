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
console.log("Search alias tests OK");
