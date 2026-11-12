const MERGED_RELATIONS = [
  "qualificationCalls",
  "feedback",
  "leadWebhookEvents",
  "messageDeliveries",
  "inboundMessages",
  "bookingLinkSends",
  "bookingAppointments",
];

function text(value) {
  return String(value || "").trim();
}

function timestamp(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function interactionTime(lead) {
  return timestamp(lead?.voiceCall?.startedAt || lead?.createdAt || lead?.updatedAt);
}

function isFriendlyName(value) {
  const name = text(value);
  if (!name || /^unknown(?: lead)?$/i.test(name) || /^caller\b/i.test(name)) return false;
  return !/^\+?[\d\s().-]+$/.test(name);
}

function latestValue(leads, field, predicate = (value) => Boolean(text(value))) {
  const match = leads.find((lead) => predicate(lead?.[field]));
  return match?.[field] ?? null;
}

function relationTime(item) {
  return timestamp(item?.updatedAt || item?.createdAt || item?.sentAt || item?.startedAt || item?.scheduledStart);
}

function mergeRelation(leads, relation) {
  const seen = new Set();
  return leads
    .flatMap((lead) => (Array.isArray(lead?.[relation]) ? lead[relation] : []))
    .filter((item) => {
      const key = item?.id === undefined || item?.id === null ? JSON.stringify(item) : String(item.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => relationTime(right) - relationTime(left));
}

export function crmContactGroupKey(lead, { normalizePhone = (value) => text(value) } = {}) {
  const rawPhone = text(lead?.phone || lead?.voiceCall?.fromNumber);
  const phone = text(normalizePhone(rawPhone) || rawPhone);
  if (phone) return `phone:${phone}`;
  const email = text(lead?.email).toLowerCase();
  if (email) return `email:${email}`;
  return `lead:${lead?.id}`;
}

export function groupCrmContactRows(rows, { normalizePhone = (value) => text(value) } = {}) {
  const groups = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = crmContactGroupKey(row, { normalizePhone });
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  return Array.from(groups, ([crmContactKey, members]) => {
    const interactions = [...members].sort((left, right) => interactionTime(right) - interactionTime(left));
    const representative = interactions[0];
    const rawPhone = text(representative?.phone || representative?.voiceCall?.fromNumber);
    const normalizedPhone = text(normalizePhone(rawPhone) || rawPhone) || null;
    const createdTimes = interactions.map((lead) => timestamp(lead.createdAt)).filter(Boolean);
    const updatedTimes = interactions.map((lead) => timestamp(lead.updatedAt)).filter(Boolean);
    const contact = {
      ...representative,
      crmContactKey,
      name: latestValue(interactions, "name", isFriendlyName) || representative?.name || null,
      phone: normalizedPhone,
      email: latestValue(interactions, "email") || representative?.email || null,
      need: latestValue(interactions, "need") || representative?.need || null,
      notes: latestValue(interactions, "notes") || representative?.notes || null,
      summary: latestValue(interactions, "summary") || representative?.summary || null,
      createdAt: createdTimes.length ? new Date(Math.min(...createdTimes)).toISOString() : representative?.createdAt,
      updatedAt: updatedTimes.length ? new Date(Math.max(...updatedTimes)).toISOString() : representative?.updatedAt,
      interactionCount: interactions.length,
      interactionLeadIds: interactions.map((lead) => lead.id),
      interactions,
    };
    for (const relation of MERGED_RELATIONS) contact[relation] = mergeRelation(interactions, relation);
    return contact;
  }).sort((left, right) => interactionTime(right) - interactionTime(left));
}

export function crmGroupMatchesSearch(contact, query) {
  const needle = text(query).toLowerCase();
  if (!needle) return true;
  return (contact?.interactions || [contact]).some((lead) =>
    [lead?.name, lead?.phone, lead?.voiceCall?.fromNumber, lead?.email, lead?.need, lead?.source, lead?.summary, lead?.notes]
      .some((value) => text(value).toLowerCase().includes(needle)),
  );
}

export function standaloneCrmContact(lead) {
  return {
    ...lead,
    crmContactKey: `lead:${lead.id}`,
    interactionCount: 1,
    interactionLeadIds: [lead.id],
    interactions: [lead],
  };
}
