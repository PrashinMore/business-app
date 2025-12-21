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
import { getTables } from '../services/tables';
import { DiningTable } from '../types/tables';

type CartScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CartScreen: React.FC = () => {
  const navigation = useNavigation<CartScreenNavigationProp>();
  const { cart, updateQuantity, removeFromCart, clearCart, getTotalAmount } = useCart();
  const { user } = useAuth();
  const { isOnline, queuedSalesCount, manualSync } = useSync();
  const { onSaleCreated } = useData();
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'UPI'>('cash');
  const [isPaid, setIsPaid] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [showTablePicker, setShowTablePicker] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  
  // Ref to track if we should print after checkout
  const printAfterCheckoutRef = useRef(false);

  // NOTE: Cart state should NEVER be cleared when table selection changes.
  // Only clearCart() should be called after successful checkout.
  // Any table dropdown/selection logic should NOT affect the cart state.

  // Load tables on mount
  useEffect(() => {
    loadTables();
  }, []);

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

      const items = cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        sellingPrice: item.sellingPrice,
      }));

      // Ensure paymentType is valid (handle 'mixed' if it exists)
      const validPaymentType: 'cash' | 'UPI' = paymentType === 'mixed' ? 'cash' : paymentType;

      const saleData = {
        date: new Date().toISOString(),
        items,
        totalAmount: Number(totalAmount.toFixed(2)),
        soldBy: user.id,
        paymentType: validPaymentType,
        isPaid,
        ...(selectedTableId && { tableId: selectedTableId }),
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
          `Your order has been queued for processing when connection is restored.\n\nLocal ID: ${sale.id}\nTotal: ₹${totalAmount.toFixed(2)}\nPayment: ${validPaymentType.toUpperCase()}\nStatus: ${isPaid ? 'Paid' : 'Pending'}\n\n${queuedSalesCount + 1} order(s) pending sync.`,
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
          paymentType: validPaymentType,
          isPaid,
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
            `Your order has been placed successfully.\n\nSale ID: ${sale.id.substring(0, 8).toUpperCase()}\nTotal: ₹${totalAmount.toFixed(2)}\nPayment: ${validPaymentType.toUpperCase()}\nStatus: ${isPaid ? 'Paid' : 'Pending'}`,
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
                  <Text style={styles.tablePickerArrow}>▼</Text>
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
              </View>
            </View>

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
                <Text style={styles.modalCloseText}>✕</Text>
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
                    <Text style={styles.tableOptionCheck}>✓</Text>
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
                    <Text style={styles.tableOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>
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
  tablePickerArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
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
  modalCloseText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
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
  tableOptionCheck: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
});

export default CartScreen;

