function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function cleanValue(value) {
  if (Array.isArray(value)) return value.map(cleanValue).find(Boolean) || "";
  if (value === null || value === undefined || typeof value === "object") return "";
  return String(value).trim().slice(0, 2000);
}

function normalizedKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function firstSourceValue(sources, keys) {
  for (const key of keys) {
    for (const source of sources) {
      const direct = cleanValue(source[key]);
      if (direct) return direct;
      const matchingKey = Object.keys(source).find((candidate) => normalizedKey(candidate) === key);
      const matched = matchingKey ? cleanValue(source[matchingKey]) : "";
      if (matched) return matched;
    }
  }
  return "";
}

function optionValue(field, value) {
  const options = Array.isArray(field.options) ? field.options.map((option) => String(option || "").trim()).filter(Boolean) : [];
  if (!options.length) return value;
  return options.find((option) => option.toLowerCase() === value.toLowerCase()) || "";
}

export function bookingPrefillFromCollectedDetails({
  fields = [],
  args = {},
  lead = null,
  customerName = "",
  phone = "",
  email = "",
} = {}) {
  const safeArgs = objectValue(args);
  const extracted = objectValue(lead?.extractedFields);
  const sources = [
    objectValue(safeArgs.intakeData),
    safeArgs,
    objectValue(extracted.bookingIntake),
    objectValue(extracted.intakeData),
    objectValue(extracted.captureLeadTool),
    extracted,
  ];
  const canonical = {
    name: cleanValue(customerName) || cleanValue(lead?.name),
    phone: cleanValue(phone) || cleanValue(lead?.phone),
    email: cleanValue(email) || cleanValue(lead?.email),
    reason:
      cleanValue(safeArgs.reason) ||
      cleanValue(safeArgs.serviceName) ||
      cleanValue(safeArgs.service) ||
      cleanValue(lead?.need) ||
      cleanValue(extracted.caller_need),
    address:
      cleanValue(safeArgs.address) ||
      cleanValue(safeArgs.service_address) ||
      cleanValue(extracted.address) ||
      cleanValue(extracted.service_address),
    requestedTime:
      cleanValue(safeArgs.requestedTime) ||
      cleanValue(safeArgs.requested_time) ||
      cleanValue(safeArgs.appointment_time) ||
      cleanValue(extracted.appointment_time),
  };
  const prefill = {};

  for (const field of fields || []) {
    const key = normalizedKey(field.fieldKey || field.label);
    if (!key) continue;
    const type = normalizedKey(field.fieldType);
    const aliases = [key];
    let fallback = "";
    if (["name", "full_name", "customer_name"].includes(key)) {
      aliases.push("name", "full_name", "customer_name", "caller_name");
      fallback = canonical.name;
    } else if (type === "phone" || ["phone", "phone_number", "mobile", "mobile_phone"].includes(key)) {
      aliases.push("phone", "phone_number", "mobile", "mobile_phone", "caller_phone");
      fallback = canonical.phone;
    } else if (type === "email" || ["email", "email_address", "customer_email"].includes(key)) {
      aliases.push("email", "email_address", "customer_email", "caller_email");
      fallback = canonical.email;
    } else if (["reason", "appointment_reason", "service", "service_name", "need"].includes(key)) {
      aliases.push("reason", "appointment_reason", "service", "service_name", "need", "caller_need");
      fallback = canonical.reason;
    } else if (["address", "service_address", "job_address", "location"].includes(key)) {
      aliases.push("address", "service_address", "job_address", "location");
      fallback = canonical.address;
    } else if (["appointment_time", "requested_time"].includes(key)) {
      aliases.push("appointment_time", "requested_time", "requestedtime");
      fallback = canonical.requestedTime;
    }
    const value = optionValue(field, firstSourceValue(sources, [...new Set(aliases)]) || fallback);
    if (value) prefill[field.fieldKey] = value;
  }

  return prefill;
}
