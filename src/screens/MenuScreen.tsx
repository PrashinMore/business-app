import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Product } from '../types/menu';
import { API_BASE_URL } from '../config/api';
import {
  canAddMore,
  getAvailability,
  getInventoryType,
  isInventoryTracked,
  isRecipeProduct,
} from '../services/inventory';

const MenuScreen: React.FC = () => {
  const { menuItems, menuLoading, menuRefreshing, loadMenu, categories, loadCategories } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const { cart, addToCart, updateQuantity } = useCart();
  const { user } = useAuth();

  // Initial load
  useEffect(() => {
    loadMenu();
    loadCategories();
  }, []);

  // Refresh when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Only refresh if we have data (not initial load)
      if (menuItems.length > 0) {
        const filters: { search?: string; category?: string } = {};
        if (searchQuery.trim()) filters.search = searchQuery.trim();
        if (selectedCategory) filters.category = selectedCategory;
        loadMenu(filters);
      }
    }, [searchQuery, selectedCategory])
  );

  // Debounced search effect
  useEffect(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      const filters: { search?: string; category?: string } = {};
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      if (selectedCategory) filters.category = selectedCategory;
      loadMenu(filters);
    }, 500); // 500ms debounce

    setDebounceTimer(timer);

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [searchQuery, selectedCategory]);

  const handleRefresh = async () => {
    const filters: { search?: string; category?: string } = {};
    if (searchQuery.trim()) filters.search = searchQuery.trim();
    if (selectedCategory) filters.category = selectedCategory;
    await loadMenu(filters, true);
    await loadCategories();
  };

  const loading = menuLoading;
  const refreshing = menuRefreshing;

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const handleAddToCart = (product: Product) => {
    // Only SIMPLE+tracked items are blocked on the client. For RECIPE the
    // backend validates ingredient stock at checkout — blocking here would
    // prevent cashiers from ever selling recipe-driven dishes.
    const simpleOutOfStock =
      isInventoryTracked(product) && !isRecipeProduct(product) && product.stock <= 0;
    if (simpleOutOfStock) {
      Alert.alert('Out of Stock', 'This item is currently unavailable');
      return;
    }

    const cartItem = cart.find(item => item.productId === product.id);
    if (cartItem && !canAddMore(product, cartItem.quantity)) {
      Alert.alert('Stock Limit', 'Cannot add more. Stock limit reached.');
      return;
    }

    addToCart(product);
  };

  const handleUpdateQuantity = (product: Product, change: number) => {
    const cartItem = cart.find(item => item.productId === product.id);
    if (!cartItem) {
      if (change > 0) {
        handleAddToCart(product);
      }
      return;
    }

    const newQuantity = cartItem.quantity + change;
    if (newQuantity <= 0) {
      updateQuantity(product.id, 0);
      return;
    }

    // Only SIMPLE+tracked items have a meaningful client-side cap.
    if (
      isInventoryTracked(product) &&
      !isRecipeProduct(product) &&
      newQuantity > product.stock
    ) {
      Alert.alert('Stock Limit', 'Quantity exceeds available stock');
      return;
    }

    updateQuantity(product.id, newQuantity);
  };

  const renderMenuItem = ({ item }: { item: Product }) => {
    const cartItem = cart.find(ci => ci.productId === item.id);
    const inventoryType = getInventoryType(item);
    const tracked = isInventoryTracked(item);
    const availability = getAvailability(item);
    // Only SIMPLE+tracked items can be "out of stock" on the client. RECIPE
    // items rely on backend validation; untracked items are always sellable.
    const isHardOutOfStock =
      tracked && inventoryType === 'SIMPLE' && item.stock <= 0;
    const canIncrement = cartItem ? canAddMore(item, cartItem.quantity) : true;

    const imageUrl = item.imageUrl
      ? `${API_BASE_URL}${item.imageUrl}`
      : null;

    // Stock / availability line. SIMPLE shows a numeric count; RECIPE shows
    // a colour-coded badge (numeric count would be misleading since it comes
    // from ingredients, not the dish itself).
    let stockLine: React.ReactNode;
    if (!tracked) {
      stockLine = <Text style={styles.availabilityUntracked}>Always available</Text>;
    } else if (inventoryType === 'RECIPE') {
      if (availability === 'out') {
        stockLine = <Text style={styles.availabilityOut}>❌ Out of stock</Text>;
      } else if (availability === 'low') {
        stockLine = <Text style={styles.availabilityLow}>⚠️ Low stock</Text>;
      } else {
        stockLine = <Text style={styles.availabilityOk}>✅ Available</Text>;
      }
    } else if (item.stock > 0) {
      const low = availability === 'low';
      stockLine = (
        <Text style={low ? styles.availabilityLow : styles.stockText}>
          {low ? '⚠️ ' : ''}In stock: {item.stock} {item.unit}
        </Text>
      );
    } else {
      stockLine = <Text style={styles.outOfStockText}>Out of Stock</Text>;
    }

    return (
      <View style={styles.menuItem}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.productImage} />
        )}
        <View style={styles.menuItemContent}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₹{Number(item.sellingPrice).toFixed(2)}</Text>
          <View style={styles.availabilityRow}>{stockLine}</View>

          {isHardOutOfStock ? (
            <Text style={styles.disabledButton}>Unavailable</Text>
          ) : cartItem ? (
            <View style={styles.quantityControls}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => handleUpdateQuantity(item, -1)}
              >
                <Text style={styles.quantityButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityText}>{cartItem.quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.quantityButton,
                  !canIncrement && styles.quantityButtonDisabled,
                ]}
                onPress={() => handleUpdateQuantity(item, 1)}
                disabled={!canIncrement}
              >
                <Text style={styles.quantityButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => handleAddToCart(item)}
            >
              <Text style={styles.addButtonText}>Add to Cart</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.filterContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity
          style={[styles.categoryButton, selectedCategory && styles.categoryButtonActive]}
          onPress={() => setCategoryModalVisible(true)}
        >
          <Text style={[styles.categoryButtonText, selectedCategory && styles.categoryButtonTextActive]}>
            {selectedCategory || 'All Categories'}
          </Text>
          <Text style={styles.categoryButtonArrow}>▼</Text>
        </TouchableOpacity>
        {(searchQuery || selectedCategory) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearFilters}
          >
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Selection Modal */}
      <Modal
        visible={categoryModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    selectedCategory === item && styles.categoryOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(item === selectedCategory ? null : item);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      selectedCategory === item && styles.categoryOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedCategory === item && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[
                    styles.categoryOption,
                    !selectedCategory && styles.categoryOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(null);
                    setCategoryModalVisible(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      !selectedCategory && styles.categoryOptionTextSelected,
                    ]}
                  >
                    All Categories
                  </Text>
                  {!selectedCategory && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

      <FlatList
        data={menuItems}
        keyExtractor={item => item.id}
        renderItem={renderMenuItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory
                ? 'No menu items found matching your filters'
                : 'No menu items available'}
            </Text>
            {(searchQuery || selectedCategory) && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={handleClearFilters}
              >
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
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
  listContent: {
    padding: 16,
  },
  menuItem: {
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
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: '#f0f0f0',
  },
  menuItemContent: {
    flex: 1,
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
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  stockText: {
    fontSize: 12,
    color: '#666',
  },
  outOfStockText: {
    fontSize: 12,
    color: '#ff3b30',
    fontWeight: '600',
  },
  availabilityRow: {
    marginBottom: 12,
  },
  availabilityOk: {
    fontSize: 12,
    color: '#15803d',
    fontWeight: '600',
  },
  availabilityLow: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '600',
  },
  availabilityOut: {
    fontSize: 12,
    color: '#ff3b30',
    fontWeight: '600',
  },
  availabilityUntracked: {
    fontSize: 12,
    color: '#94a3b8',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  quantityButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#ccc',
  },
  quantityButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '600',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    color: '#999',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 120,
  },
  categoryButtonActive: {
    backgroundColor: '#e3f2fd',
    borderColor: '#007AFF',
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  categoryButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  categoryButtonArrow: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
  },
  clearButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  clearButtonText: {
    color: '#fff',
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
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  categoryOptionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  categoryOptionTextSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  clearFiltersButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default MenuScreen;

