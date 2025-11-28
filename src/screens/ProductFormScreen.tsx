import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import {
  getProducts,
  createProduct,
  updateProduct,
  CreateProductData,
  UpdateProductData,
} from '../services/products';
import { useCategories } from '../hooks/useCategories';
import { Category } from '../types/categories';
import { RootStackParamList } from '../navigation/AppNavigator';
import { API_BASE_URL } from '../config/api';

type ProductFormScreenRouteProp = RouteProp<RootStackParamList, 'ProductForm'>;
type ProductFormScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProductForm'>;

const ProductFormScreen: React.FC = () => {
  const navigation = useNavigation<ProductFormScreenNavigationProp>();
  const route = useRoute<ProductFormScreenRouteProp>();
  const { user } = useAuth();
  const productId = route.params?.productId;

  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(!!productId);
  const [image, setImage] = useState<any>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    category: '',
    costPrice: '',
    sellingPrice: '',
    stock: '',
    unit: '',
    lowStockThreshold: '',
  });

  // Fetch categories
  const { categories, loading: categoriesLoading } = useCategories({ autoLoad: true });

  useEffect(() => {
    if (productId) {
      loadProduct();
    }
  }, [productId]);

  const loadProduct = async () => {
    try {
      setLoadingProduct(true);
      const products = await getProducts();
      const product = products.find(p => p.id === productId);
      
      if (!product) {
        Alert.alert('Error', 'Product not found');
        navigation.goBack();
        return;
      }

      setFormData({
        name: product.name,
        category: product.category,
        costPrice: product.costPrice.toString(),
        sellingPrice: product.sellingPrice.toString(),
        stock: product.stock.toString(),
        unit: product.unit,
        lowStockThreshold: product.lowStockThreshold.toString(),
      });
      if (product.imageUrl) {
        setExistingImageUrl(product.imageUrl);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load product');
      navigation.goBack();
    } finally {
      setLoadingProduct(false);
    }
  };

  const pickImage = async () => {
    try {
      // Try to import expo-image-picker dynamically
      const ImagePicker = await import('expo-image-picker');
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImage(result.assets[0]);
        setExistingImageUrl(null);
      }
    } catch (error) {
      Alert.alert(
        'Image Picker Not Available',
        'Please install expo-image-picker to enable image uploads. Run: npx expo install expo-image-picker'
      );
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required');
      return;
    }
    if (!formData.category.trim()) {
      Alert.alert('Validation Error', 'Category is required');
      return;
    }
    if (!formData.costPrice || parseFloat(formData.costPrice) <= 0) {
      Alert.alert('Validation Error', 'Cost price must be greater than 0');
      return;
    }
    if (!formData.sellingPrice || parseFloat(formData.sellingPrice) <= 0) {
      Alert.alert('Validation Error', 'Selling price must be greater than 0');
      return;
    }
    if (!formData.stock || parseFloat(formData.stock) < 0) {
      Alert.alert('Validation Error', 'Stock must be 0 or greater');
      return;
    }
    if (!formData.unit.trim()) {
      Alert.alert('Validation Error', 'Unit is required');
      return;
    }
    if (!formData.lowStockThreshold || parseFloat(formData.lowStockThreshold) < 0) {
      Alert.alert('Validation Error', 'Low stock threshold must be 0 or greater');
      return;
    }

    try {
      setLoading(true);

      const productData = {
        name: formData.name.trim(),
        category: formData.category.trim(),
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        stock: parseFloat(formData.stock),
        unit: formData.unit.trim(),
        lowStockThreshold: parseFloat(formData.lowStockThreshold),
        imageUrl: existingImageUrl,
      };

      if (productId) {
        await updateProduct(productId, productData, image || undefined);
        Alert.alert('Success', 'Product updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createProduct(productData, image || undefined);
        Alert.alert('Success', 'Product created successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  if (loadingProduct) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading product...</Text>
      </View>
    );
  }

  const displayImage = image
    ? { uri: image.uri }
    : existingImageUrl
    ? { uri: existingImageUrl.startsWith('http') ? existingImageUrl : `${API_BASE_URL}${existingImageUrl}` }
    : null;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Product Image</Text>
        <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
          {displayImage ? (
            <Image source={displayImage} style={styles.image} />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>Tap to add image</Text>
            </View>
          )}
        </TouchableOpacity>
        {(image || existingImageUrl) && (
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={() => {
              setImage(null);
              setExistingImageUrl(null);
            }}
          >
            <Text style={styles.removeImageText}>Remove Image</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="Enter product name"
          placeholderTextColor="#999"
        />

        <Text style={styles.label}>Category *</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setCategoryModalVisible(true)}
        >
          <Text style={[styles.dropdownText, !formData.category && styles.dropdownPlaceholder]}>
            {formData.category || 'Select a category'}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

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
              {categoriesLoading ? (
                <View style={styles.modalLoadingContainer}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.modalLoadingText}>Loading categories...</Text>
                </View>
              ) : (
                <FlatList
                  data={categories}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[
                        styles.categoryOption,
                        formData.category === item.name && styles.categoryOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, category: item.name });
                        setCategoryModalVisible(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          formData.category === item.name && styles.categoryOptionTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      {item.isRawMaterial && (
                        <View style={styles.rawMaterialBadge}>
                          <Text style={styles.rawMaterialBadgeText}>Raw Material</Text>
                        </View>
                      )}
                      {formData.category === item.name && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    <View style={styles.modalEmptyContainer}>
                      <Text style={styles.modalEmptyText}>No categories available</Text>
                      <Text style={styles.modalEmptySubtext}>
                        Create categories in the Inventory management section
                      </Text>
                    </View>
                  }
                />
              )}
            </View>
          </View>
        </Modal>

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Cost Price *</Text>
            <TextInput
              style={styles.input}
              value={formData.costPrice}
              onChangeText={(text) => setFormData({ ...formData, costPrice: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Selling Price *</Text>
            <TextInput
              style={styles.input}
              value={formData.sellingPrice}
              onChangeText={(text) => setFormData({ ...formData, sellingPrice: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Stock *</Text>
            <TextInput
              style={styles.input}
              value={formData.stock}
              onChangeText={(text) => setFormData({ ...formData, stock: text })}
              placeholder="0"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Unit *</Text>
            <TextInput
              style={styles.input}
              value={formData.unit}
              onChangeText={(text) => setFormData({ ...formData, unit: text })}
              placeholder="e.g., kg, liters, pieces"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        <Text style={styles.label}>Low Stock Threshold *</Text>
        <TextInput
          style={styles.input}
          value={formData.lowStockThreshold}
          onChangeText={(text) => setFormData({ ...formData, lowStockThreshold: text })}
          placeholder="Alert when stock falls below this number"
          keyboardType="numeric"
          placeholderTextColor="#999"
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {productId ? 'Update Product' : 'Create Product'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e0e0e0',
  },
  imagePlaceholderText: {
    color: '#999',
    fontSize: 16,
  },
  removeImageButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#ff3b30',
    borderRadius: 6,
    marginBottom: 16,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dropdown: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  dropdownPlaceholder: {
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
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
  modalLoadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalLoadingText: {
    marginTop: 12,
    color: '#666',
    fontSize: 14,
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
  rawMaterialBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  rawMaterialBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#e65100',
  },
  checkmark: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  modalEmptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  modalEmptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default ProductFormScreen;

