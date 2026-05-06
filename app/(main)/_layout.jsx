import { Stack } from "expo-router";
import { COLORS } from "../../constants/theme";

export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown:    false,
        contentStyle:   { backgroundColor: COLORS.bg },
        animation:      "slide_from_right",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="index"           options={{ animation: "fade" }} />
      <Stack.Screen name="scanner"         options={{ animation: "slide_from_bottom", gestureDirection: "vertical" }} />
      <Stack.Screen name="loading"         options={{ animation: "fade", gestureEnabled: false }} />
      <Stack.Screen name="results/vt"      options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="results/ml"      options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}
