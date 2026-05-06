import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated, Platform, StyleSheet, Text, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useScan } from "../../context/ScanContext";
import { COLORS } from "../../constants/theme";

export default function ScannerScreen() {
  const { scanMode }  = useLocalSearchParams();
  const router        = useRouter();
  const { setScanMode, setScannedUrl } = useScan();

  const [hasScanned,  setHasScanned]  = useState(false);
  const scanLineAnim  = useRef(new Animated.Value(0)).current;
  const pulseAnim     = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setScanMode(scanMode);
    const lineAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    lineAnim.start();
    pulse.start();
    return () => { lineAnim.stop(); pulse.stop(); };
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    if (hasScanned) return;
    setHasScanned(true);
    setScannedUrl(data);
    router.push({ pathname: "/(main)/loading", params: { url: data, scanMode } });
  };

  const modeColor = scanMode === "virustotal" ? COLORS.accent : scanMode === "both" ? COLORS.warning : COLORS.safe;
  const modeIcon  = scanMode === "virustotal" ? "shield-search" : scanMode === "both" ? "shield-half-full" : "brain";
  const modeLabel = scanMode === "virustotal" ? "VirusTotal" : scanMode === "both" ? "Full Scan" : "ML Model";

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={hasScanned ? undefined : handleBarCodeScanned}
      />

      {/* Dimmed overlay — left/right/top/bottom strips */}
      <View style={[styles.overlay, styles.overlayTop]} />
      <View style={[styles.overlay, styles.overlayBottom]} />
      <View style={[styles.overlay, styles.overlayLeft]} />
      <View style={[styles.overlay, styles.overlayRight]} />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.modeLabel}>
          <MaterialCommunityIcons name={modeIcon} size={18} color={modeColor} />
          <Text style={[styles.modeLabelText, { color: modeColor }]}>{modeLabel} Scan</Text>
        </View>
        <View style={{ width: 42 }} />
      </SafeAreaView>

      {/* Scan frame */}
      <View style={styles.frameArea}>
        <Animated.View style={[styles.frame, { transform: [{ scale: pulseAnim }], borderColor: modeColor }]}>
          {/* Corners */}
          {[styles.cornerTL, styles.cornerTR, styles.cornerBL, styles.cornerBR].map((cs, i) => (
            <View key={i} style={[styles.corner, cs, { borderColor: modeColor }]} />
          ))}
          {/* Scan line */}
          <Animated.View style={[styles.scanLine, {
            backgroundColor: modeColor,
            shadowColor:      modeColor,
            transform: [{ translateY: scanLineAnim.interpolate({ inputRange: [0,1], outputRange: [0, 234] }) }],
          }]} />
        </Animated.View>
      </View>

      {/* Bottom instruction */}
      <View style={styles.bottomBar}>
        <Text style={styles.instruction}>Point your camera at a QR code</Text>
        <Text style={styles.subInstruction}>The URL will be automatically extracted and analyzed</Text>
      </View>
    </View>
  );
}

const FRAME_SIZE = 260;

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#000" },
  overlay:         { position: "absolute", backgroundColor: "rgba(10,14,39,0.78)" },
  overlayTop:      { top: 0, left: 0, right: 0, height: "25%" },
  overlayBottom:   { bottom: 0, left: 0, right: 0, height: "25%" },
  overlayLeft:     { top: "25%", left: 0, width: `calc(50% - ${FRAME_SIZE / 2}px)`, bottom: "25%" },
  overlayRight:    { top: "25%", right: 0, width: `calc(50% - ${FRAME_SIZE / 2}px)`, bottom: "25%" },
  topBar:          { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: Platform.OS === "android" ? 40 : 0, paddingBottom: 10, backgroundColor: "rgba(10,14,39,0.80)" },
  backBtn:         { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.12)", justifyContent: "center", alignItems: "center" },
  modeLabel:       { flexDirection: "row", alignItems: "center", gap: 8 },
  modeLabelText:   { fontSize: 16, fontWeight: "700" },
  frameArea:       { flex: 1, justifyContent: "center", alignItems: "center" },
  frame:           { width: FRAME_SIZE, height: FRAME_SIZE, position: "relative", overflow: "hidden", borderWidth: 0 },
  corner:          { position: "absolute", width: 28, height: 28, borderWidth: 3 },
  cornerTL:        { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
  cornerTR:        { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
  cornerBL:        { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
  cornerBR:        { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
  scanLine:        { position: "absolute", left: 0, right: 0, height: 2, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 6, elevation: 4 },
  bottomBar:       { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingBottom: 52, paddingTop: 18, paddingHorizontal: 24, backgroundColor: "rgba(10,14,39,0.80)" },
  instruction:     { fontSize: 16, fontWeight: "600", color: "#fff", marginBottom: 6 },
  subInstruction:  { fontSize: 12, color: COLORS.textSecondary, textAlign: "center" },
});
