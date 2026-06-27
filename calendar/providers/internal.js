import { DateTime } from "luxon";

function parseClock(date, clock, zone) {
  const [hour, minute] = String(clock || "00:00")
    .split(":")
    .map(Number);
  return DateTime.fromObject(
    { year: date.year, month: date.month, day: date.day, hour: hour || 0, minute: minute || 0 },
    { zone },
  );
}

export async function listSlots({ prisma, profile, config, fromDate, days = 14, durationMinutes }) {
  const zone = config.timezone || "America/Chicago";
  const duration = Math.max(5, Number(durationMinutes || config.slotDurationMinutes || 30));
  const dayCount = Math.min(60, Math.max(1, Number(days || 14)));
  const now = DateTime.now().setZone(zone);
  const firstDay = DateTime.fromISO(fromDate || now.toISODate(), { zone }).startOf("day");
  if (!firstDay.isValid) throw new Error("Invalid start date");
  const rangeEnd = firstDay.plus({ days: dayCount });

  const appointments = await prisma.appointment.findMany({
    where: {
      businessName: profile.businessName,
      website: profile.website,
      scheduledStart: { gte: firstDay.toUTC().toJSDate(), lt: rangeEnd.toUTC().toJSDate() },
      status: { notIn: ["cancelled", "rejected"] },
    },
    orderBy: { scheduledStart: "asc" },
  });

  const rules = new Map(config.availabilityRules.map((rule) => [rule.dayOfWeek, rule]));
  const slots = [];
  const bufferMinutes = Math.max(0, Number(config.bufferMinutes || 0));

  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = firstDay.plus({ days: offset });
    const dayOfWeek = date.weekday % 7;
    const rule = rules.get(dayOfWeek);
    if (!rule?.enabled) continue;

    let cursor = parseClock(date, rule.startTime, zone);
    const endOfWindow = parseClock(date, rule.endTime, zone);
    while (cursor.plus({ minutes: duration }) <= endOfWindow && slots.length < 300) {
      const slotEnd = cursor.plus({ minutes: duration });
      const unavailable = appointments.some((appointment) => {
        const bookedStart = DateTime.fromJSDate(appointment.scheduledStart, { zone: "utc" }).setZone(zone);
        const bookedEnd = DateTime.fromJSDate(appointment.scheduledEnd, { zone: "utc" }).setZone(zone);
        return cursor < bookedEnd.plus({ minutes: bufferMinutes }) && slotEnd.plus({ minutes: bufferMinutes }) > bookedStart;
      });
      if (!unavailable && cursor > now) {
        slots.push({
          start: cursor.toISO(),
          end: slotEnd.toISO(),
          date: cursor.toISODate(),
          label: cursor.toFormat("ccc, LLL d 'at' h:mm a"),
          timezone: zone,
        });
      }
      cursor = cursor.plus({ minutes: duration + bufferMinutes });
    }
  }

  return { slots, appointments, timezone: zone, durationMinutes: duration };
}

export async function book({ prisma, profile, config, start, durationMinutes, customer, intakeData, reason }) {
  const zone = config.timezone || "America/Chicago";
  const requestedStart = DateTime.fromISO(String(start || ""), { zone });
  if (!requestedStart.isValid) throw new Error("A valid appointment start time is required");
  const duration = Math.max(5, Number(durationMinutes || config.slotDurationMinutes || 30));
  const availability = await listSlots({
    prisma,
    profile,
    config,
    fromDate: requestedStart.toISODate(),
    days: 1,
    durationMinutes: duration,
  });
  const matched = availability.slots.find(
    (slot) => Math.abs(DateTime.fromISO(slot.start).toMillis() - requestedStart.toMillis()) < 60_000,
  );
  if (!matched) throw new Error("That appointment time is not available");

  const status = config.appointmentMode === "instant" ? "confirmed" : "requested";
  const startUtc = DateTime.fromISO(matched.start).toUTC();
  const bookingKey = `${profile.cacheKey}:${startUtc.toISO()}`;
  let appointment;
  try {
    appointment = await prisma.appointment.create({
      data: {
        businessName: profile.businessName,
        website: profile.website,
        customerName: String(customer.name || "unknown"),
        phone: customer.phone ? String(customer.phone) : null,
        email: customer.email ? String(customer.email) : null,
        requestedAt: matched.start,
        scheduledStart: startUtc.toJSDate(),
        scheduledEnd: DateTime.fromISO(matched.end).toUTC().toJSDate(),
        durationMinutes: duration,
        timezone: zone,
        intakeData: intakeData || {},
        reason: reason ? String(reason) : null,
        status,
        calendarProvider: "internal",
        bookingKey,
      },
    });
  } catch (error) {
    if (error.code === "P2002") throw new Error("That appointment slot was just booked by someone else");
    throw error;
  }

  const persisted = await prisma.appointment.findUnique({ where: { id: appointment.id } });
  if (!persisted?.scheduledStart || persisted.bookingKey !== bookingKey) {
    throw new Error("The appointment could not be verified after saving");
  }
  return persisted;
}
