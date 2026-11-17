import assert from "node:assert/strict";

import {
  DEFAULT_ONBOARDING_INSTRUCTIONS,
  ONBOARDING_CONVERSATION_RULES,
  ONBOARDING_OPENING_INSTRUCTION,
  onboardingBuildClosingMessage,
  phoneOnboardingLinkMessage,
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

const textClosing = onboardingBuildClosingMessage("text");
assert.match(textClosing, /build your agent now and text you a link to try it/i);
assert.match(textClosing, /link isn't opened, I'll send a reminder/i);
assert.match(onboardingBuildClosingMessage("email"), /email you a link to try it/i);

const setupUrl = "https://ai.ringport.app/o/70099660?channel=text";
const setupMessage = phoneOnboardingLinkMessage({ businessName: "Gerber Collision & Glass", setupUrl });
assert.match(setupMessage, /is ready\. Try it and finish setup here:/i);
assert.ok(setupMessage.includes(`\n\n${setupUrl}\n\n`), "The setup URL must be isolated on its own line");
assert.ok(!setupMessage.includes(`setup: ${setupUrl}`), "The setup URL must not run into the preceding sentence");

const reminderMessage = phoneOnboardingLinkMessage({
  businessName: "Gerber Collision & Glass",
  setupUrl,
  isReminder: true,
});
assert.match(reminderMessage, /Just checking that you received/i);
assert.ok(reminderMessage.includes(`\n\n${setupUrl}\n\n`), "Reminder URLs must also be isolated on their own line");

console.log("Onboarding conversation checks passed");
