export type BusinessProfile = {
  id: number;
  businessName: string;
  website?: string | null;
  summary?: string | null;
  hours?: string | null;
  services?: string | null;
  serviceArea?: string | null;
  contact?: string | null;
  phone?: string | null;
  address?: string | null;
  email?: string | null;
  language?: string | null;
  accountStatus?: string | null;
  trialEndsAt?: string | null;
  creditBalance?: number | null;
  subscriptionPlanId?: number | null;
};

export type PlaceSuggestion = {
  placeId: string;
  text: string;
  mainText?: string;
  secondaryText?: string;
  types?: string[];
};

export type VoiceQuota = {
  limitSeconds: number;
  usedSeconds: number;
  remainingSeconds: number;
};

export type SubscriptionPlan = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  monthlyPriceCents: number;
  monthlyCredits: number;
  maxPhoneNumbers?: number;
  maxTransferTargets?: number;
  maxUsers?: number;
  outboundQualificationEnabled?: boolean;
  smartReviewsEnabled?: boolean;
  callTransfersEnabled?: boolean;
  allowCreditTopups?: boolean;
  signupWaitlist?: boolean;
  signupSlotsRemaining?: number | null;
};

export type FastAgentResponse = {
  accessToken: string;
  cached: boolean;
  profile: BusinessProfile;
  trial: {
    started: boolean;
    days: number;
    endsAt?: string | null;
    credits?: number | null;
    tokenUsd?: number | null;
  };
  voiceQuota?: VoiceQuota | null;
  demoPhoneNumber?: string | null;
  demoCallerLimit?: number | null;
  selectedPlan?: SubscriptionPlan | null;
  planUnavailable?: string | null;
};

export type AuthUser = {
  id: number;
  email: string;
  name?: string | null;
  role: string;
  business?: BusinessProfile | null;
};

export type AuthResponse = {
  token: string;
  expiresAt: string;
  user: AuthUser;
  trial?: {
    started: boolean;
    endsAt?: string | null;
    credits?: number | null;
  };
};

export type MobileModule = {
  id: string;
  title: string;
  summary?: string;
  status?: string;
  fields?: Array<{
    key: string;
    label: string;
    type: "text" | "textarea" | "url" | "select" | "number" | "boolean";
    value?: unknown;
    required?: boolean;
  }>;
  actions?: Array<{
    id: string;
    label: string;
    method: string;
    provider?: string;
  }>;
  records?: unknown[];
};

export type DashboardResponse = {
  profile: BusinessProfile;
  phoneNumbers: Array<{ id: number; phoneNumber: string; status: string; numberType: string; label?: string | null }>;
  entitlements?: Record<string, unknown>;
  planUsage?: Record<string, unknown>;
  modules: MobileModule[];
  metrics: {
    creditBalance: number;
    accountStatus: string;
    newLeads: number;
    totalLeads: number;
    upcomingAppointments: number;
    assignedNumbers: number;
  };
  recent: {
    leads: Array<Record<string, unknown>>;
    appointments: Array<Record<string, unknown>>;
    inboundMessages: Array<Record<string, unknown>>;
    outboundMessages: Array<Record<string, unknown>>;
    calls: Array<Record<string, unknown>>;
  };
};

export type BillingResponse = {
  accountStatus: string;
  creditBalance: number;
  currentPlan?: SubscriptionPlan | null;
  availablePlans: SubscriptionPlan[];
  stripe: {
    ready: boolean;
    checkoutConfigured: boolean;
    webhookConfigured: boolean;
    configurationError?: string;
    subscriptionStatus?: string;
    subscriptionCurrentPeriodEnd?: string | null;
  };
};
