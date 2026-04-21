import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { useData } from '../context/DataContext';
import { checkout } from '../services/menu';
import { CartItem } from '../types/menu';
import {
  canAddMore,
  cartHasRecipeItems,
  classifyCheckoutError,
  getInventoryType,
  isInventoryTracked,
  isRecipeProduct,
  maxClientQuantity,
} from '../services/inventory';
import { API_BASE_URL } from '../config/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BillData, BillItem } from './PrintBillScreen';
import { getTables } from '../services/tables';
import { DiningTable } from '../types/tables';
import { Customer } from '../types/crm';
import { CustomerSearchModal } from '../components/CustomerSearchModal';
import { getEligibleRewards, redeemReward } from '../services/crm';

type CartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const { cart, updateQuantity, removeFromCart, clearCart, getTotalAmount } = useCart();
  const { user } = useAuth();
  const { isOnline, queuedSalesCount, manualSync } = useSync();
  const { onSaleCreated } = useData();
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'UPI' | 'mixed'>('cash');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitUpiAmount, setSplitUpiAmount] = useState<string>('');
  const [isPaid, setIsPaid] = useState(false);
  const [saleDate, setSaleDate] = useState<Date>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [isSaleDatePickerVisible, setSaleDatePickerVisible] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [visitType, setVisitType] = useState<'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('DINE_IN');
  const [selectedRewardId, setSelectedRewardId] = useState<string | null>(null);
  const [eligibleRewards, setEligibleRewards] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    type: 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'FREE_ITEM' | 'CASHBACK';
    pointsRequired: number;
    discountPercentage?: number;
    discountAmount?: number;
    freeItemName?: string;
    cashbackAmount?: number;
    minOrderValue?: number;
    maxDiscountAmount?: number;
  }>>([]);
  const [redemptionDiscount, setRedemptionDiscount] = useState<number>(0);
  const [loadingEligibleRewards, setLoadingEligibleRewards] = useState(false);
  /**
   * Product IDs for which the backend reported an ingredient-stock failure.
   * We highlight these rows so the cashier can remove / reduce them before
   * retrying. Cleared on any cart edit and on a successful checkout.
   */
  const [ingredientFailureIds, setIngredientFailureIds] = useState<Set<string>>(
    () => new Set(),
  );
  
  // Ref to track if we should print after checkout
  const printAfterCheckoutRef = useRef(false);

  // NOTE: Cart state should NEVER be cleared when table selection changes.
  // Only clearCart() should be called after successful checkout.
  // Any table dropdown/selection logic should NOT affect the cart state.

  // Load tables on mount
  useEffect(() => {
    loadTables();
  }, []);

  // Load eligible rewards when customer and cart change
  useEffect(() => {
    async function loadEligibleRewards() {
      if (
        !selectedCustomer?.loyaltyAccount ||
        getTotalAmount() <= 0
      ) {
        setEligibleRewards([]);
        setSelectedRewardId(null);
        setRedemptionDiscount(0);
        return;
      }

      setLoadingEligibleRewards(true);
      try {
        const rewards = await getEligibleRewards(
          selectedCustomer.id,
          getTotalAmount(),
        );
        setEligibleRewards(rewards);
        // Reset selection if current reward is no longer eligible
        if (selectedRewardId && !rewards.find(r => r.id === selectedRewardId)) {
          setSelectedRewardId(null);
          setRedemptionDiscount(0);
        }
      } catch (err) {
        console.error('Failed to load eligible rewards:', err);
        setEligibleRewards([]);
      } finally {
        setLoadingEligibleRewards(false);
      }
    }

    loadEligibleRewards();
  }, [selectedCustomer?.id, cart.length, selectedRewardId]);

  // Calculate discount when selected reward changes
  useEffect(() => {
    if (!selectedRewardId || eligibleRewards.length === 0) {
      setRedemptionDiscount(0);
      return;
    }

    const selectedReward = eligibleRewards.find(r => r.id === selectedRewardId);
    if (!selectedReward) {
      setRedemptionDiscount(0);
      return;
    }

    let discount = 0;
    if (selectedReward.type === 'DISCOUNT_PERCENTAGE' && selectedReward.discountPercentage) {
      discount = (getTotalAmount() * selectedReward.discountPercentage) / 100;
    } else if (selectedReward.type === 'DISCOUNT_FIXED' && selectedReward.discountAmount) {
      discount = selectedReward.discountAmount;
    }

    // Apply maximum discount limit
    if (selectedReward.maxDiscountAmount && discount > selectedReward.maxDiscountAmount) {
      discount = selectedReward.maxDiscountAmount;
    }

    // Don't exceed bill amount
    discount = Math.min(discount, getTotalAmount());
    setRedemptionDiscount(discount);
  }, [selectedRewardId, eligibleRewards, cart.length]);

  const loadTables = async () => {
    try {
      setLoadingTables(true);
      const data = await getTables();
      setTables(data);
    } catch (error: any) {
      // Silently fail - table management might not be enabled
      console.log('Tables not available:', error.message);
    } finally {
      setLoadingTables(false);
    }
  };

  const selectedTable = tables.find(t => t.id === selectedTableId);

  const showSaleDatePicker = () => setSaleDatePickerVisible(true);
  const hideSaleDatePicker = () => setSaleDatePickerVisible(false);
  const handleSaleDateConfirm = (date: Date) => {
    const next = new Date(date);
    next.setHours(0, 0, 0, 0);
    setSaleDate(next);
    hideSaleDatePicker();
  };

  const getMinAllowedSaleDate = () => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const formatSaleDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleUpdateQuantity = (productId: string, change: number) => {
    const cartItem = cart.find(item => item.productId === productId);
    if (!cartItem) return;

    const newQuantity = cartItem.quantity + change;
    if (newQuantity <= 0) {
      removeFromCart(productId);
      clearIngredientFailureFor(productId);
      return;
    }

    // Only enforce a hard cap for SIMPLE+tracked items. RECIPE / untracked
    // quantities are validated on the backend (against ingredient stock).
    if (newQuantity > maxClientQuantity(cartItem.product)) {
      Alert.alert('Stock Limit', 'Quantity exceeds available stock');
      return;
    }

    updateQuantity(productId, newQuantity);
    // Any qty change invalidates the previous ingredient-failure highlight.
    clearIngredientFailureFor(productId);
  };

  const clearIngredientFailureFor = (productId: string) => {
    setIngredientFailureIds((prev) => {
      if (!prev.has(productId)) return prev;
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  };

  const handleRemoveItem = (productId: string) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeFromCart(productId),
        },
      ]
    );
  };

  /**
   * Public entry point: shows an offline-warn confirmation when the cart
   * contains RECIPE items before dispatching the actual checkout.
   * Ingredient stock is only authoritative on the backend, so an offline
   * sale cannot pre-validate it — the cashier should know upfront.
   */
  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    if (!isOnline && cartHasRecipeItems(cart)) {
      Alert.alert(
        'Offline sale — ingredients not validated',
        '⚠️ Ingredient stock will be validated when back online. If ingredients are short, this sale may be rejected during sync.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              printAfterCheckoutRef.current = false;
            },
          },
          {
            text: 'Queue anyway',
            onPress: () => runCheckout(),
          },
        ],
      );
      return;
    }

    runCheckout();
  };

  const runCheckout = async () => {
    try {
      setCheckingOut(true);

      const subtotalAmount = getTotalAmount();
      let finalTotalAmount = subtotalAmount;
      let loyaltyPointsRedeemed = 0;
      let loyaltyDiscountAmount = 0;

      // Handle reward redemption if applicable
      if (
        selectedCustomer?.loyaltyAccount &&
        selectedRewardId &&
        redemptionDiscount > 0
      ) {
        try {
          const redemption = await redeemReward(
            selectedCustomer.id,
            selectedRewardId,
            subtotalAmount,
          );
          loyaltyPointsRedeemed = redemption.pointsUsed;
          loyaltyDiscountAmount = redemption.discountAmount;
          finalTotalAmount = Number((subtotalAmount - redemption.discountAmount).toFixed(2));
          // Update selected customer with new points
          if (selectedCustomer.loyaltyAccount) {
            selectedCustomer.loyaltyAccount.points = redemption.pointsAfter;
          }
        } catch (err) {
          console.error('Reward redemption failed:', err);
          Alert.alert('Redemption Error', err instanceof Error ? err.message : 'Failed to redeem reward. Please try again.');
          setCheckingOut(false);
          return;
        }
      }

      const items = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
      }));

      const parsedCashAmount = Number(splitCashAmount || '0');
      const parsedUpiAmount = Number(splitUpiAmount || '0');
      const splitTotal = Number((parsedCashAmount + parsedUpiAmount).toFixed(2));
      const roundedFinalTotal = Number(finalTotalAmount.toFixed(2));
      if (Number.isNaN(saleDate.getTime())) {
        Alert.alert('Invalid date', 'Please select a valid sale date.');
        setCheckingOut(false);
        return;
      }
      if (saleDate < getMinAllowedSaleDate()) {
        Alert.alert('Date out of range', 'You can record sales up to 2 weeks back only.');
        setCheckingOut(false);
        return;
      }

      if (paymentType === 'mixed') {
        if (parsedCashAmount < 0 || parsedUpiAmount < 0) {
          Alert.alert('Invalid split', 'Cash and UPI amounts cannot be negative.');
          setCheckingOut(false);
          return;
        }
        if (splitTotal <= 0) {
          Alert.alert('Invalid split', 'Enter cash and/or UPI amount for split payment.');
          setCheckingOut(false);
          return;
        }
        if (splitTotal > roundedFinalTotal) {
          Alert.alert('Invalid split', 'Split amount cannot exceed total bill amount.');
          setCheckingOut(false);
          return;
        }
      }

      // Use a stable UTC timestamp string for selected business date.
      // Noon UTC avoids timezone edge cases while preserving the chosen calendar date.
      const saleDateTimeIso = `${formatSaleDate(saleDate)}T12:00:00.000Z`;

      const saleData = {
        date: saleDateTimeIso,
        items,
        totalAmount: Number(finalTotalAmount.toFixed(2)),
        soldBy: user.id,
        paymentType,
        ...(paymentType === 'mixed' && {
          cashAmount: Number(parsedCashAmount.toFixed(2)),
          upiAmount: Number(parsedUpiAmount.toFixed(2)),
        }),
        isPaid: paymentType === 'mixed' ? splitTotal === roundedFinalTotal : isPaid,
        ...(selectedTableId && { tableId: selectedTableId }),
        // CRM fields
        ...(selectedCustomer && { customerId: selectedCustomer.id }),
        ...(customerPhone && !selectedCustomer && { 
          customerPhone,
          ...(customerName && { customerName }),
        }),
        visitType,
        ...(loyaltyPointsRedeemed > 0 && {
          loyaltyPointsRedeemed,
          loyaltyDiscountAmount,
        }),
      };

      const sale = await checkout(saleData);

      // Store sale data before clearing cart for printing
      const saleId = sale.id;
      const saleDateIso = saleData.date;

      // Check if sale was queued offline
      if ('offline' in sale && sale.offline) {
        // Clear cart on success (even if offline)
        clearCart();
        setIngredientFailureIds(new Set());

        // Trigger data refresh for offline sale too (stock changed locally)
        onSaleCreated();

        Alert.alert(
          'Order Queued Offline',
          `Your order has been queued for processing when connection is restored.\n\nLocal ID: ${sale.id}\nTotal: ₹${finalTotalAmount.toFixed(2)}\nPayment: ${paymentType.toUpperCase()}\nStatus: ${(paymentType === 'mixed' ? splitTotal === roundedFinalTotal : isPaid) ? 'Paid' : 'Pending'}\n\n${queuedSalesCount + 1} order(s) pending sync.`,
          [
            { text: 'OK' },
            ...(isOnline ? [] : [
              {
                text: 'Retry Sync',
                onPress: async () => {
                  try {
                    await manualSync();
                  } catch (error) {
                    Alert.alert('Sync Error', 'Failed to sync orders. They will sync automatically when online.');
                  }
                },
              },
            ]),
          ]
        );
      } else {
        // Store items for printing before clearing cart
        const printBillItems: BillItem[] = cart.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: Number(item.sellingPrice),
          subtotal: Number(item.sellingPrice) * item.quantity,
        }));

        const printBillData: BillData = {
          saleId,
          date: saleDateIso,
          items: printBillItems,
          subtotal: subtotalAmount,
          totalAmount: finalTotalAmount,
          paymentType,
          isPaid: paymentType === 'mixed' ? splitTotal === roundedFinalTotal : isPaid,
          cashierName: user?.name,
        };

        // Clear cart on success (online sale)
        clearCart();
        setSelectedRewardId(null);
        setRedemptionDiscount(0);
        setIngredientFailureIds(new Set());

        // Trigger data refresh (dashboard, sales list, menu stock)
        onSaleCreated();

        // Check if user wanted to print immediately
        if (printAfterCheckoutRef.current) {
          printAfterCheckoutRef.current = false; // Reset the flag
          // Navigate directly to print screen
          navigation.navigate('PrintBill', { billData: printBillData });
        } else {
          // Show alert with print option
          Alert.alert(
            'Order Placed! 🎉',
            `Your order has been placed successfully.\n\nSale ID: ${sale.id.substring(0, 8).toUpperCase()}\nTotal: ₹${finalTotalAmount.toFixed(2)}\nPayment: ${paymentType.toUpperCase()}\nStatus: ${(paymentType === 'mixed' ? splitTotal === roundedFinalTotal : isPaid) ? 'Paid' : 'Pending'}`,
            [
              { text: 'Done', style: 'cancel' },
              {
                text: '🖨️ Print Bill',
                onPress: () => {
                  navigation.navigate('PrintBill', { billData: printBillData });
                },
              },
            ]
          );
        }
      }
    } catch (error: any) {
      printAfterCheckoutRef.current = false; // Reset on error

      // The backend rejects recipe-driven sales with two distinct kinds of
      // errors. We surface them with tailored copy so the cashier knows
      // exactly what to do next, and we leave the cart intact so they can
      // edit and retry (spec 4.2 / 4.3).
      const kind = classifyCheckoutError(error);
      const rawMessage = error?.message || 'An error occurred during checkout';

      if (kind === 'insufficient_ingredients') {
        // Highlight all RECIPE items — backend doesn't tell us which dish
        // was the culprit, and pinpointing requires per-ingredient detail
        // we don't have on the client.
        const recipeIds = new Set(
          cart.filter((i) => isRecipeProduct(i.product)).map((i) => i.productId),
        );
        setIngredientFailureIds(recipeIds);
        Alert.alert(
          'Not enough ingredients',
          'One or more recipe items cannot be fulfilled because ingredients are short. Reduce the quantity or remove the affected item and try again.',
          [{ text: 'OK' }],
        );
      } else if (kind === 'missing_recipe') {
        Alert.alert(
          'Recipe not set',
          'One of the dishes in this order has no recipe configured. Ask a manager to add its ingredients before selling again.',
          [
            { text: 'OK', style: 'cancel' },
            {
              text: 'Notify manager',
              onPress: () => {
                // Best-effort: log for now; a future CRM/notification API can hook in here.
                console.log('[recipe-missing] cashier requested manager notification', {
                  user: user?.id,
                  productIds: cart
                    .filter((i) => isRecipeProduct(i.product))
                    .map((i) => i.productId),
                });
                Alert.alert('Notified', 'A note was logged for the manager.');
              },
            },
          ],
        );
      } else {
        Alert.alert('Checkout Failed', rawMessage);
      }
    } finally {
      setCheckingOut(false);
    }
  };

  // Handler for "Checkout & Print" button
  const handleCheckoutAndPrint = () => {
    printAfterCheckoutRef.current = true;
    handleCheckout();
  };

  const renderCartItem = ({ item }: { item: CartItem }) => {
    const imageUrl = item.product.imageUrl
      ? `${API_BASE_URL}${item.product.imageUrl}`
      : null;

    const inventoryType = getInventoryType(item.product);
    const tracked = isInventoryTracked(item.product);
    const recipe = isRecipeProduct(item.product);
    const canIncrement = canAddMore(item.product, item.quantity);
    const flagged = ingredientFailureIds.has(item.productId);

    // Stock line — numeric for SIMPLE, descriptive for RECIPE/untracked.
    let stockLine: React.ReactNode;
    if (!tracked) {
      stockLine = <Text style={styles.itemStock}>Not stock-tracked</Text>;
    } else if (recipe) {
      stockLine = (
        <Text style={[styles.itemStock, flagged && styles.itemStockError]}>
          {flagged
            ? '❌ Ingredients short — reduce or remove'
            : 'Recipe item · ingredients deducted on sale'}
        </Text>
      );
    } else {
      stockLine = (
        <Text style={styles.itemStock}>
          Stock: {item.product.stock} {item.product.unit}
        </Text>
      );
    }

    return (
      <View style={[styles.cartItem, flagged && styles.cartItemFlagged]}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        )}
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.product.name}</Text>
          <Text style={styles.itemPrice}>₹{Number(item.sellingPrice).toFixed(2)} each</Text>
          {stockLine}

          <View style={styles.itemFooter}>
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleUpdateQuantity(item.productId, -1)}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{item.quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  !canIncrement && styles.quantityButtonDisabled,
                ]}
                onPress={() => handleUpdateQuantity(item.productId, 1)}
                disabled={!canIncrement}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.itemSubtotal}>
              ₹{(Number(item.sellingPrice) * item.quantity).toFixed(2)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.productId)}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const totalAmount = getTotalAmount();

  if (cart.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color="#999" style={styles.emptyIcon} />
        <Text style={styles.emptyText}>Your cart is empty</Text>
        <Text style={styles.emptySubtext}>Add items from the menu to get started</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={cart}
        keyExtractor={item => item.productId}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View style={styles.checkoutSection}>
            {/* Table Selection */}
            {tables.length > 0 && (
              <View style={styles.tableSection}>
                <Text style={styles.paymentTypeLabel}>Table (Optional):</Text>
                <TouchableOpacity
                  style={styles.tablePicker}
                  onPress={() => setShowTablePicker(true)}
                >
                  <Text style={[styles.tablePickerText, !selectedTable && styles.tablePickerPlaceholder]}>
                    {selectedTable ? `${selectedTable.name} (${selectedTable.status})` : 'Select Table'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#666" />
                </TouchableOpacity>
                {selectedTableId && (
                  <TouchableOpacity
                    style={styles.clearTableButton}
                    onPress={() => setSelectedTableId(null)}
                  >
                    <Text style={styles.clearTableButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <View style={styles.paymentTypeSection}>
              <Text style={styles.paymentTypeLabel}>Sale Date:</Text>
              <TouchableOpacity style={styles.saleDateButton} onPress={showSaleDatePicker}>
                <Text style={styles.saleDateText}>{formatSaleDate(saleDate)}</Text>
                <Ionicons name="calendar" size={18} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.paymentTypeSection}>
              <Text style={styles.paymentTypeLabel}>Payment Method:</Text>
              <View style={styles.paymentTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'cash' && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => setPaymentType('cash')}
                >
                  <Text
                    style={[
                      styles.paymentTypeButtonText,
                      paymentType === 'cash' && styles.paymentTypeButtonTextActive,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'UPI' && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => setPaymentType('UPI')}
                >
                  <Text
                    style={[
                      styles.paymentTypeButtonText,
                      paymentType === 'UPI' && styles.paymentTypeButtonTextActive,
                    ]}
                  >
                    UPI
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    paymentType === 'mixed' && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => setPaymentType('mixed')}
                >
                  <Text
                    style={[
                      styles.paymentTypeButtonText,
                      paymentType === 'mixed' && styles.paymentTypeButtonTextActive,
                    ]}
                  >
                    Split
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {paymentType === 'mixed' && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Split Amount</Text>
                <View style={styles.splitRow}>
                  <View style={styles.splitInputContainer}>
                    <Text style={styles.splitInputLabel}>Cash</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={splitCashAmount}
                      onChangeText={setSplitCashAmount}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <View style={styles.splitInputContainer}>
                    <Text style={styles.splitInputLabel}>UPI</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                      value={splitUpiAmount}
                      onChangeText={setSplitUpiAmount}
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                </View>
                <Text style={styles.splitHint}>
                  Enter paid amounts. Remaining amount will stay pending.
                </Text>
              </View>
            )}

            <View style={styles.paymentStatusSection}>
              <Text style={styles.paymentTypeLabel}>Payment Status:</Text>
              <View style={styles.paymentTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    !isPaid && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => setIsPaid(false)}
                >
                  <Text
                    style={[
                      styles.paymentTypeButtonText,
                      !isPaid && styles.paymentTypeButtonTextActive,
                    ]}
                  >
                    Pending
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    isPaid && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => setIsPaid(true)}
                >
                  <Text
                    style={[
                      styles.paymentTypeButtonText,
                      isPaid && styles.paymentTypeButtonTextActive,
                    ]}
                  >
                    Paid
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Customer Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Customer (Optional)</Text>
              <TouchableOpacity
                style={styles.customerButton}
                onPress={() => setShowCustomerModal(true)}
              >
                {selectedCustomer ? (
                  <View style={styles.customerInfo}>
                    <Ionicons name="person" size={20} color="#007AFF" />
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                      <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
                      {selectedCustomer.loyaltyAccount && (
                        <Text style={styles.loyaltyPoints}>
                          ⭐ {selectedCustomer.loyaltyAccount.points} points ({selectedCustomer.loyaltyAccount.tier})
                        </Text>
                      )}
                      {loadingEligibleRewards ? (
                        <View style={styles.redemptionContainer}>
                          <Text style={styles.redemptionLabel}>Loading rewards...</Text>
                        </View>
                      ) : eligibleRewards.length === 0 ? (
                        <View style={styles.redemptionContainer}>
                          <Text style={styles.redemptionLabel}>No eligible rewards available</Text>
                        </View>
                      ) : (
                        <View style={styles.redemptionContainer}>
                          <Text style={styles.redemptionLabel}>Available Rewards:</Text>
                          <ScrollView style={styles.rewardsList}>
                            {eligibleRewards.map((reward) => {
                              const getRewardDesc = () => {
                                if (reward.type === 'DISCOUNT_PERCENTAGE') {
                                  return `${reward.discountPercentage}% discount${reward.maxDiscountAmount ? ` (max ₹${reward.maxDiscountAmount})` : ''}`;
                                }
                                if (reward.type === 'DISCOUNT_FIXED') {
                                  return `₹${reward.discountAmount} off${reward.maxDiscountAmount ? ` (max ₹${reward.maxDiscountAmount})` : ''}`;
                                }
                                if (reward.type === 'FREE_ITEM') {
                                  return `Free ${reward.freeItemName}`;
                                }
                                if (reward.type === 'CASHBACK') {
                                  return `₹${reward.cashbackAmount} cashback`;
                                }
                                return '';
                              };
                              const isSelected = selectedRewardId === reward.id;
                              return (
                                <TouchableOpacity
                                  key={reward.id}
                                  onPress={() => {
                                    setSelectedRewardId(isSelected ? null : reward.id);
                                  }}
                                  style={[
                                    styles.rewardItem,
                                    isSelected && styles.rewardItemSelected,
                                  ]}
                                >
                                  <View style={styles.rewardItemContent}>
                                    <Text style={[styles.rewardName, isSelected && styles.rewardNameSelected]}>
                                      {reward.name}
                                    </Text>
                                    <Text style={[styles.rewardDesc, isSelected && styles.rewardDescSelected]}>
                                      {getRewardDesc()}
                                    </Text>
                                    {reward.minOrderValue && (
                                      <Text style={styles.rewardMinOrder}>
                                        Min order: ₹{reward.minOrderValue}
                                      </Text>
                                    )}
                                  </View>
                                  <Text style={[styles.rewardPoints, isSelected && styles.rewardPointsSelected]}>
                                    {reward.pointsRequired} pts
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                          {selectedRewardId && redemptionDiscount > 0 && (
                            <View style={styles.discountContainer}>
                              <Text style={styles.discountText}>
                                Discount: -₹{redemptionDiscount.toFixed(2)}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedCustomer(null);
                        setCustomerPhone('');
                        setCustomerName('');
                      }}
                      style={styles.removeCustomerButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : customerPhone ? (
                  <View style={styles.customerInfo}>
                    <Ionicons name="phone-portrait" size={20} color="#007AFF" />
                    <View style={styles.customerDetails}>
                      <Text style={styles.customerPhone}>{customerPhone}</Text>
                      <Text style={styles.newCustomerText}>New customer will be created</Text>
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setCustomerPhone('');
                        setCustomerName('');
                      }}
                      style={styles.removeCustomerButton}
                    >
                      <Ionicons name="close-circle" size={20} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.customerInfo}>
                    <Ionicons name="person-add" size={20} color="#6b7280" />
                    <Text style={styles.customerButtonText}>Select or Add Customer</Text>
                    <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Customer Name Input (for new customers) */}
            {customerPhone && !selectedCustomer && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Customer Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter customer name"
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholderTextColor="#9ca3af"
                />
              </View>
            )}

            {/* Visit Type Selection */}
            {selectedCustomer || customerPhone ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Visit Type</Text>
                <View style={styles.visitTypeContainer}>
                  {(['DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.visitTypeButton,
                        visitType === type && styles.visitTypeButtonActive,
                      ]}
                      onPress={() => setVisitType(type)}
                    >
                      <Text
                        style={[
                          styles.visitTypeButtonText,
                          visitType === type && styles.visitTypeButtonTextActive,
                        ]}
                      >
                        {type.replace('_', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

            {redemptionDiscount > 0 && (
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
              </View>
            )}
            {redemptionDiscount > 0 && (
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>Loyalty Discount:</Text>
                <Text style={[styles.totalAmount, styles.discountAmount]}>-₹{redemptionDiscount.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{(totalAmount - redemptionDiscount).toFixed(2)}</Text>
            </View>

            {!isOnline && (
              <View style={styles.offlineBanner}>
                <Ionicons name="warning" size={16} color="#856404" style={{ marginRight: 6 }} />
                <Text style={styles.offlineText}>Offline Mode - Orders will be synced when online</Text>
              </View>
            )}

            {!isOnline && cartHasRecipeItems(cart) && (
              <View style={styles.recipeOfflineBanner}>
                <Ionicons name="information-circle" size={16} color="#7c2d12" style={{ marginRight: 6 }} />
                <Text style={styles.recipeOfflineText}>
                  Ingredient stock will be validated when back online.
                </Text>
              </View>
            )}
            
            {queuedSalesCount > 0 && (
              <View style={styles.queuedBanner}>
                <Text style={styles.queuedText}>
                  {queuedSalesCount} order(s) queued for sync
                </Text>
                {isOnline && (
                  <TouchableOpacity
                    style={styles.syncButton}
                    onPress={manualSync}
                  >
                    <Text style={styles.syncButtonText}>Sync Now</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Show two buttons when payment is marked as Paid */}
            {isPaid ? (
              <View style={styles.checkoutButtonsRow}>
                <TouchableOpacity
                  style={[styles.checkoutButton, styles.checkoutButtonSecondary, checkingOut && styles.checkoutButtonDisabled]}
                  onPress={handleCheckout}
                  disabled={checkingOut}
                >
                  {checkingOut && !printAfterCheckoutRef.current ? (
                    <ActivityIndicator color="#007AFF" />
                  ) : (
                    <Text style={styles.checkoutButtonTextSecondary}>
                      {isOnline ? 'Checkout' : 'Checkout (Offline)'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.checkoutButton, styles.checkoutButtonPrint, checkingOut && styles.checkoutButtonDisabled]}
                  onPress={handleCheckoutAndPrint}
                  disabled={checkingOut}
                >
                  {checkingOut && printAfterCheckoutRef.current ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="print" size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.checkoutButtonText}>Checkout & Print</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.checkoutButton, checkingOut && styles.checkoutButtonDisabled]}
                onPress={handleCheckout}
                disabled={checkingOut}
              >
                {checkingOut ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.checkoutButtonText}>
                    {isOnline ? 'Checkout' : 'Checkout (Offline)'}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Customer Search Modal */}
      <CustomerSearchModal
        visible={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        onSelect={(customer, phone) => {
          if (customer) {
            setSelectedCustomer(customer);
            setCustomerPhone('');
            setCustomerName(''); // Clear name when existing customer is selected
          } else if (phone) {
            setCustomerPhone(phone);
            setSelectedCustomer(null);
            // Keep customerName if user already entered it
          } else {
            setSelectedCustomer(null);
            setCustomerPhone('');
            setCustomerName('');
          }
        }}
        initialPhone={customerPhone}
      />

      {/* Table Picker Modal */}
      <Modal
        visible={showTablePicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowTablePicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Table</Text>
              <TouchableOpacity
                onPress={() => setShowTablePicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={18} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={tables}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.tableOption,
                    selectedTableId === item.id && styles.tableOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedTableId(item.id);
                    setShowTablePicker(false);
                  }}
                >
                  <View>
                    <Text style={styles.tableOptionName}>{item.name}</Text>
                    {item.area && <Text style={styles.tableOptionArea}>{item.area}</Text>}
                    <Text style={styles.tableOptionInfo}>
                      Capacity: {item.capacity} • {item.status}
                    </Text>
                  </View>
                  {selectedTableId === item.id && (
                    <Ionicons name="checkmark" size={18} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[
                    styles.tableOption,
                    !selectedTableId && styles.tableOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedTableId(null);
                    setShowTablePicker(false);
                  }}
                >
                  <Text style={styles.tableOptionName}>No Table</Text>
                  {!selectedTableId && (
                    <Ionicons name="checkmark" size={18} color="#007AFF" />
                  )}
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

      <DateTimePickerModal
        isVisible={isSaleDatePickerVisible}
        mode="date"
        onConfirm={handleSaleDateConfirm}
        onCancel={hideSaleDatePicker}
        minimumDate={getMinAllowedSaleDate()}
        maximumDate={new Date()}
        date={saleDate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  cartItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cartItemFlagged: {
    borderWidth: 1.5,
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  itemStockError: {
    color: '#b91c1c',
    fontWeight: '600',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  itemStock: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#ccc',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 12,
    minWidth: 24,
    textAlign: 'center',
  },
  itemSubtotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  removeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    fontSize: 24,
    color: '#ff3b30',
    fontWeight: 'bold',
  },
  checkoutSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentTypeSection: {
    marginBottom: 16,
  },
  paymentStatusSection: {
    marginBottom: 16,
  },
  saleDateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saleDateText: {
    fontSize: 16,
    color: '#333',
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  customerButton: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerDetails: {
    flex: 1,
    marginLeft: 12,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  loyaltyPoints: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
    marginTop: 4,
  },
  redemptionContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  redemptionLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  redemptionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redemptionInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    color: '#111827',
  },
  discountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  discountAmount: {
    color: '#10b981',
  },
  rewardsList: {
    maxHeight: 200,
  },
  rewardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rewardItemSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  rewardItemContent: {
    flex: 1,
  },
  rewardName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  rewardNameSelected: {
    color: '#007AFF',
  },
  rewardDesc: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  rewardDescSelected: {
    color: '#007AFF',
  },
  rewardMinOrder: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
  },
  rewardPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f59e0b',
    marginLeft: 12,
  },
  rewardPointsSelected: {
    color: '#007AFF',
  },
  discountContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#d1fae5',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  newCustomerText: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  removeCustomerButton: {
    padding: 4,
  },
  customerButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 12,
  },
  visitTypeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  visitTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  visitTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  visitTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'capitalize',
  },
  visitTypeButtonTextActive: {
    color: '#007AFF',
  },
  paymentTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  paymentTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  paymentTypeButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  paymentTypeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  paymentTypeButtonTextActive: {
    color: '#007AFF',
  },
  splitRow: {
    flexDirection: 'row',
    gap: 12,
  },
  splitInputContainer: {
    flex: 1,
  },
  splitInputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4b5563',
    marginBottom: 6,
  },
  splitHint: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  checkoutButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  checkoutButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
  },
  checkoutButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    flex: 0.8,
  },
  checkoutButtonPrint: {
    backgroundColor: '#1a1a2e',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    flex: 1.2,
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkoutButtonTextSecondary: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    flexDirection: 'row',
    alignItems: 'center',
  },
  offlineText: {
    fontSize: 14,
    color: '#856404',
    flex: 1,
  },
  recipeOfflineBanner: {
    backgroundColor: '#ffedd5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ea580c',
    flexDirection: 'row',
    alignItems: 'center',
  },
  recipeOfflineText: {
    fontSize: 13,
    color: '#7c2d12',
    flex: 1,
  },
  queuedBanner: {
    backgroundColor: '#d1ecf1',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#17a2b8',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queuedText: {
    fontSize: 14,
    color: '#0c5460',
    flex: 1,
  },
  syncButton: {
    backgroundColor: '#17a2b8',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginLeft: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tableSection: {
    marginBottom: 16,
  },
  tablePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  tablePickerText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  tablePickerPlaceholder: {
    color: '#999',
  },
  clearTableButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  clearTableButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  tableOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  tableOptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  tableOptionArea: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tableOptionInfo: {
    fontSize: 12,
    color: '#999',
  },
});

export default CartScreen;

