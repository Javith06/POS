import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useToast } from "../../components/Toast";
import { Fonts } from "../../constants/Fonts";
import { Theme } from "../../constants/theme";

export default function Index() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();
  const { showToast } = useToast();
  const { width } = useWindowDimensions();

  useFocusEffect(
    useCallback(() => {
      setEmail("");
      setPassword("");
    }, []),
  );

  const handleLogin = () => {
    const adminEmail = "unipro@gmail.com";
    const adminPassword = "786";
    const userEmail = "user123";
    const userPassword = "123";

    if (!email || !password) {
      showToast({
        type: "warning",
        message: "Fields Required",
        subtitle: "Please enter your email and password",
      });
      return;
    }

    const isAdmin = email === adminEmail && password === adminPassword;
    const isUser =
      email.toLowerCase() === userEmail && password === userPassword;

    if (isAdmin || isUser) {
      setEmail("");
      setPassword("");
      router.replace("/(tabs)/category");
      return;
    }

    showToast({
      type: "error",
      message: "Invalid Credentials",
      subtitle: "Email or password is incorrect",
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Abstract Orange Background */}
      <View style={styles.abstractBg}>
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />
      </View>

      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <View style={styles.centerWrap}>
            <View style={styles.card}>
              <View style={styles.logoContainer}>
                <View style={styles.iconWrap}>
                  <Text style={styles.brandEmoji}>☕</Text>
                </View>
                <Text style={styles.brandTitle}>Smart Café</Text>
                <Text style={styles.brandSubtitle}>
                  Manage Everything. Simply.
                </Text>
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>USERNAME / EMAIL</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      emailFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={emailFocused ? Theme.primary : Theme.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Enter your email"
                      placeholderTextColor={Theme.textMuted}
                      style={[
                        styles.input,
                        Platform.select({ web: { outlineStyle: "none" } }) as any,
                      ]}
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PASSWORD</Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      passwordFocused && styles.inputWrapperFocused,
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={20}
                      color={passwordFocused ? Theme.primary : Theme.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor={Theme.textMuted}
                      secureTextEntry
                      style={[
                        styles.input,
                        Platform.select({ web: { outlineStyle: "none" } }) as any,
                      ]}
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.loginButton}
                  onPress={handleLogin}
                  activeOpacity={0.85}
                >
                  <Text style={styles.loginText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </TouchableOpacity>

                <View style={styles.footerWrap}>
                  <Text style={styles.footerNote}>
                    © 2026 Unipro Softwares SG Pte Ltd. All Rights Reserved.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.primary,
  },
  abstractBg: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  blob1: {
    position: "absolute",
    width: 600,
    height: 600,
    borderRadius: 300,
    backgroundColor: "rgba(255,255,255,0.08)",
    top: -200,
    left: -200,
  },
  blob2: {
    position: "absolute",
    width: 800,
    height: 800,
    borderRadius: 400,
    backgroundColor: "rgba(0,0,0,0.04)",
    bottom: -300,
    right: -200,
  },
  blob3: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: "30%",
    right: -100,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 30,
    padding: 32,
    backgroundColor: "#ffffff",
    ...Theme.shadowLg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: Theme.bgMain,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  brandEmoji: {
    fontSize: 28,
  },
  brandTitle: {
    fontSize: 28,
    fontFamily: Fonts.black,
    color: Theme.textPrimary,
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Theme.textSecondary,
    marginTop: 6,
  },
  formContainer: {
    width: "100%",
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Theme.textSecondary,
    marginBottom: 8,
    letterSpacing: 1,
    paddingLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.bgInput,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 50,
  },
  inputWrapperFocused: {
    backgroundColor: "#fff",
    ...Theme.shadowSm,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Theme.textPrimary,
    fontSize: 15,
    fontFamily: Fonts.medium,
    height: "100%",
  },
  loginButton: {
    height: 50,
    backgroundColor: Theme.primary,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
    shadowColor: Theme.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  loginText: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 16,
  },
  footerWrap: {
    marginTop: 24,
    alignItems: "center",
  },
  footerNote: {
    fontSize: 13,
    fontFamily: "sherrif",
    color: Theme.textMuted,
  },
});
