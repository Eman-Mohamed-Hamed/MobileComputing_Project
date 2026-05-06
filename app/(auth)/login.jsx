import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/AuthContext";
import { COLORS } from "../../constants/theme";
import { apiPost } from "../../utils/api";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [identifier,    setIdentifier]    = useState("");
  const [password,      setPassword]      = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleLogin = async () => {
    setError("");
    if (!identifier.trim() || !password) {
      setError("Please fill in all fields.");
      shake();
      return;
    }
    setLoading(true);
    try {
      const data = await apiPost("/auth/login", { identifier: identifier.trim(), password });
      await login(data.token, data.user);
      router.replace("/(main)");
    } catch (e) {
      setError(e.message || "Login failed. Please try again.");
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.bg, "#0d1333", COLORS.bgSecondary]} style={styles.gradient}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

            {/* Header */}
            <View style={styles.header}>
              <LinearGradient colors={[COLORS.accent, "#0088ff"]} style={styles.logoGradient}>
                <MaterialCommunityIcons name="shield-lock" size={44} color="#fff" />
              </LinearGradient>
              <Text style={styles.title}>QR GUARD</Text>
              <Text style={styles.subtitle}>Sign in to your account</Text>
            </View>

            {/* Form Card */}
            <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>

              {/* Error Banner */}
              {!!error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {/* Username / Email Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>USERNAME OR EMAIL</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter username or email"
                    placeholderTextColor={COLORS.textMuted}
                    value={identifier}
                    onChangeText={setIdentifier}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Enter your password"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity style={styles.submitBtn} onPress={handleLogin} activeOpacity={0.8} disabled={loading}>
                <LinearGradient colors={[COLORS.accent, "#0088ff"]} style={styles.submitGradient}>
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <>
                        <Ionicons name="log-in-outline" size={20} color="#fff" />
                        <Text style={styles.submitText}>Sign In</Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>New to QR Guard?</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Register link */}
              <TouchableOpacity style={styles.registerBtn} onPress={() => router.push("/(auth)/register")} activeOpacity={0.8}>
                <Text style={styles.registerText}>Create an Account</Text>
                <Ionicons name="arrow-forward" size={16} color={COLORS.safe} />
              </TouchableOpacity>

            </Animated.View>

            {/* Footer */}
            <View style={styles.footer}>
              <MaterialCommunityIcons name="lock-check" size={13} color={COLORS.textMuted} />
              <Text style={styles.footerText}>Passwords are hashed and stored securely</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bg },
  gradient:        { flex: 1 },
  scroll:          { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 32 },
  header:          { alignItems: "center", marginBottom: 32 },
  logoGradient:    { width: 80, height: 80, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  title:           { fontSize: 28, fontWeight: "900", color: COLORS.textPrimary, letterSpacing: 6, marginBottom: 6 },
  subtitle:        { fontSize: 14, color: COLORS.textSecondary, letterSpacing: 0.5 },
  card:            { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.cardBorder },
  errorBanner:     { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,68,68,0.1)", borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,68,68,0.3)" },
  errorText:       { color: COLORS.danger, fontSize: 13, flex: 1 },
  inputGroup:      { marginBottom: 18 },
  label:           { fontSize: 10, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 1.5, marginBottom: 8 },
  inputWrapper:    { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgInput, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 14, height: 52 },
  inputIcon:       { marginRight: 10 },
  input:           { color: COLORS.textPrimary, fontSize: 15, flex: 1 },
  eyeBtn:          { padding: 4 },
  submitBtn:       { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  submitGradient:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  submitText:      { color: "#fff", fontSize: 16, fontWeight: "700" },
  divider:         { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 22 },
  dividerLine:     { flex: 1, height: 1, backgroundColor: COLORS.cardBorder },
  dividerText:     { fontSize: 12, color: COLORS.textMuted },
  registerBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(0,255,136,0.08)", borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(0,255,136,0.25)" },
  registerText:    { color: COLORS.safe, fontSize: 15, fontWeight: "700" },
  footer:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28 },
  footerText:      { fontSize: 11, color: COLORS.textMuted },
});
