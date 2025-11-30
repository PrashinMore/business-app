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
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useExpenses } from '../hooks/useExpenses';
import { Expense, EXPENSE_CATEGORIES } from '../types/expenses';
import { RootStackParamList } from '../navigation/AppNavigator';

type ExpenseFormScreenRouteProp = RouteProp<RootStackParamList, 'ExpenseForm'>;
type ExpenseFormScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExpenseForm'>;

const ExpenseFormScreen: React.FC = () => {
  const navigation = useNavigation<ExpenseFormScreenNavigationProp>();
  const route = useRoute<ExpenseFormScreenRouteProp>();
  const { user } = useAuth();
  const { onExpenseUpdated } = useData();
  const expense = route.params?.expense;

  const [loading, setLoading] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [formData, setFormData] = useState({
    category: '',
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
  });

  const { createExpense, updateExpense } = useExpenses();

  useEffect(() => {
    if (expense) {
      // Editing existing expense
      setFormData({
        category: expense.category,
        amount: expense.amount.toString(),
        note: expense.note || '',
        date: expense.date.split('T')[0], // Extract date part
      });
    }
  }, [expense]);

  const validateForm = () => {
    if (!formData.category.trim()) {
      Alert.alert('Validation Error', 'Please select a category');
      return false;
    }
    if (!formData.amount.trim()) {
      Alert.alert('Validation Error', 'Please enter an amount');
      return false;
    }
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid positive amount');
      return false;
    }
    if (!formData.date.trim()) {
      Alert.alert('Validation Error', 'Please enter a date');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    try {
      setLoading(true);

      const expenseData = {
        category: formData.category.trim(),
        amount: parseFloat(formData.amount),
        note: formData.note.trim() || undefined,
        date: formData.date,
        addedBy: user.id,
      };

      if (expense) {
        // Update existing expense
        await updateExpense(expense.id, {
          category: expenseData.category,
          amount: expenseData.amount,
          note: expenseData.note,
          date: expenseData.date,
        });
        // Trigger data refresh across the app
        onExpenseUpdated();
        Alert.alert('Success', 'Expense updated successfully');
      } else {
        // Create new expense
        await createExpense(expenseData);
        // Trigger data refresh across the app
        onExpenseUpdated();
        Alert.alert('Success', 'Expense created successfully');
      }

      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const selectCategory = (category: string) => {
    setFormData({ ...formData, category });
    setShowCategoryPicker(false);
  };

  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading && !expense) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Saving expense...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>
          {expense ? 'Edit Expense' : 'Add New Expense'}
        </Text>

        {/* Category Selection */}
        <Text style={styles.label}>Category *</Text>
        <TouchableOpacity
          style={styles.categorySelector}
          onPress={() => setShowCategoryPicker(!showCategoryPicker)}
        >
          <Text style={formData.category ? styles.categoryText : styles.placeholderText}>
            {formData.category || 'Select a category'}
          </Text>
          <Text style={styles.dropdownIcon}>{showCategoryPicker ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {showCategoryPicker && (
          <View style={styles.categoryList}>
            {EXPENSE_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryItem,
                  formData.category === category && styles.categoryItemSelected,
                ]}
                onPress={() => selectCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryItemText,
                    formData.category === category && styles.categoryItemTextSelected,
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Amount */}
        <Text style={styles.label}>Amount *</Text>
        <TextInput
          style={styles.input}
          value={formData.amount}
          onChangeText={(text) => setFormData({ ...formData, amount: text })}
          placeholder="0.00"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          returnKeyType="next"
        />

        {/* Date */}
        <Text style={styles.label}>Date *</Text>
        <TextInput
          style={styles.input}
          value={formData.date}
          onChangeText={(text) => setFormData({ ...formData, date: text })}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
          returnKeyType="next"
        />
        {formData.date && (
          <Text style={styles.dateDisplay}>
            {formatDateForDisplay(formData.date)}
          </Text>
        )}

        {/* Note */}
        <Text style={styles.label}>Note (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.note}
          onChangeText={(text) => setFormData({ ...formData, note: text })}
          placeholder="Add a note about this expense..."
          placeholderTextColor="#999"
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {expense ? 'Update Expense' : 'Create Expense'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
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
  form: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  categorySelector: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  dropdownIcon: {
    fontSize: 16,
    color: '#666',
  },
  categoryList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginTop: 4,
    maxHeight: 200,
  },
  categoryItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  categoryItemSelected: {
    backgroundColor: '#e3f2fd',
  },
  categoryItemText: {
    fontSize: 16,
    color: '#333',
  },
  categoryItemTextSelected: {
    color: '#007AFF',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dateDisplay: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginLeft: 4,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ExpenseFormScreen;
