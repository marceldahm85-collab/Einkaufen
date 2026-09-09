const fs = require("fs");
const vm = require("vm");
const assert = require("assert");

async function loadModule(file, globalName, payload) {
  const source = fs.readFileSync(file, "utf8");

  const context = {
    window: {},
    console,
    fetch: async () => ({
      ok: true,
      json: async () => JSON.parse(JSON.stringify(payload))
    })
  };

  vm.createContext(context);
  vm.runInContext(source, context, { filename: file });

  const api = context.window[globalName];
  assert(api, `${globalName} export missing`);
  assert.strictEqual(typeof api.browse, "function", `${globalName}.browse missing`);

  return api;
}

(async () => {
  const payload = {
    updatedAt: "2026-09-09T12:00:00Z",
    products: [
      {
        remoteObjectId: "3",
        retailerProductId: "3",
        name: "Zitrone",
        description: "Bio",
        currentPrice: 1.2,
        promotionVerified: false
      },
      {
        remoteObjectId: "1",
        retailerProductId: "1",
        name: "Apfel Gala",
        description: "rot",
        currentPrice: 2.5,
        promotionVerified: true
      },
      {
        remoteObjectId: "2",
        retailerProductId: "2",
        name: "Apfelsaft",
        description: "naturtrüb",
        currentPrice: 1.8,
        promotionVerified: false
      },
      {
        remoteObjectId: "4",
        retailerProductId: "4",
        name: "Banane",
        description: "Obst",
        currentPrice: 1.4,
        promotionVerified: true
      }
    ]
  };

  for (const [file, globalName] of [
    ["live-mpreis.js", "MPreisLive"],
    ["live-spar.js", "SparLive"],
    ["live-tg.js", "TgLive"]
  ]) {
    const api = await loadModule(file, globalName, payload);

    const page1 = await api.browse({ offset: 0, limit: 2 });
    assert.strictEqual(page1.total, 4);
    assert.strictEqual(page1.items.length, 2);
    assert.strictEqual(page1.items[0].name, "Apfel Gala");
    assert.strictEqual(page1.items[1].name, "Apfelsaft");
    assert.strictEqual(page1.hasMore, true);

    const page2 = await api.browse({ offset: 2, limit: 2 });
    assert.strictEqual(page2.items[0].name, "Banane");
    assert.strictEqual(page2.items[1].name, "Zitrone");
    assert.strictEqual(page2.hasMore, false);

    const search = await api.browse({ query: "apfel", offset: 0, limit: 10 });
    assert.strictEqual(search.total, 2);
    assert.strictEqual(search.items[0].name, "Apfel Gala");
    assert.strictEqual(search.items[1].name, "Apfelsaft");

    const promos = await api.browse({
      promotionsOnly: true,
      offset: 0,
      limit: 10
    });
    assert.strictEqual(promos.total, 2);
    assert.deepStrictEqual(
      Array.from(promos.items, item => item.name),
      ["Apfel Gala", "Banane"]
    );
  }

  console.log("Catalog browse tests OK");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
