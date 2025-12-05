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
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Product } from '../types/menu';
import { API_BASE_URL } from '../config/api';

// Helper function to detect tablet
const isTablet = () => {
  const { width } = Dimensions.get('window');
  
  // Consider it a tablet if width is >= 600dp or if it's an iPad
  if (Platform.OS === 'ios') {
    return Platform.isPad || (width >= 768);
  }
  return width >= 600;
};

const MenuScreen: React.FC = () => {
  const { menuItems, menuLoading, menuRefreshing, loadMenu, categories, loadCategories } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const { cart, addToCart, updateQuantity } = useCart();
  const { user } = useAuth();
  const [isTabletDevice, setIsTabletDevice] = useState(false);

  // Check if device is tablet
  useEffect(() => {
    setIsTabletDevice(isTablet());
  }, []);

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
    if (product.stock <= 0) {
      Alert.alert('Out of Stock', 'This item is currently unavailable');
      return;
    }

    const cartItem = cart.find(item => item.productId === product.id);
    if (cartItem && cartItem.quantity >= product.stock) {
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

    if (newQuantity > product.stock) {
      Alert.alert('Stock Limit', 'Quantity exceeds available stock');
      return;
    }

    updateQuantity(product.id, newQuantity);
  };

  const renderMenuItem = ({ item }: { item: Product }) => {
    const cartItem = cart.find(ci => ci.productId === item.id);
    const isOutOfStock = item.stock <= 0;
    const imageUrl = item.imageUrl
      ? `${API_BASE_URL}${item.imageUrl}`
      : null;

    return (
      <View style={styles.menuItem}>
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.productImage} />
        )}
        <View style={styles.menuItemContent}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₹{Number(item.sellingPrice).toFixed(2)}</Text>
          {item.stock > 0 ? (
            <Text style={styles.stockText}>In Stock: {item.stock} {item.unit}</Text>
          ) : (
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          )}

          {isOutOfStock ? (
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
                  cartItem.quantity >= item.stock && styles.quantityButtonDisabled,
                ]}
                onPress={() => handleUpdateQuantity(item, 1)}
                disabled={cartItem.quantity >= item.stock}
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

  if (isTabletDevice) {
    // Tablet layout with sidebar
    return (
      <View style={styles.container}>
        <View style={styles.tabletLayout}>
          {/* Sidebar for categories */}
          <View style={styles.sidebar}>
            <Text style={styles.sidebarTitle}>Categories</Text>
            <ScrollView style={styles.sidebarScroll}>
              <TouchableOpacity
                style={[
                  styles.sidebarCategoryItem,
                  !selectedCategory && styles.sidebarCategoryItemSelected,
                ]}
                onPress={() => setSelectedCategory(null)}
              >
                <Text
                  style={[
                    styles.sidebarCategoryText,
                    !selectedCategory && styles.sidebarCategoryTextSelected,
                  ]}
                >
                  All Categories
                </Text>
                {!selectedCategory && (
                  <Text style={styles.sidebarCheckmark}>✓</Text>
                )}
              </TouchableOpacity>
              {categories.map((item) => (
                <TouchableOpacity
                  key={item}
                  style={[
                    styles.sidebarCategoryItem,
                    selectedCategory === item && styles.sidebarCategoryItemSelected,
                  ]}
                  onPress={() => setSelectedCategory(item === selectedCategory ? null : item)}
                >
                  <Text
                    style={[
                      styles.sidebarCategoryText,
                      selectedCategory === item && styles.sidebarCategoryTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedCategory === item && (
                    <Text style={styles.sidebarCheckmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Main content area */}
          <View style={styles.tabletMainContent}>
            {/* Search Bar */}
            <View style={styles.tabletSearchContainer}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor="#999"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {(searchQuery || selectedCategory) && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearFilters}
                >
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>

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
        </View>
      </View>
    );
  }

  // Phone layout with dropdown
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
    marginBottom: 12,
  },
  outOfStockText: {
    fontSize: 12,
    color: '#ff3b30',
    marginBottom: 12,
    fontWeight: '600',
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
  // Tablet-specific styles
  tabletLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebar: {
    width: 250,
    backgroundColor: '#fff',
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
    paddingTop: 16,
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sidebarCategoryItemSelected: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  sidebarCategoryText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  sidebarCategoryTextSelected: {
    fontWeight: '600',
    color: '#007AFF',
  },
  sidebarCheckmark: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tabletMainContent: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  tabletSearchContainer: {
    backgroundColor: '#fff',
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
});

export default MenuScreen;

