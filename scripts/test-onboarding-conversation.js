import assert from "node:assert/strict";

import {
  DEFAULT_ONBOARDING_INSTRUCTIONS,
  ONBOARDING_CONVERSATION_RULES,
  ONBOARDING_OPENING_INSTRUCTION,
} from "../onboarding-conversation.js";

const spokenOpening = ONBOARDING_OPENING_INSTRUCTION.match(/Say exactly: "([^"]+)"/)?.[1] || "";
assert.ok(spokenOpening, "The onboarding opening must contain exact spoken copy");
assert.equal((spokenOpening.match(/\?/g) || []).length, 0, "The open invitation should not bundle multiple questions");
assert.ok(spokenOpening.split(/\s+/).length <= 14, "The onboarding opening should stay brief");
assert.match(ONBOARDING_OPENING_INSTRUCTION, /stop speaking and wait/i);
assert.match(ONBOARDING_CONVERSATION_RULES, /ask exactly one question at a time/i);
assert.match(ONBOARDING_CONVERSATION_RULES, /Never ask again for information they already provided/i);
assert.match(ONBOARDING_CONVERSATION_RULES, /Does everything look right\?/i);
assert.match(DEFAULT_ONBOARDING_INSTRUCTIONS, /natural, concise conversation/i);

console.log("Onboarding conversation checks passed");
