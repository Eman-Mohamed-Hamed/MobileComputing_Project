import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  false,
  }),
});

export async function setupNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("scan-results", {
      name:              "Scan Results",
      importance:        Notifications.AndroidImportance.HIGH,
      vibrationPattern:  [0, 200, 100, 200],
      lightColor:        "#0066ff",
    });
  }

  return status === "granted";
}

export async function sendScanNotification(url, isMalicious, scanMode) {
  const modeLabel = scanMode === "virustotal" ? "VirusTotal" : scanMode === "ml" ? "ML Model" : "Both Engines";
  const title     = isMalicious ? "⚠️ Threat Detected!" : "✅ URL is Safe";
  const body      = isMalicious
    ? `${modeLabel} flagged this URL as potentially malicious.`
    : `${modeLabel} classified this URL as safe.`;

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { url, isMalicious },
        ...(Platform.OS === "android" && { channelId: "scan-results" }),
      },
      trigger: null,
    });
  } catch (e) {
    console.warn("Notification failed:", e);
  }
}
