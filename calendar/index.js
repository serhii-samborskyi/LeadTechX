import * as internal from "./providers/internal.js";
import * as vagaro from "./providers/vagaro.js";

const providers = { internal, vagaro };

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
