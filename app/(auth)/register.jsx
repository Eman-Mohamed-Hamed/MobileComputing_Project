import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

// ─── Defined OUTSIDE the screen component so they are stable across re-renders ───

function PasswordStrength({ password }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 6)            score++;
  if (password.length >= 10)           score++;
  if (/[A-Z]/.test(password))          score++;
  if (/[0-9]/.test(password))          score++;
  if (/[^A-Za-z0-9]/.test(password))  score++;

  const { label, color } =
    score <= 1 ? { label: "Weak",   color: COLORS.danger  } :
    score <= 3 ? { label: "Medium", color: COLORS.warning } :
                 { label: "Strong", color: COLORS.safe    };

  return (
    <View style={{ marginTop: 8 }}>
      <View style={{ flexDirection: "row", gap: 4 }}>
        {[1,2,3,4,5].map(i => (
          <View
            key={i}
            style={{ flex: 1, height: 3, borderRadius: 2,
              backgroundColor: i <= score ? color : "rgba(255,255,255,0.1)" }}
          />
        ))}
      </View>
      <Text style={{ color, fontSize: 11, marginTop: 4 }}>{label}</Text>
    </View>
  );
}

function InputField({ label, value, onChange, placeholder, icon, error, keyboardType,
                      secureTextEntry, rightElement }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrapper, error && styles.inputError]}>
        <Ionicons
          name={icon}
          size={18}
          color={error ? COLORS.danger : COLORS.textSecondary}
          style={styles.inputIcon}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={keyboardType || "default"}
        />
        {rightElement}
      </View>
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const router    = useRouter();
  const { login } = useAuth();

  const [username,    setUsername]    = useState("");
  const [email,       setEmail]       = useState("");
  const [password,    setPassword]    = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const validate = () => {
    const errs = {};
    if (!username.trim())           errs.username = "Username is required";
    else if (username.length < 3)   errs.username = "At least 3 characters";
    if (!email.trim())              errs.email    = "Email is required";
    else if (!email.includes("@"))  errs.email    = "Enter a valid email";
    if (!password)                  errs.password = "Password is required";
    else if (password.length < 6)   errs.password = "At least 6 characters";
    if (password !== confirmPass)   errs.confirm  = "Passwords do not match";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async () => {
    setError("");
    if (!validate()) { shake(); return; }
    setLoading(true);
    try {
      const data = await apiPost("/auth/register", {
        username: username.trim(),
        email:    email.trim().toLowerCase(),
        password,
      });
      await login(data.token, data.user);
      router.replace("/(main)");
    } catch (e) {
      setError(e.message || "Registration failed. Please try again.");
      shake();
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={[COLORS.bg, "#0d1333", COLORS.bgSecondary]} style={styles.gradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>

            {/* Header */}
            <View style={styles.header}>
              <LinearGradient colors={[COLORS.safe, "#00cc88"]} style={styles.logoGradient}>
                <MaterialCommunityIcons name="shield-plus" size={44} color={COLORS.bg} />
              </LinearGradient>
              <Text style={styles.title}>CREATE ACCOUNT</Text>
              <Text style={styles.subtitle}>Join QR Guard to stay protected</Text>
            </View>

            {/* Card */}
            <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>

              {!!error && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.danger} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <InputField
                label="USERNAME"
                value={username}
                onChange={setUsername}
                placeholder="Choose a username"
                icon="person-outline"
                error={fieldErrors.username}
              />

              <InputField
                label="EMAIL ADDRESS"
                value={email}
                onChange={setEmail}
                placeholder="Enter your email"
                icon="mail-outline"
                keyboardType="email-address"
                error={fieldErrors.email}
              />

              {/* Password with strength meter */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>PASSWORD</Text>
                <View style={[styles.inputWrapper, fieldErrors.password && styles.inputError]}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={18}
                    color={fieldErrors.password ? COLORS.danger : COLORS.textSecondary}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="Create a password"
                    placeholderTextColor={COLORS.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPass(v => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPass ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
                {!!fieldErrors.password && (
                  <Text style={styles.fieldError}>{fieldErrors.password}</Text>
                )}
                <PasswordStrength password={password} />
              </View>

              {/* Confirm password */}
              <InputField
                label="CONFIRM PASSWORD"
                value={confirmPass}
                onChange={setConfirmPass}
                placeholder="Re-enter your password"
                icon="lock-closed-outline"
                secureTextEntry={!showConfirm}
                error={fieldErrors.confirm}
                rightElement={
                  <TouchableOpacity onPress={() => setShowConfirm(v => !v)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showConfirm ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                }
              />

              {/* Submit */}
              <TouchableOpacity
                style={styles.submitBtn}
                onPress={handleRegister}
                activeOpacity={0.8}
                disabled={loading}
              >
                <LinearGradient colors={[COLORS.safe, "#00cc88"]} style={styles.submitGradient}>
                  {loading
                    ? <ActivityIndicator color={COLORS.bg} />
                    : <>
                        <MaterialCommunityIcons name="shield-check" size={20} color={COLORS.bg} />
                        <Text style={[styles.submitText, { color: COLORS.bg }]}>Create Account</Text>
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>Already registered?</Text>
                <View style={styles.dividerLine} />
              </View>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={() => router.replace("/(auth)/login")}
                activeOpacity={0.8}
              >
                <Text style={styles.loginText}>Sign In Instead</Text>
                <Ionicons name="log-in-outline" size={16} color={COLORS.accent} />
              </TouchableOpacity>

            </Animated.View>

            <View style={styles.footer}>
              <MaterialCommunityIcons name="lock-check" size={13} color={COLORS.textMuted} />
              <Text style={styles.footerText}>Passwords are hashed with PBKDF2-SHA256</Text>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: COLORS.bg },
  gradient:      { flex: 1 },
  scroll:        { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 },
  backBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.08)", justifyContent: "center", alignItems: "center", marginBottom: 16 },
  header:        { alignItems: "center", marginBottom: 28 },
  logoGradient:  { width: 80, height: 80, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 14 },
  title:         { fontSize: 24, fontWeight: "900", color: COLORS.textPrimary, letterSpacing: 4, marginBottom: 6 },
  subtitle:      { fontSize: 14, color: COLORS.textSecondary },
  card:          { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, borderWidth: 1, borderColor: COLORS.cardBorder },
  errorBanner:   { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,68,68,0.1)", borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,68,68,0.3)" },
  errorText:     { color: COLORS.danger, fontSize: 13, flex: 1 },
  inputGroup:    { marginBottom: 16 },
  label:         { fontSize: 10, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 1.5, marginBottom: 8 },
  inputWrapper:  { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.bgInput, borderRadius: 12, borderWidth: 1, borderColor: COLORS.cardBorder, paddingHorizontal: 14, height: 52 },
  inputError:    { borderColor: "rgba(255,68,68,0.5)" },
  inputIcon:     { marginRight: 10 },
  input:         { color: COLORS.textPrimary, fontSize: 15 },
  eyeBtn:        { padding: 4 },
  fieldError:    { color: COLORS.danger, fontSize: 11, marginTop: 5 },
  submitBtn:     { borderRadius: 14, overflow: "hidden", marginTop: 8 },
  submitGradient:{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16 },
  submitText:    { fontSize: 16, fontWeight: "700" },
  divider:       { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  dividerLine:   { flex: 1, height: 1, backgroundColor: COLORS.cardBorder },
  dividerText:   { fontSize: 12, color: COLORS.textMuted },
  loginBtn:      { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "rgba(0,102,255,0.08)", borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: "rgba(0,102,255,0.25)" },
  loginText:     { color: COLORS.accent, fontSize: 15, fontWeight: "700" },
  footer:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 24 },
  footerText:    { fontSize: 11, color: COLORS.textMuted },
});
