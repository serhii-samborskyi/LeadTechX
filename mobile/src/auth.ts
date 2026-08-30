import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "ringport.mobile.authToken";

async function setItem(key: string, value: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function readAuthToken() {
  return getItem(TOKEN_KEY);
}

export function saveAuthToken(token: string) {
  return setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
  return deleteItem(TOKEN_KEY);
}

export const secureStorage = {
  getItem,
  setItem,
  deleteItem,
};
