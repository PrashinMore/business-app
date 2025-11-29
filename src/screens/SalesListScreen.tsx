import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { listSales, getPaymentTypeTotals } from '../services/sales';
import { Sale, SalesFilters, PaymentTypeTotals } from '../types/sales';
import { RootStackParamList } from '../navigation/AppNavigator';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const SalesListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentTotals, setPaymentTotals] = useState<PaymentTypeTotals | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter states
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [productId, setProductId] = useState('');
  const [staff, setStaff] = useState('');
  const [paymentType, setPaymentType] = useState<'' | 'cash' | 'UPI'>('');

  // Date picker states
  const [isFromDatePickerVisible, setFromDatePickerVisible] = useState(false);
  const [isToDatePickerVisible, setToDatePickerVisible] = useState(false);

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);

      const filters: SalesFilters = {};
      if (fromDate) filters.from = fromDate;
      if (toDate) filters.to = toDate;
      if (productId) filters.productId = productId;
      if (staff) filters.staff = staff;
      if (paymentType) filters.paymentType = paymentType;

      // Load sales and payment totals in parallel
      const [salesData, totalsData] = await Promise.all([
        listSales(filters),
        getPaymentTypeTotals({
          from: fromDate || undefined,
          to: toDate || undefined,
          productId: productId || undefined,
          staff: staff || undefined,
        }),
      ]);

      setSales(salesData);
      setPaymentTotals(totalsData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSales();
    setRefreshing(false);
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setProductId('');
    setStaff('');
    setPaymentType('');
    setFromDatePickerVisible(false);
    setToDatePickerVisible(false);
    setTimeout(() => loadSales(), 100);
  };

  const showFromDatePicker = () => {
    setFromDatePickerVisible(true);
  };

  const hideFromDatePicker = () => {
    setFromDatePickerVisible(false);
  };

  const handleFromDateConfirm = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    setFromDate(formattedDate);
    hideFromDatePicker();
  };

  const showToDatePicker = () => {
    setToDatePickerVisible(true);
  };

  const hideToDatePicker = () => {
    setToDatePickerVisible(false);
  };

  const handleToDateConfirm = (date: Date) => {
    const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    setToDate(formattedDate);
    hideToDatePicker();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount).toFixed(2)}`;
  };

  const getTotalItems = (sale: Sale) => {
    return sale.items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const renderSaleItem = ({ item }: { item: Sale }) => (
    <TouchableOpacity
      style={styles.saleCard}
      onPress={() => {
        // Navigate to SaleDetails screen in the root stack
        navigation.getParent()?.navigate('SaleDetails', { saleId: item.id });
      }}
    >
      <View style={styles.saleHeader}>
        <Text style={styles.saleDate}>{formatDate(item.date)}</Text>
        <Text style={styles.saleAmount}>{formatCurrency(item.totalAmount)}</Text>
      </View>

      <View style={styles.saleInfo}>
        <Text style={styles.saleItems}>{getTotalItems(item)} items</Text>
        <View style={styles.paymentInfo}>
          <View
            style={[
              styles.paymentTypeBadge,
              item.paymentType === 'UPI' && styles.paymentTypeBadgeUPI,
            ]}
          >
            <Text style={styles.paymentTypeText}>
              {item.paymentType || 'cash'?.toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.paymentStatusBadge,
              item.isPaid ? styles.paymentStatusBadgePaid : styles.paymentStatusBadgePending,
            ]}
          >
            <Text
              style={[
                styles.paymentStatusText,
                item.isPaid && styles.paymentStatusTextPaid,
              ]}
            >
              {item.isPaid ? 'Paid' : 'Pending'}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.saleId}>ID: {item.id.substring(0, 8)}...</Text>
    </TouchableOpacity>
  );

  if (loading && sales.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading sales...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters Toggle */}
      <TouchableOpacity
        style={styles.filterToggle}
        onPress={() => setShowFilters(!showFilters)}
      >
        <Text style={styles.filterToggleText}>
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Text>
      </TouchableOpacity>

      {/* Filters Section */}
      {showFilters && (
        <ScrollView style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Filters</Text>

          <TouchableOpacity style={styles.datePickerButton} onPress={showFromDatePicker}>
            <Text style={fromDate ? styles.datePickerText : styles.datePickerPlaceholder}>
              {fromDate ? formatDate(fromDate) : 'From Date'}
            </Text>
            <Text style={styles.datePickerIcon}>📅</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.datePickerButton} onPress={showToDatePicker}>
            <Text style={toDate ? styles.datePickerText : styles.datePickerPlaceholder}>
              {toDate ? formatDate(toDate) : 'To Date'}
            </Text>
            <Text style={styles.datePickerIcon}>📅</Text>
          </TouchableOpacity>

          <TextInput
            style={styles.filterInput}
            placeholder="Product ID"
            placeholderTextColor="#999"
            value={productId}
            onChangeText={setProductId}
          />

          <TextInput
            style={styles.filterInput}
            placeholder="Staff Name or ID"
            placeholderTextColor="#999"
            value={staff}
            onChangeText={setStaff}
          />

          <View style={styles.paymentTypeFilter}>
            <TouchableOpacity
              style={[
                styles.paymentTypeFilterButton,
                paymentType === 'cash' && styles.paymentTypeFilterButtonActive,
              ]}
              onPress={() => setPaymentType(paymentType === 'cash' ? '' : 'cash')}
            >
              <Text
                style={[
                  styles.paymentTypeFilterText,
                  paymentType === 'cash' && styles.paymentTypeFilterTextActive,
                ]}
              >
                Cash
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.paymentTypeFilterButton,
                paymentType === 'UPI' && styles.paymentTypeFilterButtonActive,
              ]}
              onPress={() => setPaymentType(paymentType === 'UPI' ? '' : 'UPI')}
            >
              <Text
                style={[
                  styles.paymentTypeFilterText,
                  paymentType === 'UPI' && styles.paymentTypeFilterTextActive,
                ]}
              >
                UPI
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.filterActions}>
            <TouchableOpacity style={styles.applyButton} onPress={loadSales}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Payment Type Totals */}
      {paymentTotals && (
        <View style={styles.totalsContainer}>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Cash</Text>
            <Text style={styles.totalValue}>{formatCurrency(paymentTotals.cash)}</Text>
          </View>
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>UPI</Text>
            <Text style={styles.totalValue}>{formatCurrency(paymentTotals.UPI)}</Text>
          </View>
          <View style={[styles.totalCard, styles.totalCardPrimary]}>
            <Text style={[styles.totalLabel, styles.totalLabelPrimary]}>Total</Text>
            <Text style={[styles.totalValue, styles.totalValuePrimary]}>
              {formatCurrency(paymentTotals.total)}
            </Text>
          </View>
        </View>
      )}

      {/* Sales List */}
      <FlatList
        data={sales}
        keyExtractor={(item) => item.id}
        renderItem={renderSaleItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No sales found</Text>
            <Text style={styles.emptySubtext}>
              {Object.keys({
                from: fromDate,
                to: toDate,
                productId,
                staff,
                paymentType,
              }).some((key) => {
                const filters: any = { from: fromDate, to: toDate, productId, staff, paymentType };
                return filters[key];
              })
                ? 'Try adjusting your filters'
                : 'Sales will appear here once orders are placed'}
            </Text>
          </View>
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Sales ({sales.length})</Text>
          </View>
        }
      />

      {/* Date Picker Modals */}
      <DateTimePickerModal
        isVisible={isFromDatePickerVisible}
        mode="date"
        onConfirm={handleFromDateConfirm}
        onCancel={hideFromDatePicker}
        maximumDate={toDate ? new Date(toDate) : new Date()}
        date={fromDate ? new Date(fromDate) : new Date()}
      />

      <DateTimePickerModal
        isVisible={isToDatePickerVisible}
        mode="date"
        onConfirm={handleToDateConfirm}
        onCancel={hideToDatePicker}
        minimumDate={fromDate ? new Date(fromDate) : undefined}
        date={toDate ? new Date(toDate) : new Date()}
      />
    </View>
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
  filterToggle: {
    backgroundColor: '#007AFF',
    padding: 12,
    alignItems: 'center',
  },
  filterToggleText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  filterInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  datePickerButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  datePickerText: {
    fontSize: 14,
    color: '#333',
  },
  datePickerPlaceholder: {
    fontSize: 14,
    color: '#999',
  },
  datePickerIcon: {
    fontSize: 16,
    color: '#666',
  },
  paymentTypeFilter: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 12,
  },
  paymentTypeFilterButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  paymentTypeFilterButtonActive: {
    borderColor: '#007AFF',
    backgroundColor: '#e3f2fd',
  },
  paymentTypeFilterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  paymentTypeFilterTextActive: {
    color: '#007AFF',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  applyButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  totalsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  totalCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  totalCardPrimary: {
    backgroundColor: '#007AFF',
  },
  totalLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  totalLabelPrimary: {
    color: '#fff',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValuePrimary: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  saleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  saleDate: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  saleAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  saleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleItems: {
    fontSize: 14,
    color: '#666',
  },
  paymentTypeBadge: {
    backgroundColor: '#f3e5f5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentTypeBadgeUPI: {
    backgroundColor: '#e3f2fd',
  },
  paymentTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
  },
  paymentInfo: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  paymentStatusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
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
  saleId: {
    fontSize: 11,
    color: '#999',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default SalesListScreen;

