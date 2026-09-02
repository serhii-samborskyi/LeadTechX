import { StatusBar } from "expo-status-bar";
import * as WebBrowser from "expo-web-browser";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  Globe2,
  LogIn,
  LogOut,
  MessageSquare,
  PhoneCall,
  PhoneOff,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react-native";

import {
  autocompletePlaces,
  buildMobileAgent,
  createSubscriptionCheckout,
  getBilling,
  getDashboard,
  getMe,
  getPlaceDetails,
  login,
  logout,
  savePreviewProfile,
  sendEmailCode,
  verifyEmailCode,
} from "../src/api";
import { clearAuthToken, readAuthToken, saveAuthToken } from "../src/auth";
import { getDeviceId } from "../src/device";
import { identifyNotifications, logoutNotifications } from "../src/notifications";
import { useLiveAgentCall } from "../src/voice";
import type {
  AuthResponse,
  BillingResponse,
  BusinessProfile,
  DashboardResponse,
  FastAgentResponse,
  PlaceSuggestion,
  SubscriptionPlan,
} from "../src/types";

type Screen = "boot" | "landing" | "building" | "review" | "test" | "claim" | "login" | "dashboard" | "agentTest" | "billing";
type IconType = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

type EditableProfile = {
  summary: string;
  phone: string;
  address: string;
  hours: string;
  serviceArea: string;
  services: string;
  language: string;
};

const logo = require("../assets/ringport-logo.png");

const emptyEditableProfile: EditableProfile = {
  summary: "",
  phone: "",
  address: "",
  hours: "",
  serviceArea: "",
  services: "",
  language: "English",
};

function profileToEditable(profile: BusinessProfile): EditableProfile {
  return {
    summary: profile.summary || "",
    phone: profile.phone || "",
    address: profile.address || "",
    hours: profile.hours || "",
    serviceArea: profile.serviceArea || "",
    services: profile.services || "",
    language: profile.language || "English",
  };
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrencyFromCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function valueText(value: unknown, fallback = "Not set") {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "string") return value;
  return String(value);
}

function Button({
  label,
  onPress,
  icon: Icon,
  variant = "primary",
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  icon?: IconType;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.secondaryButton,
        variant === "ghost" && styles.ghostButton,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.pressed,
      ]}
    >
      {Icon ? <Icon color={variant === "primary" ? "#ffffff" : "#0a211c"} size={19} strokeWidth={2.4} /> : null}
      <Text style={[styles.buttonText, variant !== "primary" && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ label, onPress, icon: Icon }: { label: string; onPress: () => void; icon: IconType }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Icon color="#0a211c" size={20} strokeWidth={2.4} />
    </Pressable>
  );
}

function StepPill({ step }: { step: number }) {
  return (
    <View style={styles.stepPill}>
      <Text style={styles.stepPillText}>Step {step} of 5</Text>
    </View>
  );
}

function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  secureTextEntry = false,
  keyboardType = "default",
  autoCapitalize = "sentences",
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "url" | "number-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#78877f"
        multiline={multiline}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, multiline && styles.textarea]}
      />
    </View>
  );
}

function TopChrome({
  step,
  onLogin,
  onBack,
}: {
  step?: number;
  onLogin?: () => void;
  onBack?: () => void;
}) {
  return (
    <View style={styles.topChrome}>
      {onBack ? (
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.loginPill}>
          <ArrowLeft color="#0a211c" size={18} strokeWidth={2.4} />
          <Text style={styles.loginPillText}>Back</Text>
        </Pressable>
      ) : onLogin ? (
        <Pressable accessibilityRole="button" onPress={onLogin} style={styles.loginPill}>
          <LogIn color="#0a211c" size={18} strokeWidth={2.4} />
          <Text style={styles.loginPillText}>Existing user? Log in</Text>
        </Pressable>
      ) : (
        <View />
      )}
      {step ? <StepPill step={step} /> : null}
    </View>
  );
}

function BrandHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.brandHeader}>
      <Image source={logo} resizeMode="contain" style={styles.logo} />
      <Text style={styles.headline}>{title}</Text>
      {subtitle ? <Text style={styles.subhead}>{subtitle}</Text> : null}
    </View>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: string | number; icon: IconType }) {
  return (
    <View style={styles.metric}>
      <Icon color="#52640f" size={20} strokeWidth={2.2} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function VoiceTestPanel({
  agent,
  deviceId,
  onClaim,
}: {
  agent: FastAgentResponse;
  deviceId: string;
  onClaim: () => void;
}) {
  const call = useLiveAgentCall({ accessToken: agent.accessToken, deviceId });
  const remaining = call.previewQuota?.remainingSeconds ?? agent.voiceQuota?.remainingSeconds ?? 300;
  const isLive = ["connecting", "listening", "agent_speaking"].includes(call.status);
  const hasPreviewTime = remaining > 0;
  const statusText =
    !isLive && !hasPreviewTime
      ? "Your free voice preview was used on this device. Claim with email to keep testing."
      : call.status === "idle"
        ? "Your preview includes five minutes of voice testing before claim."
        : call.status.replace("_", " ");
  const handleVoicePress = () => {
    if (isLive) {
      call.stop();
      return;
    }
    if (!hasPreviewTime) {
      onClaim();
      return;
    }
    call.start();
  };

  return (
    <View style={styles.section}>
      <View style={styles.voiceOrb}>
        <PhoneCall color={isLive ? "#ffffff" : "#31403a"} size={36} strokeWidth={2.3} />
      </View>
      <Text style={styles.sectionTitle}>Test {agent.profile.businessName}</Text>
      <Text style={styles.bodyText}>{statusText}</Text>
      <Text style={styles.quotaText}>{Math.max(0, Math.floor(remaining / 60))}:{String(Math.max(0, remaining % 60)).padStart(2, "0")} preview left</Text>
      <View style={styles.row}>
        <Button
          label={isLive ? "Stop voice test" : hasPreviewTime ? "Start voice test" : "Claim to keep testing"}
          icon={isLive ? PhoneOff : PhoneCall}
          onPress={handleVoicePress}
        />
        <Button label="Reset" icon={RefreshCw} variant="secondary" onPress={call.stop} />
      </View>
      {__DEV__ ? <Button label="Play test tone" icon={RefreshCw} variant="ghost" onPress={call.playDiagnosticTone} /> : null}
      {agent.demoPhoneNumber ? (
        <Button
          label={`Call ${agent.demoPhoneNumber}`}
          icon={PhoneCall}
          variant="ghost"
          onPress={() => Linking.openURL(`tel:${agent.demoPhoneNumber}`)}
        />
      ) : null}
      {call.error ? <Text style={styles.errorText}>{call.error}</Text> : null}
      <View style={styles.transcript}>
        {call.transcript.length ? (
          call.transcript.map((item) => (
            <View key={item.id} style={[styles.bubble, item.speaker === "agent" ? styles.agentBubble : styles.systemBubble]}>
              <Text style={styles.bubbleSpeaker}>{item.speaker}</Text>
              <Text style={styles.bubbleText}>{item.text}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Transcript will appear during the test call.</Text>
        )}
      </View>
      <Button label="Claim this agent" icon={ArrowRight} onPress={onClaim} />
    </View>
  );
}

function OwnerVoiceTestPanel({
  dashboard,
  authToken,
  deviceId,
}: {
  dashboard: DashboardResponse;
  authToken: string;
  deviceId: string;
}) {
  const call = useLiveAgentCall({ sessionToken: authToken, deviceId });
  const isLive = ["connecting", "listening", "agent_speaking"].includes(call.status);
  const assignedNumber =
    dashboard.phoneNumbers.find((number) => number.status === "active")?.phoneNumber || dashboard.phoneNumbers[0]?.phoneNumber || "";

  return (
    <View style={styles.section}>
      <View style={styles.voiceOrb}>
        <PhoneCall color={isLive ? "#ffffff" : "#31403a"} size={36} strokeWidth={2.3} />
      </View>
      <Text style={styles.sectionTitle}>Talk to {dashboard.profile.businessName}</Text>
      <Text style={styles.bodyText}>
        {call.status === "idle" ? "Start a live test from this phone using your saved business profile." : call.status.replace("_", " ")}
      </Text>
      <View style={styles.row}>
        <Button
          label={isLive ? "Stop voice test" : "Start voice test"}
          icon={isLive ? PhoneOff : PhoneCall}
          onPress={isLive ? call.stop : call.start}
        />
        <Button label="Reset" icon={RefreshCw} variant="secondary" onPress={call.stop} />
      </View>
      {__DEV__ ? <Button label="Play test tone" icon={RefreshCw} variant="ghost" onPress={call.playDiagnosticTone} /> : null}
      {assignedNumber ? (
        <Button label={`Call ${assignedNumber}`} icon={PhoneCall} variant="ghost" onPress={() => Linking.openURL(`tel:${assignedNumber}`)} />
      ) : null}
      {call.error ? <Text style={styles.errorText}>{call.error}</Text> : null}
      <View style={styles.transcript}>
        {call.transcript.length ? (
          call.transcript.map((item) => (
            <View key={item.id} style={[styles.bubble, item.speaker === "agent" ? styles.agentBubble : styles.systemBubble]}>
              <Text style={styles.bubbleSpeaker}>{item.speaker}</Text>
              <Text style={styles.bubbleText}>{item.text}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>Transcript will appear during the test call.</Text>
        )}
      </View>
    </View>
  );
}

export default function RingPortMobile() {
  const [screen, setScreen] = useState<Screen>("boot");
  const [deviceId, setDeviceId] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [query, setQuery] = useState("");
  const [websiteMode, setWebsiteMode] = useState(false);
  const [website, setWebsite] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [agent, setAgent] = useState<FastAgentResponse | null>(null);
  const [editableProfile, setEditableProfile] = useState<EditableProfile>(emptyEditableProfile);
  const [profileDirty, setProfileDirty] = useState(false);
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [billing, setBilling] = useState<BillingResponse | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const canBuildFromName = useMemo(() => Boolean(deviceId && query.trim().length >= 2), [deviceId, query]);
  const canBuildFromWebsite = useMemo(() => Boolean(deviceId && website.trim().length >= 5), [deviceId, website]);

  const loadDashboard = useCallback(async (token: string) => {
    const data = await getDashboard(token);
    setDashboard(data);
    setScreen("dashboard");
    return data;
  }, []);

  const completeAuth = useCallback(
    async (response: AuthResponse) => {
      await saveAuthToken(response.token);
      setAuthToken(response.token);
      await identifyNotifications({ token: response.token, user: response.user, deviceId });
      await loadDashboard(response.token);
    },
    [deviceId, loadDashboard],
  );

  useEffect(() => {
    let active = true;
    async function boot() {
      try {
        const id = await getDeviceId();
        if (!active) return;
        setDeviceId(id);
        const token = await readAuthToken();
        if (!token) {
          setScreen("landing");
          return;
        }
        setAuthToken(token);
        await getMe(token);
        if (!active) return;
        await loadDashboard(token);
      } catch {
        await clearAuthToken();
        if (active) setScreen("landing");
      }
    }
    boot();
    return () => {
      active = false;
    };
  }, [loadDashboard]);

  useEffect(() => {
    if (screen !== "landing" || websiteMode) return;
    const input = query.trim();
    if (input.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setPlacesLoading(true);
      try {
        const data = await autocompletePlaces(input);
        setSuggestions(data.suggestions || []);
      } catch {
        setSuggestions([]);
      } finally {
        setPlacesLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, screen, websiteMode]);

  const updateEditableProfile = (key: keyof EditableProfile, value: string) => {
    setEditableProfile((current) => ({ ...current, [key]: value }));
    setProfileDirty(true);
  };

  const runBuild = useCallback(
    async (input: { businessName?: string; placeId?: string; website?: string }) => {
      if (!deviceId) return;
      setBusy(true);
      setError("");
      setScreen("building");
      try {
        const data = await buildMobileAgent({ ...input, deviceId });
        setAgent(data);
        setEditableProfile(profileToEditable(data.profile));
        setProfileDirty(false);
        setScreen("review");
      } catch (buildError) {
        setError(buildError instanceof Error ? buildError.message : "Could not build this agent.");
        setScreen("landing");
      } finally {
        setBusy(false);
      }
    },
    [deviceId],
  );

  const selectSuggestion = useCallback(
    async (suggestion: PlaceSuggestion) => {
      setBusy(true);
      setError("");
      try {
        const details = await getPlaceDetails(suggestion.placeId).catch(() => null);
        await runBuild({
          placeId: suggestion.placeId,
          businessName: details?.place.businessName || suggestion.mainText || suggestion.text,
          website: details?.place.website || "",
        });
      } finally {
        setBusy(false);
      }
    },
    [runBuild],
  );

  const persistProfile = useCallback(async () => {
    if (!agent || !profileDirty) return agent;
    setBusy(true);
    setError("");
    try {
      const data = await savePreviewProfile(agent.accessToken, editableProfile);
      const updated = { ...agent, profile: data.profile };
      setAgent(updated);
      setEditableProfile(profileToEditable(data.profile));
      setProfileDirty(false);
      return updated;
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Could not save profile.");
      throw profileError;
    } finally {
      setBusy(false);
    }
  }, [agent, editableProfile, profileDirty]);

  const goToTest = useCallback(async () => {
    try {
      await persistProfile();
      setScreen("test");
    } catch {
      // Error is rendered on the review screen.
    }
  }, [persistProfile]);

  const requestCode = useCallback(async () => {
    if (!agent) return;
    setBusy(true);
    setError("");
    setDevCode("");
    try {
      await persistProfile();
      const response = await sendEmailCode(agent.accessToken, email);
      setCodeSent(true);
      if (response.code) setDevCode(response.code);
    } catch (codeError) {
      setError(codeError instanceof Error ? codeError.message : "Could not send verification code.");
    } finally {
      setBusy(false);
    }
  }, [agent, email, persistProfile]);

  const claimAccount = useCallback(async () => {
    if (!agent) return;
    setBusy(true);
    setError("");
    try {
      const response = await verifyEmailCode({
        accessToken: agent.accessToken,
        email,
        code: verificationCode,
        password,
        name,
      });
      await completeAuth(response);
    } catch (claimError) {
      setError(claimError instanceof Error ? claimError.message : "Could not create account.");
    } finally {
      setBusy(false);
    }
  }, [agent, completeAuth, email, name, password, verificationCode]);

  const submitLogin = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await login(loginEmail, loginPassword);
      await completeAuth(response);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Could not log in.");
    } finally {
      setBusy(false);
    }
  }, [completeAuth, loginEmail, loginPassword]);

  const signOut = useCallback(async () => {
    const token = authToken;
    setAuthToken("");
    setDashboard(null);
    setBilling(null);
    await clearAuthToken();
    logoutNotifications();
    if (token) await logout(token).catch(() => null);
    setScreen("landing");
  }, [authToken]);

  const openBilling = useCallback(async () => {
    if (!authToken || !dashboard?.profile) return;
    setBusy(true);
    setError("");
    setScreen("billing");
    try {
      const response = await getBilling(authToken, dashboard.profile);
      setBilling(response);
      setSelectedPlanId(response.currentPlan?.id || response.availablePlans[0]?.id || null);
    } catch (billingError) {
      setError(billingError instanceof Error ? billingError.message : "Could not load billing.");
    } finally {
      setBusy(false);
    }
  }, [authToken, dashboard?.profile]);

  const startCheckout = useCallback(async () => {
    if (!authToken || !dashboard?.profile || !selectedPlanId || Platform.OS === "ios") return;
    setBusy(true);
    setError("");
    try {
      const response = await createSubscriptionCheckout(authToken, dashboard.profile, selectedPlanId);
      await WebBrowser.openBrowserAsync(response.url);
      await loadDashboard(authToken);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not open checkout.");
    } finally {
      setBusy(false);
    }
  }, [authToken, dashboard?.profile, loadDashboard, selectedPlanId]);

  if (screen === "boot") {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <View style={styles.centerScreen}>
          <Image source={logo} resizeMode="contain" style={styles.bootLogo} />
          <ActivityIndicator color="#87b72d" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          {screen === "landing" ? (
            <>
              <TopChrome step={1} onLogin={() => setScreen("login")} />
              <BrandHeader title="Build your AI receptionist" />
              <View style={styles.trialBadge}>
                <CheckCircle2 color="#52640f" size={18} strokeWidth={2.4} />
                <Text style={styles.trialBadgeText}>Start risk-free: 7-day trial after setup</Text>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{websiteMode ? "Use your website" : "Find your business"}</Text>
                {websiteMode ? (
                  <>
                    <TextField
                      label="Website"
                      value={website}
                      onChangeText={setWebsite}
                      placeholder="https://example.com"
                      keyboardType="url"
                      autoCapitalize="none"
                    />
                    <Button
                      label="Build agent"
                      icon={Sparkles}
                      disabled={!canBuildFromWebsite || busy}
                      onPress={() => runBuild({ website })}
                    />
                    <Button label="Search by business name" icon={Search} variant="ghost" onPress={() => setWebsiteMode(false)} />
                  </>
                ) : (
                  <>
                    <View style={styles.searchBox}>
                      <Search color="#6b776e" size={22} strokeWidth={2.3} />
                      <TextInput
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Business name"
                        placeholderTextColor="#78877f"
                        autoCapitalize="words"
                        returnKeyType="search"
                        onSubmitEditing={() => {
                          if (canBuildFromName) runBuild({ businessName: query });
                        }}
                        style={styles.searchInput}
                      />
                    </View>
                    <View style={styles.suggestions}>
                      {placesLoading ? (
                        <View style={styles.suggestionRow}>
                          <ActivityIndicator color="#87b72d" />
                          <Text style={styles.suggestionTitle}>Searching</Text>
                        </View>
                      ) : null}
                      {suggestions.map((suggestion) => (
                        <Pressable
                          key={suggestion.placeId}
                          accessibilityRole="button"
                          onPress={() => selectSuggestion(suggestion)}
                          style={({ pressed }) => [styles.suggestionRow, pressed && styles.pressed]}
                        >
                          <View style={styles.suggestionIcon}>
                            <Building2 color="#6a8f14" size={22} strokeWidth={2.3} />
                          </View>
                          <View style={styles.suggestionCopy}>
                            <Text style={styles.suggestionTitle}>{suggestion.mainText || suggestion.text}</Text>
                            <Text style={styles.suggestionMeta} numberOfLines={1}>
                              {suggestion.secondaryText || suggestion.text}
                            </Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                    <Button
                      label="Build from typed name"
                      icon={Sparkles}
                      disabled={!canBuildFromName || busy}
                      onPress={() => runBuild({ businessName: query })}
                    />
                    <Button label="Use my website instead" icon={Globe2} variant="ghost" onPress={() => setWebsiteMode(true)} />
                  </>
                )}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            </>
          ) : null}

          {screen === "building" ? (
            <>
              <TopChrome step={2} />
              <BrandHeader title="Building your agent" subtitle="RingPort is preparing the business profile." />
              <View style={styles.centerPanel}>
                <ActivityIndicator color="#87b72d" size="large" />
                <Text style={styles.bodyText}>Researching business details and receptionist behavior.</Text>
              </View>
            </>
          ) : null}

          {screen === "review" && agent ? (
            <>
              <TopChrome step={3} onBack={() => setScreen("landing")} />
              <BrandHeader title={`RingPort for ${agent.profile.businessName}`} subtitle="Review the details before testing." />
              <View style={styles.section}>
                <TextField label="Summary" value={editableProfile.summary} multiline onChangeText={(value) => updateEditableProfile("summary", value)} />
                <TextField label="Phone" value={editableProfile.phone} keyboardType="default" onChangeText={(value) => updateEditableProfile("phone", value)} />
                <TextField label="Address" value={editableProfile.address} onChangeText={(value) => updateEditableProfile("address", value)} />
                <TextField label="Hours" value={editableProfile.hours} multiline onChangeText={(value) => updateEditableProfile("hours", value)} />
                <TextField label="Service area" value={editableProfile.serviceArea} multiline onChangeText={(value) => updateEditableProfile("serviceArea", value)} />
                <TextField label="Services" value={editableProfile.services} multiline onChangeText={(value) => updateEditableProfile("services", value)} />
                <Button label={profileDirty ? "Save and test" : "Continue to test"} icon={ArrowRight} disabled={busy} onPress={goToTest} />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            </>
          ) : null}

          {screen === "test" && agent ? (
            <>
              <TopChrome step={4} onBack={() => setScreen("review")} />
              <BrandHeader title="Test the receptionist" subtitle="Speak naturally and listen to the generated agent." />
              <VoiceTestPanel agent={agent} deviceId={deviceId} onClaim={() => setScreen("claim")} />
            </>
          ) : null}

          {screen === "claim" && agent ? (
            <>
              <TopChrome step={5} onBack={() => setScreen("test")} />
              <BrandHeader title="Claim your agent" subtitle="Verify email and create your password." />
              <View style={styles.section}>
                <TextField
                  label="Email"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="owner@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                {!codeSent ? (
                  <Button label="Send verification code" icon={ShieldCheck} disabled={busy || !email} onPress={requestCode} />
                ) : (
                  <>
                    <TextField
                      label="Verification code"
                      value={verificationCode}
                      onChangeText={setVerificationCode}
                      placeholder="123456"
                      keyboardType="number-pad"
                      autoCapitalize="none"
                    />
                    <TextField label="Your name" value={name} onChangeText={setName} placeholder={agent.profile.businessName} />
                    <TextField
                      label="Password"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      placeholder="At least 10 characters"
                    />
                    {devCode ? <Text style={styles.devCode}>Development code: {devCode}</Text> : null}
                    <Button label="Create account" icon={ArrowRight} disabled={busy} onPress={claimAccount} />
                  </>
                )}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            </>
          ) : null}

          {screen === "login" ? (
            <>
              <TopChrome onBack={() => setScreen("landing")} />
              <BrandHeader title="Log in" subtitle="Access your RingPort dashboard." />
              <View style={styles.section}>
                <TextField
                  label="Email"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TextField label="Password" value={loginPassword} onChangeText={setLoginPassword} secureTextEntry autoCapitalize="none" />
                <Button label="Log in" icon={LogIn} disabled={busy} onPress={submitLogin} />
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            </>
          ) : null}

          {screen === "dashboard" && dashboard ? (
            <>
              <View style={styles.dashboardHeader}>
                <View>
                  <Text style={styles.kicker}>Business dashboard</Text>
                  <Text style={styles.dashboardTitle}>{dashboard.profile.businessName}</Text>
                </View>
                <View style={styles.dashboardActions}>
                  <IconButton label="Refresh" icon={RefreshCw} onPress={() => authToken && loadDashboard(authToken)} />
                  <IconButton label="Sign out" icon={LogOut} onPress={signOut} />
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <Metric label="Credits" value={dashboard.metrics.creditBalance} icon={CreditCard} />
                <Metric label="New leads" value={dashboard.metrics.newLeads} icon={UserRound} />
                <Metric label="Bookings" value={dashboard.metrics.upcomingAppointments} icon={CalendarDays} />
                <Metric label="Numbers" value={dashboard.metrics.assignedNumbers} icon={PhoneCall} />
              </View>

              <View style={styles.dashboardPrimaryActions}>
                <Button label="Test agent" icon={PhoneCall} onPress={() => setScreen("agentTest")} />
              </View>

              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Control modules</Text>
                  <Button label="Billing" icon={CreditCard} variant="secondary" onPress={openBilling} />
                </View>
                {dashboard.modules.map((module) => (
                  <View key={module.id} style={styles.moduleRow}>
                    <View style={styles.moduleIcon}>
                      {module.id === "calendar" ? (
                        <CalendarDays color="#6a8f14" size={22} />
                      ) : module.id === "messaging" ? (
                        <MessageSquare color="#6a8f14" size={22} />
                      ) : module.id === "billing" ? (
                        <CreditCard color="#6a8f14" size={22} />
                      ) : (
                        <Sparkles color="#6a8f14" size={22} />
                      )}
                    </View>
                    <View style={styles.moduleCopy}>
                      <Text style={styles.moduleTitle}>{module.title}</Text>
                      <Text style={styles.moduleSummary}>{module.summary || module.status}</Text>
                    </View>
                    <Text style={styles.moduleStatus}>{module.status || "ready"}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent leads</Text>
                {dashboard.recent.leads.length ? (
                  dashboard.recent.leads.map((lead) => (
                    <View key={String(lead.id)} style={styles.listItem}>
                      <Text style={styles.listTitle}>{valueText(lead.name, "New lead")}</Text>
                      <Text style={styles.listMeta}>{valueText(lead.need, valueText(lead.phone, "No details"))}</Text>
                      <Text style={styles.listStatus}>{valueText(lead.status)}</Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No leads yet.</Text>
                )}
              </View>
            </>
          ) : null}

          {screen === "agentTest" && dashboard ? (
            <>
              <TopChrome onBack={() => setScreen("dashboard")} />
              <BrandHeader title="Test the receptionist" subtitle={dashboard.profile.businessName} />
              <OwnerVoiceTestPanel dashboard={dashboard} authToken={authToken} deviceId={deviceId} />
            </>
          ) : null}

          {screen === "billing" && dashboard ? (
            <>
              <TopChrome onBack={() => setScreen("dashboard")} />
              <BrandHeader title="Billing" subtitle={`${dashboard.profile.businessName} plan and credits`} />
              <View style={styles.section}>
                {busy ? <ActivityIndicator color="#87b72d" /> : null}
                {billing ? (
                  <>
                    <Text style={styles.planStatus}>Status: {billing.accountStatus}</Text>
                    <Text style={styles.planStatus}>Credits: {billing.creditBalance}</Text>
                    {Platform.OS === "ios" ? (
                      <Text style={styles.bodyText}>Subscription checkout is hidden in this iOS build for worldwide App Store distribution.</Text>
                    ) : (
                      <>
                        {billing.availablePlans.map((plan) => (
                          <Pressable
                            key={plan.id}
                            accessibilityRole="button"
                            onPress={() => setSelectedPlanId(plan.id)}
                            style={[styles.planRow, selectedPlanId === plan.id && styles.selectedPlanRow]}
                          >
                            <View>
                              <Text style={styles.planName}>{plan.name}</Text>
                              <Text style={styles.planMeta}>
                                {formatCurrencyFromCents(plan.monthlyPriceCents)} / month · {plan.monthlyCredits} credits
                              </Text>
                            </View>
                            {selectedPlanId === plan.id ? <CheckCircle2 color="#52640f" size={21} /> : null}
                          </Pressable>
                        ))}
                        <Button
                          label="Open Stripe checkout"
                          icon={CreditCard}
                          disabled={busy || !billing.stripe.ready || !selectedPlanId}
                          onPress={startCheckout}
                        />
                      </>
                    )}
                  </>
                ) : null}
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7fbfa",
  },
  flex: {
    flex: 1,
  },
  page: {
    minHeight: "100%",
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 36,
  },
  centerScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
  },
  bootLogo: {
    width: 220,
    height: 70,
  },
  topChrome: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  loginPill: {
    minHeight: 42,
    borderRadius: 999,
    backgroundColor: "#e8f4d6",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginPillText: {
    color: "#0a211c",
    fontSize: 15,
    fontWeight: "800",
  },
  stepPill: {
    minHeight: 38,
    borderRadius: 999,
    backgroundColor: "#edf1e7",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepPillText: {
    color: "#52640f",
    fontWeight: "800",
  },
  brandHeader: {
    alignItems: "center",
    paddingTop: 72,
    paddingBottom: 28,
    gap: 18,
  },
  logo: {
    width: 244,
    height: 72,
  },
  headline: {
    color: "#0a211c",
    textAlign: "center",
    fontSize: 37,
    lineHeight: 43,
    fontWeight: "900",
    letterSpacing: 0,
  },
  subhead: {
    color: "#51635c",
    textAlign: "center",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
  },
  trialBadge: {
    alignSelf: "center",
    minHeight: 42,
    maxWidth: "100%",
    borderRadius: 999,
    backgroundColor: "#eef7df",
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 58,
  },
  trialBadgeText: {
    color: "#263d10",
    fontWeight: "800",
    fontSize: 15,
    flexShrink: 1,
  },
  section: {
    width: "100%",
    gap: 14,
    paddingBottom: 22,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    color: "#0a211c",
    fontSize: 21,
    lineHeight: 27,
    fontWeight: "900",
    letterSpacing: 0,
  },
  bodyText: {
    color: "#51635c",
    fontSize: 16,
    lineHeight: 23,
    fontWeight: "600",
  },
  centerPanel: {
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingTop: 80,
  },
  searchBox: {
    minHeight: 68,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "#d8ded9",
    backgroundColor: "#ffffff",
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0a211c",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    minHeight: 52,
    color: "#0a211c",
    fontSize: 20,
    fontWeight: "700",
  },
  suggestions: {
    overflow: "hidden",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe5df",
    backgroundColor: "#ffffff",
  },
  suggestionRow: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#edf0ed",
  },
  suggestionIcon: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#eef7df",
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionCopy: {
    flex: 1,
    minWidth: 0,
  },
  suggestionTitle: {
    color: "#0a211c",
    fontSize: 17,
    fontWeight: "900",
  },
  suggestionMeta: {
    color: "#75827b",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 3,
    fontWeight: "600",
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: "#31403a",
    fontSize: 14,
    fontWeight: "800",
  },
  input: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d8ded9",
    backgroundColor: "#ffffff",
    color: "#0a211c",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: "600",
  },
  textarea: {
    minHeight: 104,
    textAlignVertical: "top",
  },
  button: {
    minHeight: 54,
    borderRadius: 8,
    backgroundColor: "#0a211c",
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#cfd8cf",
    backgroundColor: "#ffffff",
  },
  ghostButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#cfd8cf",
  },
  disabledButton: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.72,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryButtonText: {
    color: "#0a211c",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  errorText: {
    color: "#a63618",
    fontWeight: "800",
    lineHeight: 21,
  },
  devCode: {
    color: "#52640f",
    fontSize: 15,
    fontWeight: "900",
  },
  quotaText: {
    color: "#52640f",
    fontSize: 16,
    fontWeight: "900",
  },
  voiceOrb: {
    alignSelf: "center",
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: "#87b72d",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#52640f",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 6,
  },
  transcript: {
    minHeight: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe5df",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 9,
  },
  bubble: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  agentBubble: {
    backgroundColor: "#eef7df",
  },
  systemBubble: {
    backgroundColor: "#f2f5f2",
  },
  bubbleSpeaker: {
    color: "#52640f",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  bubbleText: {
    color: "#0a211c",
    lineHeight: 21,
    fontWeight: "600",
  },
  emptyText: {
    color: "#75827b",
    fontWeight: "700",
    lineHeight: 21,
  },
  dashboardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingTop: 10,
    paddingBottom: 18,
  },
  kicker: {
    color: "#52640f",
    fontSize: 13,
    textTransform: "uppercase",
    fontWeight: "900",
    letterSpacing: 0,
  },
  dashboardTitle: {
    color: "#0a211c",
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    letterSpacing: 0,
    maxWidth: 230,
  },
  dashboardActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d8ded9",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 22,
  },
  dashboardPrimaryActions: {
    marginBottom: 22,
  },
  metric: {
    width: "48%",
    minHeight: 112,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe5df",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 7,
    justifyContent: "center",
  },
  metricValue: {
    color: "#0a211c",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 0,
  },
  metricLabel: {
    color: "#65726c",
    fontSize: 13,
    fontWeight: "800",
  },
  moduleRow: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe5df",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  moduleIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#eef7df",
    alignItems: "center",
    justifyContent: "center",
  },
  moduleCopy: {
    flex: 1,
    minWidth: 0,
  },
  moduleTitle: {
    color: "#0a211c",
    fontSize: 16,
    fontWeight: "900",
  },
  moduleSummary: {
    color: "#65726c",
    marginTop: 3,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
  },
  moduleStatus: {
    color: "#52640f",
    fontSize: 12,
    fontWeight: "900",
    maxWidth: 86,
    textAlign: "right",
  },
  listItem: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe5df",
    backgroundColor: "#ffffff",
    padding: 13,
    gap: 5,
  },
  listTitle: {
    color: "#0a211c",
    fontSize: 16,
    fontWeight: "900",
  },
  listMeta: {
    color: "#65726c",
    lineHeight: 20,
    fontWeight: "600",
  },
  listStatus: {
    color: "#52640f",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  planStatus: {
    color: "#0a211c",
    fontSize: 17,
    fontWeight: "800",
  },
  planRow: {
    minHeight: 82,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#dfe5df",
    backgroundColor: "#ffffff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  selectedPlanRow: {
    borderColor: "#87b72d",
    backgroundColor: "#f4faec",
  },
  planName: {
    color: "#0a211c",
    fontSize: 17,
    fontWeight: "900",
  },
  planMeta: {
    color: "#65726c",
    marginTop: 4,
    fontWeight: "700",
  },
});
