import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Expense,
  ExpenseFilters,
  CreateExpenseData,
  UpdateExpenseData,
  MonthlySummary,
  ExpenseReport
} from '../types/expenses';
import * as expensesApi from '../services/expenses';

interface UseExpensesOptions {
  filters?: ExpenseFilters;
  autoLoad?: boolean;
}

interface UseExpensesReturn {
  // Data
  expenses: Expense[];
  totalItems: number; // Total count for pagination
  monthlySummary: MonthlySummary[];
  expenseReport: ExpenseReport | null;

  // Loading states
  loading: boolean;
  summaryLoading: boolean;
  reportLoading: boolean;

  // Error states
  error: string | null;
  summaryError: string | null;
  reportError: string | null;

  // Actions
  createExpense: (data: CreateExpenseData) => Promise<Expense>;
  updateExpense: (id: string, data: UpdateExpenseData) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;

  // Utility functions
  refreshExpenses: () => Promise<void>;
  refreshSummary: (from?: string, to?: string) => Promise<void>;
  refreshReport: (from?: string, to?: string) => Promise<void>;
  setFilters: (filters: ExpenseFilters) => void;
  clearError: () => void;
}

export function useExpenses(options: UseExpensesOptions = {}): UseExpensesReturn {
  const { filters: initialFilters, autoLoad = true } = options;

  // Data state
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [expenseReport, setExpenseReport] = useState<ExpenseReport | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Filters state
  const [filters, setFiltersState] = useState<ExpenseFilters | undefined>(initialFilters);
  
  // Wrapper for setFilters that only updates if values actually changed
  const setFilters = (newFilters: ExpenseFilters) => {
    setFiltersState(prev => {
      // Compare filter values to prevent unnecessary updates
      const prevKey = JSON.stringify({
        from: prev?.from || '',
        to: prev?.to || '',
        category: prev?.category || '',
        page: prev?.page || 1,
        size: prev?.size || 20,
      });
      const newKey = JSON.stringify({
        from: newFilters?.from || '',
        to: newFilters?.to || '',
        category: newFilters?.category || '',
        page: newFilters?.page || 1,
        size: newFilters?.size || 20,
      });
      
      // Only update if values actually changed
      if (prevKey !== newKey) {
        return newFilters;
      }
      return prev; // Return previous to prevent re-render
    });
  };

  // Load expenses
  const loadExpenses = async (expenseFilters?: ExpenseFilters) => {
    try {
      setLoading(true);
      setError(null);
      const data = await expensesApi.getExpenses(expenseFilters);
      
      // Handle paginated response or legacy array format
      if (Array.isArray(data)) {
        setExpenses(data);
        setTotalItems(data.length);
      } else {
        setExpenses(data.expenses);
        setTotalItems(data.total);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load expenses';
      setError(errorMessage);
      console.error('Load expenses error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load monthly summary
  const loadMonthlySummary = async (from?: string, to?: string) => {
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const data = await expensesApi.getMonthlySummary(from, to);
      setMonthlySummary(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load monthly summary';
      setSummaryError(errorMessage);
      console.error('Load monthly summary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Load expense report
  const loadExpenseReport = async (from?: string, to?: string) => {
    try {
      setReportLoading(true);
      setReportError(null);
      const data = await expensesApi.getExpenseReport(from, to);
      setExpenseReport(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load expense report';
      setReportError(errorMessage);
      console.error('Load expense report error:', err);
    } finally {
      setReportLoading(false);
    }
  };

  // Create expense
  const createExpense = async (data: CreateExpenseData): Promise<Expense> => {
    try {
      const newExpense = await expensesApi.createExpense(data);
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    } catch (err) {
      throw err;
    }
  };

  // Update expense
  const updateExpense = async (id: string, updates: UpdateExpenseData): Promise<Expense> => {
    try {
      const updatedExpense = await expensesApi.updateExpense(id, updates);
      setExpenses(prev => prev.map(e => e.id === id ? updatedExpense : e));
      return updatedExpense;
    } catch (err) {
      throw err;
    }
  };

  // Delete expense
  const deleteExpense = async (id: string): Promise<void> => {
    try {
      await expensesApi.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err) {
      throw err;
    }
  };

  // Refresh functions
  const refreshExpenses = async () => {
    await loadExpenses(filters);
  };

  const refreshSummary = async (from?: string, to?: string) => {
    await loadMonthlySummary(from, to);
  };

  const refreshReport = async (from?: string, to?: string) => {
    await loadExpenseReport(from, to);
  };

  // Clear error
  const clearError = () => {
    setError(null);
    setSummaryError(null);
    setReportError(null);
  };

  // Effect to load expenses when filters change or on mount
  // Use a ref to track previous filter values to prevent unnecessary API calls
  const prevFiltersKeyRef = useRef<string | null>(null);
  
  useEffect(() => {
    if (!autoLoad) return;
    
    // Create a stable string representation of filters to compare
    const filtersKey = JSON.stringify({
      from: filters?.from || '',
      to: filters?.to || '',
      category: filters?.category || '',
      page: filters?.page || 1,
      size: filters?.size || 20,
    });
    
    // Only load if filters have actually changed (or on first load when prevFiltersKeyRef is null)
    if (prevFiltersKeyRef.current !== filtersKey) {
      prevFiltersKeyRef.current = filtersKey;
      loadExpenses(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.from, filters?.to, filters?.category, filters?.page, filters?.size, autoLoad]);

  return {
    // Data
    expenses,
    totalItems,
    monthlySummary,
    expenseReport,

    // Loading states
    loading,
    summaryLoading,
    reportLoading,

    // Error states
    error,
    summaryError,
    reportError,

    // Actions
    createExpense,
    updateExpense,
    deleteExpense,

    // Utility functions
    refreshExpenses,
    refreshSummary,
    refreshReport,
    setFilters,
    clearError,
  };
}
