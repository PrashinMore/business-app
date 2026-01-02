import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Outlet } from '../types/outlets';
import { fonts } from '../styles/fonts';

interface OutletSelectorProps {
  outlets: Outlet[];
  selectedOutlet: Outlet | null;
  onSelect: (outlet: Outlet) => void;
}

export const OutletSelector: React.FC<OutletSelectorProps> = ({ 
  outlets, 
  selectedOutlet, 
  onSelect 
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  
  // Don't show selector if only one outlet
  if (outlets.length <= 1) {
    return null;
  }
  
  return (
    <View>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.selectorButton}
      >
        <View style={styles.selectorContent}>
          <View style={styles.selectorTextContainer}>
            <Text style={styles.selectorLabel}>Current Outlet</Text>
            <Text style={styles.selectorName}>
              {selectedOutlet?.name || 'Select Outlet'}
              {selectedOutlet?.isPrimary && (
                <Text style={styles.primaryBadge}> (Primary)</Text>
              )}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </View>
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Outlet</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={outlets}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                  style={[
                    styles.outletItem,
                    selectedOutlet?.id === item.id && styles.outletItemSelected
                  ]}
                >
                  <View style={styles.outletItemContent}>
                    <View style={styles.outletItemHeader}>
                      <Text style={styles.outletItemName}>
                        {item.name}
                      </Text>
                      {item.isPrimary && (
                        <View style={styles.primaryTag}>
                          <Text style={styles.primaryTagText}>Primary</Text>
                        </View>
                      )}
                      {selectedOutlet?.id === item.id && (
                        <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                      )}
                    </View>
                    {item.address && (
                      <Text style={styles.outletItemAddress}>
                        {item.address}
                      </Text>
                    )}
                    {item.contactNumber && (
                      <Text style={styles.outletItemContact}>
                        {item.contactNumber}
                      </Text>
                    )}
                    {!item.isActive && (
                      <Text style={styles.inactiveBadge}>Inactive</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
              style={styles.outletList}
            />
            
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={styles.cancelButton}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  selectorButton: {
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
  },
  selectorContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  selectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: fonts.medium,
  },
  primaryBadge: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: fonts.medium,
  },
  closeButton: {
    padding: 4,
  },
  outletList: {
    maxHeight: 400,
  },
  outletItem: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  outletItemSelected: {
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  outletItemContent: {
    flex: 1,
  },
  outletItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  outletItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
    fontFamily: fonts.medium,
  },
  primaryTag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  primaryTagText: {
    fontSize: 10,
    color: '#4338ca',
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  outletItemAddress: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
    fontFamily: fonts.regular,
  },
  outletItemContact: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
    fontFamily: fonts.regular,
  },
  inactiveBadge: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
    fontFamily: fonts.regular,
  },
  cancelButton: {
    padding: 16,
    backgroundColor: '#111827',
    borderRadius: 8,
    marginTop: 16,
  },
  cancelButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: fonts.medium,
  },
});

