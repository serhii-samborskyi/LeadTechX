import assert from "node:assert/strict";

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

console.log("Inbound discovery playbook checks passed");
