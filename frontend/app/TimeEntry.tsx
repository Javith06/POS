import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from "react-native";
import { useToast } from "@/components/Toast";
import { API_URL } from "@/constants/Config";
import { Fonts } from "@/constants/Fonts";

type ActiveField = "user" | "pass" | "staff";
type ShiftState = "UNCLOCKED" | "WORKING" | "ON_BREAK";

export default function TimeEntry() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { showToast } = useToast();

  const isTablet = width < 900;

  const [userId, setUserId] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [staffName, setStaffName] = useState<string>("");
  const [active, setActive] = useState<ActiveField>("user");
  const [shiftState, setShiftState] = useState<ShiftState>("UNCLOCKED");

  const [time, setTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const date = time.toLocaleDateString("en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const clock = time.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const keypad: string[] = [
    "1", "2", "3", "Bksp",
    "4", "5", "6", "Space",
    "7", "8", "9", "Clear",
    "0", "00", ".", "Ent",
  ];

  const getValue = (): string => {
    if (active === "user") return userId;
    if (active === "pass") return password;
    return staffName;
  };

  const setValue = (val: string): void => {
    if (active === "user") setUserId(val);
    if (active === "pass") setPassword(val);
    if (active === "staff") setStaffName(val);
  };

  const handleKeyPress = (key: string): void => {
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
      Alert.alert("Select Action", "Please tap an action button below (IN, OUT, Break).");
      return;
    }

    setValue(value + key);
  };

  const trackAction = async (
    action: "START" | "BREAK_IN" | "BREAK_OUT" | "END",
    nextState: ShiftState
  ) => {
    if (!userId.trim() || !password.trim() || !staffName.trim()) {
      Alert.alert("⚠️ Missing Fields", "Please enter User ID, Password, and Name.", [{ text: "OK" }]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/attendance/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: userId,
          employeeName: staffName,
          action,
          timestamp: new Date().toISOString(),
          businessUnitId: "default",
          userId: "current-user",
        }),
      });

      const result = await response.json();
      if (result.success) {
        showToast({ type: "success", message: `Shift ${action.replace('_', ' ')}` });
        setShiftState(nextState);

        // If clocking out, reset the user interface entirely after a brief delay
        if (action === "END") {
          setTimeout(() => {
            setUserId("");
            setPassword("");
            setStaffName("");
            setActive("user");
          }, 1500);
        }
      } else {
        showToast({ type: "error", message: result.message || `Failed. Please try again.` });
      }
    } catch (err) {
      showToast({ type: "error", message: `Connection Error.` });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.background}>
        
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>

          <Text style={styles.title}>
            SMART <Text style={{ color: "#ea580c" }}>Café</Text>
          </Text>

          <View style={styles.timeWrap}>
            <Ionicons name="time-outline" size={18} color="#ea580c" />
            <Text style={styles.timeText}>
              {date} · {clock}
            </Text>
          </View>
        </View>

        {/* CONTENT */}
        <View
          style={[
            styles.content,
            { flexDirection: isTablet ? "column" : "row" },
          ]}
        >
          {/* LOGIN FORM CARD */}
          <View style={[styles.card, styles.formBox]}>
            <View style={styles.cardHeader}>
              <Ionicons name="person-circle" size={24} color="#ea580c" />
              <Text style={styles.cardTitle}>Staff Gateway</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>User ID</Text>
              <TextInput
                style={[styles.input, active === "user" && styles.inputActive]}
                value={userId}
                onChangeText={setUserId}
                onFocus={() => setActive("user")}
                placeholder="Enter ID"
                placeholderTextColor="#94a3b8"
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, active === "pass" && styles.inputActive]}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                onFocus={() => setActive("pass")}
                placeholder="Enter password"
                placeholderTextColor="#94a3b8"
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Staff Name</Text>
              <TextInput
                style={[styles.input, active === "staff" && styles.inputActive]}
                value={staffName}
                onChangeText={setStaffName}
                onFocus={() => setActive("staff")}
                placeholder="Enter name"
                placeholderTextColor="#94a3b8"
                editable={false}
              />
            </View>

            <View style={styles.actionDivider} />

            {/* ACTION BUTTONS */}
            <View style={styles.buttonsWrap}>
              {shiftState === "UNCLOCKED" && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.btnIn]}
                  onPress={() => trackAction("START", "WORKING")}
                >
                  <Ionicons name="log-in" size={22} color="#fff" />
                  <Text style={styles.btnText}>CLOCK IN</Text>
                </TouchableOpacity>
              )}

              {shiftState === "WORKING" && (
                <View style={styles.rowBtns}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rowActionBtn, styles.btnBreakIn]}
                    onPress={() => trackAction("BREAK_IN", "ON_BREAK")}
                  >
                    <Ionicons name="cafe" size={22} color="#fff" />
                    <Text style={styles.btnText}>START BREAK</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rowActionBtn, styles.btnOut]}
                    onPress={() => trackAction("END", "UNCLOCKED")}
                  >
                    <Ionicons name="log-out" size={22} color="#fff" />
                    <Text style={styles.btnText}>CLOCK OUT</Text>
                  </TouchableOpacity>
                </View>
              )}

              {shiftState === "ON_BREAK" && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.btnBreakOut]}
                  onPress={() => trackAction("BREAK_OUT", "WORKING")}
                >
                  <Ionicons name="play" size={22} color="#fff" />
                  <Text style={styles.btnText}>END BREAK</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* KEYPAD CARD */}
          <View style={[styles.card, styles.keypadBox]}>
            <View style={styles.keypad}>
              {keypad.map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[
                    styles.key,
                    k === "Ent" && styles.keyEnter,
                    (k === "Bksp" || k === "Clear") && styles.keyDanger,
                  ]}
                  onPress={() => handleKeyPress(k)}
                >
                  <Text
                    style={[
                      styles.keyText,
                      k === "Ent" && styles.keyTextLight,
                      (k === "Bksp" || k === "Clear") && styles.keyTextDanger,
                    ]}
                  >
                    {k}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  background: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.black,
    color: "#1e293b",
  },
  timeWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff7ed",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ffedd5",
  },
  timeText: {
    color: "#ea580c",
    fontFamily: Fonts.bold,
    fontSize: 14,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 25,
    width: "100%",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  formBox: {
    width: "100%",
    maxWidth: 420,
  },
  keypadBox: {
    width: "100%",
    maxWidth: 380,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Fonts.black,
    color: "#1e293b",
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    color: "#64748b",
    marginBottom: 6,
    fontSize: 12,
    fontFamily: Fonts.bold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    padding: 16,
    color: "#1e293b",
    fontSize: 16,
    fontFamily: Fonts.bold,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  inputActive: {
    borderColor: "#ea580c",
    backgroundColor: "#fff7ed",
  },
  actionDivider: {
    height: 1,
    backgroundColor: "#ffedd5",
    marginTop: 10,
    marginBottom: 20,
  },
  buttonsWrap: {
    width: "100%",
  },
  rowBtns: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
  },
  actionBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    height: 60,
    borderRadius: 16,
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  rowActionBtn: {
    flex: 1,
  },
  btnText: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  btnIn: {
    backgroundColor: "#ea580c", // Primary Orange
  },
  btnBreakIn: {
    backgroundColor: "#fb923c", // Lighter Orange for Break
  },
  btnBreakOut: {
    backgroundColor: "#ea580c", // Primary Orange
  },
  btnOut: {
    backgroundColor: "#9a3412", // Dark Orange/Brown for Out
  },
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  key: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  keyEnter: {
    backgroundColor: "#ea580c",
    borderColor: "#ea580c",
    shadowColor: "#ea580c",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  keyDanger: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },
  keyText: {
    color: "#1e293b",
    fontFamily: Fonts.black,
    fontSize: 18,
  },
  keyTextLight: {
    color: "#fff",
  },
  keyTextDanger: {
    color: "#ef4444",
  },
});
