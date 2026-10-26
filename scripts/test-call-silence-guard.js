import assert from "node:assert/strict";

import {
  createCallSilenceGuard,
  normalizedCallSilenceHangupSeconds,
  normalizedCallSilenceWarningSeconds,
  telephonyAudioLevel,
} from "../call-silence-guard.js";

assert.equal(normalizedCallSilenceWarningSeconds(undefined), 20);
assert.equal(normalizedCallSilenceWarningSeconds(0), 0);
assert.equal(normalizedCallSilenceWarningSeconds(999), 300);
assert.equal(normalizedCallSilenceHangupSeconds(undefined), 15);
assert.equal(normalizedCallSilenceHangupSeconds(1), 5);

const pcmuSilence = telephonyAudioLevel(Buffer.alloc(160, 0xff).toString("base64"), "PCMU");
assert.equal(pcmuSilence.rms, 0);
assert.equal(pcmuSilence.peak, 0);

const pcmuVoice = telephonyAudioLevel(Buffer.alloc(160, 0x00).toString("base64"), "PCMU");
assert.ok(pcmuVoice.rms > 10000);
assert.ok(pcmuVoice.peak > 10000);

const l16VoiceBuffer = Buffer.alloc(320);
for (let offset = 0; offset < l16VoiceBuffer.length; offset += 2) l16VoiceBuffer.writeInt16LE(offset % 4 ? 2400 : -2400, offset);
const l16Voice = telephonyAudioLevel(l16VoiceBuffer.toString("base64"), "L16", "LE");
assert.equal(l16Voice.rms, 2400);
assert.equal(l16Voice.peak, 2400);

let clock = 1000;
let warnings = 0;
let hangups = 0;
let resumes = 0;
const guard = createCallSilenceGuard({
  warningSeconds: 20,
  hangupSeconds: 15,
  now: () => clock,
  schedule: false,
  onWarning: async () => {
    warnings += 1;
  },
  onHangup: async () => {
    hangups += 1;
  },
  onResume: async () => {
    resumes += 1;
  },
});

guard.start();
clock += 19999;
await guard.check();
assert.equal(warnings, 0);
clock += 1;
await guard.check();
assert.equal(warnings, 1);
clock += 5000;
guard.noteAgentPlaybackEnded();
clock += 14999;
await guard.check();
assert.equal(hangups, 0);
guard.noteCallerActivity("transcription");
await Promise.resolve();
assert.equal(resumes, 1);
clock += 20000;
await guard.check();
assert.equal(warnings, 2);
clock += 15000;
await guard.check();
assert.equal(hangups, 1);

console.log("Call silence guard tests passed");
