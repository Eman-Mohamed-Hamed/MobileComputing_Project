import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScan } from "../../context/ScanContext";
import { COLORS } from "../../constants/theme";
import { apiPost } from "../../utils/api";
import { sendScanNotification } from "../../utils/notifications";

export default function LoadingScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams();
  const url     = params.url     || "";
  const mode    = params.scanMode || "";

  const { setScanResults, setScanError, setScannedUrl, setScanMode } = useScan();

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const didFetch  = useRef(false);

  useEffect(() => {
    setScannedUrl(url);
    setScanMode(mode);

    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();

    if (!didFetch.current) {
      didFetch.current = true;
      doScan();
    }

    return () => pulse.stop();
  }, []);

  const doScan = async () => {
    try {
      const endpoint =
        mode === "virustotal" ? "/scan/virustotal" :
        mode === "ml"         ? "/scan/ml"         :
                                "/scan/both";

      const data = await apiPost(endpoint, { url });
      setScanResults(data);
      setScanError(null);

      // Determine result for notification
      const isMalicious =
        mode === "both"        ? data.final_status === "Danger" :
        mode === "virustotal"  ? data.is_flagged === true       :
                                 data.is_malicious === true;

      await sendScanNotification(url, isMalicious, mode);

      const resultScreen =
        mode === "virustotal" ? "/(main)/results/vt" :
        mode === "ml"         ? "/(main)/results/ml" :
                                "/(main)/results/both";

      router.replace(resultScreen);
    } catch (err) {
      setScanError(err.message || "Failed to connect to server");
      setScanResults(null);

      const resultScreen =
        mode === "virustotal" ? "/(main)/results/vt" :
        mode === "ml"         ? "/(main)/results/ml" :
                                "/(main)/results/both";

      router.replace(resultScreen);
    }
  };

  const modeColor = mode === "virustotal" ? COLORS.accent : mode === "both" ? COLORS.warning : COLORS.safe;
  const modeIcon  = mode === "virustotal" ? "shield-search" : mode === "both" ? "shield-half-full" : "brain";
  const modeLabel = mode === "virustotal" ? "VirusTotal"    : mode === "both" ? "Full Scan"        : "ML Model";
  const gradColors =
    mode === "virustotal" ? [COLORS.accent, "#0088ff"] :
    mode === "both"       ? [COLORS.warning, "#cc8800"] :
                            [COLORS.safe, "#00cc88"];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.bg, "#0d1333", COLORS.bgSecondary]} style={styles.gradient}>
        <Animated.View style={[styles.center, { opacity: fadeAnim }]}>

          <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 28 }}>
            <LinearGradient colors={gradColors} style={styles.iconBg}>
              {mode === "ml"
                ? <FontAwesome5 name="brain" size={44} color={COLORS.bg} />
                : <MaterialCommunityIcons name={modeIcon} size={48} color="#fff" />
              }
            </LinearGradient>
          </Animated.View>

          <Text style={styles.title}>Analyzing URL...</Text>
          <Text style={styles.subtitle}>
            {mode === "virustotal" ? "Checking against 70+ security engines"
             : mode === "ml"       ? "Running ML feature extraction & prediction"
             :                       "Running VirusTotal + ML analysis"}
          </Text>

          <View style={styles.urlBox}>
            <Ionicons name="link" size={14} color={COLORS.textSecondary} />
            <Text style={styles.urlText} numberOfLines={2}>{url}</Text>
          </View>

          <ActivityIndicator size="large" color={modeColor} style={{ marginTop: 32 }} />

          <View style={styles.stepsRow}>
            {(mode === "virustotal" ? ["Extracting URL","Querying VT API","Parsing results"]
              : mode === "ml"       ? ["Extracting features","Running model","Computing confidence"]
              :                       ["ML analysis","VirusTotal query","Combined verdict"]
            ).map((step, i) => (
              <View key={i} style={styles.stepChip}>
                <View style={[styles.stepDot, { backgroundColor: modeColor }]} />
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>

        </Animated.View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  gradient:  { flex: 1 },
  center:    { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28 },
  iconBg:    { width: 104, height: 104, borderRadius: 32, justifyContent: "center", alignItems: "center" },
  title:     { fontSize: 22, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 8 },
  subtitle:  { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", marginBottom: 22 },
  urlBox:    { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, maxWidth: "100%" },
  urlText:   { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  stepsRow:  { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 10, marginTop: 30 },
  stepChip:  { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  stepDot:   { width: 6, height: 6, borderRadius: 3 },
  stepText:  { fontSize: 11, color: COLORS.textSecondary },
});
