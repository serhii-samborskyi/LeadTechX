import assert from "node:assert/strict";

import { bookingPrefillFromCollectedDetails } from "../booking-prefill.js";

const fields = [
  { fieldKey: "name", label: "Full name", fieldType: "text", options: [] },
  { fieldKey: "phone", label: "Phone number", fieldType: "phone", options: [] },
  { fieldKey: "email", label: "Email", fieldType: "email", options: [] },
  { fieldKey: "address", label: "Address", fieldType: "text", options: [] },
  { fieldKey: "building_description", label: "Building description", fieldType: "text", options: [] },
  { fieldKey: "appointment_time", label: "Requested time", fieldType: "text", options: [] },
  { fieldKey: "access_type", label: "Access type", fieldType: "select", options: ["Front door", "Side door"] },
];

const prefill = bookingPrefillFromCollectedDetails({
  fields,
  args: {
    building_description: "Two-story brick home",
    requestedTime: "Tomorrow morning",
    access_type: "side door",
  },
  lead: {
    name: "Dora Robinson",
    phone: "+13125550123",
    email: "dora@example.com",
    extractedFields: { service_address: "123 Main Street" },
  },
});

assert.deepEqual(prefill, {
  name: "Dora Robinson",
  phone: "+13125550123",
  email: "dora@example.com",
  address: "123 Main Street",
  building_description: "Two-story brick home",
  appointment_time: "Tomorrow morning",
  access_type: "Side door",
});

const configuredOnly = bookingPrefillFromCollectedDetails({
  fields: [{ fieldKey: "phone_number", label: "Phone", fieldType: "phone", options: [] }],
  args: { private_note: "must not be exposed" },
  customerName: "Hidden Name",
  phone: "+17735550123",
});

assert.deepEqual(configuredOnly, { phone_number: "+17735550123" });
console.log("Booking prefill tests passed");
