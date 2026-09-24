const fs = require("fs");
const assert = require("assert");

const app = fs.readFileSync("app.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const live = fs.readFileSync("live-lidl.js", "utf8");
const workflow = fs.readFileSync(".github/workflows/prices-and-pages.yml", "utf8");

assert(app.includes('const AUTO_MATCH_STORES = ["mpreis", "spar", "tg", "billa", "hofer", "lidl"]'), "LIDL/HOFER fehlen im Auto-Matching");
assert(app.includes('if (store === "lidl") return window.LidlLive;'), "Lidl-Live-Modul fehlt in der App");
assert(app.includes('counts.lidl || 0'), "Lidl-Zähler fehlt");
assert(app.includes('function renderLidlLiveStatus('), "Lidl-Status fehlt");

assert(index.includes('data-catalog-store="lidl"'), "Lidl fehlt im Händlerkatalog");
assert(index.includes('data-auto-match-store="lidl"'), "Lidl fehlt im Trefferfilter");
assert(index.includes('id="lidlLiveStatus"'), "Lidl-Statuskarte fehlt");
assert(index.includes('<script src="live-lidl.js"></script>'), "live-lidl.js wird nicht geladen");
assert(index.includes('<script src="live-hofer.js"></script>'), "live-hofer.js wird nicht geladen");

assert(app.includes('const promotionsSupported = ["mpreis", "spar", "tg", "lidl", "hofer"].includes(currentCatalogRetailer)'), "LIDL/HOFER-Aktionsfilter nicht aktiviert");

assert(live.includes('const DATA_URL = "data/lidl.json"'), "LIDL-Datenquelle falsch");
assert(live.includes('window.LidlLive ='), "LidlLive Export fehlt");

assert(workflow.includes('python scripts/update_lidl.py'), "LIDL-Importer fehlt im Workflow");
assert(workflow.includes('python scripts/update_lidl_actions.py'), "LIDL-Aktionsimport fehlt im Workflow");
assert(workflow.includes('python scripts/test_update_lidl_actions.py'), "LIDL-Aktionstest fehlt im Workflow");
assert(workflow.includes('node --check live-lidl.js'), "LIDL-JS wird im Workflow nicht geprüft");
assert(workflow.includes("live-lidl.js"), "live-lidl.js wird nicht nach Pages kopiert");

console.log("LIDL/HOFER integration wiring tests OK");
