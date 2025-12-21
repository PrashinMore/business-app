import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTables, createTable, updateTable, deleteTable, updateTableStatus } from '../services/tables';
import { DiningTable, TableStatus, CreateTableDto, UpdateTableDto } from '../types/tables';

const TablesListScreen: React.FC = () => {
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTable, setEditingTable] = useState<DiningTable | null>(null);
  
  // Form state
  const [tableName, setTableName] = useState('');
  const [capacity, setCapacity] = useState('');
  const [area, setArea] = useState('');

  const loadTables = async () => {
    try {
      const data = await getTables();
      setTables(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load tables');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (tables.length > 0) {
        loadTables();
      }
    }, [])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTables();
  };

  const getStatusColor = (status: TableStatus): string => {
    switch (status) {
      case 'AVAILABLE':
        return '#4CAF50';
      case 'OCCUPIED':
        return '#FF9800';
      case 'RESERVED':
        return '#2196F3';
      case 'CLEANING':
        return '#9E9E9E';
      case 'BLOCKED':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const handleAddTable = async () => {
    if (!tableName.trim() || !capacity) {
      Alert.alert('Validation Error', 'Please provide table name and capacity');
      return;
    }

    const capacityNum = parseInt(capacity, 10);
    if (isNaN(capacityNum) || capacityNum < 1) {
      Alert.alert('Validation Error', 'Capacity must be at least 1');
      return;
    }

    try {
      const tableData: CreateTableDto = {
        name: tableName.trim(),
        capacity: capacityNum,
        area: area.trim() || undefined,
      };

      await createTable(tableData);
      setShowAddModal(false);
      resetForm();
      await loadTables();
      Alert.alert('Success', 'Table created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create table');
    }
  };

  const handleUpdateTable = async () => {
    if (!editingTable) return;

    if (!tableName.trim() || !capacity) {
      Alert.alert('Validation Error', 'Please provide table name and capacity');
      return;
    }

    const capacityNum = parseInt(capacity, 10);
    if (isNaN(capacityNum) || capacityNum < 1) {
      Alert.alert('Validation Error', 'Capacity must be at least 1');
      return;
    }

    try {
      const updateData: UpdateTableDto = {
        name: tableName.trim(),
        capacity: capacityNum,
        area: area.trim() || undefined,
      };

      await updateTable(editingTable.id, updateData);
      setEditingTable(null);
      resetForm();
      await loadTables();
      Alert.alert('Success', 'Table updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update table');
    }
  };

  const handleDeleteTable = (table: DiningTable) => {
    Alert.alert(
      'Delete Table',
      `Are you sure you want to delete table "${table.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTable(table.id);
              await loadTables();
              Alert.alert('Success', 'Table deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete table');
            }
          },
        },
      ]
    );
  };

  const handleStatusChange = async (table: DiningTable, newStatus: TableStatus) => {
    try {
      await updateTableStatus(table.id, { status: newStatus });
      await loadTables();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update table status');
    }
  };

  const resetForm = () => {
    setTableName('');
    setCapacity('');
    setArea('');
    setEditingTable(null);
  };

  const openEditModal = (table: DiningTable) => {
    setEditingTable(table);
    setTableName(table.name);
    setCapacity(table.capacity.toString());
    setArea(table.area || '');
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const renderTableItem = ({ item }: { item: DiningTable }) => (
    <View style={styles.tableCard}>
      <View style={styles.tableHeader}>
        <View>
          <Text style={styles.tableName}>{item.name}</Text>
          {item.area && <Text style={styles.tableArea}>{item.area}</Text>}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.tableInfo}>
        <Text style={styles.capacityText}>Capacity: {item.capacity} seats</Text>
        {!item.isActive && (
          <Text style={styles.inactiveText}>Inactive</Text>
        )}
      </View>

      <View style={styles.tableActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => openEditModal(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.statusButton]}
          onPress={() => {
            const statusOptions: TableStatus[] = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'BLOCKED'];
            Alert.alert(
              'Change Status',
              'Select new status:',
              statusOptions.map(status => ({
                text: status,
                onPress: () => handleStatusChange(item, status),
              }))
            );
          }}
        >
          <Text style={styles.actionButtonText}>Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteTable(item)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading tables...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tables}
        keyExtractor={(item) => item.id}
        renderItem={renderTableItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tables found</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add a table</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add/Edit Modal */}
      <Modal
        visible={showAddModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTable ? 'Edit Table' : 'Add Table'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Table Name"
              placeholderTextColor="#999"
              value={tableName}
              onChangeText={setTableName}
            />

            <TextInput
              style={styles.input}
              placeholder="Capacity"
              placeholderTextColor="#999"
              value={capacity}
              onChangeText={setCapacity}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.input}
              placeholder="Area (optional)"
              placeholderTextColor="#999"
              value={area}
              onChangeText={setArea}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={closeModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingTable ? handleUpdateTable : handleAddTable}
              >
                <Text style={styles.saveButtonText}>
                  {editingTable ? 'Update' : 'Create'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  tableCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tableName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  tableArea: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  tableInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  capacityText: {
    fontSize: 14,
    color: '#666',
  },
  inactiveText: {
    fontSize: 12,
    color: '#F44336',
    fontWeight: '600',
  },
  tableActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
  },
  statusButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: '#F44336',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
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
    fontSize: 32,
    color: '#fff',
    fontWeight: 'bold',
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
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  modalActions: {
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
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TablesListScreen;

