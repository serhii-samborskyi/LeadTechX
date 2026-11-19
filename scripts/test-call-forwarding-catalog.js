import assert from "node:assert/strict";

import {
  CALL_FORWARDING_LINE_TYPES,
  CALL_FORWARDING_PROVIDERS,
  callForwardingProvider,
  callForwardingProvidersForType,
  renderForwardingTemplate,
} from "../public/call-forwarding-catalog.js";

const ids = CALL_FORWARDING_PROVIDERS.map((provider) => provider.id);
assert.equal(new Set(ids).size, ids.length, "provider ids must be unique");
assert(ids.includes("other"), "catalog must include an Other provider fallback");

for (const lineType of CALL_FORWARDING_LINE_TYPES) {
  const providers = callForwardingProvidersForType(lineType.id);
  assert(providers.length > 1, `${lineType.label} must have provider choices`);
  assert(providers.some((provider) => provider.id === "other"), `${lineType.label} must include the fallback provider`);
}

for (const provider of CALL_FORWARDING_PROVIDERS) {
  assert(provider.name, `${provider.id} must have a display name`);
  assert(provider.verifiedOn, `${provider.id} must have a verification date`);
  assert(provider.noAnswer?.length, `${provider.id} must explain no-answer behavior`);
  assert(provider.disable?.length, `${provider.id} must explain how to undo forwarding`);
  for (const action of [...provider.noAnswer, ...(provider.busy || []), ...(provider.unreachable || []), ...provider.disable]) {
    assert(action.value || action.instruction, `${provider.id} has an empty guide action`);
    const rendered = renderForwardingTemplate(action.value || action.instruction, {
      destinationNumber: "+13125550123",
      delaySeconds: 20,
      ringCount: 4,
    });
    assert(!rendered.includes("{{"), `${provider.id} has an unresolved template token: ${rendered}`);
  }
}

assert.equal(
  renderForwardingTemplate(callForwardingProvider("verizon_wireless").noAnswer[0].value, {
    destinationNumber: "+13125550123",
  }),
  "*713125550123",
);
assert.equal(
  renderForwardingTemplate(callForwardingProvider("tmobile").noAnswer[0].value, {
    destinationNumber: "+13125550123",
    delaySeconds: 20,
  }),
  "**61*13125550123**20#",
);
assert.equal(callForwardingProvider("google_fi").status, "unsupported");
assert.equal(callForwardingProvider("xfinity_voice").status, "unsupported");

console.log("Call-forwarding catalog tests passed");
