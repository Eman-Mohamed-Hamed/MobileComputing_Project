import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert, Animated, Linking, Platform, ScrollView,
  StyleSheet, Text, ToastAndroid, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScan } from "../../../context/ScanContext";
import { COLORS } from "../../../constants/theme";

export default function MLResultsScreen() {
  const router = useRouter();
  const { scanResults: results, scannedUrl, scanError: error } = useScan();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const copyUrl = async () => {
    await Clipboard.setStringAsync(scannedUrl);
    setCopied(true);
    if (Platform.OS === "android") ToastAndroid.show("URL copied to clipboard!", ToastAndroid.SHORT);
    setTimeout(() => setCopied(false), 2500);
  };

  const openUrl = async () => {
    const supported = await Linking.canOpenURL(scannedUrl);
    if (supported) {
      Alert.alert("Open URL", "This will open the URL in your browser. Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Open", onPress: () => Linking.openURL(scannedUrl) },
      ]);
    } else {
      Alert.alert("Cannot open URL", "This URL cannot be opened on your device.");
    }
  };

  const isMalicious = results?.is_malicious;
  const isSafe      = results && !results.is_malicious;
  const hasError    = error || !results;

  const verdictColor = hasError ? COLORS.warning : isSafe ? COLORS.safe : COLORS.danger;
  const verdictLabel = hasError ? "SCAN ERROR"   : isSafe ? "SAFE"      : "MALICIOUS";
  const verdictIcon  = hasError ? "alert-circle" : isSafe ? "shield-check" : "shield-alert";

  const featureItems = results?.features ? [
    { icon: "resize",             label: "URL Length",     value: results.features.url_length,     warn: results.features.url_length > 75 },
    { icon: "pulse",              label: "Entropy",         value: results.features.url_entropy,    warn: results.features.url_entropy > 4 },
    { icon: "warning",            label: "Suspicious Words",value: results.features.num_sus_words,  warn: results.features.num_sus_words > 0 },
    { icon: "globe",              label: "IP Address",      value: results.features.has_ip_address ? "Yes" : "No", warn: results.features.has_ip_address },
    { icon: "lock-closed",        label: "HTTPS",           value: results.features.has_https      ? "Yes" : "No", warn: !results.features.has_https },
    { icon: "link",               label: "URL Shortener",   value: results.features.has_shortener  ? "Yes" : "No", warn: results.features.has_shortener },
    { icon: "folder-open",        label: "Dir. Depth",      value: results.features.directory_depth, warn: results.features.directory_depth > 5 },
    { icon: "ellipsis-horizontal",label: "Dots Count",      value: results.features.num_dots,       warn: results.features.num_dots > 4 },
  ] : [];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.bg, "#0d1333", COLORS.bgSecondary]} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => router.replace("/(main)")} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>ML Model Results</Text>
              <View style={[styles.engineBadge, { borderColor: "rgba(0,255,136,0.4)" }]}>
                <FontAwesome5 name="brain" size={11} color={COLORS.safe} />
                <Text style={[styles.engineBadgeText, { color: COLORS.safe }]}>AI MODEL</Text>
              </View>
            </View>

            {/* Verdict Card */}
            <View style={[styles.verdictCard, { borderColor: verdictColor + "55" }]}>
              <LinearGradient colors={[COLORS.card, COLORS.bgSecondary]} style={styles.verdictGrad}>
                <View style={[styles.verdictIconBg, { backgroundColor: verdictColor + "1A" }]}>
                  <MaterialCommunityIcons name={verdictIcon} size={56} color={verdictColor} />
                </View>
                <Text style={[styles.verdictLabel, { color: verdictColor }]}>{verdictLabel}</Text>
                <Text style={styles.verdictSub}>
                  {hasError
                    ? (error || "Could not complete ML analysis")
                    : isSafe
                    ? "The ML model classified this URL as safe"
                    : "The ML model detected this URL as potentially malicious"}
                </Text>
              </LinearGradient>
            </View>

            {/* URL Card */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>SCANNED URL</Text>
              <View style={styles.urlRow}>
                <Ionicons name="link" size={14} color={COLORS.textSecondary} />
                <Text style={styles.urlText} selectable numberOfLines={3}>{scannedUrl}</Text>
              </View>
              <View style={styles.urlActions}>
                <TouchableOpacity style={[styles.urlBtn, { borderColor: copied ? "rgba(0,255,136,0.4)" : COLORS.cardBorder }]} onPress={copyUrl} activeOpacity={0.8}>
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={copied ? COLORS.safe : COLORS.textSecondary} />
                  <Text style={[styles.urlBtnText, { color: copied ? COLORS.safe : COLORS.textSecondary }]}>
                    {copied ? "Copied!" : "Copy URL"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.urlBtn, { borderColor: "rgba(0,102,255,0.35)", backgroundColor: "rgba(0,102,255,0.08)" }]} onPress={openUrl} activeOpacity={0.8}>
                  <Ionicons name="open-outline" size={16} color={COLORS.accent} />
                  <Text style={[styles.urlBtnText, { color: COLORS.accent }]}>Open Link</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Confidence */}
            {results && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>CONFIDENCE SCORE</Text>
                  <View style={styles.confRow}>
                    <View style={styles.confGauge}>
                      <View style={[styles.confFill, { width: `${results.confidence}%`, backgroundColor: isSafe ? COLORS.safe : COLORS.danger }]} />
                    </View>
                    <Text style={[styles.confValue, { color: isSafe ? COLORS.safe : COLORS.danger }]}>
                      {results.confidence}%
                    </Text>
                  </View>
                  <Text style={styles.confSub}>
                    Model is {results.confidence}% confident in its prediction
                  </Text>
                </View>

                {/* Feature Analysis */}
                {featureItems.length > 0 && (
                  <View style={styles.card}>
                    <Text style={styles.cardLabel}>FEATURE ANALYSIS</Text>
                    <View style={styles.featureGrid}>
                      {featureItems.map((item, idx) => (
                        <View key={idx} style={[styles.featureItem, item.warn && styles.featureItemWarn]}>
                          <View style={styles.featureItemTop}>
                            <Ionicons name={item.icon} size={15} color={item.warn ? COLORS.warning : COLORS.textSecondary} />
                            {item.warn && <Ionicons name="alert-circle" size={12} color={COLORS.warning} style={{ marginLeft: 4 }} />}
                          </View>
                          <Text style={[styles.featureVal, item.warn && { color: COLORS.warning }]}>{item.value}</Text>
                          <Text style={styles.featureLabel}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}

            {/* Scan Again */}
            <TouchableOpacity style={styles.scanAgainBtn} onPress={() => router.replace("/(main)")} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.safe, "#00cc88"]} style={styles.scanAgainGrad}>
                <MaterialCommunityIcons name="qrcode-scan" size={20} color={COLORS.bg} />
                <Text style={[styles.scanAgainText, { color: COLORS.bg }]}>Scan Another QR Code</Text>
              </LinearGradient>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bg },
  gradient:        { flex: 1 },
  content:         { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  header:          { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerTitle:     { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  engineBadge:     { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  engineBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  verdictCard:     { borderRadius: 20, overflow: "hidden", borderWidth: 1, marginBottom: 14 },
  verdictGrad:     { padding: 28, alignItems: "center" },
  verdictIconBg:   { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  verdictLabel:    { fontSize: 28, fontWeight: "900", letterSpacing: 4, marginBottom: 8 },
  verdictSub:      { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20 },
  card:            { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder },
  cardLabel:       { fontSize: 10, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 1.5, marginBottom: 12 },
  urlRow:          { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 14 },
  urlText:         { fontSize: 13, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  urlActions:      { flexDirection: "row", gap: 10 },
  urlBtn:          { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  urlBtnText:      { fontSize: 13, fontWeight: "600" },
  confRow:         { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  confGauge:       { flex: 1, height: 12, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 6, overflow: "hidden" },
  confFill:        { height: "100%", borderRadius: 6 },
  confValue:       { fontSize: 22, fontWeight: "800", minWidth: 62, textAlign: "right" },
  confSub:         { fontSize: 12, color: COLORS.textSecondary },
  featureGrid:     { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureItem:     { width: "48%", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
  featureItemWarn: { borderColor: "rgba(255,170,0,0.3)" },
  featureItemTop:  { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  featureVal:      { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 2 },
  featureLabel:    { fontSize: 11, color: COLORS.textSecondary },
  scanAgainBtn:    { marginTop: 8, borderRadius: 14, overflow: "hidden" },
  scanAgainGrad:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  scanAgainText:   { fontSize: 16, fontWeight: "700" },
});
