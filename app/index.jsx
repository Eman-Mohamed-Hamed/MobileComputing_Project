import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

// ============================================
// CONFIGURATION
// ============================================
// IMPORTANT: Change this to your computer's local IP address
// Find it by running 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux)

// const API_BASE_URL = "http://192.168.1.100:5000";

const API_BASE_URL = ""    // حط ال IP address of flask server  هنا  

// ============================================
// THEME COLORS
// ============================================
const COLORS = {
  bg: "#0a0e27",
  bgSecondary: "#1a1f3a",
  card: "#162447",
  cardBorder: "#1f3460",
  accent: "#0066ff",
  accentGlow: "#0044cc",
  safe: "#00ff88",
  safeDark: "#00cc6a",
  danger: "#ff4444",
  dangerDark: "#cc0000",
  warning: "#ffaa00",
  warningDark: "#cc8800",
  textPrimary: "#ffffff",
  textSecondary: "#8892b0",
  textMuted: "#4a5568",
  scanLine: "#00ff88",
  overlay: "rgba(10, 14, 39, 0.85)",
};

// ============================================
// SCREEN STATES
// ============================================
const SCREENS = {
  HOME: "home",
  SCANNER: "scanner",
  LOADING: "loading",
  VT_RESULTS: "vt_results",
  ML_RESULTS: "ml_results",
};

// ============================================
// MAIN APP COMPONENT
// ============================================
export default function Index() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [scanMode, setScanMode] = useState(null); // 'virustotal' or 'ml'
  const [scannedUrl, setScannedUrl] = useState("");
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, [screen]);

  useEffect(() => {
    if (screen === SCREENS.SCANNER) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [screen]);

  useEffect(() => {
    if (screen === SCREENS.LOADING) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    }
  }, [screen]);

  // ============================================
  // NAVIGATION HELPERS
  // ============================================
  const goHome = () => {
    setScreen(SCREENS.HOME);
    setResults(null);
    setError(null);
    setScannedUrl("");
    setHasScanned(false);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
  };

  const startScan = async (mode) => {
    setScanMode(mode);
    setHasScanned(false);

    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission Required",
          "QR Guard needs camera access to scan QR codes. Please enable it in your device settings.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
    }

    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    setScreen(SCREENS.SCANNER);
  };

  // ============================================
  // QR CODE HANDLER
  // ============================================
  const handleBarCodeScanned = async ({ type, data }) => {
    if (hasScanned) return;
    setHasScanned(true);

    const url = data;
    setScannedUrl(url);
    setScreen(SCREENS.LOADING);
    fadeAnim.setValue(0);
    slideAnim.setValue(50);

    try {
      const endpoint =
        scanMode === "virustotal" ? "/scan/virustotal" : "/scan/ml";

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const resultData = await response.json();
      setResults(resultData);
      setError(null);

      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      setScreen(
        scanMode === "virustotal" ? SCREENS.VT_RESULTS : SCREENS.ML_RESULTS
      );
    } catch (err) {
      setError(err.message || "Failed to connect to the server");
      setResults(null);
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      setScreen(
        scanMode === "virustotal" ? SCREENS.VT_RESULTS : SCREENS.ML_RESULTS
      );
    }
  };

  // ============================================
  // RENDER SCREENS
  // ============================================
  if (screen === SCREENS.HOME) return renderHomeScreen();
  if (screen === SCREENS.SCANNER) return renderScannerScreen();
  if (screen === SCREENS.LOADING) return renderLoadingScreen();
  if (screen === SCREENS.VT_RESULTS) return renderVTResultsScreen();
  if (screen === SCREENS.ML_RESULTS) return renderMLResultsScreen();

  return renderHomeScreen();

  // ============================================
  // HOME SCREEN
  // ============================================
  function renderHomeScreen() {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[COLORS.bg, "#0d1333", COLORS.bgSecondary]}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={styles.homeContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.homeHeader,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Shield Icon */}
              <View style={styles.logoContainer}>
                <LinearGradient
                  colors={[COLORS.accent, "#0088ff"]}
                  style={styles.logoGradient}
                >
                  <MaterialCommunityIcons
                    name="shield-lock"
                    size={48}
                    color={COLORS.textPrimary}
                  />
                </LinearGradient>
              </View>

              <Text style={styles.appTitle}>QR GUARD</Text>
              <Text style={styles.appSubtitle}>
                Advanced QR Code Phishing Detection
              </Text>

              {/* Decorative line */}
              <View style={styles.decorLine}>
                <View style={styles.decorLinePart} />
                <MaterialCommunityIcons
                  name="security"
                  size={16}
                  color={COLORS.accent}
                />
                <View style={styles.decorLinePart} />
              </View>

              <Text style={styles.appDescription}>
                Scan any QR code and instantly detect if the encoded URL is
                malicious. Choose your preferred detection engine below.
              </Text>
            </Animated.View>

            {/* Scan Options */}
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {/* VirusTotal Option */}
              <TouchableOpacity
                style={styles.scanOptionCard}
                onPress={() => startScan("virustotal")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#162447", "#1a2a52"]}
                  style={styles.scanOptionGradient}
                >
                  <View style={styles.scanOptionHeader}>
                    <View
                      style={[
                        styles.scanOptionIcon,
                        { backgroundColor: "rgba(0, 102, 255, 0.15)" },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="shield-search"
                        size={32}
                        color={COLORS.accent}
                      />
                    </View>
                    <View style={styles.scanOptionTextContainer}>
                      <Text style={styles.scanOptionTitle}>
                        VirusTotal Scan
                      </Text>
                      <Text style={styles.scanOptionBadge}>API-POWERED</Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={COLORS.textSecondary}
                    />
                  </View>
                  <Text style={styles.scanOptionDescription}>
                    Check the URL against 70+ security vendors and sandboxes
                    using the VirusTotal threat intelligence platform.
                  </Text>
                  <View style={styles.scanOptionFeatures}>
                    <View style={styles.featureTag}>
                      <Ionicons
                        name="globe-outline"
                        size={12}
                        color={COLORS.accent}
                      />
                      <Text style={styles.featureTagText}>70+ Engines</Text>
                    </View>
                    <View style={styles.featureTag}>
                      <Ionicons
                        name="cloud-outline"
                        size={12}
                        color={COLORS.accent}
                      />
                      <Text style={styles.featureTagText}>Cloud-Based</Text>
                    </View>
                    <View style={styles.featureTag}>
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={COLORS.accent}
                      />
                      <Text style={styles.featureTagText}>Real-Time</Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* ML Option */}
              <TouchableOpacity
                style={styles.scanOptionCard}
                onPress={() => startScan("ml")}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={["#162447", "#1a2a52"]}
                  style={styles.scanOptionGradient}
                >
                  <View style={styles.scanOptionHeader}>
                    <View
                      style={[
                        styles.scanOptionIcon,
                        { backgroundColor: "rgba(0, 255, 136, 0.1)" },
                      ]}
                    >
                      <FontAwesome5
                        name="brain"
                        size={28}
                        color={COLORS.safe}
                      />
                    </View>
                    <View style={styles.scanOptionTextContainer}>
                      <Text style={styles.scanOptionTitle}>
                        ML Model Scan
                      </Text>
                      <Text
                        style={[
                          styles.scanOptionBadge,
                          { backgroundColor: "rgba(0, 255, 136, 0.1)", color: COLORS.safe },
                        ]}
                      >
                        AI-POWERED
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={COLORS.textSecondary}
                    />
                  </View>
                  <Text style={styles.scanOptionDescription}>
                    Analyze the URL using a Random Forest machine learning model
                    trained on 500K+ URLs with 91.6% accuracy.
                  </Text>
                  <View style={styles.scanOptionFeatures}>
                    <View style={[styles.featureTag, { borderColor: "rgba(0,255,136,0.3)" }]}>
                      <FontAwesome5
                        name="robot"
                        size={10}
                        color={COLORS.safe}
                      />
                      <Text style={[styles.featureTagText, { color: COLORS.safe }]}>
                        Random Forest
                      </Text>
                    </View>
                    <View style={[styles.featureTag, { borderColor: "rgba(0,255,136,0.3)" }]}>
                      <Ionicons
                        name="analytics-outline"
                        size={12}
                        color={COLORS.safe}
                      />
                      <Text style={[styles.featureTagText, { color: COLORS.safe }]}>
                        20 Features
                      </Text>
                    </View>
                    <View style={[styles.featureTag, { borderColor: "rgba(0,255,136,0.3)" }]}>
                      <Ionicons
                        name="flash-outline"
                        size={12}
                        color={COLORS.safe}
                      />
                      <Text style={[styles.featureTagText, { color: COLORS.safe }]}>
                        Instant
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <MaterialCommunityIcons
                name="lock-check"
                size={14}
                color={COLORS.textMuted}
              />
              <Text style={styles.footerText}>
                Your scans are processed securely
              </Text>
            </View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ============================================
  // SCANNER SCREEN
  // ============================================
  function renderScannerScreen() {
    return (
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
        />

        {/* Overlay */}
        <View style={styles.scannerOverlay}>
          {/* Top bar */}
          <SafeAreaView style={styles.scannerTopBar}>
            <TouchableOpacity onPress={goHome} style={styles.scannerBackBtn}>
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <View style={styles.scannerTitleContainer}>
              <MaterialCommunityIcons
                name={scanMode === "virustotal" ? "shield-search" : "brain"}
                size={20}
                color={scanMode === "virustotal" ? COLORS.accent : COLORS.safe}
              />
              <Text style={styles.scannerTitle}>
                {scanMode === "virustotal" ? "VirusTotal" : "ML Model"} Scan
              </Text>
            </View>
            <View style={{ width: 40 }} />
          </SafeAreaView>

          {/* Scan frame */}
          <View style={styles.scanFrameContainer}>
            <View style={styles.scanFrame}>
              {/* Corner decorations */}
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              {/* Animated scan line */}
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [
                      {
                        translateY: scanLineAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 230],
                        }),
                      },
                    ],
                  },
                ]}
              />
            </View>
          </View>

          {/* Bottom instruction */}
          <View style={styles.scannerBottom}>
            <Text style={styles.scannerInstruction}>
              Point your camera at a QR code
            </Text>
            <Text style={styles.scannerSubInstruction}>
              The URL will be automatically extracted and analyzed
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ============================================
  // LOADING SCREEN
  // ============================================
  function renderLoadingScreen() {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[COLORS.bg, "#0d1333", COLORS.bgSecondary]}
          style={styles.gradient}
        >
          <View style={styles.loadingContainer}>
            <Animated.View
              style={[
                styles.loadingIconContainer,
                { transform: [{ scale: pulseAnim }] },
              ]}
            >
              <LinearGradient
                colors={
                  scanMode === "virustotal"
                    ? [COLORS.accent, "#0088ff"]
                    : [COLORS.safe, "#00cc88"]
                }
                style={styles.loadingIconGradient}
              >
                <MaterialCommunityIcons
                  name={
                    scanMode === "virustotal" ? "shield-search" : "brain"
                  }
                  size={48}
                  color={COLORS.textPrimary}
                />
              </LinearGradient>
            </Animated.View>

            <Text style={styles.loadingTitle}>Analyzing URL...</Text>
            <Text style={styles.loadingSubtitle}>
              {scanMode === "virustotal"
                ? "Checking against 70+ security engines"
                : "Running ML feature extraction & prediction"}
            </Text>

            <View style={styles.loadingUrlContainer}>
              <Ionicons name="link" size={14} color={COLORS.textSecondary} />
              <Text style={styles.loadingUrl} numberOfLines={2}>
                {scannedUrl}
              </Text>
            </View>

            <ActivityIndicator
              size="large"
              color={scanMode === "virustotal" ? COLORS.accent : COLORS.safe}
              style={{ marginTop: 30 }}
            />
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ============================================
  // VIRUSTOTAL RESULTS SCREEN
  // ============================================
  function renderVTResultsScreen() {
    const isSafe = results && results.scanned && !results.is_flagged;
    const isFlagged = results && results.scanned && results.is_flagged;
    const hasError = error || (results && !results.scanned);

    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[COLORS.bg, "#0d1333", COLORS.bgSecondary]}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {/* Header */}
              <View style={styles.resultsHeader}>
                <TouchableOpacity onPress={goHome} style={styles.backButton}>
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={COLORS.textPrimary}
                  />
                </TouchableOpacity>
                <Text style={styles.resultsHeaderTitle}>
                  VirusTotal Results
                </Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Verdict Card */}
              <View
                style={[
                  styles.verdictCard,
                  {
                    borderColor: hasError
                      ? COLORS.warning
                      : isSafe
                      ? COLORS.safe
                      : COLORS.danger,
                  },
                ]}
              >
                <View
                  style={[
                    styles.verdictIconContainer,
                    {
                      backgroundColor: hasError
                        ? "rgba(255,170,0,0.15)"
                        : isSafe
                        ? "rgba(0,255,136,0.1)"
                        : "rgba(255,68,68,0.1)",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      hasError
                        ? "alert-circle"
                        : isSafe
                        ? "shield-check"
                        : "shield-alert"
                    }
                    size={56}
                    color={
                      hasError
                        ? COLORS.warning
                        : isSafe
                        ? COLORS.safe
                        : COLORS.danger
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.verdictText,
                    {
                      color: hasError
                        ? COLORS.warning
                        : isSafe
                        ? COLORS.safe
                        : COLORS.danger,
                    },
                  ]}
                >
                  {hasError ? "SCAN ERROR" : isSafe ? "SAFE" : "DANGER"}
                </Text>
                <Text style={styles.verdictSubtext}>
                  {hasError
                    ? error || results?.error || "Could not complete scan"
                    : isSafe
                    ? "No security vendors flagged this URL"
                    : `${results?.malicious_votes + results?.suspicious_votes} security vendors flagged this URL`}
                </Text>
              </View>

              {/* URL Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>SCANNED URL</Text>
                <View style={styles.urlDisplay}>
                  <Ionicons
                    name="link"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.urlText} selectable>
                    {scannedUrl}
                  </Text>
                </View>
              </View>

              {/* Stats Cards */}
              {results && results.scanned && (
                <>
                  {/* Detection Ratio */}
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardLabel}>DETECTION RATIO</Text>
                    <View style={styles.detectionRatioContainer}>
                      <Text style={styles.detectionRatioText}>
                        <Text
                          style={{
                            color:
                              results.malicious_votes +
                                results.suspicious_votes >
                              0
                                ? COLORS.danger
                                : COLORS.safe,
                            fontSize: 32,
                            fontWeight: "bold",
                          }}
                        >
                          {results.malicious_votes + results.suspicious_votes}
                        </Text>
                        <Text style={{ color: COLORS.textSecondary }}>
                          {" "}
                          / {results.total_engines}
                        </Text>
                      </Text>
                      <Text style={styles.detectionRatioLabel}>
                        engines flagged this URL
                      </Text>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${
                              results.total_engines > 0
                                ? ((results.malicious_votes +
                                    results.suspicious_votes) /
                                    results.total_engines) *
                                  100
                                : 0
                            }%`,
                            backgroundColor:
                              results.malicious_votes +
                                results.suspicious_votes >
                              0
                                ? COLORS.danger
                                : COLORS.safe,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Breakdown */}
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardLabel}>
                      ENGINE BREAKDOWN
                    </Text>
                    <View style={styles.breakdownGrid}>
                      <BreakdownItem
                        label="Malicious"
                        value={results.malicious_votes}
                        color={COLORS.danger}
                        icon="close-circle"
                      />
                      <BreakdownItem
                        label="Suspicious"
                        value={results.suspicious_votes}
                        color={COLORS.warning}
                        icon="alert-circle"
                      />
                      <BreakdownItem
                        label="Harmless"
                        value={results.harmless_votes}
                        color={COLORS.safe}
                        icon="checkmark-circle"
                      />
                      <BreakdownItem
                        label="Undetected"
                        value={results.undetected_votes}
                        color={COLORS.textSecondary}
                        icon="help-circle"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Scan Again Button */}
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={goHome}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.accent, "#0088ff"]}
                  style={styles.scanAgainGradient}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={20}
                    color={COLORS.textPrimary}
                  />
                  <Text style={styles.scanAgainText}>Scan Another QR Code</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ============================================
  // ML RESULTS SCREEN
  // ============================================
  function renderMLResultsScreen() {
    const isSafe = results && !results.is_malicious;
    const isMalicious = results && results.is_malicious;
    const hasError = error || !results;

    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[COLORS.bg, "#0d1333", COLORS.bgSecondary]}
          style={styles.gradient}
        >
          <ScrollView
            contentContainerStyle={styles.resultsContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={{
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }}
            >
              {/* Header */}
              <View style={styles.resultsHeader}>
                <TouchableOpacity onPress={goHome} style={styles.backButton}>
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={COLORS.textPrimary}
                  />
                </TouchableOpacity>
                <Text style={styles.resultsHeaderTitle}>ML Model Results</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Verdict Card */}
              <View
                style={[
                  styles.verdictCard,
                  {
                    borderColor: hasError
                      ? COLORS.warning
                      : isSafe
                      ? COLORS.safe
                      : COLORS.danger,
                  },
                ]}
              >
                <View
                  style={[
                    styles.verdictIconContainer,
                    {
                      backgroundColor: hasError
                        ? "rgba(255,170,0,0.15)"
                        : isSafe
                        ? "rgba(0,255,136,0.1)"
                        : "rgba(255,68,68,0.1)",
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={
                      hasError
                        ? "alert-circle"
                        : isSafe
                        ? "shield-check"
                        : "shield-alert"
                    }
                    size={56}
                    color={
                      hasError
                        ? COLORS.warning
                        : isSafe
                        ? COLORS.safe
                        : COLORS.danger
                    }
                  />
                </View>
                <Text
                  style={[
                    styles.verdictText,
                    {
                      color: hasError
                        ? COLORS.warning
                        : isSafe
                        ? COLORS.safe
                        : COLORS.danger,
                    },
                  ]}
                >
                  {hasError
                    ? "SCAN ERROR"
                    : isSafe
                    ? "SAFE"
                    : "MALICIOUS"}
                </Text>
                <Text style={styles.verdictSubtext}>
                  {hasError
                    ? error || "Could not complete ML analysis"
                    : isSafe
                    ? "The ML model classified this URL as safe"
                    : "The ML model detected this URL as potentially malicious"}
                </Text>
              </View>

              {/* URL Card */}
              <View style={styles.infoCard}>
                <Text style={styles.infoCardLabel}>SCANNED URL</Text>
                <View style={styles.urlDisplay}>
                  <Ionicons
                    name="link"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                  <Text style={styles.urlText} selectable>
                    {scannedUrl}
                  </Text>
                </View>
              </View>

              {/* Confidence Gauge */}
              {results && (
                <>
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardLabel}>
                      CONFIDENCE SCORE
                    </Text>
                    <View style={styles.confidenceContainer}>
                      <View style={styles.confidenceGauge}>
                        <View
                          style={[
                            styles.confidenceGaugeFill,
                            {
                              width: `${results.confidence}%`,
                              backgroundColor: isSafe
                                ? COLORS.safe
                                : COLORS.danger,
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.confidenceValue,
                          { color: isSafe ? COLORS.safe : COLORS.danger },
                        ]}
                      >
                        {results.confidence}%
                      </Text>
                    </View>
                    <Text style={styles.confidenceLabel}>
                      Model is {results.confidence}% confident in its
                      prediction
                    </Text>
                  </View>

                  {/* Feature Analysis */}
                  <View style={styles.infoCard}>
                    <Text style={styles.infoCardLabel}>
                      FEATURE ANALYSIS
                    </Text>
                    <View style={styles.featureGrid}>
                      <FeatureItem
                        icon="resize"
                        label="URL Length"
                        value={results.features?.url_length}
                        warning={results.features?.url_length > 75}
                      />
                      <FeatureItem
                        icon="pulse"
                        label="Entropy"
                        value={results.features?.url_entropy}
                        warning={results.features?.url_entropy > 4}
                      />
                      <FeatureItem
                        icon="warning"
                        label="Suspicious Words"
                        value={results.features?.num_sus_words}
                        warning={results.features?.num_sus_words > 0}
                      />
                      <FeatureItem
                        icon="globe"
                        label="IP Address"
                        value={
                          results.features?.has_ip_address ? "Yes" : "No"
                        }
                        warning={results.features?.has_ip_address}
                      />
                      <FeatureItem
                        icon="lock-closed"
                        label="HTTPS"
                        value={results.features?.has_https ? "Yes" : "No"}
                        warning={!results.features?.has_https}
                      />
                      <FeatureItem
                        icon="link"
                        label="URL Shortener"
                        value={
                          results.features?.has_shortener ? "Yes" : "No"
                        }
                        warning={results.features?.has_shortener}
                      />
                      <FeatureItem
                        icon="folder-open"
                        label="Directory Depth"
                        value={results.features?.directory_depth}
                        warning={results.features?.directory_depth > 5}
                      />
                      <FeatureItem
                        icon="ellipsis-horizontal"
                        label="Dots Count"
                        value={results.features?.num_dots}
                        warning={results.features?.num_dots > 4}
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Scan Again Button */}
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={goHome}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[COLORS.safe, "#00cc88"]}
                  style={styles.scanAgainGradient}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={20}
                    color={COLORS.bg}
                  />
                  <Text style={[styles.scanAgainText, { color: COLORS.bg }]}>
                    Scan Another QR Code
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }
}

// ============================================
// REUSABLE COMPONENTS
// ============================================
function BreakdownItem({ label, value, color, icon }) {
  return (
    <View style={styles.breakdownItem}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.breakdownValue, { color }]}>{value}</Text>
      <Text style={styles.breakdownLabel}>{label}</Text>
    </View>
  );
}

function FeatureItem({ icon, label, value, warning }) {
  return (
    <View
      style={[
        styles.featureItem,
        warning && { borderColor: "rgba(255,170,0,0.3)" },
      ]}
    >
      <View style={styles.featureItemHeader}>
        <Ionicons
          name={icon}
          size={16}
          color={warning ? COLORS.warning : COLORS.textSecondary}
        />
        {warning && (
          <Ionicons
            name="alert-circle"
            size={12}
            color={COLORS.warning}
            style={{ marginLeft: 4 }}
          />
        )}
      </View>
      <Text
        style={[
          styles.featureItemValue,
          warning && { color: COLORS.warning },
        ]}
      >
        {value}
      </Text>
      <Text style={styles.featureItemLabel}>{label}</Text>
    </View>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  gradient: {
    flex: 1,
  },

  // Home Screen
  homeContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  homeHeader: {
    alignItems: "center",
    marginBottom: 30,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoGradient: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.textPrimary,
    letterSpacing: 6,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    marginBottom: 16,
  },
  decorLine: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 10,
  },
  decorLinePart: {
    width: 40,
    height: 1,
    backgroundColor: COLORS.accent,
    opacity: 0.4,
  },
  appDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 10,
  },

  // Scan Option Cards
  scanOptionCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  scanOptionGradient: {
    padding: 20,
  },
  scanOptionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  scanOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  scanOptionTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  scanOptionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  scanOptionBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.accent,
    backgroundColor: "rgba(0, 102, 255, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    letterSpacing: 1,
  },
  scanOptionDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  scanOptionFeatures: {
    flexDirection: "row",
    gap: 8,
  },
  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,102,255,0.3)",
  },
  featureTagText: {
    fontSize: 11,
    color: COLORS.accent,
    fontWeight: "600",
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
  },
  footerText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Scanner Screen
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  scannerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 40 : 0,
    paddingBottom: 10,
    backgroundColor: COLORS.overlay,
  },
  scannerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  scannerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  scanFrameContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scanFrame: {
    width: 260,
    height: 260,
    position: "relative",
    overflow: "hidden",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: COLORS.safe,
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.scanLine,
    shadowColor: COLORS.scanLine,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  scannerBottom: {
    alignItems: "center",
    paddingBottom: 60,
    paddingHorizontal: 20,
    backgroundColor: COLORS.overlay,
    paddingTop: 20,
  },
  scannerInstruction: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  scannerSubInstruction: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
  },

  // Loading Screen
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
  },
  loadingIconContainer: {
    marginBottom: 24,
  },
  loadingIconGradient: {
    width: 100,
    height: 100,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  loadingUrlContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    maxWidth: "100%",
  },
  loadingUrl: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },

  // Results Screens
  resultsContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  resultsHeaderTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // Verdict Card
  verdictCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
  },
  verdictIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  verdictText: {
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 4,
    marginBottom: 8,
  },
  verdictSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // Info Cards
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  urlDisplay: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  urlText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 20,
  },

  // Detection Ratio
  detectionRatioContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  detectionRatioText: {
    fontSize: 16,
  },
  detectionRatioLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    minWidth: 4,
  },

  // Breakdown
  breakdownGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  breakdownItem: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    gap: 4,
  },
  breakdownValue: {
    fontSize: 24,
    fontWeight: "800",
  },
  breakdownLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },

  // Confidence
  confidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  confidenceGauge: {
    flex: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 6,
    overflow: "hidden",
  },
  confidenceGaugeFill: {
    height: "100%",
    borderRadius: 6,
  },
  confidenceValue: {
    fontSize: 22,
    fontWeight: "800",
    minWidth: 60,
    textAlign: "right",
  },
  confidenceLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  // Feature Grid
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  featureItem: {
    width: "48%",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  featureItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  featureItemValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featureItemLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  // Scan Again Button
  scanAgainButton: {
    marginTop: 8,
    borderRadius: 14,
    overflow: "hidden",
  },
  scanAgainGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
  },
  scanAgainText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
});
