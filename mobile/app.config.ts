import type { ConfigContext, ExpoConfig } from "expo/config";

const oneSignalMode = process.env.EXPO_PUBLIC_ONESIGNAL_MODE === "production" ? "production" : "development";
const easProjectId = "04159f82-050a-4c51-9cd7-c4de2811eb86";

export default ({ config }: ConfigContext): ExpoConfig => {
  const existingBackgroundModes = Array.isArray(config.ios?.infoPlist?.UIBackgroundModes)
    ? config.ios.infoPlist.UIBackgroundModes
    : [];

  return {
    ...config,
    name: "RingPort AI Receptionist",
    slug: "ringport-ai-receptionist",
    scheme: "ringport",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    assetBundlePatterns: ["**/*"],
    runtimeVersion: {
      policy: "appVersion",
    },
    updates: {
      url: `https://u.expo.dev/${easProjectId}`,
    },
    ios: {
      ...config.ios,
      appleTeamId: process.env.EXPO_APPLE_TEAM_ID || config.ios?.appleTeamId,
      bundleIdentifier: "ai.ringport.app",
      buildNumber: "2",
      supportsTablet: true,
      infoPlist: {
        ...config.ios?.infoPlist,
        ITSAppUsesNonExemptEncryption: false,
        NSMicrophoneUsageDescription: "Allow RingPort to access your microphone so you can test your AI receptionist.",
        UIBackgroundModes: [...new Set([...existingBackgroundModes, "remote-notification"])],
      },
      entitlements: {
        ...config.ios?.entitlements,
        "aps-environment": oneSignalMode,
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
      [
        "react-native-audio-api",
        {
          iosMicrophonePermission: "Allow RingPort to access your microphone so you can test your AI receptionist.",
          iosBackgroundMode: false,
          androidPermissions: ["android.permission.MODIFY_AUDIO_SETTINGS"],
          androidForegroundService: false,
          androidFSTypes: ["mediaPlayback"],
          disableFFmpeg: false,
          disableStaticExternalLibs: false,
        },
      ],
    ],
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_RINGPORT_API_URL || "https://ai.ringport.app",
      oneSignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || "",
      appStoreName: "RingPort AI Receptionist",
      appStoreSubtitle: "AI sales rep for calls",
      appStoreCategory: "Business",
      eas: {
        ...config.extra?.eas,
        projectId: easProjectId,
      },
    },
  };
};
