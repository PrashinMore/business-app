import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { useData } from '../context/DataContext';
import {
  getProducts,
  createProduct,
  updateProduct,
  getProductSuggestions,
  checkDuplicate,
  CreateProductData,
  UpdateProductData,
  DuplicateCheckResult,
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
  const { onProductUpdated } = useData();
  const productId = route.params?.productId;

  const [loading, setLoading] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(!!productId);
  const [image, setImage] = useState<any>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    message: string;
    similarProduct: { id: string; name: string };
  } | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

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

  // Fetch name suggestions with debouncing
  const fetchNameSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setNameSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set loading state
    setLoadingSuggestions(true);

    // Debounce: wait 300ms after user stops typing
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const results = await getProductSuggestions(query.trim(), 10);
        const names = results.map(r => r.name);
        setNameSuggestions(names);
        setShowSuggestions(names.length > 0);
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
        setNameSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 300);
  }, []);

  // Check for duplicate product name on blur
  const handleNameBlur = useCallback(async () => {
    const productName = formData.name.trim();
    
    if (!productName || productName.length < 2) {
      setDuplicateWarning(null);
      return;
    }

    try {
      setCheckingDuplicate(true);
      const result = await checkDuplicate(productName, productId || undefined);
      
      if (result.isDuplicate && result.similarProduct) {
        setDuplicateWarning({
          message: result.message || 'A product with a similar name may already exist',
          similarProduct: result.similarProduct,
        });
      } else {
        setDuplicateWarning(null);
      }
    } catch (err) {
      console.error('Failed to check duplicate:', err);
      // Don't show error to user, just silently fail
      setDuplicateWarning(null);
    } finally {
      setCheckingDuplicate(false);
    }
  }, [formData.name, productId]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

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
        setDuplicateWarning(null); // Clear warning on success
        // Trigger data refresh across the app
        onProductUpdated();
        Alert.alert('Success', 'Product updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        await createProduct(productData, image || undefined);
        setDuplicateWarning(null); // Clear warning on success
        // Trigger data refresh across the app
        onProductUpdated();
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
        <View style={styles.nameInputContainer}>
          <TextInput
            style={[
              styles.input,
              duplicateWarning && styles.inputWarning,
            ]}
            value={formData.name}
            onChangeText={(text) => {
              setFormData({ ...formData, name: text });
              fetchNameSuggestions(text);
              // Clear warning when user starts typing again
              if (duplicateWarning) {
                setDuplicateWarning(null);
              }
            }}
            onFocus={() => {
              if (nameSuggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            onBlur={() => {
              // Delay to allow click on suggestion
              setTimeout(() => {
                setShowSuggestions(false);
                // Check for duplicate after suggestions are hidden
                handleNameBlur();
              }, 200);
            }}
            placeholder="Enter product name"
            placeholderTextColor="#999"
          />
          {loadingSuggestions && (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color="#007AFF" />
            </View>
          )}
          
          {/* Suggestions Dropdown */}
          {showSuggestions && nameSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <FlatList
                data={nameSuggestions}
                keyExtractor={(item, index) => `suggestion-${index}`}
                renderItem={({ item, index }) => (
                  <TouchableOpacity
                    style={[
                      styles.suggestionItem,
                      index === nameSuggestions.length - 1 && styles.suggestionItemLast,
                    ]}
                    onPress={() => {
                      setFormData({ ...formData, name: item });
                      setNameSuggestions([]);
                      setShowSuggestions(false);
                    }}
                  >
                    <Text style={styles.suggestionText}>{item}</Text>
                  </TouchableOpacity>
                )}
                nestedScrollEnabled={true}
              />
            </View>
          )}
        </View>

        {/* Duplicate Warning */}
        {duplicateWarning && (
          <View style={styles.duplicateWarningContainer}>
            <Text style={styles.duplicateWarningText}>
              ⚠️ {duplicateWarning.message}
            </Text>
            <Text style={styles.duplicateWarningSubtext}>
              Similar product found: <Text style={styles.duplicateWarningBold}>{duplicateWarning.similarProduct.name}</Text>
            </Text>
            <TouchableOpacity
              style={styles.useNameButton}
              onPress={() => {
                setFormData({ ...formData, name: duplicateWarning.similarProduct.name });
                setDuplicateWarning(null);
              }}
            >
              <Text style={styles.useNameButtonText}>Use this name instead</Text>
            </TouchableOpacity>
          </View>
        )}

        {checkingDuplicate && (
          <View style={styles.checkingDuplicateContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.checkingDuplicateText}>Checking for duplicates...</Text>
          </View>
        )}

        <View style={styles.categorySection}>
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
        </View>

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
  categorySection: {
    zIndex: 1,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  inputWarning: {
    borderColor: '#ffc107',
    backgroundColor: '#fffbf0',
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
  nameInputContainer: {
    position: 'relative',
    zIndex: 100,
    marginBottom: 4,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
    top: 12,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    zIndex: 9999,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 15,
    overflow: 'hidden',
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  duplicateWarningContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  duplicateWarningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  duplicateWarningSubtext: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 8,
  },
  duplicateWarningBold: {
    fontWeight: 'bold',
  },
  useNameButton: {
    alignSelf: 'flex-start',
  },
  useNameButtonText: {
    fontSize: 14,
    color: '#e65100',
    textDecorationLine: 'underline',
    fontWeight: '600',
  },
  checkingDuplicateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    padding: 8,
  },
  checkingDuplicateText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
});

export default ProductFormScreen;

