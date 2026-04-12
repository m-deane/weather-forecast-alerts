# Native App Wrapper Plan

## Recommended Approach: Capacitor

Capacitor (by Ionic) wraps the existing Vite/React web app into native iOS and Android shells with minimal changes to the existing codebase.

## Target Platforms

- **iOS** (iPhone/iPad) via Xcode
- **Android** (phone/tablet) via Android Studio

## Key Native Features

| Feature | Web (current) | Native (Capacitor) |
|---------|--------------|-------------------|
| Push notifications | Web Push API (browser-level) | APNs (iOS) / FCM (Android) via @capacitor/push-notifications |
| Offline storage | localStorage + IndexedDB | Same, plus native filesystem via @capacitor/filesystem |
| Home screen widget | PWA manifest (Add to Home Screen) | True native widget (iOS WidgetKit / Android App Widget) |
| Background refresh | Not possible | Background fetch for periodic forecast updates |
| Location services | Web Geolocation API | Native GPS via @capacitor/geolocation (more reliable) |

## Estimated Effort

- **Basic wrapper** (web app in native shell, no native features): 1 day
- **Push notifications** (APNs + FCM setup, backend changes): 1-2 days
- **Home screen widget** (native code required): 2-3 days per platform
- **Total for MVP**: 2-3 days

## Dependencies

```
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android
npm install @capacitor/push-notifications
npm install @capacitor/geolocation
npm install @capacitor/filesystem
```

## Setup Steps

1. Install Capacitor CLI and core packages
2. Run `npx cap init "Scottish Mountain Weather" com.scottishmountainweather.app`
3. Add platforms: `npx cap add ios` and `npx cap add android`
4. Build the Vite app: `npm run build`
5. Sync web assets to native projects: `npx cap sync`
6. Open in IDE: `npx cap open ios` or `npx cap open android`

## Architecture Notes

- The existing Vite build output (`dist/`) is copied into the native app's web view
- API calls continue to hit the same backend (no changes needed)
- Capacitor plugins provide JS-to-native bridges for push notifications, geolocation, etc.
- The PWA manifest is still used for the web version; native apps use their own app icons and metadata

## App Store Requirements

- **iOS**: Apple Developer account ($99/year), Xcode on macOS, app review process (1-3 days)
- **Android**: Google Play Developer account ($25 one-time), Android Studio, app review (hours to days)

## Risks and Considerations

- iOS WidgetKit requires writing Swift code (not covered by Capacitor alone)
- Push notification backend needs APNS/FCM integration (server-side changes to FastAPI)
- App store updates require rebuilding and resubmitting (web updates are instant)
- Consider whether the PWA (current approach) is sufficient before investing in native wrappers
