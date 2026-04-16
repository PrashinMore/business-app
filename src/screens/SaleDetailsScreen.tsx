import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Platform,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { getSaleDetails, updateSalePayment } from '../services/sales';
import { Sale } from '../types/sales';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useProductNames } from '../hooks/useProductNames';
import { useAuth } from '../context/AuthContext';
import { BillData, BillItem } from './PrintBillScreen';

type SaleDetailsScreenRouteProp = RouteProp<RootStackParamList, 'SaleDetails'>;
type SaleDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SaleDetails'>;

const SaleDetailsScreen: React.FC = () => {
  const navigation = useNavigation<SaleDetailsScreenNavigationProp>();
  const route = useRoute<SaleDetailsScreenRouteProp>();
  const { saleId } = route.params;
  const { user } = useAuth();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [splitCashAmount, setSplitCashAmount] = useState('');
  const [splitUpiAmount, setSplitUpiAmount] = useState('');
  const [showPaymentModePicker, setShowPaymentModePicker] = useState(false);

  // Extract product IDs from sale items for fetching names
  const productIds = sale?.items.map(item => item.productId) || [];

  // Fetch product names
  const { productNames, loading: productNamesLoading } = useProductNames({
    productIds,
    enabled: !!sale && productIds.length > 0,
  });

  // Function to navigate to print bill screen
  const handlePrintBill = () => {
    if (!sale) return;

    const billItems: BillItem[] = sale.items.map(item => ({
      name: productNames.get(item.productId) || `Product ${item.productId.substring(0, 8)}`,
      quantity: item.quantity,
      price: Number(item.sellingPrice),
      subtotal: Number(item.subtotal),
    }));

    const billData: BillData = {
      saleId: sale.id,
      date: sale.date,
      items: billItems,
      subtotal: Number(sale.totalAmount),
      totalAmount: Number(sale.totalAmount),
      paymentType: (sale.paymentType as 'cash' | 'UPI' | 'mixed') || 'cash',
      isPaid: sale.isPaid,
      cashierName: user?.name,
    };

    navigation.navigate('PrintBill', { billData });
  };

  useEffect(() => {
    loadSaleDetails();
  }, [saleId]);

  const loadSaleDetails = async () => {
    try {
      setLoading(true);
      const saleData = await getSaleDetails(saleId);
      setSale(saleData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load sale details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSaleDetails();
    setRefreshing(false);
  };

  const handleUpdatePayment = async (isPaid: boolean) => {
    if (!sale) return;

    try {
      setUpdatingPayment(true);
      const updatedSale = await updateSalePayment(sale.id, { isPaid });
      setSale(updatedSale);
      Alert.alert('Success', `Payment status updated to ${isPaid ? 'Paid' : 'Pending'}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update payment status');
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleUpdatePaymentType = async (paymentType: 'cash' | 'UPI' | 'mixed') => {
    if (!sale) return;

    try {
      setUpdatingPayment(true);
      if (paymentType === 'mixed') {
        const cashAmount = Number(splitCashAmount || '0');
        const upiAmount = Number(splitUpiAmount || '0');
        const totalPaid = Number((cashAmount + upiAmount).toFixed(2));
        const totalAmount = Number(sale.totalAmount);

        if (cashAmount < 0 || upiAmount < 0) {
          Alert.alert('Invalid split', 'Cash and UPI amounts cannot be negative.');
          setUpdatingPayment(false);
          return;
        }
        if (totalPaid <= 0) {
          Alert.alert('Invalid split', 'Enter cash and/or UPI amount.');
          setUpdatingPayment(false);
          return;
        }
        if (totalPaid > totalAmount) {
          Alert.alert('Invalid split', 'Split amount cannot exceed sale total.');
          setUpdatingPayment(false);
          return;
        }

        const updatedSale = await updateSalePayment(sale.id, {
          paymentType: 'mixed',
          cashAmount: Number(cashAmount.toFixed(2)),
          upiAmount: Number(upiAmount.toFixed(2)),
          isPaid: Number(totalPaid.toFixed(2)) === Number(totalAmount.toFixed(2)),
        });
        setSale(updatedSale);
        Alert.alert('Success', 'Payment type updated to MIXED');
      } else {
        const updatedSale = await updateSalePayment(sale.id, { paymentType });
        setSale(updatedSale);
        Alert.alert('Success', `Payment type updated to ${paymentType.toUpperCase()}`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update payment type');
    } finally {
      setUpdatingPayment(false);
    }
  };

  useEffect(() => {
    if (!sale) return;
    setSplitCashAmount(String(Number(sale.cashAmount || 0)));
    setSplitUpiAmount(String(Number(sale.upiAmount || 0)));
  }, [sale?.id, sale?.cashAmount, sale?.upiAmount]);

  const getPaymentModeLabel = (mode: 'cash' | 'UPI' | 'mixed') => {
    if (mode === 'cash') return 'All Cash';
    if (mode === 'UPI') return 'All UPI';
    return 'Mixed Split';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading sale details...</Text>
      </View>
    );
  }

  if (!sale) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Sale not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sale Details</Text>
      </View>

      {/* Sale Information Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sale Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Sale ID:</Text>
          <Text style={[styles.infoValue, styles.saleId]}>{sale.id}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Date:</Text>
          <Text style={styles.infoValue}>{formatDate(sale.date)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Amount:</Text>
          <Text style={[styles.infoValue, styles.totalAmount]}>
            {formatCurrency(sale.totalAmount)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Type:</Text>
          <View style={styles.paymentTypeContainer}>
            <TouchableOpacity
              style={[
                styles.paymentTypeBadge,
                sale.paymentType === 'UPI' && styles.paymentTypeBadgeUPI,
              ]}
              onPress={() => {
                if (sale.paymentType !== 'cash') {
                  handleUpdatePaymentType('cash');
                }
              }}
              disabled={updatingPayment}
            >
              <Text style={styles.paymentTypeText}>
                {(sale.paymentType || 'cash').toUpperCase()}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.paymentTypeButton, styles.paymentTypeButtonSelector]}
              onPress={() => setShowPaymentModePicker((prev) => !prev)}
              disabled={updatingPayment}
            >
              <Text style={styles.paymentTypeButtonText}>Change Mode</Text>
            </TouchableOpacity>
          </View>
        </View>
        {showPaymentModePicker && (
          <View style={styles.paymentModeDropdown}>
            {(['cash', 'UPI', 'mixed'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.paymentModeOption,
                  sale.paymentType === mode && styles.paymentModeOptionActive,
                ]}
                onPress={() => {
                  setShowPaymentModePicker(false);
                  if (sale.paymentType !== mode) {
                    handleUpdatePaymentType(mode);
                  }
                }}
                disabled={updatingPayment}
              >
                <Text
                  style={[
                    styles.paymentModeOptionText,
                    sale.paymentType === mode && styles.paymentModeOptionTextActive,
                  ]}
                >
                  {getPaymentModeLabel(mode)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        {sale.paymentType === 'mixed' && (
          <View style={styles.splitSection}>
            <View style={styles.splitInputWrap}>
              <Text style={styles.splitLabel}>Cash</Text>
              <TextInput
                style={styles.splitInput}
                keyboardType="decimal-pad"
                value={splitCashAmount}
                onChangeText={setSplitCashAmount}
                placeholder="0.00"
              />
            </View>
            <View style={styles.splitInputWrap}>
              <Text style={styles.splitLabel}>UPI</Text>
              <TextInput
                style={styles.splitInput}
                keyboardType="decimal-pad"
                value={splitUpiAmount}
                onChangeText={setSplitUpiAmount}
                placeholder="0.00"
              />
            </View>
            <TouchableOpacity
              style={[styles.paymentTypeButton, styles.paymentTypeButtonMixed]}
              onPress={() => handleUpdatePaymentType('mixed')}
              disabled={updatingPayment}
            >
              <Text style={styles.paymentTypeButtonText}>
                {updatingPayment ? 'Updating...' : 'Update Split'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Status:</Text>
          <View style={styles.paymentStatusContainer}>
            <View
              style={[
                styles.paymentStatusBadge,
                sale.isPaid ? styles.paymentStatusBadgePaid : styles.paymentStatusBadgePending,
              ]}
            >
              <Text
                style={[
                  styles.paymentStatusText,
                  sale.isPaid && styles.paymentStatusTextPaid,
                ]}
              >
                {sale.isPaid ? 'Paid' : 'Pending'}
              </Text>
            </View>
            {!sale.isPaid && (
              <TouchableOpacity
                style={styles.markPaidButton}
                onPress={() => handleUpdatePayment(true)}
                disabled={updatingPayment}
              >
                <Text style={styles.markPaidButtonText}>
                  {updatingPayment ? 'Updating...' : 'Mark as Paid'}
                </Text>
              </TouchableOpacity>
            )}
            {sale.isPaid && (
              <TouchableOpacity
                style={styles.markPendingButton}
                onPress={() => handleUpdatePayment(false)}
                disabled={updatingPayment}
              >
                <Text style={styles.markPendingButtonText}>
                  {updatingPayment ? 'Updating...' : 'Mark as Pending'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Total Items:</Text>
          <Text style={styles.infoValue}>
            {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
          </Text>
        </View>
      </View>

      {/* Items Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Items ({sale.items.length})</Text>
        
        {sale.items.map((item, index) => (
          <View key={item.id} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemNumber}>#{index + 1}</Text>
              <Text style={styles.itemSubtotal}>
                {formatCurrency(item.subtotal)}
              </Text>
            </View>
            
            <View style={styles.itemDetails}>
              <View style={styles.itemDetailRow}>
                <Text style={styles.itemDetailLabel}>Product:</Text>
                <Text style={styles.itemDetailValue}>
                  {productNames.get(item.productId) || `Loading... (${item.productId.substring(0, 8)}...)`}
                </Text>
              </View>
              
              <View style={styles.itemDetailRow}>
                <Text style={styles.itemDetailLabel}>Quantity:</Text>
                <Text style={styles.itemDetailValue}>{item.quantity}</Text>
              </View>
              
              <View style={styles.itemDetailRow}>
                <Text style={styles.itemDetailLabel}>Price per unit:</Text>
                <Text style={styles.itemDetailValue}>
                  {formatCurrency(item.sellingPrice)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>

      {/* Print Bill Button */}
      <TouchableOpacity
        style={styles.printButton}
        onPress={handlePrintBill}
        disabled={productNamesLoading}
      >
        <Ionicons name="print" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.printButtonText}>
          {productNamesLoading ? 'Loading...' : 'Print Receipt'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// Create shadow styles separately to avoid react-native-web warnings
const cardShadow = Platform.OS === 'web' 
  ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)' }
  : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    };

const printButtonShadow = Platform.OS === 'web'
  ? { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.15)' }
  : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 4,
    };

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    ...cardShadow,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  saleId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentTypeBadge: {
    backgroundColor: '#f3e5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentTypeBadgeUPI: {
    backgroundColor: '#e3f2fd',
  },
  paymentTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  paymentTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  paymentTypeButtonUPI: {
    borderColor: '#2196F3',
    backgroundColor: '#e3f2fd',
  },
  paymentTypeButtonCash: {
    borderColor: '#9C27B0',
    backgroundColor: '#f3e5f5',
  },
  paymentTypeButtonMixed: {
    borderColor: '#ff9800',
    backgroundColor: '#fff3e0',
  },
  paymentTypeButtonSelector: {
    borderColor: '#9ca3af',
    backgroundColor: '#f9fafb',
  },
  paymentTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  splitSection: {
    marginTop: 10,
    gap: 8,
    alignItems: 'flex-end',
  },
  splitInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  splitLabel: {
    width: 44,
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  splitInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
  paymentModeDropdown: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  paymentModeOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  paymentModeOptionActive: {
    backgroundColor: '#eef6ff',
  },
  paymentModeOptionText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  paymentModeOptionTextActive: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  paymentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentStatusBadgePending: {
    backgroundColor: '#fff3cd',
  },
  paymentStatusBadgePaid: {
    backgroundColor: '#d4edda',
  },
  paymentStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },
  paymentStatusTextPaid: {
    color: '#155724',
  },
  markPaidButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markPaidButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  markPendingButton: {
    backgroundColor: '#ffc107',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  markPendingButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
  },
  itemCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  itemSubtotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  itemDetails: {
    gap: 8,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemDetailLabel: {
    fontSize: 14,
    color: '#666',
  },
  itemDetailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    textAlign: 'center',
    padding: 20,
  },
  printButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a2e',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 16,
    gap: 10,
    ...printButtonShadow,
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default SaleDetailsScreen;

