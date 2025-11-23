import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getMenuItems } from '../services/menu';
import { Product } from '../types/menu';
import { API_BASE_URL } from '../config/api';

const MenuScreen: React.FC = () => {
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { cart, addToCart, updateQuantity } = useCart();
  const { user } = useAuth();

  useEffect(() => {
    loadMenuItems();
  }, []);

  const loadMenuItems = async () => {
    try {
      setLoading(true);
      const items = await getMenuItems();
      setMenuItems(items);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadMenuItems();
    setRefreshing(false);
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

  return (
    <View style={styles.container}>
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
            <Text style={styles.emptyText}>No menu items available</Text>
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
});

export default MenuScreen;

