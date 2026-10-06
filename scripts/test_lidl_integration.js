const fs = require("fs");
const assert = require("assert");
const app = fs.readFileSync("app.js", "utf8");
const index = fs.readFileSync("index.html", "utf8");
const live = fs.readFileSync("live-lidl.js", "utf8");
const workflow = fs.readFileSync(".github/workflows/prices-and-pages.yml", "utf8");
const integrity = fs.readFileSync("scripts/check_action_integrity.py", "utf8");

assert(app.includes('const AUTO_MATCH_STORES = ["mpreis", "spar", "tg", "billa", "hofer", "lidl"]'), "Lidl fehlt im Auto-Matching");
assert(app.includes('if (store === "lidl") return window.LidlLive;'), "Lidl-Live-Modul fehlt");
assert(app.includes('counts.lidl || 0'), "Lidl-Zähler fehlt");
assert(app.includes('function linkLidlResult('), "Lidl-Katalogverknüpfung fehlt");
assert(app.includes('function renderLidlLiveStatus('), "Lidl-Status fehlt");
assert(app.includes('refreshLidlPublicStatus().then'), "Lidl-Status wird beim Start nicht geladen");

assert(index.includes('data-catalog-store="lidl"'), "Lidl fehlt im Händlerkatalog");
assert(index.includes('data-auto-match-store="lidl"'), "Lidl fehlt im Trefferfilter");
assert(index.includes('id="lidlLiveStatus"'), "Lidl-Statuskarte fehlt");
assert(index.includes('<script src="live-lidl.js"></script>'), "live-lidl.js wird nicht geladen");

assert(live.includes('const DATA_URL = "data/lidl.json"'), "Lidl-Datenquelle falsch");
assert(live.includes('window.LidlLive ='), "LidlLive Export fehlt");

assert(workflow.includes('python scripts/update_lidl.py'), "Lidl-Importer fehlt im Workflow");
assert(workflow.includes("python scripts/test_update_lidl.py"), "Lidl-Importtest fehlt im Workflow");
assert(workflow.includes("python scripts/update_lidl_actions.py"), "Lidl-Aktionsimport fehlt im Workflow");
assert(workflow.includes('node --check live-lidl.js'), "Lidl-JS wird im Workflow nicht geprüft");
assert(workflow.includes('node scripts/test_lidl_integration.js'), "Lidl-Integrationstest fehlt im Workflow");
assert(workflow.includes("live-lidl.js") && workflow.includes("manifest.webmanifest") && workflow.includes("cp index.html"), "live-lidl.js wird nicht nach Pages kopiert");
assert(integrity.includes('"lidl": DATA_DIR / "lidl.json"'), "Lidl fehlt im Integritätscheck");

console.log("Lidl integration wiring tests OK");
