import * as Application from "expo-application";
import * as Crypto from "expo-crypto";
import { Platform } from "react-native";

import { secureStorage } from "./auth";

const DEVICE_ID_KEY = "ringport.mobile.deviceId";

async function platformDeviceId() {
  if (Platform.OS === "ios") return Application.getIosIdForVendorAsync();
  if (Platform.OS === "android") return Application.getAndroidId();
  return null;
}

export async function getDeviceId() {
  const stored = await secureStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;
  const nativeId = await platformDeviceId().catch(() => null);
  const randomId = Crypto.randomUUID();
  const deviceId = nativeId ? `${Platform.OS}:${nativeId}` : `${Platform.OS}:install:${randomId}`;
  await secureStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
