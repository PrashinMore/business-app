import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getSaleDetails, updateSalePayment } from '../services/sales';
import { Sale } from '../types/sales';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useProductNames } from '../hooks/useProductNames';
import { TouchableOpacity } from 'react-native';

type SaleDetailsScreenRouteProp = RouteProp<RootStackParamList, 'SaleDetails'>;
type SaleDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SaleDetails'>;

const SaleDetailsScreen: React.FC = () => {
  const navigation = useNavigation<SaleDetailsScreenNavigationProp>();
  const route = useRoute<SaleDetailsScreenRouteProp>();
  const { saleId } = route.params;

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // Extract product IDs from sale items for fetching names
  const productIds = sale?.items.map(item => item.productId) || [];

  // Fetch product names
  const { productNames, loading: productNamesLoading } = useProductNames({
    productIds,
    enabled: !!sale && productIds.length > 0,
  });

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

  const handleUpdatePaymentType = async (paymentType: 'cash' | 'UPI') => {
    if (!sale) return;

    try {
      setUpdatingPayment(true);
      const updatedSale = await updateSalePayment(sale.id, { paymentType });
      setSale(updatedSale);
      Alert.alert('Success', `Payment type updated to ${paymentType.toUpperCase()}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update payment type');
    } finally {
      setUpdatingPayment(false);
    }
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
            {sale.paymentType === 'cash' && (
              <TouchableOpacity
                style={[styles.paymentTypeButton, styles.paymentTypeButtonUPI]}
                onPress={() => handleUpdatePaymentType('UPI')}
                disabled={updatingPayment}
              >
                <Text style={styles.paymentTypeButtonText}>Switch to UPI</Text>
              </TouchableOpacity>
            )}
            {sale.paymentType === 'UPI' && (
              <TouchableOpacity
                style={[styles.paymentTypeButton, styles.paymentTypeButtonCash]}
                onPress={() => handleUpdatePaymentType('cash')}
                disabled={updatingPayment}
              >
                <Text style={styles.paymentTypeButtonText}>Switch to Cash</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

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
    </ScrollView>
  );
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  paymentTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
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
});

export default SaleDetailsScreen;

