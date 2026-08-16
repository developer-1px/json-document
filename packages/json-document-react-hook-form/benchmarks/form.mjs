import { JSDOM } from "jsdom";
import { benchmarkConfig, measureAsync, reportScaling } from "../../../benchmarks/measure.mjs";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
globalThis.window = dom.window;
globalThis.document = dom.window.document;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: dom.window.navigator,
});
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const [{ act, cleanup, renderHook }, { createJSONDocument }, { useReactHookFormConnector }] = await Promise.all([
  import("@testing-library/react"),
  import("@interactive-os/json-document"),
  import("../dist/index.js"),
]);

const config = benchmarkConfig("PERF_RHF_ITEMS");
console.log("json-document React Hook Form connector benchmark");
console.log(`items=${config.sizes.join(",")} rounds=${config.rounds} warmups=${config.warmups}`);

const externalRows = [];
const submitRows = [];
for (const size of config.sizes) {
  const initial = { items: Array.from({ length: size }, (_, index) => ({ id: `item-${index}`, done: false })) };
  const middle = Math.floor(size / 2);
  console.log(`\nitems=${size}`);

  const external = await measureAsync(config, "external leaf sync", async () => {
    const documentState = createJSONDocument(initial);
    const hook = renderHook(() => useReactHookFormConnector(documentState));
    return async () => {
      let committed;
      await act(async () => {
        committed = documentState.commit([{ op: "replace", path: `/items/${middle}/done`, value: true }]);
      });
      const synced = hook.result.current.form.getValues(`items.${middle}.done`) === true;
      hook.unmount();
      cleanup();
      return committed?.ok === true && synced;
    };
  });
  externalRows.push({ size, ...external });

  const submit = await measureAsync(config, "whole form submit", async () => {
    const documentState = createJSONDocument(initial);
    const hook = renderHook(() => useReactHookFormConnector(documentState));
    hook.result.current.form.setValue(`items.${middle}.done`, true);
    return async () => {
      await act(async () => { await hook.result.current.submit(); });
      const committed = documentState.value.items[middle].done === true;
      hook.unmount();
      cleanup();
      return committed;
    };
  });
  submitRows.push({ size, ...submit });
}

console.log("\nexternal leaf sync");
reportScaling(externalRows);
console.log("\nwhole form submit");
reportScaling(submitRows);
