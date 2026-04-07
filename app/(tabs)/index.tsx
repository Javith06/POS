import { useRouter, useFocusEffect } from "expo-router";
import React, { useState, useCallback } from "react";
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useToast } from "../../components/Toast";
import { Theme } from "../../constants/theme";
import { Fonts } from "../../constants/Fonts";

export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();
  const containerWidth = Math.min(width - 40, 420);

  useFocusEffect(
    useCallback(() => {
      setEmail("");
      setPassword("");
    }, [])
  );

  const handleLogin = () => {
    const adminEmail = "unipro@gmail.com";
    const adminPassword = "786";
    const userEmail = "user123";
    const userPassword = "123";

    if (!email || !password) {
      showToast({ type: "warning", message: "Fields Required", subtitle: "Please enter your email and password" });
      return;
    }

    const isAdmin = email === adminEmail && password === adminPassword;
    const isUser = email.toLowerCase() === userEmail && password === userPassword;

    if (isAdmin || isUser) {
      setEmail("");
      setPassword("");
      router.replace("/(tabs)/category");
      return;
    }

    showToast({ type: "error", message: "Invalid Credentials", subtitle: "Email or password is incorrect" });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgMain} />

      {/* Left decorative panel */}
      <View style={styles.leftPanel}>
        <View style={styles.brandCircle}>
          <Text style={styles.brandEmoji}>☕</Text>
        </View>
        <Text style={styles.brandTagline}>Your Smart{"\n"}Café POS</Text>
        <Text style={styles.brandSub}>Manage orders, tables &amp; sales{"\n"}all in one place.</Text>

        <View style={styles.featureList}>
          {["🍽️  Fast order management", "📊  Real-time sales reports", "🔒  Secure table locking", "🧾  Built-in receipt printing"].map((f, i) => (
            <View key={i} style={styles.featureItem}>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Right login form */}
      <View style={styles.rightPanel}>
        <View style={[styles.loginBox, { width: containerWidth }]}>
          {/* Logo mark */}
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>SC</Text>
          </View>

          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to your POS account</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Username / Email</Text>
            <TextInput
              placeholder="Enter your email"
              placeholderTextColor={Theme.textMuted}
              style={[styles.input, emailFocused && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              placeholder="Enter your password"
              placeholderTextColor={Theme.textMuted}
              secureTextEntry
              style={[styles.input, passwordFocused && styles.inputFocused]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
            />
          </View>

          <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.85}>
            <Text style={styles.loginText}>Sign In</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>Smart Café POS · Secure Login</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: Theme.bgMain,
  },

  /* ── Left Decorative Panel ── */
  leftPanel: {
    flex: 1,
    backgroundColor: Theme.primary,
    padding: 40,
    justifyContent: "center",
    display: "flex",
  },
  brandCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  brandEmoji: { fontSize: 36 },
  brandTagline: {
    color: "#fff",
    fontSize: 32,
    fontFamily: Fonts.black,
    lineHeight: 38,
    marginBottom: 12,
  },
  brandSub: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 15,
    fontFamily: Fonts.regular,
    lineHeight: 22,
    marginBottom: 36,
  },
  featureList: { gap: 12 },
  featureItem: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: Theme.radiusMd,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  featureText: {
    color: "#fff",
    fontFamily: Fonts.medium,
    fontSize: 14,
  },

  /* ── Right Login Panel ── */
  rightPanel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.bgMain,
    padding: 30,
  },
  loginBox: {
    backgroundColor: Theme.bgCard,
    borderRadius: Theme.radiusXl,
    padding: 36,
    borderWidth: 1,
    borderColor: Theme.border,
    ...Theme.shadowLg,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Theme.primaryLight,
    borderWidth: 1.5,
    borderColor: Theme.primaryBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  logoMarkText: {
    color: Theme.primary,
    fontFamily: Fonts.black,
    fontSize: 20,
    letterSpacing: 1,
  },
  title: {
    color: Theme.textPrimary,
    fontSize: 26,
    fontFamily: Fonts.black,
    marginBottom: 4,
  },
  subtitle: {
    color: Theme.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.regular,
    marginBottom: 28,
  },

  /* Inputs */
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    color: Theme.textSecondary,
    fontFamily: Fonts.semiBold,
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Theme.bgInput,
    color: Theme.textPrimary,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Theme.radiusMd,
    fontSize: 15,
    fontFamily: Fonts.regular,
    borderWidth: 1.5,
    borderColor: Theme.border,
  },
  inputFocused: {
    borderColor: Theme.primary,
    backgroundColor: "#fff",
  },

  /* Login Button */
  loginButton: {
    backgroundColor: Theme.primary,
    paddingVertical: 16,
    borderRadius: Theme.radiusMd,
    alignItems: "center",
    marginTop: 8,
    ...Theme.shadowMd,
  },
  loginText: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 16,
    letterSpacing: 0.5,
  },

  footerNote: {
    color: Theme.textMuted,
    fontSize: 12,
    fontFamily: Fonts.regular,
    textAlign: "center",
    marginTop: 20,
  },
});
