import assert from "node:assert/strict";

import { crmGroupMatchesSearch, groupCrmContactRows, standaloneCrmContact } from "../crm-grouping.js";

function normalizePhone(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

const calls = [
  {
    id: 1,
    name: "Caller +17736677270",
    phone: "(773) 667-7270",
    status: "new",
    source: "incoming_call",
    need: "incoming_call",
    createdAt: "2026-11-12T13:15:33.000Z",
    updatedAt: "2026-11-12T13:15:33.000Z",
    voiceCall: { startedAt: "2026-11-12T13:15:33.000Z", fromNumber: "+17736677270" },
    bookingLinkSends: [],
  },
  {
    id: 2,
    name: "Unknown lead",
    phone: "+1 773 667 7270",
    status: "new",
    source: "incoming_call",
    createdAt: "2026-11-12T13:15:52.000Z",
    updatedAt: "2026-11-12T13:15:52.000Z",
    voiceCall: { startedAt: "2026-11-12T13:15:52.000Z", fromNumber: "+17736677270" },
    bookingLinkSends: [],
  },
  {
    id: 3,
    name: "Sam",
    phone: "+17736677270",
    status: "callback",
    source: "incoming_call",
    need: "wire removal quote",
    createdAt: "2026-11-12T13:16:33.000Z",
    updatedAt: "2026-11-12T13:16:33.000Z",
    voiceCall: { startedAt: "2026-11-12T13:16:33.000Z", fromNumber: "+17736677270" },
    bookingLinkSends: [{ id: 8, sentAt: "2026-11-12T13:16:40.000Z" }],
  },
  {
    id: 4,
    name: "Sam",
    phone: "+17736677270",
    status: "appointment",
    source: "incoming_call",
    need: "clean my doobie",
    createdAt: "2026-11-12T14:00:07.000Z",
    updatedAt: "2026-11-12T14:00:07.000Z",
    voiceCall: { startedAt: "2026-11-12T14:00:07.000Z", fromNumber: "+17736677270" },
    bookingLinkSends: [{ id: 9, sentAt: "2026-11-12T14:00:12.000Z" }],
  },
  {
    id: 5,
    name: "Alex",
    phone: "+13125550100",
    status: "new",
    createdAt: "2026-11-12T15:00:00.000Z",
    updatedAt: "2026-11-12T15:00:00.000Z",
    voiceCall: { startedAt: "2026-11-12T15:00:00.000Z", fromNumber: "+13125550100" },
  },
  {
    id: 6,
    name: "Walk-in",
    status: "new",
    createdAt: "2026-11-12T16:00:00.000Z",
    updatedAt: "2026-11-12T16:00:00.000Z",
  },
];

const grouped = groupCrmContactRows(calls, { normalizePhone });
assert.equal(grouped.length, 3);

const sam = grouped.find((contact) => contact.phone === "+17736677270");
assert.ok(sam);
assert.equal(sam.interactionCount, 4);
assert.deepEqual(sam.interactionLeadIds, [4, 3, 2, 1]);
assert.equal(sam.id, 4);
assert.equal(sam.name, "Sam");
assert.equal(sam.status, "appointment");
assert.equal(sam.need, "clean my doobie");
assert.deepEqual(sam.bookingLinkSends.map((send) => send.id), [9, 8]);
assert.equal(crmGroupMatchesSearch(sam, "wire removal"), true);
assert.equal(crmGroupMatchesSearch(sam, "not present"), false);

const standalone = standaloneCrmContact(calls[4]);
assert.equal(standalone.interactionCount, 1);
assert.deepEqual(standalone.interactionLeadIds, [5]);

console.log("CRM grouping tests passed");
