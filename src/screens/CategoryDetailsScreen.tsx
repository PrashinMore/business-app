import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useCategories } from '../hooks/useCategories';
import { Category, Product } from '../types/categories';
import { RootStackParamList } from '../navigation/AppNavigator';

type CategoryDetailsScreenRouteProp = RouteProp<RootStackParamList, 'CategoryDetails'>;
type CategoryDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'CategoryDetails'>;

const CategoryDetailsScreen: React.FC = () => {
  const navigation = useNavigation<CategoryDetailsScreenNavigationProp>();
  const route = useRoute<CategoryDetailsScreenRouteProp>();
  const { user } = useAuth();
  const category = route.params?.category;

  const [refreshing, setRefreshing] = useState(false);

  const {
    categoryDetails,
    detailsLoading,
    detailsError,
    loadCategoryDetails,
  } = useCategories();

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(
        'Access Denied',
        'You need admin privileges to access this section.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (category?.id) {
      loadCategoryDetails(category.id);
    }
  }, [category?.id, isAdmin]);

  const handleRefresh = async () => {
    if (category?.id) {
      setRefreshing(true);
      await loadCategoryDetails(category.id);
      setRefreshing(false);
    }
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

  const renderProductItem = ({ item }: { item: Product }) => (
    <View style={styles.productCard}>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>
          ${parseFloat(item.sellingPrice).toFixed(2)}
        </Text>
        <Text style={styles.productStock}>
          Stock: {item.stock} {item.unit}
        </Text>
      </View>
    </View>
  );

  // Don't render anything if user is not admin
  if (!isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.accessDeniedText}>Access Denied</Text>
        <Text style={styles.accessDeniedSubtext}>Admin privileges required</Text>
      </View>
    );
  }

  // Use categoryDetails if available, otherwise fall back to route param
  const displayCategory = categoryDetails || category;

  if (!displayCategory) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Category not found</Text>
      </View>
    );
  }

  if (detailsLoading && !displayCategory.products) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading category details...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Category Header */}
      <View style={styles.header}>
        <Text style={styles.categoryName}>{displayCategory.name}</Text>
        {displayCategory.isRawMaterial && (
          <View style={styles.rawMaterialBadge}>
            <Text style={styles.rawMaterialText}>Raw Material Category</Text>
          </View>
        )}
        {displayCategory.description && (
          <Text style={styles.categoryDescription}>{displayCategory.description}</Text>
        )}
        <Text style={styles.productCount}>
          {displayCategory.products?.length || 0} product{displayCategory.products?.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Category Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Category Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>{formatDate(displayCategory.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Updated:</Text>
          <Text style={styles.infoValue}>{formatDate(displayCategory.updatedAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Category ID:</Text>
          <Text style={styles.infoValue}>{displayCategory.id}</Text>
        </View>
      </View>

      {/* Error Display */}
      {detailsError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{detailsError}</Text>
        </View>
      )}

      {/* Products Section */}
      {displayCategory.products && displayCategory.products.length > 0 && (
        <View style={styles.productsSection}>
          <Text style={styles.productsTitle}>Products in this Category</Text>
          <FlatList
            data={displayCategory.products}
            keyExtractor={(item) => item.id}
            renderItem={renderProductItem}
            scrollEnabled={false}
            contentContainerStyle={styles.productsList}
          />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('CategoryForm', { category: displayCategory })}
        >
          <Text style={styles.editButtonText}>Edit Category</Text>
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  categoryName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  rawMaterialBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  rawMaterialText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e65100',
  },
  categoryDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  productCount: {
    fontSize: 14,
    color: '#007AFF',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  productsSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  productsList: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 12,
    color: '#666',
  },
  actionsSection: {
    padding: 16,
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CategoryDetailsScreen;

