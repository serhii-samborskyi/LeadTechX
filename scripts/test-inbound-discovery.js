import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { inboundDiscoveryPlaybook, inboundOpeningInstruction } from "../inbound-discovery.js";

const opening = inboundOpeningInstruction({ businessName: "WireClean", agentName: "Alex" });
assert.match(
  opening,
  /Thanks for calling WireClean—this is Alex\. What are you looking to get taken care of today\?/,
);
assert.match(opening, /stop speaking and wait/i);
assert.equal((opening.match(/\?/g) || []).length, 1, "The default opening should ask exactly one question");
assert.doesNotMatch(opening, /the receptionist for/i);

const returningOpening = inboundOpeningInstruction({
  businessName: "WireClean",
  agentName: "Alex",
  hasCallerHistory: true,
});
assert.match(returningOpening, /greet them by first name/i);
assert.match(returningOpening, /recent need/i);
assert.match(returningOpening, /something new/i);

const playbook = inboundDiscoveryPlaybook();
assert.match(playbook, /caller should do most of the talking/i);
assert.match(playbook, /ask at most one question per turn/i);
assert.match(playbook, /stop discovery as soon as/i);
assert.match(playbook, /never ask for the inbound phone number/i);
assert.match(playbook, /ask for email only when/i);
assert.match(playbook, /complaint.*switch out of sales discovery/i);
assert.match(playbook, /potentially dangerous or urgent/i);
assert.ok((playbook.match(/^\d+\./gm) || []).length >= 4, "The playbook should include at least four examples");

// The regular phone greeting is prepared in the Gemini connection callback and
// consumed later in the provider message callback. Keep provider-message code
// from reaching back into connection-local caller history: that caused regular
// calls to become silent while onboarding and browser tests still worked.
const serverSource = readFileSync(new URL("../server.js", import.meta.url), "utf8");
const setupCompleteStart = serverSource.indexOf("if (message.setupComplete && !greeted)");
const setupCompleteEnd = serverSource.indexOf("const serverContent = message.serverContent;", setupCompleteStart);
assert.ok(setupCompleteStart >= 0 && setupCompleteEnd > setupCompleteStart, "Phone setup-complete handler should exist");
const setupCompleteHandler = serverSource.slice(setupCompleteStart, setupCompleteEnd);
assert.match(setupCompleteHandler, /const greeting = initialGreetingInstruction;/);
assert.doesNotMatch(
  setupCompleteHandler,
  /\bcallerHistory\b/,
  "The provider message callback must not reference connection-local caller history",
);
assert.match(serverSource, /let initialGreetingInstruction = "";/);
assert.match(serverSource, /initialGreetingInstruction = isOnboarding[\s\S]*?hasCallerHistory: \/Known caller name:\/i\.test\(callerHistory\)/);

console.log("Inbound discovery playbook checks passed");
