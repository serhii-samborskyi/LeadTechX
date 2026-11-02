import * as internal from "./providers/internal.js";
import * as vagaro from "./providers/vagaro.js";
import * as googleCalendar from "./providers/google-calendar.js";
import * as calendly from "./providers/calendly.js";

const providers = { internal, vagaro, google_calendar: googleCalendar, calendly };

export function getCalendarProvider(name = "internal") {
  const provider = providers[name];
  if (!provider) throw new Error(`Calendar provider is not configured: ${name}`);
  return provider;
}

export async function listCalendarSlots(args) {
  return getCalendarProvider(args.config.calendarProvider).listSlots(args);
}

export async function bookCalendarAppointment(args) {
  return getCalendarProvider(args.config.calendarProvider).book(args);
}

export async function updateCalendarAppointment(args) {
  const provider = getCalendarProvider(args.config.calendarProvider);
  if (typeof provider.update !== "function") throw new Error(`${args.config.calendarProvider} appointments cannot be updated from RingPort`);
  return provider.update(args);
}

export async function cancelCalendarAppointment(args) {
  const provider = getCalendarProvider(args.config.calendarProvider);
  if (typeof provider.cancel !== "function") throw new Error(`${args.config.calendarProvider} appointments cannot be cancelled from RingPort`);
  return provider.cancel(args);
}
