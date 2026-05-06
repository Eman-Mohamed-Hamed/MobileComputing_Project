import { useEffect } from "react";
import { useSegments, useRouter, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { ScanProvider } from "../context/ScanContext";
import { setupNotifications } from "../utils/notifications";
import { COLORS } from "../constants/theme";

function RootNavigation() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router   = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === "(auth)";
    if (!user && !inAuth) {
      router.replace("/(auth)/login");
    } else if (user && inAuth) {
      router.replace("/(main)");
    }
  }, [user, loading, segments]);

  useEffect(() => {
    setupNotifications();
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
      <Stack.Screen name="(auth)"        options={{ animation: "fade" }} />
      <Stack.Screen name="(main)"        options={{ animation: "fade" }} />
      <Stack.Screen name="+not-found"    />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ScanProvider>
        <SafeAreaProvider>
          <StatusBar style="light" backgroundColor={COLORS.bg} />
          <RootNavigation />
        </SafeAreaProvider>
      </ScanProvider>
    </AuthProvider>
  );
}
