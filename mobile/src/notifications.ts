import Constants from "expo-constants";
import { Platform } from "react-native";
import { OneSignal } from "react-native-onesignal";

import { registerPushSubscription } from "./api";
import type { AuthUser } from "./types";

type AppExtra = {
  oneSignalAppId?: string;
};

const extra = (Constants.expoConfig?.extra || Constants.manifest2?.extra || {}) as AppExtra;
let initialized = false;

export function initializeNotifications() {
  const appId = String(extra.oneSignalAppId || "").trim();
  if (!appId || initialized) return false;
  OneSignal.initialize(appId);
  initialized = true;
  return true;
}

export async function identifyNotifications(input: { token: string; user: AuthUser; deviceId: string }) {
  if (!initializeNotifications()) return;
  const externalId = `user:${input.user.id}`;
  OneSignal.login(externalId);
  OneSignal.User.addTags({
    role: input.user.role,
    businessProfileId: input.user.business?.id ? String(input.user.business.id) : "",
    accountStatus: input.user.business?.accountStatus || "",
  });
  await OneSignal.Notifications.requestPermission(false).catch(() => false);
  const [oneSignalId, subscriptionId] = await Promise.all([
    OneSignal.User.getOnesignalId().catch(() => null),
    OneSignal.User.pushSubscription.getIdAsync().catch(() => null),
  ]);
  await registerPushSubscription(input.token, {
    deviceId: input.deviceId,
    oneSignalId,
    subscriptionId,
    externalId,
    platform: Platform.OS,
    tags: {
      role: input.user.role,
      businessProfileId: input.user.business?.id ? String(input.user.business.id) : "",
    },
  }).catch(() => null);
}

export function logoutNotifications() {
  if (!initialized) return;
  OneSignal.logout();
}
