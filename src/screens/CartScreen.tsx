import React, { useState } from 'react';
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
} from 'react-native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../context/SyncContext';
import { checkout } from '../services/menu';
import { CartItem } from '../types/menu';
import { API_BASE_URL } from '../config/api';

const CartScreen: React.FC = () => {
  const { cart, updateQuantity, removeFromCart, clearCart, getTotalAmount } = useCart();
  const { user } = useAuth();
  const { isOnline, queuedSalesCount, manualSync } = useSync();
  const [checkingOut, setCheckingOut] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'UPI'>('cash');
  const [isPaid, setIsPaid] = useState(false);

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

      const saleData = {
        date: new Date().toISOString(),
        items,
        totalAmount: Number(totalAmount.toFixed(2)),
        soldBy: user.id,
        paymentType,
        isPaid,
      };

      const sale = await checkout(saleData);

      // Check if sale was queued offline
      if ('offline' in sale && sale.offline) {
        // Clear cart on success (even if offline)
        clearCart();

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
        // Clear cart on success (online sale)
        clearCart();

        Alert.alert(
          'Order Placed!',
          `Your order has been placed successfully.\n\nSale ID: ${sale.id}\nTotal: ₹${totalAmount.toFixed(2)}\nPayment: ${paymentType.toUpperCase()}\nStatus: ${isPaid ? 'Paid' : 'Pending'}`,
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      Alert.alert('Checkout Failed', error.message || 'An error occurred during checkout');
    } finally {
      setCheckingOut(false);
    }
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
  checkoutButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  checkoutButtonDisabled: {
    opacity: 0.6,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
});

export default CartScreen;

