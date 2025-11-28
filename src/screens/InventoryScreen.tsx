import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { getLowStockProducts, adjustStock, getProducts } from '../services/products';
import { Product } from '../types/menu';
import { RootStackParamList } from '../navigation/AppNavigator';

type InventoryScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const InventoryScreen: React.FC = () => {
  const navigation = useNavigation<InventoryScreenNavigationProp>();
  const { user } = useAuth();
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [activeTab, setActiveTab] = useState<'lowStock' | 'all'>('lowStock');

  useEffect(() => {
    loadData();
  }, []);

  // Refresh data when screen comes into focus (e.g., returning from ProductForm)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [lowStock, all] = await Promise.all([
        getLowStockProducts(),
        getProducts(),
      ]);
      setLowStockProducts(lowStock);
      setAllProducts(all);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustmentValue('');
    setAdjustModalVisible(true);
  };

  const handleAdjustStock = async () => {
    if (!selectedProduct) return;

    const delta = parseFloat(adjustmentValue);
    if (isNaN(delta) || delta === 0) {
      Alert.alert('Invalid Input', 'Please enter a valid non-zero number');
      return;
    }

    const newStock = selectedProduct.stock + delta;
    if (newStock < 0) {
      Alert.alert('Invalid Adjustment', 'Stock cannot be negative');
      return;
    }

    try {
      setAdjusting(true);
      await adjustStock(selectedProduct.id, delta);
      Alert.alert('Success', `Stock adjusted by ${delta > 0 ? '+' : ''}${delta}`);
      setAdjustModalVisible(false);
      setSelectedProduct(null);
      setAdjustmentValue('');
      await loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to adjust stock');
    } finally {
      setAdjusting(false);
    }
  };

  const renderLowStockProduct = ({ item }: { item: Product }) => {
    const stockPercentage = (item.stock / item.lowStockThreshold) * 100;

    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          onPress={() => openAdjustModal(item)}
          activeOpacity={0.7}
        >
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
          </View>
          <View style={styles.stockInfo}>
            <View style={styles.stockBarContainer}>
              <View
                style={[
                  styles.stockBar,
                  {
                    width: `${Math.min(stockPercentage, 100)}%`,
                    backgroundColor: stockPercentage < 50 ? '#ff3b30' : '#ff9800',
                  },
                ]}
              />
            </View>
            <Text style={styles.stockText}>
              {item.stock} / {item.lowStockThreshold} {item.unit}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.getParent()?.navigate('ProductForm', { productId: item.id })}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => openAdjustModal(item)}
          >
            <Text style={styles.adjustButtonText}>Adjust Stock</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderAllProduct = ({ item }: { item: Product }) => {
    const isLowStock = item.stock < item.lowStockThreshold;

    return (
      <View style={styles.productCard}>
        <TouchableOpacity
          onPress={() => openAdjustModal(item)}
          activeOpacity={0.7}
        >
          <View style={styles.productHeader}>
            <Text style={styles.productName}>{item.name}</Text>
            <Text style={styles.productCategory}>{item.category}</Text>
          </View>
          <View style={styles.stockInfo}>
            <Text style={[styles.stockText, isLowStock && styles.lowStockText]}>
              Stock: {item.stock} {item.unit}
            </Text>
            {isLowStock && (
              <Text style={styles.lowStockWarning}>
                Low Stock (Threshold: {item.lowStockThreshold})
              </Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.getParent()?.navigate('ProductForm', { productId: item.id })}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.adjustButton}
            onPress={() => openAdjustModal(item)}
          >
            <Text style={styles.adjustButtonText}>Adjust Stock</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && lowStockProducts.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading inventory...</Text>
      </View>
    );
  }

  const isAdmin = user?.role === 'admin';

  return (
    <View style={styles.container}>
      {isAdmin && (
        <View style={styles.manageCategoriesContainer}>
          <TouchableOpacity
            style={styles.manageCategoriesButton}
            onPress={() => navigation.getParent()?.navigate('CategoriesList')}
          >
            <Text style={styles.manageCategoriesButtonText}>📁 Manage Categories</Text>
          </TouchableOpacity>
        </View>
      )}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lowStock' && styles.activeTab]}
          onPress={() => setActiveTab('lowStock')}
        >
          <Text style={[styles.tabText, activeTab === 'lowStock' && styles.activeTabText]}>
            Low Stock
          </Text>
          {lowStockProducts.length > 0 && activeTab === 'lowStock' && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{lowStockProducts.length}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Products
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={activeTab === 'lowStock' ? lowStockProducts : allProducts}
        renderItem={activeTab === 'lowStock' ? renderLowStockProduct : renderAllProduct}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'lowStock' ? 'No low stock items' : 'No products found'}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeTab === 'lowStock'
                ? 'All products are well stocked!'
                : 'Add products to get started'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={adjustModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAdjustModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Adjust Stock</Text>
            {selectedProduct && (
              <>
                <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                <Text style={styles.modalCurrentStock}>
                  Current Stock: {selectedProduct.stock} {selectedProduct.unit}
                </Text>
                <Text style={styles.modalLabel}>
                  Adjustment (positive to add, negative to remove):
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={adjustmentValue}
                  onChangeText={setAdjustmentValue}
                  placeholder="e.g., +10 or -5"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                {adjustmentValue && !isNaN(parseFloat(adjustmentValue)) && (
                  <Text style={styles.modalPreview}>
                    New Stock: {selectedProduct.stock + parseFloat(adjustmentValue)}{' '}
                    {selectedProduct.unit}
                  </Text>
                )}
                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => {
                      setAdjustModalVisible(false);
                      setSelectedProduct(null);
                      setAdjustmentValue('');
                    }}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonConfirm]}
                    onPress={handleAdjustStock}
                    disabled={adjusting}
                  >
                    {adjusting ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.modalButtonConfirmText}>Confirm</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.getParent()?.navigate('ProductForm', { productId: undefined })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  manageCategoriesContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  manageCategoriesButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  manageCategoriesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#007AFF',
  },
  badge: {
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: '#666',
  },
  stockInfo: {
    marginBottom: 12,
  },
  stockBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  stockBar: {
    height: '100%',
    borderRadius: 4,
  },
  stockText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  lowStockText: {
    color: '#ff3b30',
  },
  lowStockWarning: {
    fontSize: 12,
    color: '#ff9800',
    marginTop: 4,
  },
  productActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  adjustButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  adjustButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  fabText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  modalProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalCurrentStock: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
    fontWeight: '600',
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalPreview: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 16,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f5f5f5',
  },
  modalButtonCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonConfirm: {
    backgroundColor: '#007AFF',
  },
  modalButtonConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default InventoryScreen;

