import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  SafeAreaView,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fonts } from "@/constants/Fonts";
import { Theme } from "@/constants/theme";
import { AttendanceView } from "@/components/AttendanceView";

type TimeEntryMode = "login" | "attendance";

export default function TimeEntry() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const isMobile = width < 700;

  const [mode, setMode] = useState<TimeEntryMode>("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [staffName, setStaffName] = useState("");
  const [active, setActive] = useState<"user" | "pass" | "staff">("user");

  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const date = time.toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  const clock = time.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const keypad = [
    "1", "2", "3", "Bksp",
    "4", "5", "6", "Space",
    "7", "8", "9", "Clear",
    "0", "00", ".", "Ent",
  ];

  const getValue = () => {
    if (active === "user") return userId;
    if (active === "pass") return password;
    return staffName;
  };

  const setValue = (val: string) => {
    if (active === "user") setUserId(val);
    if (active === "pass") setPassword(val);
    if (active === "staff") setStaffName(val);
  };

  const handleKeyPress = (key: string) => {
    let value = getValue();

    if (key === "Bksp") {
      setValue(value.slice(0, -1));
      return;
    }

    if (key === "Clear") {
      setValue("");
      return;
    }

    if (key === "Space") {
      setValue(value + " ");
      return;
    }

    if (key === "Ent") {
      handleSubmit();
      return;
    }

    setValue(value + key);
  };

  const handleSubmit = () => {
    if (!userId.trim() || !password.trim() || !staffName.trim()) {
      Alert.alert("⚠️ Missing Information", "Please fill in all fields: User ID, Password, and Staff Name", [{ text: "OK" }]);
      return;
    }

    setMode("attendance");
  };

  if (mode === "attendance") {
    return (
      <View style={styles.background}>
        <StatusBar barStyle="dark-content" />
        <SafeAreaView style={styles.container}>
          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => setMode("login")}
            >
              <Ionicons name="arrow-back" size={24} color={Theme.textPrimary} />
            </TouchableOpacity>

            <View style={styles.headerTitle}>
              <Text style={styles.headerTitleMain}>Attendance Tracking</Text>
              <Text style={styles.headerSubtitle}>{staffName}</Text>
            </View>
          </View>

          <AttendanceView 
            employeeId={userId} 
            employeeName={staffName}
            onClose={() => router.back()}
          />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.background}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={Theme.textPrimary} />
          </TouchableOpacity>

          <View style={styles.headerTitle}>
            <Text style={styles.headerTitleMain}>Staff Time Entry</Text>
            <Text style={styles.headerSubtitle}>{date}</Text>
          </View>

          <View style={styles.headerTime}>
            <Ionicons name="time-outline" size={20} color={Theme.success} />
            <Text style={styles.headerClock}>{clock}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isMobile}
        >
          <View style={[styles.content, { flexDirection: "column", alignItems: "center", justifyContent: "center" }]}>
            {/* LOGIN FORM CARD */}
            <View style={[styles.formCard, { width: "100%", maxWidth: 450 }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-circle-outline" size={24} color={Theme.primary} />
                <Text style={styles.cardTitle}>Staff Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>👤 User ID</Text>
                <TextInput
                  style={[styles.input, active === "user" && styles.inputActive]}
                  placeholder="Enter your user ID"
                  placeholderTextColor={Theme.textMuted}
                  value={userId}
                  onChangeText={setUserId}
                  onFocus={() => setActive("user")}
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>🔒 Password</Text>
                <TextInput
                  style={[styles.input, active === "pass" && styles.inputActive]}
                  placeholder="Enter your password"
                  placeholderTextColor={Theme.textMuted}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setActive("pass")}
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>👥 Staff Name</Text>
                <TextInput
                  style={[styles.input, active === "staff" && styles.inputActive]}
                  placeholder="Enter your name"
                  placeholderTextColor={Theme.textMuted}
                  value={staffName}
                  onChangeText={setStaffName}
                  onFocus={() => setActive("staff")}
                  editable={false}
                />
              </View>

              {/* NUMERIC KEYPAD */}
              <View style={styles.keypadGrid}>
                {keypad.map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[
                      styles.key,
                      (k === "Ent") && styles.keyEnter,
                      (k === "Clear" || k === "Bksp") && styles.keyAction,
                    ]}
                    onPress={() => handleKeyPress(k)}
                  >
                    <Text style={[styles.keyText, (k === "Ent") && { color: "#fff" }]}>{k}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* FOOTER ACTION BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
          >
            <Ionicons name="checkmark-done" size={20} color="#fff" />
            <Text style={styles.submitBtnText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: Theme.bgMain },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row", alignItems: "center", paddingVertical: 16, paddingHorizontal: 16,
    borderRadius: 16, marginTop: 16, marginBottom: 10, gap: 12, backgroundColor: Theme.bgCard,
    borderWidth: 1, borderColor: Theme.border, ...Theme.shadowSm,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Theme.bgMuted,
    justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Theme.border,
  },
  headerTitle: { flex: 1 },
  headerTitleMain: { fontSize: 20, fontFamily: Fonts.black, color: Theme.textPrimary, letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 12, fontFamily: Fonts.medium, color: Theme.textSecondary, marginTop: 2 },
  headerTime: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10, backgroundColor: Theme.success + "15", borderWidth: 1, borderColor: Theme.success + "30",
  },
  headerClock: { fontSize: 14, fontFamily: Fonts.bold, color: Theme.success },
  scrollContent: { flexGrow: 1, paddingBottom: 120, paddingHorizontal: 16 },
  content: { gap: 16, justifyContent: "center", alignItems: "center", paddingBottom: 20, width: "100%" },
  formCard: {
    padding: 24, borderRadius: 24, borderWidth: 1, borderColor: Theme.border,
    backgroundColor: Theme.bgCard, ...Theme.shadowLg,
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Theme.border,
  },
  cardTitle: { fontSize: 18, fontFamily: Fonts.black, color: Theme.textPrimary, letterSpacing: 0.3 },
  inputGroup: { marginBottom: 14 },
  label: { fontSize: 11, fontFamily: Fonts.black, color: Theme.textMuted, marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" },
  input: {
    backgroundColor: Theme.bgInput, borderRadius: 12, padding: 14, color: Theme.textPrimary,
    fontSize: 16, fontFamily: Fonts.bold, borderWidth: 1, borderColor: Theme.border,
  },
  inputActive: { borderColor: Theme.primary, backgroundColor: Theme.primary + "05" },
  keypadGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "space-between", marginTop: 10 },
  key: {
    width: "22.5%", aspectRatio: 1, borderRadius: 14, backgroundColor: Theme.bgMuted,
    alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Theme.border,
  },
  keyAction: { backgroundColor: Theme.danger + "10", borderColor: Theme.danger + "30" },
  keyEnter: { backgroundColor: Theme.primary, borderColor: Theme.primary, ...Theme.shadowSm },
  keyText: { color: Theme.textPrimary, fontFamily: Fonts.black, fontSize: 15, letterSpacing: 0.3 },
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 20,
    borderTopWidth: 1, borderTopColor: Theme.border, backgroundColor: Theme.bgCard, ...Theme.shadowLg,
  },
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Theme.primary, paddingVertical: 16, borderRadius: 16, ...Theme.shadowMd,
  },
  submitBtnText: { fontFamily: Fonts.black, fontSize: 16, color: "#fff", letterSpacing: 0.5, textTransform: "uppercase" },
});