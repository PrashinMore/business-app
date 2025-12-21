/**
 * Expenses Service
 *
 * Handles all expense management operations
 */

import { API_BASE_URL } from '../config/api';
import { apiRequest } from './auth';
import {
  Expense,
  ExpenseFilters,
  CreateExpenseData,
  UpdateExpenseData,
  MonthlySummary,
  ExpenseReport
} from '../types/expenses';

/**
 * Get all expenses with optional filters and pagination
 * @param filters - Optional filters for date range, category, and pagination
 * @returns Promise with paginated expenses response or array of expenses (backward compatibility)
 */
export async function getExpenses(filters?: ExpenseFilters): Promise<{ expenses: Expense[]; total: number } | Expense[]> {
  try {
    const queryParams = new URLSearchParams();

    if (filters?.from) {
      queryParams.append('from', filters.from);
    }
    if (filters?.to) {
      queryParams.append('to', filters.to);
    }
    if (filters?.category) {
      queryParams.append('category', filters.category);
    }
    if (filters?.page !== undefined) {
      queryParams.append('page', filters.page.toString());
    }
    if (filters?.size !== undefined) {
      queryParams.append('size', filters.size.toString());
    }

    const queryString = queryParams.toString();
    const endpoint = `/expenses${queryString ? `?${queryString}` : ''}`;

    const response = await apiRequest(endpoint, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load expenses');
    }

    const data = await response.json();
    
    // Check if response is paginated (has expenses and total) or legacy format (array)
    if (data && typeof data === 'object' && 'expenses' in data && 'total' in data) {
      // Convert amount strings to numbers
      const expenses: Expense[] = data.expenses.map((expense: any) => ({
        ...expense,
        amount: parseFloat(expense.amount.toString()) || 0,
      }));
      return { expenses, total: data.total };
    }
    
    // Backward compatibility: return as array if legacy format
    const expensesData: any[] = Array.isArray(data) ? data : [];
    const expenses: Expense[] = expensesData.map(expense => ({
      ...expense,
      amount: parseFloat(expense.amount.toString()) || 0,
    }));
    return expenses;
  } catch (error) {
    console.error('Get expenses error:', error);
    throw error;
  }
}

/**
 * Create a new expense
 */
export async function createExpense(expenseData: CreateExpenseData): Promise<Expense> {
  try {
    const response = await apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create expense');
    }

    const expenseData: any = await response.json();
    // Convert amount string to number
    const expense: Expense = {
      ...expenseData,
      amount: parseFloat(expenseData.amount.toString()) || 0,
    };
    return expense;
  } catch (error) {
    console.error('Create expense error:', error);
    throw error;
  }
}

/**
 * Update an existing expense
 */
export async function updateExpense(
  expenseId: string,
  expenseData: UpdateExpenseData
): Promise<Expense> {
  try {
    const response = await apiRequest(`/expenses/${expenseId}`, {
      method: 'PATCH',
      body: JSON.stringify(expenseData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update expense');
    }

    const expenseData: any = await response.json();
    // Convert amount string to number
    const expense: Expense = {
      ...expenseData,
      amount: parseFloat(expenseData.amount.toString()) || 0,
    };
    return expense;
  } catch (error) {
    console.error('Update expense error:', error);
    throw error;
  }
}

/**
 * Delete an expense
 */
export async function deleteExpense(expenseId: string): Promise<void> {
  try {
    const response = await apiRequest(`/expenses/${expenseId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete expense');
    }
  } catch (error) {
    console.error('Delete expense error:', error);
    throw error;
  }
}

/**
 * Get monthly expense summaries
 */
export async function getMonthlySummary(
  from?: string,
  to?: string
): Promise<MonthlySummary[]> {
  try {
    const queryParams = new URLSearchParams();

    if (from) {
      queryParams.append('from', from);
    }
    if (to) {
      queryParams.append('to', to);
    }

    const queryString = queryParams.toString();
    const endpoint = `/expenses/summary/monthly${queryString ? `?${queryString}` : ''}`;

    const response = await apiRequest(endpoint, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load monthly summary');
    }

    const summary: MonthlySummary[] = await response.json();
    return summary;
  } catch (error) {
    console.error('Get monthly summary error:', error);
    throw error;
  }
}

/**
 * Get detailed expense report
 */
export async function getExpenseReport(
  from?: string,
  to?: string
): Promise<ExpenseReport> {
  try {
    const queryParams = new URLSearchParams();

    if (from) {
      queryParams.append('from', from);
    }
    if (to) {
      queryParams.append('to', to);
    }

    const queryString = queryParams.toString();
    const endpoint = `/reports/expenses${queryString ? `?${queryString}` : ''}`;

    const response = await apiRequest(endpoint, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load expense report');
    }

    const report: ExpenseReport = await response.json();
    return report;
  } catch (error) {
    console.error('Get expense report error:', error);
    throw error;
  }
}

/**
 * Get expenses for current month
 */
export async function getCurrentMonthExpenses(): Promise<Expense[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const from = new Date(year, month, 1).toISOString().split('T')[0];
  const to = new Date(year, month + 1, 0).toISOString().split('T')[0];

  return getExpenses({ from, to });
}

/**
 * Get expenses for current year
 */
export async function getCurrentYearExpenses(): Promise<Expense[]> {
  const currentYear = new Date().getFullYear();
  const from = `${currentYear}-01-01`;
  const to = `${currentYear}-12-31`;

  return getExpenses({ from, to });
}

/**
 * Get total expenses by category for a date range
 */
export async function getCategoryTotals(
  from?: string,
  to?: string
): Promise<Record<string, number>> {
  try {
    const expenses = await getExpenses({ from, to });

    const totals = expenses.reduce((acc, expense) => {
      if (!acc[expense.category]) {
        acc[expense.category] = 0;
      }
      acc[expense.category] += expense.amount;
      return acc;
    }, {} as Record<string, number>);

    return totals;
  } catch (error) {
    console.error('Get category totals error:', error);
    throw error;
  }
}

/**
 * Get top spending categories
 */
export async function getTopCategories(
  limit: number = 5,
  from?: string,
  to?: string
): Promise<Array<{ category: string; amount: number }>> {
  try {
    const categoryTotals = await getCategoryTotals(from, to);

    return Object.entries(categoryTotals)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, limit);
  } catch (error) {
    console.error('Get top categories error:', error);
    throw error;
  }
}

/**
 * Search expenses by category or note
 */
export function searchExpenses(
  expenses: Expense[],
  searchTerm: string
): Expense[] {
  const term = searchTerm.toLowerCase();

  return expenses.filter(expense =>
    expense.category.toLowerCase().includes(term) ||
    expense.note?.toLowerCase().includes(term) ||
    expense.amount.toString().includes(term)
  );
}

/**
 * Add expense with today's date
 */
export async function addExpenseToday(
  category: string,
  amount: number,
  userId: string,
  note?: string
): Promise<Expense> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  return createExpense({
    category,
    amount,
    note,
    date: today,
    addedBy: userId,
  });
}
