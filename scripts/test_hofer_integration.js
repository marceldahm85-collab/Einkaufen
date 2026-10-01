const fs = require("fs");
const assert = require("assert");

const app = fs.readFileSync("app.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const live = fs.readFileSync("live-hofer.js", "utf8");
const workflow = fs.readFileSync(".github/workflows/prices-and-pages.yml", "utf8");
const integrity = fs.readFileSync("scripts/check_action_integrity.py", "utf8");
const sw = fs.readFileSync("sw.js", "utf8");

assert(app.includes('const AUTO_MATCH_STORES = ["mpreis", "spar", "tg", "billa", "hofer", "lidl"]'), "HOFER fehlt im Auto-Matching");
assert(app.includes('if (store === "hofer") return window.HoferLive;'), "HOFER-Live-Modul fehlt");
assert(app.includes('counts.hofer || 0'), "HOFER-Zähler fehlt");
assert(app.includes('function linkHoferResult('), "HOFER-Katalogverknüpfung fehlt");
assert(app.includes('function renderHoferLiveStatus('), "HOFER-Status fehlt");
assert(app.includes('function openHoferPromotions('), "HOFER-Aktionsansicht fehlt");
assert(app.includes('refreshHoferPublicStatus().then'), "HOFER-Status wird beim Start nicht geladen");
assert(app.includes('openOfficialFlyer("hofer")'), "HOFER-Flugblatt-Handler fehlt");
assert(app.includes('const promotionsSupported = ["mpreis", "spar", "tg", "billa", "hofer", "lidl"].includes(currentCatalogRetailer)'), "HOFER-Aktionsfilter nicht aktiviert");

assert(index.includes('data-catalog-store="hofer"'), "HOFER fehlt im Händlerkatalog");
assert(index.includes('data-auto-match-store="hofer"'), "HOFER fehlt im Trefferfilter");
assert(index.includes('id="hoferLiveStatus"'), "HOFER-Statuskarte fehlt");
assert(index.includes('id="showHoferPromotionsBtn"'), "HOFER-Aktionsbutton fehlt");
assert(index.includes('id="openHoferFlyerBtn"'), "HOFER-Flugblattbutton fehlt");
assert(index.includes('id="hoferPromotionsSheet"'), "HOFER-Aktionssheet fehlt");
assert(index.includes('<script src="live-hofer.js"></script>'), "live-hofer.js wird nicht geladen");

assert(live.includes('const DATA_URL = "data/hofer.json"'), "HOFER-Datenquelle falsch");
assert(live.includes('window.HoferLive ='), "HoferLive Export fehlt");

assert(workflow.includes('python scripts/update_hofer.py'), "HOFER-Importer fehlt im Workflow");
assert(workflow.includes('python scripts/update_hofer_actions.py'), "HOFER-Aktionsimport fehlt im Workflow");
assert(workflow.includes('python scripts/test_update_hofer.py'), "HOFER-Importtest fehlt im Workflow");
assert(workflow.includes('python scripts/test_update_hofer_actions.py'), "HOFER-Aktionstest fehlt im Workflow");
assert(workflow.includes('node --check live-hofer.js'), "HOFER-JS wird im Workflow nicht geprüft");
assert(workflow.includes('node scripts/test_hofer_integration.js'), "HOFER-Integrationstest fehlt im Workflow");
assert(workflow.includes('live-hofer.js manifest.webmanifest'), "live-hofer.js wird nicht nach Pages kopiert");

assert(integrity.includes('"hofer": DATA_DIR / "hofer.json"'), "HOFER fehlt im Integritätscheck");
assert(sw.includes('./live-hofer.js'), "HOFER fehlt im Service Worker");

console.log("HOFER integration wiring tests OK");
