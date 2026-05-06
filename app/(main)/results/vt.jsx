import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Linking, ScrollView, StyleSheet,
  Text, ToastAndroid, TouchableOpacity, View, Platform, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScan } from "../../../context/ScanContext";
import { COLORS } from "../../../constants/theme";

export default function VTResultsScreen() {
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
      Alert.alert(
        "Open URL",
        "This will open the URL in your browser. Are you sure?",
        [{ text: "Cancel", style: "cancel" }, { text: "Open", onPress: () => Linking.openURL(scannedUrl) }]
      );
    } else {
      Alert.alert("Cannot open URL", "This URL cannot be opened on your device.");
    }
  };

  const isSafe    = results?.scanned && !results?.is_flagged;
  const isFlagged = results?.scanned &&  results?.is_flagged;
  const hasError  = error || (results && !results?.scanned);

  const verdictColor = hasError ? COLORS.warning : isSafe ? COLORS.safe : COLORS.danger;
  const verdictLabel = hasError ? "SCAN ERROR" : isSafe ? "SAFE" : "DANGER";
  const verdictIcon  = hasError ? "alert-circle" : isSafe ? "shield-check" : "shield-alert";

  const flaggedCount = (results?.malicious_votes ?? 0) + (results?.suspicious_votes ?? 0);

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
              <Text style={styles.headerTitle}>VirusTotal Results</Text>
              <View style={[styles.engineBadge, { borderColor: "rgba(0,102,255,0.4)" }]}>
                <MaterialCommunityIcons name="shield-search" size={13} color={COLORS.accent} />
                <Text style={[styles.engineBadgeText, { color: COLORS.accent }]}>VT API</Text>
              </View>
            </View>

            {/* Verdict Card */}
            <View style={[styles.verdictCard, { borderColor: verdictColor + "55" }]}>
              <LinearGradient
                colors={[COLORS.card, COLORS.bgSecondary]}
                style={styles.verdictGrad}
              >
                <View style={[styles.verdictIconBg, { backgroundColor: verdictColor + "1A" }]}>
                  <MaterialCommunityIcons name={verdictIcon} size={56} color={verdictColor} />
                </View>
                <Text style={[styles.verdictLabel, { color: verdictColor }]}>{verdictLabel}</Text>
                <Text style={styles.verdictSub}>
                  {hasError
                    ? (error || results?.error || "Could not complete scan")
                    : isSafe
                    ? "No security vendors flagged this URL"
                    : `${flaggedCount} security vendor${flaggedCount !== 1 ? "s" : ""} flagged this URL`}
                </Text>
              </LinearGradient>
            </View>

            {/* URL Card with Copy/Open buttons */}
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

            {/* Stats: detection ratio */}
            {results?.scanned && (
              <>
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>DETECTION RATIO</Text>
                  <View style={styles.ratioRow}>
                    <Text style={[styles.ratioCount, { color: flaggedCount > 0 ? COLORS.danger : COLORS.safe }]}>
                      {flaggedCount}
                    </Text>
                    <Text style={styles.ratioOf}> / {results.total_engines}</Text>
                  </View>
                  <Text style={styles.ratioSub}>engines flagged this URL</Text>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, {
                      width: `${results.total_engines > 0 ? (flaggedCount / results.total_engines) * 100 : 0}%`,
                      backgroundColor: flaggedCount > 0 ? COLORS.danger : COLORS.safe,
                    }]} />
                  </View>
                </View>

                {/* Engine Breakdown */}
                <View style={styles.card}>
                  <Text style={styles.cardLabel}>ENGINE BREAKDOWN</Text>
                  <View style={styles.breakdownGrid}>
                    <BreakdownItem icon="close-circle"      color={COLORS.danger}        label="Malicious"  value={results.malicious_votes} />
                    <BreakdownItem icon="alert-circle"      color={COLORS.warning}       label="Suspicious" value={results.suspicious_votes} />
                    <BreakdownItem icon="checkmark-circle"  color={COLORS.safe}          label="Harmless"   value={results.harmless_votes} />
                    <BreakdownItem icon="help-circle"       color={COLORS.textSecondary} label="Undetected" value={results.undetected_votes} />
                  </View>
                </View>
              </>
            )}

            {/* Scan Again */}
            <TouchableOpacity style={styles.scanAgainBtn} onPress={() => router.replace("/(main)")} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.accent, "#0088ff"]} style={styles.scanAgainGrad}>
                <MaterialCommunityIcons name="qrcode-scan" size={20} color="#fff" />
                <Text style={styles.scanAgainText}>Scan Another QR Code</Text>
              </LinearGradient>
            </TouchableOpacity>

          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

function BreakdownItem({ icon, color, label, value }) {
  return (
    <View style={styles.breakdownItem}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={[styles.breakdownVal, { color }]}>{value ?? 0}</Text>
      <Text style={styles.breakdownLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: COLORS.bg },
  gradient:       { flex: 1 },
  content:        { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  header:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerTitle:    { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  engineBadge:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  engineBadgeText:{ fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  verdictCard:    { borderRadius: 20, overflow: "hidden", borderWidth: 1, marginBottom: 14 },
  verdictGrad:    { padding: 28, alignItems: "center" },
  verdictIconBg:  { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  verdictLabel:   { fontSize: 28, fontWeight: "900", letterSpacing: 4, marginBottom: 8 },
  verdictSub:     { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20 },
  card:           { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder },
  cardLabel:      { fontSize: 10, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 1.5, marginBottom: 12 },
  urlRow:         { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 14 },
  urlText:        { fontSize: 13, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  urlActions:     { flexDirection: "row", gap: 10 },
  urlBtn:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  urlBtnText:     { fontSize: 13, fontWeight: "600" },
  ratioRow:       { flexDirection: "row", alignItems: "baseline", marginBottom: 4 },
  ratioCount:     { fontSize: 36, fontWeight: "900" },
  ratioOf:        { fontSize: 18, color: COLORS.textSecondary },
  ratioSub:       { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },
  progressBg:     { height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" },
  progressFill:   { height: "100%", borderRadius: 4, minWidth: 4 },
  breakdownGrid:  { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  breakdownItem:  { flex: 1, minWidth: "44%", backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 12, padding: 14, alignItems: "center", gap: 5 },
  breakdownVal:   { fontSize: 26, fontWeight: "800" },
  breakdownLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: "600" },
  scanAgainBtn:   { marginTop: 8, borderRadius: 14, overflow: "hidden" },
  scanAgainGrad:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  scanAgainText:  { fontSize: 16, fontWeight: "700", color: "#fff" },
});
