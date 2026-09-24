const fs = require("fs");
const assert = require("assert");

const app = fs.readFileSync("app.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const live = fs.readFileSync("live-billa.js", "utf8");
const workflow = fs.readFileSync(".github/workflows/prices-and-pages.yml", "utf8");

assert(app.includes('const AUTO_MATCH_STORES = ["mpreis", "spar", "tg", "billa", "hofer"]'), "BILLA/HOFER fehlen im Auto-Matching");
assert(app.includes('if (store === "billa") return window.BillaLive;'), "BILLA-Live-Modul fehlt in der App");
assert(app.includes('counts.billa || 0'), "BILLA-Zähler fehlt");
assert(app.includes('function linkBillaResult('), "BILLA-Katalogverknüpfung fehlt");
assert(app.includes('function renderBillaLiveStatus('), "BILLA-Status fehlt");

assert(index.includes('data-catalog-store="billa"'), "BILLA fehlt im Händlerkatalog");
assert(index.includes('data-auto-match-store="billa"'), "BILLA fehlt im Trefferfilter");
assert(index.includes('id="billaLiveStatus"'), "BILLA-Statuskarte fehlt");
assert(index.includes('<script src="live-billa.js"></script>'), "live-billa.js wird nicht geladen");
assert(index.includes('<script src="live-hofer.js"></script>'), "live-hofer.js wird nicht geladen");

assert(app.includes('const promotionsSupported = ["mpreis", "spar", "tg", "billa", "hofer"].includes(currentCatalogRetailer)'), "BILLA/HOFER-Aktionsfilter nicht aktiviert");

assert(live.includes('const DATA_URL = "data/billa.json"'), "BILLA-Datenquelle falsch");
assert(live.includes('window.BillaLive ='), "BillaLive Export fehlt");

assert(workflow.includes('python scripts/update_billa.py'), "BILLA-Importer fehlt im Workflow");
assert(workflow.includes('python scripts/update_billa_actions.py'), "BILLA-Aktionsimport fehlt im Workflow");
assert(workflow.includes('python scripts/test_update_billa_actions.py'), "BILLA-Aktionstest fehlt im Workflow");
assert(workflow.includes('node --check live-billa.js'), "BILLA-JS wird im Workflow nicht geprüft");
assert(workflow.includes('live-billa.js manifest.webmanifest'), "live-billa.js wird nicht nach Pages kopiert");

console.log("BILLA/HOFER integration wiring tests OK");
