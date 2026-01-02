import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Customer } from '../types/crm';
import { getCustomers, findCustomerByPhone, normalizePhoneNumber } from '../services/crm';
import { fonts } from '../styles/fonts';

interface CustomerSearchModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (customer: Customer | null, phone?: string) => void;
  initialPhone?: string;
}

export const CustomerSearchModal: React.FC<CustomerSearchModalProps> = ({
  visible,
  onClose,
  onSelect,
  initialPhone = '',
}) => {
  const [searchQuery, setSearchQuery] = useState(initialPhone);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);

  useEffect(() => {
    if (visible) {
      setSearchQuery(initialPhone);
      setSelectedCustomer(null);
      setIsNewCustomer(false);
      if (initialPhone) {
        handleSearch(initialPhone);
      }
    }
  }, [visible, initialPhone]);

  const handleSearch = async (query: string) => {
    const normalizedQuery = normalizePhoneNumber(query);
    
    if (normalizedQuery.length < 10 && query.length > 0) {
      setCustomers([]);
      setIsNewCustomer(false);
      return;
    }

    if (normalizedQuery.length === 0) {
      setCustomers([]);
      setIsNewCustomer(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getCustomers({ search: normalizedQuery, size: 10 });
      setCustomers(response.customers);
      
      // Check if exact phone match exists
      const exactMatch = response.customers.find(c => c.phone === normalizedQuery);
      if (exactMatch) {
        setSelectedCustomer(exactMatch);
        setIsNewCustomer(false);
      } else if (normalizedQuery.length >= 10) {
        // Valid phone number but no customer found - can create new
        setIsNewCustomer(true);
        setSelectedCustomer(null);
      } else {
        setIsNewCustomer(false);
        setSelectedCustomer(null);
      }
    } catch (error: any) {
      console.error('Search customers error:', error);
      // On error, still allow creating new customer if phone is valid
      if (normalizedQuery.length >= 10) {
        setIsNewCustomer(true);
        setSelectedCustomer(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (text: string) => {
    setSearchQuery(text);
    // Debounce search
    const timeoutId = setTimeout(() => {
      handleSearch(text);
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    onSelect(customer);
    onClose();
  };

  const handleCreateNew = () => {
    const normalizedPhone = normalizePhoneNumber(searchQuery);
    if (normalizedPhone.length < 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit phone number');
      return;
    }
    onSelect(null, normalizedPhone);
    onClose();
  };

  const handleSkip = () => {
    onSelect(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Customer</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#6b7280" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter phone number or name"
              value={searchQuery}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              autoFocus={true}
            />
            {loading && (
              <ActivityIndicator size="small" color="#007AFF" style={styles.loader} />
            )}
          </View>

          {selectedCustomer && (
            <View style={styles.selectedCustomerCard}>
              <View style={styles.selectedCustomerHeader}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.selectedCustomerText}>Customer Found</Text>
              </View>
              <TouchableOpacity
                onPress={() => handleSelectCustomer(selectedCustomer)}
                style={styles.customerCard}
              >
                <View style={styles.customerInfo}>
                  <Text style={styles.customerName}>{selectedCustomer.name}</Text>
                  <Text style={styles.customerPhone}>{selectedCustomer.phone}</Text>
                  {selectedCustomer.email && (
                    <Text style={styles.customerEmail}>{selectedCustomer.email}</Text>
                  )}
                  <View style={styles.customerStats}>
                    <Text style={styles.statText}>
                      {selectedCustomer.totalVisits} visits
                    </Text>
                    <Text style={styles.statText}>
                      ₹{typeof selectedCustomer.totalSpend === 'number' 
                        ? selectedCustomer.totalSpend.toFixed(0) 
                        : Number(selectedCustomer.totalSpend || 0).toFixed(0)} spent
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>
          )}

          {isNewCustomer && !selectedCustomer && (
            <View style={styles.newCustomerCard}>
              <Text style={styles.newCustomerText}>
                No customer found with this phone number
              </Text>
              <TouchableOpacity
                onPress={handleCreateNew}
                style={styles.createButton}
              >
                <Ionicons name="person-add" size={20} color="white" />
                <Text style={styles.createButtonText}>Create New Customer</Text>
              </TouchableOpacity>
            </View>
          )}

          {customers.length > 0 && !selectedCustomer && (
            <FlatList
              data={customers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectCustomer(item)}
                  style={styles.customerItem}
                >
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerPhone}>{item.phone}</Text>
                    {item.email && (
                      <Text style={styles.customerEmail}>{item.email}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                </TouchableOpacity>
              )}
              style={styles.customerList}
            />
          )}

          <View style={styles.footer}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: fonts.medium,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: fonts.regular,
  },
  loader: {
    marginLeft: 8,
  },
  selectedCustomerCard: {
    marginBottom: 16,
  },
  selectedCustomerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedCustomerText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: fonts.medium,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
    fontFamily: fonts.regular,
  },
  customerEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  customerStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 16,
    fontFamily: fonts.regular,
  },
  customerList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  newCustomerCard: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  newCustomerText: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 12,
    fontFamily: fonts.regular,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    fontFamily: fonts.medium,
  },
  footer: {
    marginTop: 16,
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontFamily: fonts.regular,
  },
});

