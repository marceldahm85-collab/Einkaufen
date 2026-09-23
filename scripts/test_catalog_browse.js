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
  vm.runInContext(fs.readFileSync("live-search.js", "utf8"), context, { filename: "live-search.js" });
  vm.runInContext(source, context, { filename: file });

  const api = context.window[globalName];
  assert(api, `${globalName} export missing`);
  assert.strictEqual(typeof api.browse, "function", `${globalName}.browse missing`);
  assert.strictEqual(typeof api.matchCandidates, "function", `${globalName}.matchCandidates missing`);

  return api;
}



async function verifyPromotionSafety() {
  const datedPayload = {
    updatedAt: "2026-09-10T10:00:00Z",
    products: [
      {
        remoteObjectId: "active",
        retailerProductId: "active",
        name: "Aktive Aktion",
        currentPrice: 1,
        regularPrice: 2,
        salePrice: 1,
        promotionVerified: true,
        promotion: { type: "price_drop", label: "Aktion" }
      },
      {
        remoteObjectId: "expired",
        retailerProductId: "expired",
        name: "Abgelaufene Aktion",
        currentPrice: 1,
        regularPrice: 2,
        salePrice: 1,
        validUntil: "2000-01-01",
        promotionVerified: true,
        promotion: { type: "bundle", requiredQuantity: 2, label: "1+1 gratis" }
      },
      {
        remoteObjectId: "future",
        retailerProductId: "future",
        name: "Zukünftige Aktion",
        currentPrice: 1,
        regularPrice: 2,
        salePrice: 1,
        validFrom: "2999-01-01",
        promotionVerified: true,
        promotion: { type: "quantity", requiredQuantity: 2, label: "ab 2 Stück" }
      }
    ]
  };

  for (const [file, globalName] of [
    ["live-mpreis.js", "MPreisLive"],
    ["live-spar.js", "SparLive"],
    ["live-tg.js", "TgLive"],
    ["live-billa.js", "BillaLive"]
  ]) {
    const api = await loadModule(file, globalName, datedPayload);
    const promos = await api.promotions();
    assert.deepStrictEqual(Array.from(promos, item => item.name), ["Aktive Aktion"]);

    const filtered = await api.browse({ promotionsOnly: true, limit: 20 });
    assert.strictEqual(filtered.total, 1);
    assert.strictEqual(filtered.items[0].name, "Aktive Aktion");
  }

  for (const [file, globalName] of [
    ["live-mpreis.js", "MPreisLive"],
    ["live-spar.js", "SparLive"]
  ]) {
    const stalePayload = JSON.parse(JSON.stringify(datedPayload));
    stalePayload.promotionStale = true;
    const api = await loadModule(file, globalName, stalePayload);
    const promos = await api.promotions();
    assert.strictEqual(promos.length, 0);
    const status = await api.status();
    assert.strictEqual(status.promotionCount, 0);
    assert.strictEqual(status.promotionStale, true);
  }
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
    ["live-tg.js", "TgLive"],
    ["live-billa.js", "BillaLive"]
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


  // Category-aware catalog search must not return products that only contain
  // the query term incidentally (e.g. Butterkeks or Kaffee-Joghurt).
  const billaPrecisionPayload = {
    updatedAt: "2026-09-23T08:00:00Z",
    products: [
      { remoteObjectId: "b1", retailerProductId: "b1", name: "Schärdinger Fasslbutter", description: "", currentPrice: 2.66 },
      { remoteObjectId: "b2", retailerProductId: "b2", name: "Leibniz Butterkeks", description: "", currentPrice: 2.49 },
      { remoteObjectId: "b3", retailerProductId: "b3", name: "Ja! Natürlich Butterschmalz", description: "", currentPrice: 4.99 },
      { remoteObjectId: "b4", retailerProductId: "b4", name: "Butter Laugen-Croissant", description: "", currentPrice: 0.89 },
      { remoteObjectId: "k1", retailerProductId: "k1", name: "Lavazza Caffe Crema Bohnen", description: "", currentPrice: 15.99 },
      { remoteObjectId: "k2", retailerProductId: "k2", name: "Kaffee Joghurt", description: "", currentPrice: 1.29 }
    ]
  };
  const billaPrecision = await loadModule("live-billa.js", "BillaLive", billaPrecisionPayload);
  const butterSearch = await billaPrecision.browse({ query: "Butter", limit: 20 });
  assert.deepStrictEqual(Array.from(butterSearch.items, item => item.name), ["Schärdinger Fasslbutter"]);
  const coffeeSearch = await billaPrecision.browse({ query: "Kaffee", limit: 20 });
  assert.deepStrictEqual(Array.from(coffeeSearch.items, item => item.name), ["Lavazza Caffe Crema Bohnen"]);

  await verifyPromotionSafety();

  console.log("Catalog browse/promotion/precision tests OK");
})().catch(error => {
  console.error(error);
  process.exit(1);
});
