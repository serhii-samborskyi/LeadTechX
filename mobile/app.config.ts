import type { ConfigContext, ExpoConfig } from "expo/config";

const oneSignalMode = process.env.EXPO_PUBLIC_ONESIGNAL_MODE === "production" ? "production" : "development";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "RingPort AI Receptionist",
  slug: "ringport-ai-receptionist",
  scheme: "ringport",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "light",
  assetBundlePatterns: ["**/*"],
  ios: {
    ...config.ios,
    bundleIdentifier: "ai.ringport.app",
    buildNumber: "1",
    supportsTablet: true,
    infoPlist: {
      NSMicrophoneUsageDescription: "Allow RingPort to access your microphone so you can test your AI receptionist.",
    },
  },
  android: {
    ...config.android,
    package: "ai.ringport.app",
    versionCode: 1,
    permissions: ["RECORD_AUDIO"],
    adaptiveIcon: {
      backgroundColor: "#071a16",
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    ...config.web,
    favicon: "./assets/favicon.png",
  },
  plugins: [
    [
      "onesignal-expo-plugin",
      {
        mode: oneSignalMode,
        disableLocation: true,
        smallIconAccentColor: "#87b72d",
      },
    ],
    "expo-asset",
    "expo-router",
    "expo-secure-store",
    "expo-web-browser",
    [
      "expo-audio",
      {
        microphonePermission: "Allow RingPort to access your microphone so you can test your AI receptionist.",
        recordAudioAndroid: true,
        enableBackgroundRecording: false,
        enableBackgroundPlayback: false,
      },
    ],
  ],
  extra: {
    apiBaseUrl: process.env.EXPO_PUBLIC_RINGPORT_API_URL || "https://ai.ringport.app",
    oneSignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || "",
    appStoreName: "RingPort AI Receptionist",
    appStoreSubtitle: "AI sales rep for calls",
    appStoreCategory: "Business",
    eas: config.extra?.eas,
  },
});
