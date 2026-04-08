import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Fonts } from "../constants/Fonts";
import { Theme } from "../constants/theme";
import { useToast } from "../components/Toast";
import { API_URL } from "@/constants/Config";

import {
  findActiveOrder,
  useActiveOrdersStore,
} from "../stores/activeOrdersStore";
import { clearCart } from "../stores/cartStore";
import {
  clearOrderContext,
  getOrderContext,
} from "../stores/orderContextStore";
import { useTableStatusStore } from "../stores/tableStatusStore";
import { useGstStore } from "../stores/gstStore"; 

export default function PaymentScreen() {
  const closeActiveOrder = useActiveOrdersStore((s) => s.closeActiveOrder);
  const clearTable = useTableStatusStore((s) => s.clearTable);
  const router = useRouter();
  const { showToast } = useToast();
  const { width, height } = useWindowDimensions();

  const isMobile = width < 768;
  const isTabletPortrait = width >= 768 && width < 1024 && height > width;
  const showOrderPanel = !isMobile && !isTabletPortrait;

  const context = getOrderContext();
  const activeOrder = context ? findActiveOrder(context) : undefined;

  const cart = useMemo(
    () => (activeOrder ? activeOrder.items : []),
    [activeOrder],
  );

  const discount = activeOrder?.discount;

  const [method, setMethod] = useState("CASH");
  const [cashInput, setCashInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [time, setTime] = useState(new Date());
  const { enabled: gstEnabled, percentage: gstPercentage, registrationNumber: gstRegNo, loadSettings: loadGst } = useGstStore();

  useEffect(() => {
    loadGst();
  }, []);

  /* ================= CALCULATIONS ================= */

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0),
    [cart],
  );

  const discountAmount = useMemo(() => {
    if (!discount?.applied) return 0;
    if (discount.type === "percentage") return (subtotal * discount.value) / 100;
    return discount.value;
  }, [discount, subtotal]);

  const discSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = gstEnabled ? parseFloat((discSubtotal * (gstPercentage / 100)).toFixed(2)) : 0;
  const total = discSubtotal + tax;

  const paidNum = parseFloat(cashInput) || 0;
  const change = Math.max(0, paidNum - total);

  const quickCash = [20, 50, 100, 200, 500, 1000];

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  /* ================= SAVE SALE TO DATABASE ================= */

  const saveSaleToDatabase = async () => {
    try {
      if (!activeOrder?.orderId || !/^#[A-Z0-9]{6}$/.test(activeOrder.orderId)) {
        showToast({ type: "error", message: "Invalid Order ID", subtitle: "Order ID format is invalid" });
        return false;
      }
      
      const saleData = {
        orderId: activeOrder?.orderId,
        orderType: context?.orderType === "DINE_IN" ? "DINE-IN" : context?.orderType || "DINE-IN",
        tableNo: context?.orderType === "TAKEAWAY" ? context?.takeawayNo : context?.tableNo,
        section: context?.section,
        items: cart.map(item => ({
          dishId: item.id,
          name: item.name,
          qty: item.qty,
          price: item.price
        })),
        subTotal: subtotal,
        taxAmount: tax,
        discountAmount: discountAmount,
        discountType: discount?.type || "fixed",
        totalAmount: total,
        paymentMethod: method,
        cashierId: "FFA46DDA-2871-42BB-BE6D-A547AE9C1B88"
      };
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_URL}/api/sales/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(saleData),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      const result = await response.json();
      
      if (response.status === 409) {
        showToast({ type: "error", message: "Duplicate Order ID", subtitle: "This order ID already exists. Please try again." });
        return false;
      }

      if (response.status === 400) {
        showToast({ type: "error", message: "Invalid Order", subtitle: result.error || "Order validation failed" });
        return false;
      }

      if (result.success) {
        return true;
      } else {
        showToast({ type: "error", message: "Payment Failed", subtitle: result.error || "Unable to process payment" });
        return false;
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        showToast({ type: "error", message: "Request Timeout", subtitle: "Server took too long to respond" });
      } else {
        showToast({ type: "error", message: "Payment Error", subtitle: error.message });
      }
      return false;
    }
  };

  /* ================= PAYMENT ================= */

  const confirmPayment = async () => {
    if (method === "CASH" && (paidNum < total && Math.abs(paidNum - total) > 0.01)) {
      showToast({ type: "warning", message: "Insufficient Payment", subtitle: `Please enter at least $${total.toFixed(2)}` });
      return;
    }

    setProcessing(true);

    const saved = await saveSaleToDatabase();
    if (!saved) {
      setProcessing(false);
      return;
    }

    const printBill = () => {
      const dateStr = new Date().toLocaleString();
      let itemsHtml = "";
      cart.forEach((i) => {
        const nameLine = `${i.qty}x ${i.name}`;
        const priceLine = `$${((i.price || 0) * i.qty).toFixed(2)}`;
        itemsHtml += `<div><span style="float:left">${nameLine}</span><span style="float:right">${priceLine}</span><div style="clear:both"></div></div>`;
        const mods = i.modifiers as any[];
        if (mods && mods.length > 0) {
          mods.forEach((mod: any) => {
            itemsHtml += `<div style="color: #444; font-size: 11px; padding-left: 15px;">+ ${mod.ModifierName}</div>`;
          });
        }
      });

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Receipt</title>
            <style>
              body { font-family: 'Courier New', Courier, monospace; width: 300px; margin: 0 auto; padding: 10px; color: #000; font-size: 12px; line-height: 1.4; }
              .text-center { text-align: center; }
              .bold { font-weight: bold; }
              .title { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
              .divider { border-top: 1px dashed #000; margin: 8px 0; }
              .flex-row { display: flex; justify-content: space-between; }
            </style>
          </head>
          <body>
            <div class="text-center">
              <div class="title">SMART CAFE POS</div>
              <div>Tel: +65 1234 5678</div>
              ${gstRegNo ? `<div>GST Reg No: ${gstRegNo}</div>` : ''}
            </div>
            <div class="divider"></div>
            <div>
              <div>Date: ${dateStr}</div>
              <div>Order #: ${activeOrder?.orderId || 'N/A'}</div>
              <div>Method: ${method}</div>
            </div>
            <div class="divider"></div>
            ${itemsHtml}
            <div class="divider"></div>
            <div class="flex-row"><span>Subtotal:</span><span>$${subtotal.toFixed(2)}</span></div>
            ${discountAmount > 0 ? `<div class="flex-row"><span>Discount:</span><span>-$${discountAmount.toFixed(2)}</span></div>` : ''}
            ${gstEnabled ? `<div class="flex-row"><span>GST (${gstPercentage}%):</span><span>$${tax.toFixed(2)}</span></div>` : ''}
            <div class="flex-row bold" style="font-size: 14px; margin-top: 5px;"><span>TOTAL:</span><span>$${total.toFixed(2)}</span></div>
            <div class="divider"></div>
            <div class="flex-row"><span>Paid:</span><span>$${paidNum.toFixed(2)}</span></div>
            <div class="flex-row"><span>Change:</span><span>$${change.toFixed(2)}</span></div>
            <div class="divider"></div>
            <div class="text-center" style="margin-top: 15px;"><div>Thank you!</div></div>
          </body>
        </html>
      `;

      if (Platform.OS === "web") {
        const win = window.open("", "", "width=300,height=600");
        if (win) {
          win.document.write(html);
          win.document.close();
          win.print();
        }
      }
    };

    printBill();

    setTimeout(() => {
      router.replace({
        pathname: "/payment_success",
        params: {
          total: total.toFixed(2),
          paidNum: paidNum.toFixed(2),
          change: change.toFixed(2),
          method,
          orderId: activeOrder?.orderId ?? "",
          tableNo: context?.tableNo ?? "",
          section: context?.section ?? "",
          orderType: context?.orderType ?? "",
        },
      });

      if (activeOrder) closeActiveOrder(activeOrder.orderId);
      if (context) {
        if (context.orderType === "DINE_IN" && context.section && context.tableNo) {
          clearTable(context.section, context.tableNo);
        } else if (context.orderType === "TAKEAWAY" && context.takeawayNo) {
          clearTable("TAKEAWAY", context.takeawayNo);
        }
      }
      clearCart();
      clearOrderContext();
      setProcessing(false);
    }, 800);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.itemRow}>
      <Text style={styles.itemQty}>{item.qty}x</Text>
      <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
      <Text style={styles.itemPrice}>${(item.price * item.qty).toFixed(2)}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={Theme.bgNav} />
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Theme.textPrimary} />
            <Text style={styles.backText}>Back to Summary</Text>
          </TouchableOpacity>

          <View style={styles.orderInfo}>
            <Text style={styles.orderTitle}>Order #{activeOrder?.orderId}</Text>
            <Text style={styles.orderSub}>
              {context?.orderType === "DINE_IN"
                ? `Table ${context?.tableNo} • ${context?.section}`
                : `Takeaway • ${context?.section}`}
            </Text>
            {context?.tableNo && useTableStatusStore.getState().getLockedName(context.tableNo, context.section) && (
              <View style={{ marginTop: 4, backgroundColor: Theme.tableLocked.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: Theme.tableLocked.border, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                <Ionicons name="lock-closed" size={12} color={Theme.tableLocked.border} />
                <Text style={{ color: Theme.tableLocked.border, fontSize: 11, fontFamily: Fonts.black, textTransform: 'uppercase' }}>
                  RESERVED: {useTableStatusStore.getState().getLockedName(context.tableNo, context.section)}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.rightHeader}>
            <Text style={styles.dateTime}>
              {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          </View>
        </View>

        {/* MAIN */}
        <View style={[styles.mainLayout, !showOrderPanel && styles.mobileLayout]}>
          {/* LEFT: TOTALS */}
          <View style={styles.leftPane}>
            <Text style={styles.sectionLabel}>Amount Due</Text>
            <Text style={styles.grandTotal}>${total.toFixed(2)}</Text>

            <View style={styles.breakdown}>
              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>Subtotal</Text>
                <Text style={styles.breakValue}>${subtotal.toFixed(2)}</Text>
              </View>

              {discount?.applied && (
                <View style={styles.breakRow}>
                  <Text style={[styles.breakLabel, { color: Theme.danger }]}>Discount</Text>
                  <Text style={[styles.breakValue, { color: Theme.danger }]}>-${discountAmount.toFixed(2)}</Text>
                </View>
              )}

              <View style={styles.breakRow}>
                <Text style={styles.breakLabel}>GST ({gstPercentage}%)</Text>
                <Text style={styles.breakValue}>${tax.toFixed(2)}</Text>
              </View>
            </View>
          </View>

          {/* CENTER: PAYMENT METHOD & CASH INPUT */}
          <View style={styles.centerPane}>
            <Text style={styles.sectionLabel}>Select Payment Method</Text>
            <View style={styles.methodRow}>
              {[
                { id: "CASH", icon: "money-bill-wave" },
                { id: "CARD", icon: "credit-card" },
                { id: "NETS", icon: "exchange-alt" },
                { id: "PAYNOW", icon: "qrcode" },
              ].map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.methodCard, method === m.id && styles.activeMethod]}
                  onPress={() => setMethod(m.id)}
                  activeOpacity={0.7}
                >
                  <FontAwesome5
                    name={m.icon}
                    size={24}
                    color={method === m.id ? "#fff" : Theme.textMuted}
                  />
                  <Text style={[styles.methodText, method === m.id && { color: "#fff" }]}>{m.id}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {method === "CASH" && (
              <View style={styles.cashSection}>
                <Text style={styles.sectionLabel}>Cash Received</Text>
                <View style={[styles.cashInputBox, { borderColor: Theme.primary }]}>
                  <Text style={styles.currency}>$</Text>
                  <TextInput
                    style={styles.cashInput as any}
                    keyboardType="numeric"
                    value={cashInput}
                    onChangeText={setCashInput}
                    placeholder={`${total.toFixed(2)}`}
                    placeholderTextColor={Theme.textMuted}
                    autoFocus={!isMobile}
                  />
                </View>

                <View style={styles.quickGrid}>
                  {quickCash.map((v) => (
                    <TouchableOpacity
                      key={v}
                      style={styles.quickBtn}
                      onPress={() => setCashInput(v.toFixed(2))}
                    >
                      <Text style={styles.quickText}>${v}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[styles.quickBtn, { backgroundColor: Theme.primaryLight, borderColor: Theme.primary }]}
                    onPress={() => setCashInput(total.toFixed(2))}
                  >
                    <Text style={[styles.quickText, { color: Theme.primary }]}>Exact</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.changeBox}>
                  <Text style={styles.changeLabel}>Change to Return</Text>
                  <Text style={styles.changeValue}>${change.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.confirmBtn, method === "CASH" && paidNum < total && Math.abs(paidNum - total) > 0.01 && styles.disabled]}
              disabled={processing || (method === "CASH" && paidNum < total && Math.abs(paidNum - total) > 0.01)}
              onPress={confirmPayment}
              activeOpacity={0.8}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="#fff" />
                  <Text style={styles.confirmText}>Complete Settlement</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* RIGHT: ORDER SUMMARY (Tablet/Desktop) */}
          {showOrderPanel && (
            <View style={styles.rightPane}>
              <View style={styles.summaryHeader}>
                <Ionicons name="list-outline" size={18} color={Theme.textSecondary} />
                <Text style={styles.receiptTitle}>Order Items</Text>
              </View>

              <FlatList
                data={cart}
                keyExtractor={(item, index) => index.toString()}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                style={styles.itemsList}
              />

              <View style={styles.receiptDivider} />
              <View style={styles.receiptTotalRow}>
                <Text style={styles.receiptTotalLabel}>Total</Text>
                <Text style={styles.receiptTotalValue}>${total.toFixed(2)}</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.bgMain,
  },
  container: {
    flex: 1,
    padding: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Theme.bgMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  backText: {
    color: Theme.textSecondary,
    fontFamily: Fonts.bold,
    fontSize: 13,
  },
  orderInfo: {
    alignItems: "center",
  },
  orderTitle: {
    color: Theme.textPrimary,
    fontFamily: Fonts.black,
    fontSize: 18,
  },
  orderSub: {
    color: Theme.textSecondary,
    fontSize: 12,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  rightHeader: {
    minWidth: 80,
    alignItems: "flex-end",
  },
  dateTime: {
    color: Theme.textMuted,
    fontFamily: Fonts.bold,
  },

  mainLayout: {
    flex: 1,
    flexDirection: "row",
    gap: 20,
  },
  mobileLayout: {
    flexDirection: "column",
  },

  leftPane: {
    flex: 0.8,
    padding: 16,
    borderRadius: 18,
    backgroundColor: Theme.bgCard,
    ...Theme.shadowMd,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  centerPane: {
    flex: 2,
    padding: 16,
    borderRadius: 18,
    backgroundColor: Theme.bgCard,
    ...Theme.shadowLg,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  rightPane: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: Theme.bgCard,
    ...Theme.shadowMd,
    borderWidth: 1,
    borderColor: Theme.border,
  },

  sectionLabel: {
    color: Theme.textSecondary,
    marginBottom: 10,
    fontFamily: Fonts.bold,
    fontSize: 14,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  grandTotal: {
    fontSize: 32,
    fontFamily: Fonts.black,
    color: Theme.primary,
  },

  breakdown: {
    marginTop: 20,
    gap: 12,
  },
  breakRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakLabel: {
    color: Theme.textSecondary,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  breakValue: {
    color: Theme.textPrimary,
    fontSize: 18,
    fontFamily: Fonts.extraBold,
  },

  methodRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 25,
  },
  methodCard: {
    flex: 1,
    height: 60,
    borderRadius: 12,
    backgroundColor: Theme.bgMuted,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Theme.border,
  },
  activeMethod: {
    backgroundColor: Theme.primary,
    borderColor: Theme.primary,
  },
  methodText: {
    marginTop: 6,
    fontFamily: Fonts.black,
    fontSize: 11,
    color: Theme.textSecondary,
  },

  cashSection: {
    marginTop: 10,
  },
  cashInputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Theme.bgInput,
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 2,
    overflow: "hidden", // Prevent outline/input escape
  },
  currency: {
    color: Theme.primary,
    fontSize: 24,
    fontFamily: Fonts.black,
    marginRight: 8,
  },
  cashInput: {
    flex: 1,
    color: Theme.textPrimary,
    fontSize: 28,
    fontFamily: Fonts.black,
    paddingLeft: 8, // Space from the $ symbol
    margin: 0,
    height: "100%",
    ...Platform.select({
      web: {
        outlineWidth: 0,
      },
    }),
  },

  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  quickBtn: {
    backgroundColor: Theme.bgMuted,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    minWidth: "22%",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Theme.border,
  },
  quickText: {
    color: Theme.textPrimary,
    fontFamily: Fonts.black,
    fontSize: 16,
  },

  changeBox: {
    marginBottom: 20,
    backgroundColor: Theme.primaryLight,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Theme.primaryBorder,
  },
  changeLabel: {
    color: Theme.primaryDark,
    fontFamily: Fonts.bold,
    fontSize: 12,
  },
  changeValue: {
    fontSize: 28,
    fontFamily: Fonts.black,
    color: Theme.primary,
  },

  confirmBtn: {
    backgroundColor: Theme.primary,
    height: 56,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    ...Theme.shadowMd,
    marginTop: "auto",
  },
  confirmText: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 18,
  },
  disabled: {
    backgroundColor: Theme.textMuted,
    opacity: 0.6,
  },

  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 15,
  },
  receiptTitle: {
    color: Theme.textPrimary,
    fontFamily: Fonts.black,
    fontSize: 16,
  },
  itemsList: {
    flex: 1,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Theme.border,
  },
  itemQty: {
    width: 35,
    color: Theme.primary,
    fontFamily: Fonts.black,
  },
  itemName: {
    flex: 1,
    color: Theme.textPrimary,
    fontFamily: Fonts.medium,
  },
  itemPrice: {
    color: Theme.textPrimary,
    fontFamily: Fonts.bold,
  },

  receiptDivider: {
    height: 1,
    backgroundColor: Theme.border,
    marginVertical: 15,
  },
  receiptTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  receiptTotalLabel: {
    color: Theme.textPrimary,
    fontFamily: Fonts.black,
    fontSize: 18,
  },
  receiptTotalValue: {
    color: Theme.primary,
    fontFamily: Fonts.black,
    fontSize: 24,
  },
});