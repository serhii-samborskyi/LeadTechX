import Constants from "expo-constants";

import type {
  AuthResponse,
  AuthUser,
  BillingResponse,
  BusinessProfile,
  DashboardResponse,
  FastAgentResponse,
  PlaceSuggestion,
} from "./types";

type ApiOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

type AppExtra = {
  apiBaseUrl?: string;
};

const extra = (Constants.expoConfig?.extra || Constants.manifest2?.extra || {}) as AppExtra;

export const API_BASE_URL = (extra.apiBaseUrl || "https://ai.ringport.app").replace(/\/$/, "");
export const LIVE_WS_URL = API_BASE_URL.replace(/^http/i, "ws") + "/live";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function queryString(params: Record<string, string | number | null | undefined>) {
  const urlParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") urlParams.set(key, String(value));
  }
  const query = urlParams.toString();
  return query ? `?${query}` : "";
}

async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  let body: string | undefined;
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  if (options.token) headers.Authorization = `Bearer ${options.token}`;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || "GET",
    headers,
    body,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(data?.error || "Request failed", response.status, data?.code);
  }
  return data as T;
}

export function autocompletePlaces(input: string) {
  return apiRequest<{ suggestions: PlaceSuggestion[] }>(`/api/places/autocomplete${queryString({ input })}`);
}

export function getPlaceDetails(placeId: string) {
  return apiRequest<{ place: BusinessProfile & { placeId?: string } }>(
    `/api/places/details${queryString({ place_id: placeId })}`,
  );
}

export function buildMobileAgent(input: {
  businessName?: string;
  website?: string;
  placeId?: string;
  deviceId: string;
}) {
  return apiRequest<FastAgentResponse>("/api/mobile/onboarding/agent", {
    method: "POST",
    body: input,
  });
}

export function savePreviewProfile(accessToken: string, profile: Partial<BusinessProfile>) {
  return apiRequest<{ profile: BusinessProfile }>("/api/onboarding/fast-agent/profile", {
    method: "PUT",
    body: { accessToken, ...profile },
  });
}

export function sendEmailCode(accessToken: string, email: string) {
  return apiRequest<{ ok: true; delivered: boolean; expiresInMinutes: number; message: string; code?: string }>(
    "/api/mobile/onboarding/email-code",
    {
      method: "POST",
      body: { accessToken, email },
    },
  );
}

export function verifyEmailCode(input: {
  accessToken: string;
  email: string;
  code: string;
  password: string;
  name?: string;
}) {
  return apiRequest<AuthResponse>("/api/mobile/onboarding/verify-code", {
    method: "POST",
    body: input,
  });
}

export function login(email: string, password: string) {
  return apiRequest<AuthResponse>("/api/mobile/auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export function logout(token: string) {
  return apiRequest<{ ok: true }>("/api/mobile/auth/logout", {
    method: "POST",
    token,
  });
}

export function getMe(token: string) {
  return apiRequest<{ user: AuthUser }>("/api/mobile/auth/me", { token });
}

export function getDashboard(token: string) {
  return apiRequest<DashboardResponse>("/api/mobile/dashboard", { token });
}

export function getBilling(token: string, profile: BusinessProfile) {
  return apiRequest<BillingResponse>(
    `/api/business-admin/billing${queryString({ business_name: profile.businessName, website: profile.website || "" })}`,
    { token },
  );
}

export function createSubscriptionCheckout(token: string, profile: BusinessProfile, subscriptionPlanId: number) {
  return apiRequest<{ url: string }>("/api/business-admin/billing/checkout", {
    method: "POST",
    token,
    body: {
      businessName: profile.businessName,
      website: profile.website || "",
      checkoutType: "subscription",
      subscriptionPlanId,
      period: 1,
    },
  });
}

export function registerPushSubscription(
  token: string,
  input: {
    deviceId: string;
    oneSignalId?: string | null;
    subscriptionId?: string | null;
    externalId?: string | null;
    platform: string;
    tags?: Record<string, string>;
    enabled?: boolean;
  },
) {
  return apiRequest<{ ok: true }>("/api/mobile/push-subscription", {
    method: "POST",
    token,
    body: input,
  });
}
