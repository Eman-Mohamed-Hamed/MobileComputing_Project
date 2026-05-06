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

export default function BothResultsScreen() {
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
    if (Platform.OS === "android") ToastAndroid.show("URL copied!", ToastAndroid.SHORT);
    setTimeout(() => setCopied(false), 2500);
  };

  const openUrl = async () => {
    const ok = await Linking.canOpenURL(scannedUrl);
    if (ok) {
      Alert.alert("Open URL", "Open this URL in your browser?", [
        { text: "Cancel", style: "cancel" },
        { text: "Open", onPress: () => Linking.openURL(scannedUrl) },
      ]);
    } else {
      Alert.alert("Cannot open URL", "This URL cannot be opened.");
    }
  };

  const hasError    = error || !results;
  const isDanger    = results?.final_status === "Danger";
  const verdictColor = hasError ? COLORS.warning : isDanger ? COLORS.danger : COLORS.safe;
  const verdictLabel = hasError ? "SCAN ERROR"   : isDanger ? "DANGER"      : "SAFE";
  const verdictIcon  = hasError ? "alert-circle" : isDanger ? "shield-alert" : "shield-check";

  const ai = results?.ai_engine        || {};
  const vt = results?.virustotal_engine || {};
  const vtFlagged = (vt.malicious_votes ?? 0) + (vt.suspicious_votes ?? 0);

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
              <Text style={styles.headerTitle}>Full Scan Results</Text>
              <View style={[styles.badge, { borderColor: "rgba(255,170,0,0.4)" }]}>
                <MaterialCommunityIcons name="shield-half-full" size={13} color={COLORS.warning} />
                <Text style={[styles.badgeText, { color: COLORS.warning }]}>DUAL</Text>
              </View>
            </View>

            {/* Verdict */}
            <View style={[styles.verdictCard, { borderColor: verdictColor + "55" }]}>
              <LinearGradient colors={[COLORS.card, COLORS.bgSecondary]} style={styles.verdictGrad}>
                <View style={[styles.verdictIconBg, { backgroundColor: verdictColor + "1A" }]}>
                  <MaterialCommunityIcons name={verdictIcon} size={56} color={verdictColor} />
                </View>
                <Text style={[styles.verdictLabel, { color: verdictColor }]}>{verdictLabel}</Text>
                <Text style={styles.verdictSub}>
                  {hasError ? (error || "Scan failed") : isDanger ? "One or more engines detected a threat" : "Both engines cleared this URL"}
                </Text>
              </LinearGradient>
            </View>

            {/* URL */}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>SCANNED URL</Text>
              <View style={styles.urlRow}>
                <Ionicons name="link" size={14} color={COLORS.textSecondary} />
                <Text style={styles.urlText} selectable numberOfLines={3}>{scannedUrl}</Text>
              </View>
              <View style={styles.urlActions}>
                <TouchableOpacity style={[styles.urlBtn, { borderColor: copied ? "rgba(0,255,136,0.4)" : COLORS.cardBorder }]} onPress={copyUrl} activeOpacity={0.8}>
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color={copied ? COLORS.safe : COLORS.textSecondary} />
                  <Text style={[styles.urlBtnText, { color: copied ? COLORS.safe : COLORS.textSecondary }]}>{copied ? "Copied!" : "Copy URL"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.urlBtn, { borderColor: "rgba(0,102,255,0.35)", backgroundColor: "rgba(0,102,255,0.08)" }]} onPress={openUrl} activeOpacity={0.8}>
                  <Ionicons name="open-outline" size={16} color={COLORS.accent} />
                  <Text style={[styles.urlBtnText, { color: COLORS.accent }]}>Open Link</Text>
                </TouchableOpacity>
              </View>
            </View>

            {results && (
              <>
                {/* ML Engine Panel */}
                <View style={styles.card}>
                  <View style={styles.engineHeader}>
                    <FontAwesome5 name="brain" size={16} color={COLORS.safe} />
                    <Text style={styles.cardLabel}>ML MODEL ENGINE</Text>
                    {ai.available
                      ? <View style={[styles.miniBadge, { backgroundColor: ai.is_malicious ? "rgba(255,68,68,0.15)" : "rgba(0,255,136,0.12)" }]}>
                          <Text style={[styles.miniBadgeText, { color: ai.is_malicious ? COLORS.danger : COLORS.safe }]}>
                            {ai.is_malicious ? "MALICIOUS" : "SAFE"}
                          </Text>
                        </View>
                      : <View style={[styles.miniBadge, { backgroundColor: "rgba(255,255,255,0.06)" }]}>
                          <Text style={[styles.miniBadgeText, { color: COLORS.textMuted }]}>N/A</Text>
                        </View>
                    }
                  </View>
                  {ai.available ? (
                    <>
                      <View style={styles.confRow}>
                        <View style={styles.confGauge}>
                          <View style={[styles.confFill, { width: `${ai.confidence}%`, backgroundColor: ai.is_malicious ? COLORS.danger : COLORS.safe }]} />
                        </View>
                        <Text style={[styles.confValue, { color: ai.is_malicious ? COLORS.danger : COLORS.safe }]}>{ai.confidence}%</Text>
                      </View>
                      <Text style={styles.confSub}>Confidence in prediction</Text>
                    </>
                  ) : (
                    <Text style={styles.naText}>ML model not available on server</Text>
                  )}
                </View>

                {/* VT Engine Panel */}
                <View style={styles.card}>
                  <View style={styles.engineHeader}>
                    <MaterialCommunityIcons name="shield-search" size={16} color={COLORS.accent} />
                    <Text style={styles.cardLabel}>VIRUSTOTAL ENGINE</Text>
                    {vt.scanned
                      ? <View style={[styles.miniBadge, { backgroundColor: vt.is_flagged ? "rgba(255,68,68,0.15)" : "rgba(0,255,136,0.12)" }]}>
                          <Text style={[styles.miniBadgeText, { color: vt.is_flagged ? COLORS.danger : COLORS.safe }]}>
                            {vt.is_flagged ? "FLAGGED" : "CLEAR"}
                          </Text>
                        </View>
                      : <View style={[styles.miniBadge, { backgroundColor: "rgba(255,170,0,0.12)" }]}>
                          <Text style={[styles.miniBadgeText, { color: COLORS.warning }]}>ERROR</Text>
                        </View>
                    }
                  </View>
                  {vt.scanned ? (
                    <>
                      <View style={styles.vtRatioRow}>
                        <Text style={[styles.vtCount, { color: vtFlagged > 0 ? COLORS.danger : COLORS.safe }]}>{vtFlagged}</Text>
                        <Text style={styles.vtTotal}> / {vt.total_engines} engines flagged</Text>
                      </View>
                      <View style={styles.progressBg}>
                        <View style={[styles.progressFill, { width: `${vt.total_engines ? (vtFlagged / vt.total_engines) * 100 : 0}%`, backgroundColor: vtFlagged > 0 ? COLORS.danger : COLORS.safe }]} />
                      </View>
                    </>
                  ) : (
                    <Text style={styles.naText}>{vt.error || "VirusTotal unavailable"}</Text>
                  )}
                </View>
              </>
            )}

            <TouchableOpacity style={styles.scanAgainBtn} onPress={() => router.replace("/(main)")} activeOpacity={0.85}>
              <LinearGradient colors={[COLORS.warning, "#cc8800"]} style={styles.scanAgainGrad}>
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
  container:     { flex: 1, backgroundColor: COLORS.bg },
  gradient:      { flex: 1 },
  content:       { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 },
  header:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center" },
  headerTitle:   { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  badge:         { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  badgeText:     { fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  verdictCard:   { borderRadius: 20, overflow: "hidden", borderWidth: 1, marginBottom: 14 },
  verdictGrad:   { padding: 28, alignItems: "center" },
  verdictIconBg: { width: 100, height: 100, borderRadius: 50, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  verdictLabel:  { fontSize: 28, fontWeight: "900", letterSpacing: 4, marginBottom: 8 },
  verdictSub:    { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20 },
  card:          { backgroundColor: COLORS.card, borderRadius: 16, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: COLORS.cardBorder },
  cardLabel:     { fontSize: 10, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 1.5, marginBottom: 0 },
  urlRow:        { flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 14 },
  urlText:       { fontSize: 13, color: COLORS.textPrimary, flex: 1, lineHeight: 20 },
  urlActions:    { flexDirection: "row", gap: 10 },
  urlBtn:        { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.cardBorder },
  urlBtnText:    { fontSize: 13, fontWeight: "600" },
  engineHeader:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  miniBadge:     { marginLeft: "auto", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  confRow:       { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  confGauge:     { flex: 1, height: 10, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 5, overflow: "hidden" },
  confFill:      { height: "100%", borderRadius: 5 },
  confValue:     { fontSize: 20, fontWeight: "800", minWidth: 56, textAlign: "right" },
  confSub:       { fontSize: 12, color: COLORS.textSecondary },
  vtRatioRow:    { flexDirection: "row", alignItems: "baseline", marginBottom: 10 },
  vtCount:       { fontSize: 32, fontWeight: "900" },
  vtTotal:       { fontSize: 16, color: COLORS.textSecondary },
  progressBg:    { height: 8, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 4, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 4, minWidth: 4 },
  naText:        { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
  scanAgainBtn:  { marginTop: 8, borderRadius: 14, overflow: "hidden" },
  scanAgainGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  scanAgainText: { fontSize: 16, fontWeight: "700" },
});
