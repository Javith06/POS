import { API_URL } from "@/constants/Config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface TodaySummary {
  clockedIn: boolean;
  shiftCompleted: boolean;
  clockInTime: string | null;
  clockOutTime: string | null;
  totalHours: number;
  totalBreakMinutes: number;
  netHours: number;
  isOnBreak: boolean;
}

export default function TimeEntryModal() {
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todaySummary, setTodaySummary] = useState<TodaySummary | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineEntries, setOfflineEntries] = useState<any[]>([]);
  const [showOfflineBadge, setShowOfflineBadge] = useState(false);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load saved credentials and offline entries
  useEffect(() => {
    loadSavedCredentials();
    loadOfflineEntries();
  }, []);

  // Fetch summary when userId changes (including on mount from AsyncStorage)
  useEffect(() => {
    if (userId) {
      fetchTodaySummary();
    }
  }, [userId]);

  const loadSavedCredentials = async () => {
    try {
      const savedUser = await AsyncStorage.getItem("lastUserName");
      const savedUserId = await AsyncStorage.getItem("lastUserId");
      if (savedUser) setUserName(savedUser);
      if (savedUserId) {
        setUserId(savedUserId);
        // Also fetch the staff name for the saved user
        try {
          const res = await fetch(`${API_URL}/api/attendance/getUser`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userName: savedUser }),
          });
          if (res.ok) {
            const data = await res.json();
            setStaffName(data.FullName || "");
          }
        } catch (_) {}
      }
    } catch (error) {
      console.error("Error loading credentials:", error);
    }
  };

  const saveCredentials = async (name: string, id: string) => {
    try {
      await AsyncStorage.setItem("lastUserName", name);
      await AsyncStorage.setItem("lastUserId", id);
    } catch (error) {
      console.error("Error saving credentials:", error);
    }
  };

  const loadOfflineEntries = async () => {
    try {
      const entries = await AsyncStorage.getItem("offlineEntries");
      if (entries) {
        const parsed = JSON.parse(entries);
        setOfflineEntries(parsed);
        setShowOfflineBadge(parsed.length > 0);
      }
    } catch (error) {
      console.error("Error loading offline entries:", error);
    }
  };

  const saveOfflineEntry = async (entry: any) => {
    try {
      const existing = await AsyncStorage.getItem("offlineEntries");
      const entries = existing ? JSON.parse(existing) : [];
      entries.push(entry);
      await AsyncStorage.setItem("offlineEntries", JSON.stringify(entries));
      setOfflineEntries(entries);
      setShowOfflineBadge(true);
    } catch (error) {
      console.error("Error saving offline entry:", error);
    }
  };

  const syncOfflineEntries = async () => {
    if (offlineEntries.length === 0) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/attendance/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: offlineEntries }),
      });

      const result = await response.json();

      if (result.success && result.synced > 0) {
        await AsyncStorage.removeItem("offlineEntries");
        setOfflineEntries([]);
        setShowOfflineBadge(false);
        Alert.alert(
          "Sync Complete",
          `${result.synced} entries synced successfully`,
        );
        fetchTodaySummary();
      }
    } catch (error) {
      console.error("Error syncing offline entries:", error);
      Alert.alert("Sync Failed", "Please check your network connection");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTodaySummary = async () => {
    if (!userId) return;
    try {
      const url = `${API_URL}/api/attendance/summary/${userId}`;
      console.log("Fetching summary:", url);
      const response = await fetch(url);
      const data = await response.json();
      console.log("Summary response:", JSON.stringify(data));
      if (response.ok && data.summary) {
        setTodaySummary(data.summary);
      } else {
        console.warn("Summary fetch failed:", data);
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTodaySummary();
    setRefreshing(false);
  };

  const formattedDate = currentTime.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedTime = currentTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const getUser = async (): Promise<string | null> => {
    if (!userName.trim()) {
      Alert.alert("Error", "Please enter User ID");
      return null;
    }

    setIsLoading(true);
    try {
      console.log("Calling API:", `${API_URL}/api/attendance/getUser`);

      const res = await fetch(`${API_URL}/api/attendance/getUser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "User not found");
      }

      setUserId(data.UserId);
      setStaffName(data.FullName);
      await saveCredentials(userName, data.UserId);
      // Force summary refresh after successful user lookup
      fetchTodaySummary();
      return data.UserId;
    } catch (error: any) {
      Alert.alert("Error", error.message || "User not found");
      setStaffName("");
      setUserId("");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const validatePassword = async () => {
    if (!password) {
      Alert.alert("Error", "Please enter Password");
      return false;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/attendance/validatePassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Invalid password");
      }

      return true;
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid credentials");
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (status: number) => {
    const actionName =
      status === 1
        ? "IN"
        : status === 0
          ? "OUT"
          : status === 4
            ? "BREAK IN"
            : "BREAK OUT";

    if (!userName.trim()) {
      Alert.alert("Error", "Please enter User ID");
      return;
    }

    // Resolve userId — use state or fetch fresh
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const fetchedId = await getUser();
      if (!fetchedId) return;
      resolvedUserId = fetchedId;
    }

    const passwordValid = await validatePassword();
    if (!passwordValid) return;

    setIsLoading(true);

    const entryData = {
      userId: resolvedUserId,  // Use resolved ID, not stale state
      status,
      userName,
      password,
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${API_URL}/api/attendance/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entryData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to save");
      }

      Alert.alert(
        "Success",
        `${actionName} recorded successfully at ${formattedTime}`,
      );

      await fetchTodaySummary();

      if (status === 0) {
        setUserName("");
        setPassword("");
        setStaffName("");
        setUserId("");
      } else {
        setPassword("");
      }
    } catch (error: any) {
      if (
        error.message.includes("Network") ||
        error.message.includes("fetch")
      ) {
        await saveOfflineEntry(entryData);
        Alert.alert(
          "Offline Mode",
          `Action saved offline. Will sync when network returns.\n\nAction: ${actionName}\nTime: ${formattedTime}`,
        );
      } else {
        Alert.alert("Error", error.message || "Failed to record attendance");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonStyle = (status: number) => {
    // If shift is complete, all buttons faded
    if (todaySummary?.shiftCompleted) {
      return [status === 1 || status === 4 ? styles.btnGreen : styles.btnRed, styles.buttonDisabled];
    }

    let baseStyle = status === 1 || status === 4 ? styles.btnGreen : styles.btnRed;
    if (isLoading) return [baseStyle, styles.buttonDisabled];

    if (status === 0 && (!todaySummary || !todaySummary.clockedIn)) {
      return [baseStyle, styles.buttonDisabled];
    }
    if (status === 4 && (!todaySummary || !todaySummary.clockedIn || todaySummary.isOnBreak)) {
      return [baseStyle, styles.buttonDisabled];
    }
    if (status === 3 && (!todaySummary || !todaySummary.isOnBreak)) {
      return [baseStyle, styles.buttonDisabled];
    }
    if (status === 1 && todaySummary && (todaySummary.clockedIn || todaySummary.shiftCompleted)) {
      return [baseStyle, styles.buttonDisabled];
    }
    return baseStyle;
  };

  const isButtonDisabled = (status: number) => {
    if (isLoading) return true;
    // All buttons disabled if shift is fully completed today
    if (todaySummary?.shiftCompleted) return true;

    if (status === 0 && (!todaySummary || !todaySummary.clockedIn)) return true;
    if (status === 4 && (!todaySummary || !todaySummary.clockedIn || todaySummary.isOnBreak)) return true;
    if (status === 3 && (!todaySummary || !todaySummary.isOnBreak)) return true;
    if (status === 1 && todaySummary && (todaySummary.clockedIn || todaySummary.shiftCompleted)) return true;

    return false;
  };

  const getButtonText = (status: number) => {
    return status === 1
      ? "IN"
      : status === 0
        ? "OUT"
        : status === 4
          ? "BREAK IN"
          : "BREAK OUT";
  };

  const SummaryModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showSummary}
      onRequestClose={() => setShowSummary(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Today's Summary</Text>

          {todaySummary ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Status:</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    todaySummary.clockedIn && styles.statusActive,
                  ]}
                >
                  {todaySummary.clockedIn
                    ? todaySummary.isOnBreak
                      ? "On Break"
                      : "Working"
                    : "Not Clocked In"}
                </Text>
              </View>

              {todaySummary.clockInTime && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Clock In:</Text>
                  <Text style={styles.summaryValue}>
                    {new Date(todaySummary.clockInTime).toLocaleTimeString()}
                  </Text>
                </View>
              )}

              {todaySummary.clockOutTime && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Clock Out:</Text>
                  <Text style={styles.summaryValue}>
                    {new Date(todaySummary.clockOutTime).toLocaleTimeString()}
                  </Text>
                </View>
              )}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Hours:</Text>
                <Text style={styles.summaryValue}>
                  {todaySummary.totalHours.toFixed(2)} hrs
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Break Time:</Text>
                <Text style={styles.summaryValue}>
                  {String(todaySummary.totalBreakMinutes)} mins
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelNet}>Net Hours:</Text>
                <Text style={styles.summaryValueNet}>
                  {todaySummary.netHours.toFixed(2)} hrs
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.noDataText}>No data for today</Text>
          )}

          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setShowSummary(false)}
          >
            <Text style={styles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Offline Badge */}
          {offlineEntries.length > 0 && (
            <TouchableOpacity
              style={styles.offlineBadge}
              onPress={syncOfflineEntries}
            >
              <Text style={styles.offlineBadgeText}>
                {offlineEntries.length} pending sync - Tap to sync
              </Text>
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Time <Text style={styles.titleSpan}>Entry</Text>
            </Text>
            <View style={styles.dateTimeContainer}>
              <Text style={styles.dateText}>{formattedDate}</Text>
              <Text style={styles.timeText}>{formattedTime}</Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>User ID</Text>
              <TextInput
                style={styles.input}
                value={userName}
                onChangeText={(text) => {
                  setUserName(text);
                  // Reset all user-specific state when ID changes
                  setUserId("");
                  setStaffName("");
                  setPassword("");
                  setTodaySummary(null);
                }}
                onBlur={getUser}
                placeholder="Enter User ID"
                placeholderTextColor="#999"
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter Password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Staff Name</Text>
              <TextInput
                style={[styles.input, styles.inputReadOnly]}
                value={staffName}
                placeholder="Staff Name"
                placeholderTextColor="#999"
                editable={false}
              />
            </View>
          </View>

          {/* Today's Summary Button */}
          {userId.length > 0 && (
            <TouchableOpacity
              style={styles.summaryBtn}
              onPress={() => setShowSummary(true)}
            >
              <Text style={styles.summaryBtnText}>View Today's Summary</Text>
            </TouchableOpacity>
          )}

          {/* Shift Completed Banner */}
          {todaySummary?.shiftCompleted === true && (
            <View style={styles.shiftDoneBanner}>
              <Text style={styles.shiftDoneText}>✅ Shift completed for today</Text>
              <Text style={styles.shiftDoneSub}>
                {todaySummary.totalHours.toFixed(2)} hrs worked
              </Text>
            </View>
          )}

          {/* Buttons Grid */}
          <View style={styles.buttonGrid}>
            {[1, 0, 4, 3].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.button, getButtonStyle(status)]}
                onPress={() => handleAction(status)}
                disabled={isButtonDisabled(status)}
              >
                <Text style={styles.buttonText}>{getButtonText(status)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Status Indicator */}
          {staffName.length > 0 && todaySummary !== null && (
            <View style={styles.statusBar}>
              <Text style={styles.statusText}>Welcome, {staffName}</Text>
              {todaySummary.isOnBreak === true && (
                <View style={styles.breakBadge}>
                  <Text style={styles.breakBadgeText}>ON BREAK</Text>
                </View>
              )}
            </View>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <SummaryModal />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  offlineBadge: {
    backgroundColor: "#ff9800",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: "center",
  },
  offlineBadgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: 30,
    paddingVertical: 20,
    backgroundColor: "#fff",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#333",
  },
  titleSpan: {
    color: "#4CAF50",
  },
  dateTimeContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  dateText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  timeText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  form: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  inputReadOnly: {
    backgroundColor: "#f9f9f9",
    color: "#666",
  },
  summaryBtn: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  summaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  button: {
    width: "48%",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnGreen: {
    backgroundColor: "#4CAF50",
  },
  btnRed: {
    backgroundColor: "#f44336",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  statusBar: {
    backgroundColor: "#e8f5e9",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  statusText: {
    color: "#4CAF50",
    fontSize: 14,
    fontWeight: "600",
  },
  breakBadge: {
    marginTop: 8,
    backgroundColor: "#ff9800",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  breakBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  shiftDoneBanner: {
    backgroundColor: "#e8f5e9",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#4CAF50",
  },
  shiftDoneText: {
    color: "#2e7d32",
    fontWeight: "bold",
    fontSize: 16,
  },
  shiftDoneSub: {
    color: "#4CAF50",
    fontSize: 13,
    marginTop: 4,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 15,
  },
  loadingText: {
    color: "#fff",
    marginTop: 10,
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "85%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  summaryLabelNet: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  summaryValueNet: {
    fontSize: 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  statusActive: {
    color: "#4CAF50",
    fontWeight: "bold",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#ddd",
    marginVertical: 10,
  },
  noDataText: {
    textAlign: "center",
    color: "#999",
    fontSize: 14,
    paddingVertical: 20,
  },
  modalCloseBtn: {
    backgroundColor: "#2196F3",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  modalCloseText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
