import { API_URL } from "@/constants/Config";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CartSidebar from "../../components/CartSidebar";
import { Fonts } from "../../constants/Fonts";
import { Theme } from "../../constants/theme";
import {
  addToCartGlobal,
  getContextId,
  setCurrentContext,
  useCartStore,
} from "../../stores/cartStore";
import { useOrderContextStore } from "../../stores/orderContextStore";

// --- COMPONENTS ---

const NavRail = () => {
  const router = useRouter();
  const navItems = [
    { id: "home", icon: "home-outline", label: "Home", active: true },
    { id: "tables", icon: "grid-outline", label: "Tables" },
    { id: "settings", icon: "settings-outline", label: "Settings" },
  ];

  return (
    <View style={styles.rail}>
      <View style={styles.railTop}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.railItem, item.active && styles.railItemActive]}
          >
            <Ionicons
              name={item.icon as any}
              size={22}
              color={item.active ? Theme.primary : Theme.textSecondary}
            />
            <Text
              style={[styles.railLabel, item.active && styles.railLabelActive]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.railBottom}>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={() => router.replace("/")}
        >
          <Ionicons
            name="log-out-outline"
            size={22}
            color={Theme.textSecondary}
          />
          <Text style={styles.railLabel}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const DishCard = ({
  dish,
  onPress,
  width,
  cartQty = 0,
}: {
  dish: any;
  onPress: () => void;
  width: number;
  cartQty?: number;
}) => {
  return (
    <TouchableOpacity style={[styles.card, { width }]} onPress={onPress}>
      {cartQty > 0 && (
        <View style={styles.qtyBadge}>
          <Text style={styles.qtyBadgeText}>{cartQty}</Text>
        </View>
      )}
      <View style={styles.dishImageWrap}>
        {dish.ImageBase64 ? (
          <Image source={{ uri: dish.ImageBase64 }} style={styles.dishImg} />
        ) : (
          <View
            style={[
              styles.dishImg,
              {
                justifyContent: "center",
                alignItems: "center",
                backgroundColor: Theme.bgMuted,
              },
            ]}
          >
            <Ionicons
              name="restaurant-outline"
              size={40}
              color={Theme.textMuted}
            />
          </View>
        )}
      </View>
      <Text style={styles.dishName} numberOfLines={2}>
        {dish.Name}
      </Text>
      <Text style={styles.dishPrice}>${(dish.Price || 0).toFixed(2)}</Text>
    </TouchableOpacity>
  );
};

// --- SCREEN ---

export default function MenuScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [kitchens, setKitchens] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [isLoadingDishes, setIsLoadingDishes] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [selectedKitchenId, setSelectedKitchenId] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [searchText, setSearchText] = useState("");
  const [allDishes, setAllDishes] = useState<any[]>([]);

  // Modifier Modal State
  const [modifiers, setModifiers] = useState<any[]>([]);
  const [showModifier, setShowModifier] = useState(false);
  const [selectedDish, setSelectedDish] = useState<any | null>(null);
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [loadingModifiers, setLoadingModifiers] = useState(false);

  // Custom Item Submodal (Screenshot Flow)
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemPrice, setCustomItemPrice] = useState("");
  const [customMods, setCustomMods] = useState<any[]>([]);
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(
    null,
  );

  const orderContext = useOrderContextStore((state) => state.currentOrder);
  const carts = useCartStore((state) => state.carts);

  const isLarge = width > 900;
  const isTablet = width > 768;
  const railWidth = 90;
  const cartWidth = isLarge ? 400 : 0;
  const mainWidth = width - railWidth - cartWidth;

  const columns = isLarge ? 5 : isTablet ? 3 : 2;
  const gap = 15;
  const cardWidth = (mainWidth - 60 - gap * (columns - 1)) / columns;

  useEffect(() => {
    const newId = getContextId(orderContext);
    setCurrentContext(newId);
  }, [orderContext]);

  useEffect(() => {
    setIsInitialLoading(true);
    fetch(`${API_URL}/kitchens`)
      .then((res) => res.json())
      .then((data) => {
        const safeData = Array.isArray(data) ? data : [];
        const filtered = safeData.filter(
          (k: any) => k.KitchenTypeName && !k.KitchenTypeName.includes("TEST"),
        );
        setKitchens(filtered);
        if (filtered.length > 0)
          loadGroups(filtered[0].CategoryId);
        setIsInitialLoading(false);
      });

    fetch(`${API_URL}/api/dishes/all`)
      .then((res) => res.json())
      .then((data) => setAllDishes(Array.isArray(data) ? data : []))
      .catch((e) => console.log(e));
  }, []);

  const loadGroups = async (kitchenId: string) => {
    setSelectedKitchenId(kitchenId);
    try {
      const res = await fetch(`${API_URL}/dishgroups/${kitchenId}`);
      const data = await res.json();
      setGroups(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) loadDishes(data[0].DishGroupId);
    } catch (e) {
      console.log(e);
    }
  };

  const loadDishes = async (groupId: string) => {
    setSelectedGroup(groupId);
    setIsLoadingDishes(true);
    try {
      const res = await fetch(`${API_URL}/dishes/${groupId}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
    } finally {
      setIsLoadingDishes(false);
    }
  };

  const filteredItems = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return items;

    // Search across all dishes if query exists
    return allDishes.filter((d) => {
      const name = (d.Name || d.DishName || "").toLowerCase();
      return name.includes(query);
    });
  }, [searchText, items, allDishes]);

  const openModifiers = async (dish: any, lineItemId: string) => {
    setSelectedDish(dish);
    setEditingLineItemId(lineItemId);
    setSelectedModifierIds([]);
    setCustomMods([]);
    setModifiers([]);
    setLoadingModifiers(true);
    setShowModifier(true);

    // Reset custom submodal
    setShowCustomModal(false);
    setCustomItemName("");
    setCustomItemPrice("");

    try {
      const res = await fetch(`${API_URL}/modifiers/${dish.DishId}`);
      if (!res.ok) throw new Error("Failed to fetch modifiers");
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        setModifiers(data);
      } else {
        // No modifiers for this dish, auto-close the modal
        setModifiers([]);
        setShowModifier(false);
        setEditingLineItemId(null);
      }
    } catch (err) {
      console.error(err);
      setModifiers([]);
      setShowModifier(false);
      setEditingLineItemId(null);
    } finally {
      setLoadingModifiers(false);
    }
  };

  const toggleModifier = (mod: any) => {
    if (mod.ModifierName.toUpperCase() === "OPEN") {
      setShowCustomModal(true);
      return;
    }

    setSelectedModifierIds((prev) => {
      const next = prev.includes(mod.ModifierID)
        ? prev.filter((id) => id !== mod.ModifierID)
        : [...prev, mod.ModifierID];
      return next;
    });
  };

  const addCustomMod = () => {
    if (!customItemName) return;
    const newId = `custom-${Date.now()}`;
    const newMod = {
      ModifierID: newId,
      ModifierName: customItemName,
      Price: parseFloat(customItemPrice) || 0,
    };

    setCustomMods(prev => [...prev, newMod]);
    setSelectedModifierIds(prev => [...prev, newId]);

    setShowCustomModal(false);
    setCustomItemName("");
    setCustomItemPrice("");
  };

  const addWithModifiers = () => {
    if (editingLineItemId) {
      const allAvailable = [...modifiers, ...customMods];
      const selectedMods = allAvailable.filter((m) =>
        selectedModifierIds.includes(m.ModifierID),
      );
      
      const modsToAdd = selectedMods.map((m) => ({
        ModifierId: m.ModifierID || m.ModifierId,
        ModifierName: m.ModifierName,
        Price: m.Price || 0,
      }));

      useCartStore.getState().updateCartItemModifiers(
        editingLineItemId,
        modsToAdd as any
      );
    }
    setShowModifier(false);
    setEditingLineItemId(null);
  };

  if (!orderContext)
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.title}>Select Table First</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.layout}>
        {/* LEFT NAV RAIL */}
        <NavRail />

        {/* MAIN CONTENT */}
        <View style={[styles.main, { width: mainWidth }]}>
          {/* TOP BAR */}
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)/category")}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color={Theme.textPrimary} />
            </TouchableOpacity>
            <View style={styles.searchWrap}>
              <Ionicons
                name="search"
                size={20}
                color={Theme.textMuted}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products....."
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => setSearchText("")}>
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={Theme.textMuted}
                  />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.topActions}>
              {!isLarge && (
                <TouchableOpacity
                  style={[styles.iconBtn, { backgroundColor: Theme.success }]}
                  onPress={() => router.push("/cart")}
                >
                  <Ionicons name="cart" size={18} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* TWO-TIER CATEGORY TABS */}
          <View style={styles.categoryNavigation}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.catScroll}
            >
              {kitchens.map((k) => (
                <TouchableOpacity
                  key={k.CategoryId}
                  style={[
                    styles.catPill,
                    selectedKitchenId === k.CategoryId && styles.catPillActive,
                  ]}
                  onPress={() => loadGroups(k.CategoryId)}
                >
                  <Text
                    style={[
                      styles.catText,
                      selectedKitchenId === k.CategoryId &&
                        styles.catTextActive,
                    ]}
                  >
                    {k.KitchenTypeName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={{ marginTop: 10 }}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.groupScroll}
              >
                {groups.map((g) => (
                  <TouchableOpacity
                    key={g.DishGroupId}
                    style={[
                      styles.groupPill,
                      selectedGroup === g.DishGroupId && styles.groupPillActive,
                    ]}
                    onPress={() => loadDishes(g.DishGroupId)}
                  >
                    <Text
                      style={[
                        styles.groupText,
                        selectedGroup === g.DishGroupId &&
                          styles.groupTextActive,
                      ]}
                    >
                      {g.DishGroupName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* PRODUCT GRID */}
          <View style={styles.gridContainer}>
            {isLoadingDishes ? (
              <ActivityIndicator
                color={Theme.primary}
                style={{ marginTop: 50 }}
              />
            ) : (
              <FlatList
                data={filteredItems}
                keyExtractor={(item) => item.DishId}
                numColumns={columns}
                key={columns}
                renderItem={({ item }) => {
                  const ctxId = getContextId(orderContext);
                  const currentCart = ctxId ? carts[ctxId] : [];
                  const cartQty = currentCart?.reduce((acc, cartItem) => {
                    return cartItem.id === item.DishId ? acc + cartItem.qty : acc;
                  }, 0) || 0;

                  return (
                    <DishCard
                      dish={item}
                      width={cardWidth}
                      cartQty={cartQty}
                      onPress={() => {
                        const lineId = addToCartGlobal({
                          id: item.DishId,
                          name: item.Name,
                          price: item.Price || 0,
                        });
                        openModifiers(item, lineId);
                      }}
                    />
                  );
                }}
                columnWrapperStyle={{ gap: gap, marginBottom: gap }}
                contentContainerStyle={styles.listPadding}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>

        {/* RIGHT CART SIDEBAR */}
        {isLarge && <CartSidebar width={cartWidth} />}

        {/* MODIFIER MODAL (Screenshot 1 Style) */}
        {showModifier && selectedDish && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>
                    Modifiers {selectedDish.Name}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowModifier(false)}
                  style={styles.modalClose}
                >
                  <Ionicons
                    name="close"
                    size={20}
                    color={Theme.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {loadingModifiers ? (
                  <ActivityIndicator color={Theme.primary} size="large" />
                ) : (
                  <ScrollView style={styles.modifierList} showsVerticalScrollIndicator={false}>
                    {modifiers.map((m) => (
                      <TouchableOpacity
                        key={m.ModifierID}
                        style={styles.modifierRow}
                        onPress={() => toggleModifier(m)}
                      >
                        <Text style={styles.modifierName}>
                          {m.ModifierName}
                        </Text>
                        <View
                          style={[
                            styles.checkbox,
                            selectedModifierIds.includes(m.ModifierID) &&
                              styles.checkboxActive,
                          ]}
                        >
                          {selectedModifierIds.includes(m.ModifierID) && (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalBtnCancel}
                  onPress={() => setShowModifier(false)}
                >
                  <Text style={styles.modalBtnTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalBtnAdd,
                    { backgroundColor: Theme.success },
                  ]}
                  onPress={addWithModifiers}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.modalBtnTextAdd}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ADD CUSTOM ITEM SUB-MODAL (Screenshot 2 Style) */}
            {showCustomModal && (
              <View
                style={[
                  styles.modalOverlay,
                  { zIndex: 2000, backgroundColor: "rgba(0,0,0,0.8)" },
                ]}
              >
                <View style={styles.customItemModal}>
                  <Text style={styles.customModalTitle}>Add Custom Item</Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Item Name *</Text>
                    <TextInput
                      style={styles.customInput}
                      placeholder="Enter item name"
                      placeholderTextColor="#666"
                      value={customItemName}
                      onChangeText={setCustomItemName}
                      autoFocus
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Price (Optional)</Text>
                    <TextInput
                      style={styles.customInput}
                      placeholder="Enter price"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={customItemPrice}
                      onChangeText={setCustomItemPrice}
                    />
                  </View>

                  <View style={styles.customModalActions}>
                    <TouchableOpacity
                      style={styles.customBtnCancel}
                      onPress={() => setShowCustomModal(false)}
                    >
                      <Text style={styles.customBtnTextCancel}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.customBtnAdd}
                      onPress={addCustomMod}
                    >
                      <Text style={styles.customBtnTextAdd}>Add Item</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const full = 999;
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Theme.bgMain },
  layout: { flex: 1, flexDirection: "row" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  rail: {
    width: 90,
    backgroundColor: "#fff",
    borderRightWidth: 1,
    borderRightColor: Theme.border,
    alignItems: "center",
    paddingVertical: 20,
  },
  railTop: { flex: 1, gap: 20 },
  railItem: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 16,
  },
  railItemActive: { backgroundColor: Theme.bgMain },
  railLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Theme.textSecondary,
    marginTop: 4,
  },
  railLabelActive: { color: Theme.primary },
  railBottom: { gap: 20, alignItems: "center" },
  logoutBtn: { alignItems: "center" },
  main: { flex: 1, padding: 20 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    ...Theme.shadowSm,
  },
  searchWrap: {
    flex: 0.7,
    height: 48,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    ...Theme.shadowSm,
  },
  searchIcon: { marginRight: 10 },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.medium,
    fontSize: 14,
    color: Theme.textPrimary,
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  topActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    ...Theme.shadowSm,
  },
  categoryNavigation: { marginBottom: 25 },
  catScroll: { gap: 10 },
  catPill: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Theme.border,
    justifyContent: "center",
    alignItems: "center",
  },
  catPillActive: {
    backgroundColor: Theme.primaryLight,
    borderColor: Theme.primary,
    ...Theme.shadowSm,
  },
  catText: { fontSize: 14, fontFamily: Fonts.bold, color: Theme.textSecondary },
  catTextActive: { color: Theme.primary },
  groupScroll: { gap: 8 },
  groupPill: {
    paddingHorizontal: 16,
    height: 32,
    borderRadius: full,
    backgroundColor: "transparent",
    borderWidth: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  groupPillActive: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Theme.border,
    ...Theme.shadowSm,
  },
  groupText: { fontSize: 12, fontFamily: Fonts.medium, color: Theme.textMuted },
  groupTextActive: { color: Theme.textPrimary, fontFamily: Fonts.bold },
  gridContainer: { flex: 1 },
  listPadding: { paddingBottom: 80 },
  card: {
    position: "relative",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 10,
    alignItems: "center",
    ...Theme.shadowMd,
  },
  qtyBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: Theme.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    borderWidth: 2,
    borderColor: "#fff",
    ...Theme.shadowSm,
  },
  qtyBadgeText: {
    color: "#fff",
    fontFamily: Fonts.black,
    fontSize: 13,
  },
  dishImageWrap: {
    width: 70,
    height: 70,
    borderRadius: 35,
    overflow: "hidden",
    marginBottom: 12,
    backgroundColor: Theme.bgMain,
  },
  dishImg: { width: "100%", height: "100%" },
  dishName: {
    fontSize: 13,
    fontFamily: Fonts.black,
    color: Theme.textPrimary,
    textAlign: "center",
    minHeight: 40,
    lineHeight: 18,
  },
  dishPrice: {
    fontSize: 14,
    fontFamily: Fonts.black,
    color: Theme.primary,
    marginTop: 4,
  },
  title: { fontSize: 24, fontFamily: Fonts.black },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    width: "85%",
    maxWidth: 480,
    maxHeight: "90%",
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    ...Theme.shadowLg,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontFamily: Fonts.black,
    color: Theme.primary,
  },
  modalClose: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Theme.bgMuted,
    borderRadius: 18,
  },
  modalBody: { flexShrink: 1 },
  modifierList: { borderTopWidth: 1, borderTopColor: Theme.border },
  modifierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.bgMain,
  },
  modifierName: {
    color: Theme.textPrimary,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Theme.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: Theme.primary },
  modalFooter: { flexDirection: "row", gap: 12, marginTop: 24 },
  modalBtnCancel: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: Theme.bgMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBtnTextCancel: {
    color: Theme.textSecondary,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  modalBtnAdd: {
    flex: 1.5,
    height: 54,
    borderRadius: 16,
    backgroundColor: Theme.success,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    ...Theme.shadowSm,
  },
  modalBtnTextAdd: { color: "#fff", fontSize: 16, fontFamily: Fonts.black },

  /* Submodal Styling (Screenshot 2) */
  customItemModal: {
    width: "85%",
    maxWidth: 380,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    ...Theme.shadowLg,
    borderWidth: 1,
    borderColor: Theme.border,
  },
  customModalTitle: {
    fontSize: 20,
    fontFamily: Fonts.black,
    color: Theme.textPrimary,
    textAlign: "center",
    marginBottom: 20,
  },
  inputGroup: { marginBottom: 18 },
  inputLabel: {
    color: Theme.textSecondary,
    fontSize: 14,
    fontFamily: Fonts.bold,
    marginBottom: 8,
  },
  customInput: {
    height: 52,
    backgroundColor: Theme.bgMain,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Theme.border,
    paddingHorizontal: 16,
    color: Theme.textPrimary,
    fontSize: 16,
    fontFamily: Fonts.medium,
  },
  customModalActions: { flexDirection: "row", gap: 12, marginTop: 10 },
  customBtnCancel: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: Theme.bgMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  customBtnTextCancel: {
    color: Theme.textSecondary,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  customBtnAdd: {
    flex: 1,
    height: 54,
    borderRadius: 16,
    backgroundColor: Theme.primary,
    justifyContent: "center",
    alignItems: "center",
    ...Theme.shadowSm,
  },
  customBtnTextAdd: { color: "#fff", fontSize: 16, fontFamily: Fonts.black },
});
