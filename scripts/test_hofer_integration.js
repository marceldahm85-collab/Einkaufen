const fs = require("fs");
const assert = require("assert");

const app = fs.readFileSync("app.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const live = fs.readFileSync("live-hofer.js", "utf8");
const workflow = fs.readFileSync(".github/workflows/prices-and-pages.yml", "utf8");

assert(app.includes('const AUTO_MATCH_STORES = ["mpreis", "spar", "tg", "billa", "hofer", "lidl"]'), "BILLA/HOFER/Lidl fehlen im Auto-Matching");
assert(app.includes('if (store === "hofer") return window.HoferLive;'), "HOFER-Live-Modul fehlt");
assert(app.includes('counts.hofer || 0'), "HOFER-Zähler fehlt");
assert(app.includes("function renderHoferLiveStatus()"), "HOFER-Status fehlt");
assert(app.includes("function openHoferPromotions()"), "HOFER-Aktionsansicht fehlt");
assert(app.includes("OFFICIAL_FLYER_URLS.hofer"), "HOFER-Flugblatt fehlt");
assert(app.includes("const AUTO_MATCH_ENGINE_VERSION = 5"), "Matching-Engine-Version nicht erhöht");

assert(index.includes('data-catalog-store="hofer"'), "HOFER fehlt im Händlerkatalog");
assert(index.includes('data-auto-match-store="hofer"'), "HOFER fehlt im Trefferfilter");
assert(index.includes('id="hoferLiveStatus"'), "HOFER-Statuskarte fehlt");
assert(index.includes('id="hoferPromotionsSheet"'), "HOFER-Aktionssheet fehlt");
assert(index.includes('<script src="live-hofer.js"></script>'), "live-hofer.js fehlt");
assert(index.includes('<script src="live-lidl.js"></script>'), "live-lidl.js fehlt");

assert(live.includes('const DATA_URL = "data/hofer.json"'), "HOFER-Datenquelle falsch");
assert(live.includes("window.HoferLive"), "HoferLive Export fehlt");

assert(workflow.includes("python scripts/update_hofer.py"), "HOFER-Grundimport fehlt");
assert(workflow.includes("python scripts/update_hofer_actions.py"), "HOFER-Aktionsimport fehlt");
assert(workflow.includes("python scripts/test_update_hofer.py"), "HOFER-Grundtest fehlt");
assert(workflow.includes("python scripts/test_update_hofer_actions.py"), "HOFER-Aktionstest fehlt");
assert(workflow.includes("node --check live-hofer.js"), "HOFER-JS-Check fehlt");
assert(workflow.includes("live-hofer.js"), "HOFER-Pages-Kopie fehlt");

console.log("HOFER integration wiring tests OK");
