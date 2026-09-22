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
${extract("fmtNumber", "cleanComparisonAmount")}
${extract("cleanComparisonAmount", "fmtAmount")}
${extract("normalizeMeasureUnit", "normalizeMeasure")}
this.result = { cleanComparisonAmount, fmtNumber };
`;
const context = { Intl };
vm.createContext(context);
vm.runInContext(code, context);
const { cleanComparisonAmount } = context.result;

assert.strictEqual(cleanComparisonAmount(9.998, "l"), 10);
assert.strictEqual(cleanComparisonAmount(1.999, "kg"), 2);
assert.strictEqual(cleanComparisonAmount(0.4998, "l"), 0.5);
assert.strictEqual(cleanComparisonAmount(1.25, "l"), 1.25);
assert.strictEqual(cleanComparisonAmount(0.333, "l"), 0.333);
assert.strictEqual(cleanComparisonAmount(6, "Stk"), 6);

console.log("Amount normalization tests OK");
