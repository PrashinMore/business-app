import React, { useState, useRef } from 'react';
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
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { useData } from '../context/DataContext';
import { checkout } from '../services/menu';
import { CartItem } from '../types/menu';
import { API_BASE_URL } from '../config/api';
import { RootStackParamList } from '../navigation/AppNavigator';
import { BillData, BillItem } from './PrintBillScreen';

type CartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const { cart, updateQuantity, removeFromCart, clearCart, getTotalAmount } = useCart();
  const { user } = useAuth();
  const { isOnline, queuedSalesCount, manualSync } = useSync();
  const { onSaleCreated } = useData();
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'UPI' | 'mixed'>('cash');
  const [isPaid, setIsPaid] = useState(false);
  const [cashAmount, setCashAmount] = useState<string>('');
  const [upiAmount, setUpiAmount] = useState<string>('');
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  
  // Ref to track if we should print after checkout
  const printAfterCheckoutRef = useRef(false);

  const handleUpdateQuantity = (productId: string, change: number) => {
    const cartItem = cart.find(item => item.productId === productId);
    if (!cartItem) return;

    const newQuantity = cartItem.quantity + change;
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    if (newQuantity > cartItem.product.stock) {
      Alert.alert('Stock Limit', 'Quantity exceeds available stock');
      return;
    }

    updateQuantity(productId, newQuantity);
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

  const handleCheckout = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to cart');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'User information not available');
      return;
    }

    try {
      setCheckingOut(true);

      const totalAmount = getTotalAmount();
      const cash = useSplitPayment ? parseFloat(cashAmount) || 0 : 0;
      const upi = useSplitPayment ? parseFloat(upiAmount) || 0 : 0;

      // Validation for split payment
      if (useSplitPayment) {
        if (cash < 0 || upi < 0) {
          Alert.alert('Invalid Amount', 'Cash and UPI amounts must be greater than or equal to 0');
          setCheckingOut(false);
          return;
        }
        if (cash + upi > totalAmount) {
          Alert.alert('Invalid Amount', `Total payment (₹${(cash + upi).toFixed(2)}) cannot exceed total amount (₹${totalAmount.toFixed(2)})`);
          setCheckingOut(false);
          return;
        }
      }

      const items = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
      }));

      // Determine payment type and amounts
      let finalPaymentType: 'cash' | 'UPI' | 'mixed' = paymentType;
      let finalCashAmount: number | undefined;
      let finalUpiAmount: number | undefined;
      let finalIsPaid = isPaid;

      if (useSplitPayment) {
        finalCashAmount = cash;
        finalUpiAmount = upi;
        if (cash > 0 && upi > 0) {
          finalPaymentType = 'mixed';
        } else if (cash > 0) {
          finalPaymentType = 'cash';
        } else if (upi > 0) {
          finalPaymentType = 'UPI';
        }
        // Auto-calculate isPaid if amounts provided
        if (cash + upi === totalAmount) {
          finalIsPaid = true;
        }
      } else {
        // Legacy mode: use paymentType to determine amounts
        // Only set amounts if payment is marked as paid
        if (isPaid) {
          if (paymentType === 'cash') {
            finalCashAmount = totalAmount;
            finalUpiAmount = 0;
          } else if (paymentType === 'UPI') {
            finalCashAmount = 0;
            finalUpiAmount = totalAmount;
          }
        }
        // If not paid, don't send amounts (let API handle it)
      }

      const saleData = {
        date: new Date().toISOString(),
        items,
        totalAmount: Number(totalAmount.toFixed(2)),
        soldBy: user.id,
        paymentType: finalPaymentType,
        ...(finalCashAmount !== undefined && { cashAmount: Number(finalCashAmount.toFixed(2)) }),
        ...(finalUpiAmount !== undefined && { upiAmount: Number(finalUpiAmount.toFixed(2)) }),
        isPaid: finalIsPaid,
      };

      const sale = await checkout(saleData);

      // Store sale data before clearing cart for printing
      const saleId = sale.id;
      const saleDate = saleData.date;

      // Check if sale was queued offline
      if ('offline' in sale && sale.offline) {
        // Clear cart on success (even if offline)
        clearCart();

        // Trigger data refresh for offline sale too (stock changed locally)
        onSaleCreated();

        Alert.alert(
          'Order Queued Offline',
          `Your order has been queued for processing when connection is restored.\n\nLocal ID: ${sale.id}\nTotal: ₹${totalAmount.toFixed(2)}\nPayment: ${paymentType.toUpperCase()}\nStatus: ${isPaid ? 'Paid' : 'Pending'}\n\n${queuedSalesCount + 1} order(s) pending sync.`,
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
          date: saleDate,
          items: printBillItems,
          subtotal: totalAmount,
          totalAmount,
          paymentType: finalPaymentType,
          isPaid: finalIsPaid,
          ...(finalCashAmount !== undefined && { cashAmount: finalCashAmount }),
          ...(finalUpiAmount !== undefined && { upiAmount: finalUpiAmount }),
          cashierName: user?.name,
        };

        // Clear cart on success (online sale)
        clearCart();

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
            `Your order has been placed successfully.\n\nSale ID: ${sale.id.substring(0, 8).toUpperCase()}\nTotal: ₹${totalAmount.toFixed(2)}\nPayment: ${paymentType.toUpperCase()}\nStatus: ${isPaid ? 'Paid' : 'Pending'}`,
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
      Alert.alert('Checkout Failed', error.message || 'An error occurred during checkout');
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

    return (
      <View style={styles.cartItem}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        )}
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{item.product.name}</Text>
          <Text style={styles.itemPrice}>₹{Number(item.sellingPrice).toFixed(2)} each</Text>
          <Text style={styles.itemStock}>Stock: {item.product.stock} {item.product.unit}</Text>

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
                  item.quantity >= item.product.stock && styles.quantityButtonDisabled,
                ]}
                onPress={() => handleUpdateQuantity(item.productId, 1)}
                disabled={item.quantity >= item.product.stock}
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
        <Text style={styles.emptyIcon}>🛒</Text>
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
            <View style={styles.paymentTypeSection}>
              <Text style={styles.paymentTypeLabel}>Payment Method:</Text>
              <View style={styles.paymentTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    !useSplitPayment && paymentType === 'cash' && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => {
                    setUseSplitPayment(false);
                    setPaymentType('cash');
                    setCashAmount('');
                    setUpiAmount('');
                  }}
                >
                  <Text
                    style={[
                      styles.paymentTypeButtonText,
                      !useSplitPayment && paymentType === 'cash' && styles.paymentTypeButtonTextActive,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    !useSplitPayment && paymentType === 'UPI' && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => {
                    setUseSplitPayment(false);
                    setPaymentType('UPI');
                    setCashAmount('');
                    setUpiAmount('');
                  }}
                >
                  <Text
                    style={[
                      styles.paymentTypeButtonText,
                      !useSplitPayment && paymentType === 'UPI' && styles.paymentTypeButtonTextActive,
                    ]}
                  >
                    UPI
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.paymentTypeButton,
                    useSplitPayment && styles.paymentTypeButtonActive,
                  ]}
                  onPress={() => {
                    setUseSplitPayment(true);
                    setPaymentType('mixed');
                  }}
                >
                  <Text
                    style={[
                      styles.paymentTypeButtonText,
                      useSplitPayment && styles.paymentTypeButtonTextActive,
                    ]}
                  >
                    Split
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {useSplitPayment && (
              <View style={styles.splitPaymentSection}>
                <Text style={styles.paymentTypeLabel}>Split Payment Amounts:</Text>
                <View style={styles.splitPaymentInputs}>
                  <View style={styles.splitPaymentInputContainer}>
                    <Text style={styles.splitPaymentLabel}>Cash (₹):</Text>
                    <TextInput
                      style={styles.splitPaymentInput}
                      value={cashAmount}
                      onChangeText={(text) => {
                        // Allow only numbers and decimal point
                        const numericValue = text.replace(/[^0-9.]/g, '');
                        setCashAmount(numericValue);
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={styles.splitPaymentInputContainer}>
                    <Text style={styles.splitPaymentLabel}>UPI (₹):</Text>
                    <TextInput
                      style={styles.splitPaymentInput}
                      value={upiAmount}
                      onChangeText={(text) => {
                        // Allow only numbers and decimal point
                        const numericValue = text.replace(/[^0-9.]/g, '');
                        setUpiAmount(numericValue);
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                {(() => {
                  const cash = parseFloat(cashAmount) || 0;
                  const upi = parseFloat(upiAmount) || 0;
                  const paid = cash + upi;
                  const remaining = totalAmount - paid;
                  return (
                    <View style={styles.splitPaymentSummary}>
                      <Text style={styles.splitPaymentSummaryText}>
                        Paid: ₹{paid.toFixed(2)} / Total: ₹{totalAmount.toFixed(2)}
                      </Text>
                      {remaining > 0 && (
                        <Text style={styles.splitPaymentRemaining}>
                          Remaining: ₹{remaining.toFixed(2)}
                        </Text>
                      )}
                      {remaining < 0 && (
                        <Text style={styles.splitPaymentError}>
                          Exceeds total by ₹{Math.abs(remaining).toFixed(2)}
                        </Text>
                      )}
                      {remaining === 0 && paid > 0 && (
                        <Text style={styles.splitPaymentComplete}>✓ Full payment</Text>
                      )}
                    </View>
                  );
                })()}
              </View>
            )}

            {!useSplitPayment && (
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
            )}

            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{totalAmount.toFixed(2)}</Text>
            </View>

            {!isOnline && (
              <View style={styles.offlineBanner}>
                <Text style={styles.offlineText}>⚠️ Offline Mode - Orders will be synced when online</Text>
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
                      <Text style={styles.printIcon}>🖨️</Text>
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
    fontSize: 64,
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
  printIcon: {
    fontSize: 16,
  },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  offlineText: {
    fontSize: 14,
    color: '#856404',
    textAlign: 'center',
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
  splitPaymentSection: {
    marginBottom: 16,
    marginTop: 8,
  },
  splitPaymentInputs: {
    gap: 12,
    marginTop: 8,
  },
  splitPaymentInputContainer: {
    marginBottom: 8,
  },
  splitPaymentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  splitPaymentInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  splitPaymentSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  splitPaymentSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  splitPaymentRemaining: {
    fontSize: 13,
    color: '#ff9800',
    fontWeight: '500',
  },
  splitPaymentError: {
    fontSize: 13,
    color: '#ff3b30',
    fontWeight: '500',
  },
  splitPaymentComplete: {
    fontSize: 13,
    color: '#28a745',
    fontWeight: '500',
  },
});

export default CartScreen;

