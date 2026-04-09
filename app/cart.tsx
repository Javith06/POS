import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Modal,
  TextInput,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Fonts } from "../constants/Fonts";
import { Theme } from "../constants/theme";
import { useToast } from "../components/Toast";

import { OrderItem, useActiveOrdersStore } from "../stores/activeOrdersStore";
import { CartItem, useCartStore } from "../stores/cartStore";
import { useOrderContextStore } from "../stores/orderContextStore";
import { getNextOrderId } from "../stores/orderIdStore";
import { useTableStatusStore } from "../stores/tableStatusStore";
import { holdOrder } from "../stores/heldOrdersStore";

export default function CartScreen() {
  const router = useRouter();
  const { showToast } = useToast();

  const [showCancelModal, setShowCancelModal] = React.useState(false);
  const [cancelPassword, setCancelPassword] = React.useState("");

  const [editingItem, setEditingItem] = React.useState<CartItem | null>(null);
  const [editQty, setEditQty] = React.useState(1);
  const [editNote, setEditNote] = React.useState("");

  const orderContext = useOrderContextStore((state) => state.currentOrder);
  const carts = useCartStore((state) => state.carts);
  const currentContextId = useCartStore((state) => state.currentContextId);
  const removeFromCartGlobal = useCartStore((state) => state.removeFromCartGlobal);
  const addToCartGlobal = useCartStore((state) => state.addToCartGlobal);
  const clearCart = useCartStore((state) => state.clearCart);
  const setCartItemsGlobal = useCartStore((state) => state.setCartItems);

  const cart = useMemo(() => {
    return (currentContextId && carts[currentContextId]) || [];
  }, [carts, currentContextId]);

  const activeOrders = useActiveOrdersStore((state) => state.activeOrders);
  const appendOrder = useActiveOrdersStore((state) => state.appendOrder);
  const markItemsSent = useActiveOrdersStore((state) => state.markItemsSent);
  const closeActiveOrder = useActiveOrdersStore((state) => state.closeActiveOrder);

  const tables = useTableStatusStore((s) => s.tables);
  const updateTableStatus = useTableStatusStore((s) => s.updateTableStatus);

  const activeOrder = useMemo(() => {
    if (!orderContext) return undefined;

    return activeOrders.find((o) => {
      if (orderContext.orderType === "DINE_IN") {
        return (
          o.context.orderType === "DINE_IN" &&
          o.context.section === orderContext.section &&
          o.context.tableNo === orderContext.tableNo
        );
      }
      if (orderContext.orderType === "TAKEAWAY") {
        return (
          o.context.orderType === "TAKEAWAY" &&
          o.context.takeawayNo === orderContext.takeawayNo
        );
      }
      return false;
    });
  }, [activeOrders, orderContext]);

  const displayItems = useMemo(() => {
    const sentItems: (OrderItem | CartItem)[] = activeOrder?.items || [];
    return [...sentItems, ...cart].filter(Boolean); // Filter out any null values
  }, [activeOrder, cart]);

  const subtotal = useMemo(() => {
    return displayItems.reduce((sum, item) => {
      if (!item) return sum;
      return sum + (item.price || 0) * item.qty;
    }, 0);
  }, [displayItems]);

  const taxRate = 0; 
  const taxAmount = subtotal * taxRate;
  const payableAmount = subtotal + taxAmount;

  const currentTableData = useMemo(() => {
    if (orderContext?.orderType !== "DINE_IN") return undefined;
    return tables.find(t => t.section === orderContext.section && t.tableNo === orderContext.tableNo);
  }, [orderContext, tables]);

  React.useEffect(() => {
    if (!orderContext) router.replace("/(tabs)/category");
  }, [orderContext]);

  if (!orderContext) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.emptyText}>No Active Order Context</Text>
      </View>
    );
  }

  const handleCancelOrder = () => {
    if (cancelPassword !== "786") {
      showToast({ type: "error", message: "Incorrect Password", subtitle: "Admin password required to cancel" });
      return;
    }

    if (activeOrder) closeActiveOrder(activeOrder.orderId);
    clearCart();
    if (orderContext.orderType === "DINE_IN" && orderContext.section && orderContext.tableNo) {
      updateTableStatus(orderContext.section, orderContext.tableNo, "", "EMPTY");
    }
    
    setShowCancelModal(false);
    setCancelPassword("");
    router.replace("/(tabs)/category");
  };

  const handleEditItemSave = () => {
    if (!editingItem || !currentContextId) return;
    
    const updatedCart = cart.map(item => {
      if (item && item.lineItemId === editingItem.lineItemId) {
        return { ...item, qty: editQty, note: editNote };
      }
      return item;
    });

    setCartItemsGlobal(currentContextId, updatedCart);
    setEditingItem(null);
  };

  const handleEditItemDelete = () => {
    if (!editingItem) return;
    removeFromCartGlobal(editingItem.lineItemId);
    setEditingItem(null);
  };

  const sendOrder = () => {
    const context = orderContext;
    if (!context || cart.length === 0) return;

    let targetOrderId = activeOrder?.orderId;
    if (!targetOrderId) {
      targetOrderId = getNextOrderId();
    }

    appendOrder(targetOrderId, context, cart);
    markItemsSent(targetOrderId);

    if (context.orderType === "DINE_IN") {
      updateTableStatus(context.section!, context.tableNo!, targetOrderId, 'SENT', undefined, undefined, payableAmount);
      clearCart();
      router.replace(`/(tabs)/category?section=${context.section}`);
    } else if (context.orderType === "TAKEAWAY") {
      updateTableStatus("TAKEAWAY", context.takeawayNo!, targetOrderId, 'SENT', undefined, undefined, payableAmount);
      clearCart();
      router.replace(`/(tabs)/category?section=TAKEAWAY`);
    } else {
      clearCart();
      router.replace("/(tabs)/category");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#1e293b" />
      <View style={styles.container}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#f8fafc" />
            </TouchableOpacity>
            
            <View>
              {orderContext.orderType === "DINE_IN" && (
                <Text style={styles.contextText}>
                  Table {orderContext.tableNo} · {orderContext.section?.replace("_", " ")}
                </Text>
              )}
              {orderContext.orderType === "TAKEAWAY" && (
                <Text style={styles.contextText}>
                  Takeaway · #{orderContext.takeawayNo}
                </Text>
              )}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              style={[styles.topActionBtn, { backgroundColor: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.25)" }]}
              onPress={() => setShowCancelModal(true)}
            >
              <Ionicons name="close-circle-outline" size={16} color="#fca5a5" />
              <Text style={[styles.topBtnText, { color: "#fca5a5" }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.topActionBtn, { backgroundColor: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.1)" }]}
              onPress={() => clearCart()}
            >
              <Ionicons name="trash-outline" size={16} color="#94a3b8" />
              <Text style={[styles.topBtnText, { color: "#94a3b8" }]}>Clear</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.cartTitleRow}>
          <Text style={styles.title}>ORDER</Text>
          {displayItems.length > 0 && (
            <View style={styles.itemCountBadge}>
              <Text style={styles.itemCountText}>{displayItems.length}</Text>
            </View>
          )}
        </View>

        <FlatList
          data={displayItems}
          keyExtractor={(i, index) => i ? i.lineItemId + index : `null-${index}`}
          contentContainerStyle={{ paddingBottom: 150 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Cart is Empty</Text>
          }
          renderItem={({ item }) => {
            if (!item) return null;
            const isSent = "status" in item && item.status === "SENT";
            const borderColor = isSent ? "rgba(74,222,128,0.35)" : "#3b82f6";

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={isSent}
                onPress={() => {
                  setEditingItem(item as CartItem);
                  setEditQty(item.qty);
                  setEditNote(item.note || "");
                }}
              >
                <View style={[
                  styles.row,
                  { borderLeftColor: borderColor, borderLeftWidth: 3 },
                  isSent && { opacity: 0.65 },
                ]}>
                  <View style={styles.itemInfo}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={[styles.name, isSent && styles.sentName]} numberOfLines={1}>
                        {item.name}
                      </Text>

                      {isSent ? (
                        <View style={styles.badgeRow}>
                          <Ionicons name="checkmark-circle" size={13} color="#4ade80" />
                          <Text style={styles.sentBadgeText}>SENT</Text>
                        </View>
                      ) : (
                        <View style={styles.badgeRow}>
                          <Ionicons name="ellipse" size={8} color="#60a5fa" />
                          <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                      )}
                    </View>

                    {/* MODIFIERS */}
                    <View style={styles.modifierContainer}>
                      {item.spicy && item.spicy !== "Medium" && <Text style={styles.modifierText}>Spicy: {item.spicy}</Text>}
                      {item.oil && item.oil !== "Normal" && <Text style={styles.modifierText}>Oil: {item.oil}</Text>}
                      {item.salt && item.salt !== "Normal" && <Text style={styles.modifierText}>Salt: {item.salt}</Text>}
                      {item.sugar && item.sugar !== "Normal" && <Text style={styles.modifierText}>Sugar: {item.sugar}</Text>}
                      {item.note && <Text style={styles.modifierText}>📝 {item.note}</Text>}
                      {item.modifiers && Array.isArray(item.modifiers) && item.modifiers.map((mod: any, idx: number) => (
                        <Text key={`mod-${idx}`} style={styles.modifierText}>
                          + {mod.ModifierName}{mod.Price ? ` ($${mod.Price.toFixed(2)})` : ""}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.itemFooter}>
                      <Text style={styles.qty}>×{item.qty}</Text>
                      <Text style={styles.price}>${((item.price || 0) * item.qty).toFixed(2)}</Text>
                    </View>
                  </View>

                  {!isSent && (
                    <View style={styles.actionRow}>
                      <Pressable
                        style={styles.actionBtn}
                        onPress={() => removeFromCartGlobal(item.lineItemId!)}
                      >
                        <Ionicons name="remove" size={18} color="#f3f4f6" />
                      </Pressable>

                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: "rgba(34,197,94,0.15)" }]}
                        onPress={() => {
                          const { qty, lineItemId, ...rest } = item as CartItem;
                          addToCartGlobal(rest);
                        }}
                      >
                        <Ionicons name="add" size={18} color="#4ade80" />
                      </Pressable>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.bottomBlock}>
          <View style={styles.subtotalCard}>
            <Text style={styles.subtotalLabel}>SUBTOTAL</Text>
            <Text style={styles.subtotalAmount}>${subtotal.toFixed(2)}</Text>
          </View>

          <View style={styles.checkoutRow}>
            {cart.length > 0 && (
              <>
                <Pressable
                  style={[styles.checkoutBtn, { backgroundColor: "#3b82f6" }]}
                  onPress={() => {
                    let targetOrderId = activeOrder?.orderId;
                    if (!targetOrderId) targetOrderId = getNextOrderId();

                    if (orderContext.orderType === "DINE_IN") {
                      updateTableStatus(orderContext.section!, orderContext.tableNo!, targetOrderId, 'HOLD', undefined, undefined, payableAmount);
                      holdOrder(targetOrderId, cart, orderContext);
                      clearCart();
                      router.replace(`/(tabs)/category?section=${orderContext.section}`);
                    } else if (orderContext.orderType === "TAKEAWAY") {
                      updateTableStatus("TAKEAWAY", orderContext.takeawayNo!, targetOrderId, 'HOLD', undefined, undefined, payableAmount);
                      holdOrder(targetOrderId, cart, orderContext);
                      clearCart();
                      router.replace(`/(tabs)/category?section=TAKEAWAY`);
                    } else {
                      clearCart();
                      router.replace("/(tabs)/category");
                    }
                  }}
                >
                  <Ionicons name="pause-circle-outline" size={18} color="#fff" />
                  <Text style={styles.checkoutBtnText}>Hold</Text>
                </Pressable>

                <Pressable
                  style={[styles.checkoutBtn, { backgroundColor: "#22c55e" }]}
                  onPress={sendOrder}
                >
                  <Ionicons name="send-outline" size={18} color="#052b12" />
                  <Text style={[styles.checkoutBtnText, { color: "#052b12" }]}>Send</Text>
                </Pressable>
              </>
            )}

            {cart.length === 0 && activeOrder && (
              <>
                {(!currentTableData || currentTableData.status === 'SENT' || currentTableData.status === 'HOLD') ? (
                  <Pressable
                    style={[styles.checkoutBtn, { backgroundColor: "#f59e0b" }]}
                    onPress={() => {
                      if (orderContext.orderType === "DINE_IN") {
                        updateTableStatus(orderContext.section!, orderContext.tableNo!, activeOrder.orderId, 'BILL_REQUESTED', undefined, undefined, payableAmount);
                        router.replace(`/(tabs)/category?section=${orderContext.section}`);
                      } else {
                        router.push("/summary");
                      }
                    }}
                  >
                    <Ionicons name="receipt-outline" size={18} color="#fff" />
                    <Text style={styles.checkoutBtnText}>Checkout</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[styles.checkoutBtn, { backgroundColor: "#0ea5e9" }]}
                    onPress={() => router.push("/summary")}
                  >
                    <Ionicons name="arrow-forward-circle-outline" size={18} color="#fff" />
                    <Text style={styles.checkoutBtnText}>Proceed</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </View>
      </View>

      {/* CANCEL MODAL */}
      <Modal transparent visible={showCancelModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Order?</Text>
            <Text style={styles.modalDesc}>Please enter admin password to cancel.</Text>
            <TextInput
              style={styles.modalInput}
              secureTextEntry
              autoFocus
              keyboardType="number-pad"
              value={cancelPassword}
              onChangeText={setCancelPassword}
              placeholder="Admin Password"
              placeholderTextColor="#6b7280"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtnCancel} onPress={() => { setShowCancelModal(false); setCancelPassword(""); }}>
                <Text style={styles.modalBtnTextCancel}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnConfirm} onPress={handleCancelOrder}>
                <Text style={styles.modalBtnTextConfirm}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT ITEM MODAL */}
      <Modal transparent visible={!!editingItem} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentEdit}>
            <Text style={styles.modalTitle}>Editing {editingItem?.name}</Text>
            
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 15 }}>
              <Text style={{ color: "#fff", fontSize: 16 }}>Quantity</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
                <TouchableOpacity 
                  style={[styles.minus, { width: 40, height: 40 }]} 
                  onPress={() => {
                    if (editQty === 1) {
                      handleEditItemDelete();
                    } else {
                      setEditQty(q => q - 1);
                    }
                  }}
                >
                  <Ionicons name="remove" size={20} color="#fff" />
                </TouchableOpacity>
                <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold", width: 30, textAlign: "center" }}>
                  {editQty}
                </Text>
                <TouchableOpacity 
                  style={[styles.plus, { width: 40, height: 40 }]} 
                  onPress={() => setEditQty(q => q + 1)}
                >
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={{ color: "#9ca3af", fontSize: 14, marginTop: 10, marginBottom: 5 }}>Special Instructions:</Text>
            <TextInput
              style={[styles.modalInput, { marginBottom: 15 }]}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="e.g. Less spicy, no onions"
              placeholderTextColor="#6b7280"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalBtnCancel, { backgroundColor: "rgba(239, 68, 68, 0.2)" }]} 
                onPress={handleEditItemDelete}
              >
                <Text style={[styles.modalBtnTextCancel, { color: "#ef4444" }]}>Delete Item</Text>
              </TouchableOpacity>
              
              <View style={{ flexDirection: "row", gap: 10 }}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setEditingItem(null)}>
                  <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtnConfirm, { backgroundColor: "#3b82f6" }]} onPress={handleEditItemSave}>
                  <Text style={styles.modalBtnTextConfirm}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0f172a", // Dark background to match sidebar
  },
  container: { flex: 1, padding: 16 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    borderRadius: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  topActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  topBtnText: { fontFamily: Fonts.bold, fontSize: 13 },
  contextText: { color: "#4ade80", fontSize: 15, fontFamily: Fonts.semiBold },
  cartTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, marginTop: 4 },
  title: { color: "#f1f5f9", fontSize: 20, fontFamily: Fonts.black, letterSpacing: 1 },
  itemCountBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  itemCountText: { color: "#94a3b8", fontFamily: Fonts.bold, fontSize: 13 },
  emptyText: { color: "#6b7280", fontSize: 16, textAlign: "center", marginTop: 40, fontFamily: Fonts.medium },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingLeft: 16,
    paddingRight: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  itemInfo: { flex: 1, paddingRight: 8 },
  name: { color: "#f3f4f6", fontFamily: Fonts.extraBold, fontSize: 16, flex: 1 },
  sentName: { color: "#6b7280" },
  badgeRow: { flexDirection: "row", alignItems: "center", marginLeft: 8 },
  sentBadgeText: { color: "#4ade80", fontSize: 11, fontFamily: Fonts.extraBold, marginLeft: 3 },
  newBadgeText: { color: "#93c5fd", fontSize: 11, fontFamily: Fonts.extraBold, marginLeft: 3 },
  itemFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  qty: { color: "#94a3b8", fontSize: 14, fontFamily: Fonts.semiBold },
  price: { color: "#22c55e", fontFamily: Fonts.black, fontSize: 16 },
  actionRow: { flexDirection: "row", gap: 12, alignItems: 'center' },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  bottomBlock: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "#1e293b",
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  subtotalCard: {
    backgroundColor: "rgba(15,23,42,0.8)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  subtotalLabel: {
    color: "#64748b",
    fontFamily: Fonts.semiBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  subtotalAmount: {
    color: "#4ade80",
    fontFamily: Fonts.black,
    fontSize: 24,
  },
  checkoutRow: { flexDirection: "row", gap: 10 },
  checkoutBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  checkoutBtnText: { color: "#fff", fontFamily: Fonts.black, fontSize: 16 },
  modifierContainer: {
    marginTop: 6,
    marginBottom: 6,
    paddingLeft: 4,
  },
  modifierText: {
    color: "#9ca3af",
    fontSize: 13,
    fontFamily: Fonts.medium,
    marginTop: 2,
  },
  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#1e293b",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalContentEdit: {
    backgroundColor: "#1e293b",
    padding: 24,
    borderRadius: 16,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  modalDesc: {
    color: "#9ca3af",
    fontSize: 14,
    marginBottom: 20,
    fontFamily: Fonts.regular,
  },
  modalInput: {
    backgroundColor: "rgba(0,0,0,0.4)",
    color: "#fff",
    padding: 14,
    borderRadius: 8,
    fontSize: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 24,
    fontFamily: Fonts.regular,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalBtnCancel: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  modalBtnTextCancel: {
    color: "#fff",
    fontFamily: Fonts.bold,
  },
  modalBtnConfirm: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#ef4444",
  },
  modalBtnTextConfirm: {
    color: "#fff",
    fontFamily: Fonts.bold,
  },
  minus: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  plus: {
    backgroundColor: "rgba(59, 130, 246, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
});
