import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  Modal,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OrderItem, useActiveOrdersStore } from "../stores/activeOrdersStore";
import { CartItem, useCartStore } from "../stores/cartStore";
import { holdOrder } from "../stores/heldOrdersStore";
import { useOrderContextStore } from "../stores/orderContextStore";
import { getNextOrderId } from "../stores/orderIdStore";
import { useTableStatusStore } from "../stores/tableStatusStore";
import { Theme } from "../constants/theme";
import { Fonts } from "../constants/Fonts";

const STABLE_EMPTY_ARRAY: any[] = [];

export default function CartScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const [editingItem, setEditingItem] = React.useState<CartItem | null>(null);
  const [editQty, setEditQty] = React.useState(1);
  const [editNote, setEditNote] = React.useState("");

  const orderContext = useOrderContextStore((s) => s.currentOrder);
  const carts = useCartStore((s) => s.carts);
  const currentContextId = useCartStore((s) => s.currentContextId);
  const clearCart = useCartStore((s) => s.clearCart);
  const removeFromCartGlobal = useCartStore((s) => s.removeFromCartGlobal);
  const addToCartGlobal = useCartStore((s) => s.addToCartGlobal);
  const setCartItemsGlobal = useCartStore((s) => s.setCartItems);

  const cart = currentContextId ? carts[currentContextId] || STABLE_EMPTY_ARRAY : STABLE_EMPTY_ARRAY;
  const activeOrders = useActiveOrdersStore((s) => s.activeOrders);
  const appendOrder = useActiveOrdersStore((s) => s.appendOrder);
  const markItemsSent = useActiveOrdersStore((s) => s.markItemsSent);

  const activeOrder = useMemo(() => {
    if (!orderContext) return undefined;
    return activeOrders.find((o) => {
      if (orderContext.orderType === "DINE_IN") {
        return o.context.orderType === "DINE_IN" && o.context.section === orderContext.section && o.context.tableNo === orderContext.tableNo;
      }
      if (orderContext.orderType === "TAKEAWAY") {
        return o.context.orderType === "TAKEAWAY" && o.context.takeawayNo === orderContext.takeawayNo;
      }
      return false;
    });
  }, [activeOrders, orderContext]);

  const displayItems = useMemo(() => {
    const sentItems: (OrderItem | CartItem)[] = activeOrder?.items || [];
    return [...sentItems, ...cart];
  }, [activeOrder, cart]);

  const subtotal = useMemo(() => {
    return displayItems.reduce((sum, item) => sum + (item.price || 0) * item.qty, 0);
  }, [displayItems]);

  const tables = useTableStatusStore((s) => s.tables);
  const updateTableStatus = useTableStatusStore((s) => s.updateTableStatus);

  const currentTableData = useMemo(() => {
    if (orderContext?.orderType !== "DINE_IN") return undefined;
    return tables.find((t) => t.section === orderContext.section && t.tableNo === orderContext.tableNo);
  }, [orderContext, tables]);

  React.useEffect(() => {
    if (!orderContext) router.replace("/(tabs)/category");
  }, [orderContext, router]);

  if (!orderContext) return null;

  const sendOrder = () => {
    const context = orderContext;
    if (!context || cart.length === 0) return;
    let targetOrderId = activeOrder?.orderId || getNextOrderId();
    appendOrder(targetOrderId, context, cart);
    markItemsSent(targetOrderId);
    if (context.orderType === "DINE_IN") {
      updateTableStatus(context.section!, context.tableNo!, targetOrderId, "SENT");
      clearCart();
      router.replace(`/(tabs)/category?section=${context.section}`);
    } else {
      updateTableStatus("TAKEAWAY", context.takeawayNo!, targetOrderId, "SENT");
      clearCart();
      router.replace(`/(tabs)/category?section=TAKEAWAY`);
    }
  };

  const handleEditItemSave = () => {
    if (!editingItem || !currentContextId) return;
    const updatedCart = cart.map(item => item.lineItemId === editingItem.lineItemId ? { ...item, qty: editQty, note: editNote } : item);
    setCartItemsGlobal(currentContextId, updatedCart);
    setEditingItem(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.container, isTablet && styles.containerTablet]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={Theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerContext}>
              {orderContext.orderType === "DINE_IN" ? `Table ${orderContext.tableNo}` : `Order #${orderContext.takeawayNo}`}
            </Text>
            <Text style={styles.headerTitle}>Order Review</Text>
          </View>
          <TouchableOpacity onPress={() => clearCart()} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={displayItems}
          keyExtractor={(i, index) => i.lineItemId + index}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const isSent = "status" in item && item.status === "SENT";
            return (
              <TouchableOpacity activeOpacity={0.7} disabled={isSent} onPress={() => { setEditingItem(item as CartItem); setEditQty(item.qty); setEditNote(item.note || ""); }} style={[styles.itemCard, isSent && styles.sentItemCard]}>
                <View style={styles.itemMain}>
                  <View style={styles.itemHeader}>
                    <Text style={[styles.itemName, isSent && styles.sentItemName]}>{item.name}</Text>
                    {isSent ? (
                      <View style={styles.sentBadge}><Ionicons name="checkmark-circle" size={12} color={Theme.success} /><Text style={styles.sentBadgeText}>SENT</Text></View>
                    ) : (
                      <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW</Text></View>
                    )}
                  </View>

                  {"note" in item && item.note ? <Text style={styles.modifier}>📝 {item.note}</Text> : null}
                  {"spicy" in item && item.spicy && item.spicy !== "Medium" && <Text style={styles.modifier}>🌶 Spicy: {item.spicy}</Text>}

                  <View style={styles.itemFooter}>
                    <Text style={styles.itemQty}>{item.qty} × ${item.price?.toFixed(2)}</Text>
                    <Text style={styles.itemTotal}>${((item.price || 0) * item.qty).toFixed(2)}</Text>
                  </View>
                </View>

                {!isSent && (
                  <View style={styles.itemActions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => addToCartGlobal(item as CartItem)}>
                      <Ionicons name="add" size={20} color={Theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { marginTop: 8 }]} onPress={() => removeFromCartGlobal(item.lineItemId)}>
                      <Ionicons name="remove" size={20} color={Theme.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.footer}>
          <View style={styles.summaryBox}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            {cart.length > 0 ? (
              <>
                <TouchableOpacity style={[styles.footerBtn, styles.holdBtn]} onPress={() => {
                  let targetOrderId = activeOrder?.orderId || getNextOrderId();
                  updateTableStatus(orderContext.section!, orderContext.tableNo!, targetOrderId, 'HOLD');
                  holdOrder(targetOrderId, cart, orderContext);
                  clearCart();
                  router.replace(`/(tabs)/category?section=${orderContext.section}`);
                }}>
                  <Text style={styles.holdBtnText}>Hold</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.footerBtn, styles.sendBtn]} onPress={sendOrder}>
                  <Text style={styles.sendBtnText}>Send Order</Text>
                </TouchableOpacity>
              </>
            ) : activeOrder && (
              <TouchableOpacity style={[styles.footerBtn, styles.checkoutBtn]} onPress={() => router.push("/summary")}>
                <Text style={styles.checkoutBtnText}>Proceed to Payment</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <Modal transparent visible={!!editingItem} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Item</Text>
              <Text style={styles.modalItemName}>{editingItem?.name}</Text>
              
              <View style={styles.qtyContainer}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setEditQty(q => Math.max(1, q - 1))}><Ionicons name="remove" size={24} color={Theme.textPrimary} /></TouchableOpacity>
                <Text style={styles.qtyText}>{editQty}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => setEditQty(q => q + 1)}><Ionicons name="add" size={24} color={Theme.textPrimary} /></TouchableOpacity>
              </View>

              <TextInput style={styles.noteInput} value={editNote} onChangeText={setEditNote} placeholder="Special instructions..." placeholderTextColor={Theme.textMuted} multiline />

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.deleteBtn} onPress={() => { removeFromCartGlobal(editingItem!.lineItemId); setEditingItem(null); }}>
                  <Ionicons name="trash-outline" size={20} color={Theme.danger} />
                  <Text style={styles.deleteBtnText}>Remove</Text>
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditingItem(null)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleEditItemSave}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Theme.bgMain },
  container: { flex: 1 },
  containerTablet: { maxWidth: 600, alignSelf: "center", width: "100%" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 15, backgroundColor: Theme.bgCard, borderBottomWidth: 1, borderBottomColor: Theme.border, ...Theme.shadowSm },
  backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Theme.border },
  headerTitleWrap: { flex: 1, marginLeft: 15 },
  headerContext: { color: Theme.textSecondary, fontFamily: Fonts.bold, fontSize: 12, textTransform: "uppercase" },
  headerTitle: { color: Theme.textPrimary, fontFamily: Fonts.black, fontSize: 18 },
  clearBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: Theme.danger + "10" },
  clearBtnText: { color: Theme.danger, fontFamily: Fonts.bold, fontSize: 13 },
  itemCard: { flexDirection: "row", backgroundColor: Theme.bgCard, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: Theme.border, overflow: "hidden", ...Theme.shadowSm },
  sentItemCard: { backgroundColor: Theme.bgMuted, borderColor: Theme.border },
  itemMain: { flex: 1, padding: 16 },
  itemHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  itemName: { flex: 1, color: Theme.textPrimary, fontFamily: Fonts.black, fontSize: 16, marginRight: 10 },
  sentItemName: { color: Theme.textMuted },
  sentBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: Theme.success + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  sentBadgeText: { color: Theme.success, fontFamily: Fonts.bold, fontSize: 10 },
  newBadge: { backgroundColor: Theme.primary + "15", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  newBadgeText: { color: Theme.primary, fontFamily: Fonts.black, fontSize: 10 },
  modifier: { color: Theme.textSecondary, fontFamily: Fonts.medium, fontSize: 13, marginTop: 4 },
  itemFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 12 },
  itemQty: { color: Theme.textSecondary, fontFamily: Fonts.bold, fontSize: 14 },
  itemTotal: { color: Theme.primary, fontFamily: Fonts.black, fontSize: 18 },
  itemActions: { padding: 12, borderLeftWidth: 1, borderLeftColor: Theme.border, backgroundColor: Theme.bgMuted + "50", justifyContent: "center" },
  actionBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: Theme.bgCard, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Theme.border, ...Theme.shadowSm },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 20, backgroundColor: Theme.bgCard, borderTopWidth: 1, borderTopColor: Theme.border, ...Theme.shadowLg },
  summaryBox: { marginBottom: 15 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  summaryLabel: { color: Theme.textSecondary, fontFamily: Fonts.bold, fontSize: 16 },
  summaryValue: { color: Theme.textPrimary, fontFamily: Fonts.black, fontSize: 24 },
  actionButtons: { flexDirection: "row", gap: 12 },
  footerBtn: { flex: 1, height: 60, borderRadius: 16, justifyContent: "center", alignItems: "center", ...Theme.shadowMd },
  holdBtn: { backgroundColor: Theme.bgMuted, borderWidth: 1, borderColor: Theme.border },
  holdBtnText: { color: Theme.textPrimary, fontFamily: Fonts.black, fontSize: 16 },
  sendBtn: { backgroundColor: Theme.primary },
  sendBtnText: { color: "#fff", fontFamily: Fonts.black, fontSize: 16 },
  checkoutBtn: { backgroundColor: Theme.success },
  checkoutBtnText: { color: "#fff", fontFamily: Fonts.black, fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { backgroundColor: Theme.bgCard, borderRadius: 24, width: "100%", maxWidth: 400, padding: 24, ...Theme.shadowLg, borderWidth: 1, borderColor: Theme.border },
  modalTitle: { color: Theme.textMuted, fontFamily: Fonts.black, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  modalItemName: { color: Theme.textPrimary, fontFamily: Fonts.black, fontSize: 22, marginBottom: 20 },
  qtyContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 30, marginBottom: 25 },
  qtyBtn: { width: 56, height: 56, borderRadius: 16, backgroundColor: Theme.bgMuted, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: Theme.border },
  qtyText: { color: Theme.textPrimary, fontFamily: Fonts.black, fontSize: 28, width: 40, textAlign: "center" },
  noteInput: { backgroundColor: Theme.bgInput, borderRadius: 16, padding: 16, color: Theme.textPrimary, fontFamily: Fonts.bold, fontSize: 15, borderWidth: 1, borderColor: Theme.border, height: 100, textAlignVertical: "top", marginBottom: 25 },
  modalActions: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10 },
  deleteBtnText: { color: Theme.danger, fontFamily: Fonts.bold, fontSize: 14 },
  cancelBtn: { paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, backgroundColor: Theme.bgMuted },
  cancelBtnText: { color: Theme.textSecondary, fontFamily: Fonts.black, fontSize: 14 },
  saveBtn: { paddingHorizontal: 25, paddingVertical: 14, borderRadius: 12, backgroundColor: Theme.primary, ...Theme.shadowSm },
  saveBtnText: { color: "#fff", fontFamily: Fonts.black, fontSize: 14 },
});
