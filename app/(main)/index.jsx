import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useRef } from "react";
import {
  Alert, Animated, Linking, ScrollView,
  StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import { useAuth } from "../../context/AuthContext";
import { useScan } from "../../context/ScanContext";
import { COLORS } from "../../constants/theme";

// Returns a time-based greeting label
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Returns the first letter(s) for the avatar
function getInitials(username = "") {
  return username.slice(0, 2).toUpperCase();
}

export default function HomeScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { clearScan }    = useScan();
  const [permission, requestPermission] = useCameraPermissions();

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  useEffect(() => {
    clearScan();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleStartScan = async (mode) => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission Required",
          "QR Guard needs camera access to scan QR codes.",
          [{ text: "Cancel", style: "cancel" }, { text: "Open Settings", onPress: () => Linking.openSettings() }]
        );
        return;
      }
    }
    router.push({ pathname: "/(main)/scanner", params: { scanMode: mode } });
  };

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ]);
  };

  const greeting  = getGreeting();
  const initials  = getInitials(user?.username);

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.bg, "#0d1333", COLORS.bgSecondary]} style={styles.gradient}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── USER BAR ── */}
          <View style={styles.userBar}>
            {/* Avatar circle */}
            <LinearGradient colors={[COLORS.accent, "#0088ff"]} style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </LinearGradient>

            {/* Greeting text */}
            <View style={styles.greetingBlock}>
              <Text style={styles.greetingLine}>
                {greeting},{" "}
                <Text style={styles.greetingName}>{user?.username}</Text>
              </Text>
              {/* Status pill */}
              <View style={styles.statusPill}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Protection active</Text>
              </View>
            </View>

            {/* Sign-out icon */}
            <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn} activeOpacity={0.75}>
              <Ionicons name="log-out-outline" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── HERO ── */}
          <Animated.View style={[styles.hero, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <LinearGradient colors={[COLORS.accent, "#0088ff"]} style={styles.logoGradient}>
              <MaterialCommunityIcons name="shield-lock" size={48} color="#fff" />
            </LinearGradient>
            <Text style={styles.appTitle}>QR GUARD</Text>
            <Text style={styles.appSubtitle}>Advanced QR Code Phishing Detection</Text>
            <View style={styles.decorLine}>
              <View style={styles.decorLinePart} />
              <MaterialCommunityIcons name="security" size={14} color={COLORS.accent} />
              <View style={styles.decorLinePart} />
            </View>
            <Text style={styles.appDesc}>
              Scan any QR code and instantly detect if the encoded URL is malicious.
              Choose your detection engine below.
            </Text>
          </Animated.View>

          {/* ── SCAN CARDS ── */}
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* VirusTotal */}
            <TouchableOpacity style={styles.scanCard} onPress={() => handleStartScan("virustotal")} activeOpacity={0.85}>
              <LinearGradient colors={["#162447", "#1a2a52"]} style={styles.scanCardGrad}>
                <View style={styles.scanCardHeader}>
                  <View style={[styles.scanCardIcon, { backgroundColor: "rgba(0,102,255,0.15)" }]}>
                    <MaterialCommunityIcons name="shield-search" size={30} color={COLORS.accent} />
                  </View>
                  <View style={styles.scanCardText}>
                    <Text style={styles.scanCardTitle}>VirusTotal Scan</Text>
                    <View style={[styles.badge, { backgroundColor: "rgba(0,102,255,0.15)" }]}>
                      <Text style={[styles.badgeText, { color: COLORS.accent }]}>API-POWERED</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.scanCardDesc}>
                  Check the URL against 70+ security vendors using the VirusTotal threat intelligence platform.
                </Text>
                <View style={styles.tagRow}>
                  {[["globe-outline","70+ Engines"],["cloud-outline","Cloud-Based"],["time-outline","Real-Time"]].map(([icon, label]) => (
                    <View key={label} style={[styles.tag, { borderColor: "rgba(0,102,255,0.3)" }]}>
                      <Ionicons name={icon} size={11} color={COLORS.accent} />
                      <Text style={[styles.tagText, { color: COLORS.accent }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* ML Model */}
            <TouchableOpacity style={styles.scanCard} onPress={() => handleStartScan("ml")} activeOpacity={0.85}>
              <LinearGradient colors={["#162447", "#1a2a52"]} style={styles.scanCardGrad}>
                <View style={styles.scanCardHeader}>
                  <View style={[styles.scanCardIcon, { backgroundColor: "rgba(0,255,136,0.1)" }]}>
                    <FontAwesome5 name="brain" size={26} color={COLORS.safe} />
                  </View>
                  <View style={styles.scanCardText}>
                    <Text style={styles.scanCardTitle}>ML Model Scan</Text>
                    <View style={[styles.badge, { backgroundColor: "rgba(0,255,136,0.1)" }]}>
                      <Text style={[styles.badgeText, { color: COLORS.safe }]}>AI-POWERED</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.scanCardDesc}>
                  Analyze the URL using a Random Forest model trained on 500K+ URLs with 91.6% accuracy.
                </Text>
                <View style={styles.tagRow}>
                  {[["flash-outline","Instant"],["analytics-outline","20 Features"],["shield-checkmark-outline","91.6% Acc."]].map(([icon, label]) => (
                    <View key={label} style={[styles.tag, { borderColor: "rgba(0,255,136,0.3)" }]}>
                      <Ionicons name={icon} size={11} color={COLORS.safe} />
                      <Text style={[styles.tagText, { color: COLORS.safe }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Full Scan */}
            <TouchableOpacity style={styles.scanCard} onPress={() => handleStartScan("both")} activeOpacity={0.85}>
              <LinearGradient colors={["#1a1533", "#221a45"]} style={styles.scanCardGrad}>
                <View style={styles.scanCardHeader}>
                  <View style={[styles.scanCardIcon, { backgroundColor: "rgba(255,170,0,0.12)" }]}>
                    <MaterialCommunityIcons name="shield-half-full" size={30} color={COLORS.warning} />
                  </View>
                  <View style={styles.scanCardText}>
                    <Text style={styles.scanCardTitle}>Full Scan</Text>
                    <View style={[styles.badge, { backgroundColor: "rgba(255,170,0,0.12)" }]}>
                      <Text style={[styles.badgeText, { color: COLORS.warning }]}>BOTH ENGINES</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={22} color={COLORS.textSecondary} />
                </View>
                <Text style={styles.scanCardDesc}>
                  Maximum protection — runs both VirusTotal and the ML model for a combined verdict.
                </Text>
                <View style={styles.tagRow}>
                  {[["layers-outline","Dual Layer"],["shield-checkmark-outline","Max Safety"]].map(([icon, label]) => (
                    <View key={label} style={[styles.tag, { borderColor: "rgba(255,170,0,0.3)" }]}>
                      <Ionicons name={icon} size={11} color={COLORS.warning} />
                      <Text style={[styles.tagText, { color: COLORS.warning }]}>{label}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </TouchableOpacity>

          </Animated.View>

          {/* Footer */}
          <View style={styles.footer}>
            <MaterialCommunityIcons name="lock-check" size={13} color={COLORS.textMuted} />
            <Text style={styles.footerText}>Your scans are processed securely</Text>
          </View>

        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bg },
  gradient:      { flex: 1 },
  content:       { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 40 },

  // ── User bar ──
  userBar:       { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24,
                   backgroundColor: "rgba(22,36,71,0.7)", borderRadius: 16, padding: 12,
                   borderWidth: 1, borderColor: COLORS.cardBorder },
  avatar:        { width: 42, height: 42, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  avatarText:    { fontSize: 15, fontWeight: "800", color: "#fff", letterSpacing: 0.5 },
  greetingBlock: { flex: 1 },
  greetingLine:  { fontSize: 14, color: COLORS.textSecondary, marginBottom: 4 },
  greetingName:  { color: COLORS.textPrimary, fontWeight: "700" },
  statusPill:    { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start",
                   backgroundColor: "rgba(0,255,136,0.1)", paddingHorizontal: 8, paddingVertical: 3,
                   borderRadius: 20, borderWidth: 1, borderColor: "rgba(0,255,136,0.25)" },
  statusDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.safe },
  statusText:    { fontSize: 10, fontWeight: "600", color: COLORS.safe, letterSpacing: 0.3 },
  logoutBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.06)",
                   justifyContent: "center", alignItems: "center",
                   borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },

  // ── Hero ──
  hero:          { alignItems: "center", marginBottom: 28 },
  logoGradient:  { width: 88, height: 88, borderRadius: 24, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  appTitle:      { fontSize: 30, fontWeight: "900", color: COLORS.textPrimary, letterSpacing: 6, marginBottom: 6 },
  appSubtitle:   { fontSize: 13, color: COLORS.textSecondary, letterSpacing: 0.5, marginBottom: 14 },
  decorLine:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  decorLinePart: { width: 40, height: 1, backgroundColor: COLORS.accent, opacity: 0.4 },
  appDesc:       { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 10 },

  // ── Scan cards ──
  scanCard:      { marginBottom: 14, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: COLORS.cardBorder },
  scanCardGrad:  { padding: 18 },
  scanCardHeader:{ flexDirection: "row", alignItems: "center", marginBottom: 10 },
  scanCardIcon:  { width: 54, height: 54, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  scanCardText:  { flex: 1, marginLeft: 12 },
  scanCardTitle: { fontSize: 17, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 4 },
  badge:         { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, alignSelf: "flex-start" },
  badgeText:     { fontSize: 9, fontWeight: "700", letterSpacing: 1 },
  scanCardDesc:  { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 12 },
  tagRow:        { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag:           { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagText:       { fontSize: 11, fontWeight: "600" },

  // ── Footer ──
  footer:        { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, marginTop: 20, paddingTop: 18, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
  footerText:    { fontSize: 11, color: COLORS.textMuted },
});
