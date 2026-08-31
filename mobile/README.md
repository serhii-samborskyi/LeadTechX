# RingPort Mobile

Expo app for the RingPort AI Receptionist acquisition funnel and owner dashboard.

## What v1 Includes

- App Store-oriented first screen for "AI receptionist" traffic.
- Google Business Profile autocomplete through the RingPort backend.
- Website-only fallback when a business is not found in Google Places.
- Fast-agent preview build without requiring email first.
- Native voice-test client for the existing `/live` WebSocket protocol.
- Five-minute anonymous voice-test quota per mobile device/install.
- Email verification code and in-app password setup.
- Business owner login and dashboard.
- Backend-driven mobile module descriptors for profile, agent settings, calendar, messaging, billing, and phone numbers.
- OneSignal setup points for push notifications.
- Android Stripe checkout from the dashboard. iOS checkout is hidden in this worldwide build to reduce App Review risk.

## Environment

Create `mobile/.env.local` when values are available:

```bash
EXPO_PUBLIC_RINGPORT_API_URL=https://ai.ringport.app
EXPO_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
EXPO_PUBLIC_ONESIGNAL_MODE=development
EXPO_APPLE_TEAM_ID=your-apple-team-id
```

Use `EXPO_PUBLIC_ONESIGNAL_MODE=production` for preview and production EAS builds.

## Development

This app uses native modules for OneSignal, SecureStore, microphone streaming, and audio playback. Use a development build rather than Expo Go for realistic testing.

```bash
cd mobile
npm install
npm run typecheck
npm run doctor
npm exec --yes --package eas-cli@23.0.0 -- eas login
npm exec --yes --package eas-cli@23.0.0 -- eas device:create
npm exec --yes --package eas-cli@23.0.0 -- eas build --profile development --platform ios
npm exec --yes --package eas-cli@23.0.0 -- eas build --profile development --platform android
```

Run the Metro server for the development client:

```bash
npm start
```

## App Store Metadata

Recommended first pass:

```text
Name: RingPort AI Receptionist
Subtitle: AI sales rep for calls
Category: Business
Keywords: virtual receptionist,answering service,phone agent,outbound calls,speed to lead,missed calls,sms
Privacy Policy: https://ringport.app/privacy.html
Terms: https://ringport.app/terms.html
```

## Backend Contract

The mobile app calls:

```text
GET  /api/places/autocomplete
GET  /api/places/details
POST /api/mobile/onboarding/agent
POST /api/mobile/onboarding/email-code
POST /api/mobile/onboarding/verify-code
POST /api/mobile/auth/login
POST /api/mobile/auth/logout
GET  /api/mobile/auth/me
GET  /api/mobile/dashboard
GET  /api/mobile/modules
POST /api/mobile/push-subscription
```

The app also speaks to:

```text
WSS /live
```

using the existing JSON message protocol with `demoToken` and `mobileDeviceId`.
