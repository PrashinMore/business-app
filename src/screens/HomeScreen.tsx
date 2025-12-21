import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useData } from '../context/DataContext';
import { RootStackParamList } from '../navigation/AppNavigator';
import { SalesTrendRange } from '../types/dashboard';
import { API_BASE_URL } from '../config/api';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { user } = useAuth();
  const { getCartItemCount, getTotalAmount } = useCart();
  const { dashboard, dashboardLoading, dashboardRefreshing, loadDashboard } = useData();
  
  const [trendRange, setTrendRange] = useState<SalesTrendRange>('7days');

  const cartItemCount = getCartItemCount();
  const cartTotal = getTotalAmount();

  // Use ref to track if dashboard has been loaded to avoid infinite loops
  const hasLoadedRef = React.useRef(false);
  const isLoadingRef = React.useRef(false);

  // Load dashboard on mount and when trend range changes
  useEffect(() => {
    if (!isLoadingRef.current) {
      isLoadingRef.current = true;
      loadDashboard(trendRange).finally(() => {
        isLoadingRef.current = false;
        hasLoadedRef.current = true;
      });
    }
  }, [trendRange, loadDashboard]);

  // Refresh when screen comes into focus (only if already loaded once and not currently loading)
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we have already loaded data at least once and not currently loading
      if (hasLoadedRef.current && !isLoadingRef.current) {
        isLoadingRef.current = true;
        loadDashboard(trendRange).finally(() => {
          isLoadingRef.current = false;
        });
      }
    }, [trendRange, loadDashboard])
  );

  const handleRefresh = async () => {
    await loadDashboard(trendRange, true);
  };

  // Extract data from context
  const { summary, salesTrend, topProducts, lowStock, expensesSummary } = dashboard;
  const loading = dashboardLoading;
  const refreshing = dashboardRefreshing;

  const getMaxSalesValue = () => {
    if (salesTrend.length === 0) return 100;
    return Math.max(...salesTrend.map(d => d.totalSales), 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const maxSales = getMaxSalesValue();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{user.name}</Text>
      </View>

      {/* Quick Stats - Cart */}
      <View style={styles.quickStatsContainer}>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>🛒</Text>
          <Text style={styles.quickStatValue}>{cartItemCount}</Text>
          <Text style={styles.quickStatLabel}>Items in Cart</Text>
        </View>
        <View style={styles.quickStatCard}>
          <Text style={styles.quickStatIcon}>💰</Text>
          <Text style={styles.quickStatValue}>₹{cartTotal.toFixed(0)}</Text>
          <Text style={styles.quickStatLabel}>Cart Total</Text>
        </View>
      </View>

      {/* Today's Summary */}
      {summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Summary</Text>
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.salesCard]}>
              <Text style={styles.summaryLabel}>Total Sales</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalSales)}</Text>
              <Text style={styles.summaryIcon}>💵</Text>
            </View>
            <View style={[styles.summaryCard, styles.profitCard]}>
              <Text style={styles.summaryLabel}>Net Profit</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.netProfit)}</Text>
              <Text style={styles.summaryIcon}>📈</Text>
            </View>
            <View style={[styles.summaryCard, styles.ordersCard]}>
              <Text style={styles.summaryLabel}>Total Orders</Text>
              <Text style={styles.summaryValue}>{summary.totalOrders}</Text>
              <Text style={styles.summaryIcon}>📦</Text>
            </View>
            <View style={[styles.summaryCard, styles.expensesCard]}>
              <Text style={styles.summaryLabel}>Expenses</Text>
              <Text style={styles.summaryValue}>{formatCurrency(summary.totalExpenses)}</Text>
              <Text style={styles.summaryIcon}>💸</Text>
            </View>
          </View>
          
          {/* Additional Metrics */}
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Gross Profit</Text>
              <Text style={styles.metricValue}>{formatCurrency(summary.grossProfit)}</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>COGS</Text>
              <Text style={styles.metricValue}>{formatCurrency(summary.costOfGoodsSold)}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Sales Trend */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sales Trend</Text>
          <View style={styles.rangeToggle}>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                trendRange === '7days' && styles.rangeButtonActive,
              ]}
              onPress={() => setTrendRange('7days')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  trendRange === '7days' && styles.rangeButtonTextActive,
                ]}
              >
                7 Days
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.rangeButton,
                trendRange === '30days' && styles.rangeButtonActive,
              ]}
              onPress={() => setTrendRange('30days')}
            >
              <Text
                style={[
                  styles.rangeButtonText,
                  trendRange === '30days' && styles.rangeButtonTextActive,
                ]}
              >
                30 Days
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.trendCard}>
          {salesTrend.length === 0 ? (
            <Text style={styles.emptyText}>No sales data available</Text>
          ) : (
            <View style={styles.trendChart}>
              {salesTrend.map((day, index) => {
                const heightPercent = (day.totalSales / maxSales) * 100;
                const barHeight = Math.max((heightPercent / 100) * 150, 20); // Max 150px height
                return (
                  <View key={index} style={styles.trendBarContainer}>
                    <View
                      style={[
                        styles.trendBar,
                        { height: barHeight },
                      ]}
                    />
                    <Text style={styles.trendDateLabel} numberOfLines={1}>
                      {formatDate(day.date)}
                    </Text>
                    <Text style={styles.trendValueLabel}>
                      {formatCurrency(day.totalSales)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Products (Last 30 Days)</Text>
          <View style={styles.topProductsCard}>
            {topProducts.map((product, index) => (
              <View key={product.productId} style={styles.topProductItem}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>#{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={styles.topProductName} numberOfLines={1}>
                    {product.productName}
                  </Text>
                  <Text style={styles.topProductDetails}>
                    Qty: {product.totalQuantity} | Revenue: {formatCurrency(product.totalRevenue)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Low Stock Alerts */}
      {lowStock.length > 0 && (
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Inventory')}
            style={styles.sectionHeader}
          >
            <Text style={styles.sectionTitle}>⚠️ Low Stock Alerts</Text>
            <Text style={styles.viewAllText}>View All ›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.lowStockCard}
            onPress={() => navigation.navigate('Inventory')}
          >
            {lowStock.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.lowStockItem}>
                <View style={styles.lowStockInfo}>
                  <Text style={styles.lowStockName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.lowStockDetails}>
                    Stock: {item.stock} {item.unit} (Threshold: {item.lowStockThreshold})
                  </Text>
                </View>
                <View
                  style={[
                    styles.lowStockBadge,
                    item.stock === 0 && styles.lowStockBadgeCritical,
                  ]}
                >
                  <Text style={styles.lowStockBadgeText}>
                    {item.stock === 0 ? 'OUT' : 'LOW'}
                  </Text>
                </View>
              </View>
            ))}
            {lowStock.length > 5 && (
              <Text style={styles.moreItemsText}>
                +{lowStock.length - 5} more items
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Expenses Summary */}
      {expensesSummary.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expenses by Category (Last Month)</Text>
          <View style={styles.expensesCard}>
            {expensesSummary.map((expense, index) => (
              <View key={index} style={styles.expenseItem}>
                <View style={styles.expenseInfo}>
                  <Text style={styles.expenseCategory}>{expense.category}</Text>
                  <Text style={styles.expensePercentage}>{expense.percentage.toFixed(1)}%</Text>
                </View>
                <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
                <View style={styles.expenseBarContainer}>
                  <View
                    style={[
                      styles.expenseBar,
                      { width: `${expense.percentage}%` },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
      )}
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
  welcomeText: {
    fontSize: 20,
    color: '#666',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  quickStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickStatIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  quickStatLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  viewAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  salesCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  profitCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  ordersCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  expensesCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  summaryIcon: {
    fontSize: 24,
    alignSelf: 'flex-end',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  rangeToggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 2,
  },
  rangeButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rangeButtonActive: {
    backgroundColor: '#007AFF',
  },
  rangeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  rangeButtonTextActive: {
    color: '#fff',
  },
  trendCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trendChart: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    minHeight: 200,
    paddingVertical: 16,
  },
  trendBarContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  trendBar: {
    width: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
    minHeight: 20,
    marginBottom: 8,
  },
  trendDateLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  trendValueLabel: {
    fontSize: 10,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  topProductsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topProductRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topProductRankText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  topProductDetails: {
    fontSize: 12,
    color: '#666',
  },
  lowStockCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lowStockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  lowStockInfo: {
    flex: 1,
    marginRight: 12,
  },
  lowStockName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  lowStockDetails: {
    fontSize: 12,
    color: '#666',
  },
  lowStockBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lowStockBadgeCritical: {
    backgroundColor: '#F44336',
  },
  lowStockBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  moreItemsText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  expensesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  expenseItem: {
    marginBottom: 16,
  },
  expenseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  expenseCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  expensePercentage: {
    fontSize: 12,
    color: '#666',
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  expenseBarContainer: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  expenseBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 3,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
});

export default HomeScreen;
