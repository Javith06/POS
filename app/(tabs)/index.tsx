import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useRef } from "react";
import {
  Animated,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Fonts } from "../../constants/Fonts";
import { Theme } from "../../constants/theme";

export default function Index() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  const router = useRouter();

  useFocusEffect(
    useCallback(() => {
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
    }, [fadeAnim, slideAnim]),
  );

  const handleLogin = () => {
    router.replace("/(tabs)/category");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Layer */}
      <LinearGradient
        colors={[Theme.primary, "#1A1A1A"]}
        style={StyleSheet.absoluteFill}
      >
        <View style={[styles.bgCircle, styles.bgCircle1]} />
        <View style={[styles.bgCircle, styles.bgCircle2]} />
      </LinearGradient>

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centeredContent}>
          <Animated.View
            style={[
              styles.content,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View style={styles.card}>
              <View style={styles.header}>
                <View style={styles.logoBadge}>
                  <Ionicons
                    name="restaurant"
                    size={48}
                    color={Theme.primary}
                  />
                </View>
                <Text style={styles.title}>Smart Cafe POS</Text>
                <Text style={styles.subtitle}>
                  Press below to start your session
                </Text>
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Enter POS</Text>
                <Ionicons name="chevron-forward" size={24} color="#fff" />
              </TouchableOpacity>

              {/* Copyright */}
              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  © 2026 Unipro Softwares SG Pte Ltd
                </Text>
              </View>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.primary,
  },
  safeArea: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  content: {
    width: "100%",
    maxWidth: 420,
    alignItems: "center",
  },
  bgCircle: {
    position: "absolute",
    borderRadius: 999,
  },
  bgCircle1: {
    width: 300,
    height: 300,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: -50,
    left: -50,
  },
  bgCircle2: {
    width: 400,
    height: 400,
    backgroundColor: "rgba(0,0,0,0.05)",
    bottom: -100,
    right: -80,
  },
  card: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 32,
    padding: 40,
    ...Theme.shadowLg,
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoBadge: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: Theme.bgMain,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  title: {
    fontSize: 32,
    fontFamily: Fonts.black,
    color: Theme.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Theme.textSecondary,
    marginTop: 10,
    textAlign: "center",
  },
  button: {
    width: "100%",
    height: 64,
    backgroundColor: Theme.primary,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    gap: 12,
    ...Theme.shadowMd,
    shadowColor: Theme.primary,
  },
  buttonText: {
    color: "#fff",
    fontSize: 20,
    fontFamily: Fonts.black,
  },
  footer: {
    marginTop: 60,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Theme.textMuted,
    opacity: 0.8,
  },
});
