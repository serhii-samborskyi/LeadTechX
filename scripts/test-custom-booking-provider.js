import assert from "node:assert/strict";
import { book, listSlots } from "../calendar/providers/custom.js";

let query = null;
const prisma = {
  bookingAppointment: {
    async findMany(args) {
      query = args;
      return [
        {
          id: 41,
          businessProfileId: 7,
          customerName: "Jordan Lee",
          phone: "+13125550100",
          email: "jordan@example.com",
          scheduledStart: null,
          scheduledEnd: null,
          timezone: "America/Chicago",
          serviceTitle: "Estimate",
          notes: null,
          status: "booking_link_sent",
          bookingUrl: "https://ai.ringport.app/b/abc123",
          manageUrl: "https://example.com/book",
          source: "phone_agent_booking_link",
        },
      ];
    },
  },
};

const result = await listSlots({
  prisma,
  profile: { id: 7 },
  config: { timezone: "America/Chicago" },
  fromDate: "2026-11-17",
  days: 14,
});

assert.equal(result.provider, "custom");
assert.equal(result.workflowMode, "booking_link");
assert.deepEqual(result.slots, []);
assert.equal(result.appointments.length, 1);
assert.equal(result.appointments[0].calendarProvider, "custom");
assert.equal(result.appointments[0].customerName, "Jordan Lee");
assert.equal(query.where.businessProfileId, 7);
assert.equal(query.where.provider, "custom");
assert.match(result.warning, /business booking website/i);

await assert.rejects(() => book(), /custom booking website/i);

console.log("custom booking provider checks passed");
