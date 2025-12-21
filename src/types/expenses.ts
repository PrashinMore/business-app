/**
 * Expense Management Types
 *
 * Based on the Expenses API documentation
 */

export interface Expense {
  id: string;                    // UUID
  category: string;              // Max 64 characters
  amount: number;                // Decimal (14,2 precision)
  note?: string | null;          // Optional text note
  date: string;                  // ISO 8601 date string
  addedBy: string;               // User ID of creator
  createdAt: string;             // ISO 8601 timestamp
}

export interface ExpenseFilters {
  from?: string;     // ISO 8601 date - Start date (inclusive)
  to?: string;       // ISO 8601 date - End date (inclusive)
  category?: string; // Filter by category name
  page?: number;     // Page number (1-based, minimum 1)
  size?: number;     // Page size (minimum 1)
}

export interface CreateExpenseData {
  category: string;        // Required, max 64 characters
  amount: number;          // Required, positive number
  note?: string;           // Optional
  date: string;           // Required, ISO 8601 date string
  addedBy: string;         // Required, user ID
}

export interface UpdateExpenseData {
  category?: string;       // Optional
  amount?: number;         // Optional
  note?: string | null;    // Optional
  date?: string;           // Optional, ISO 8601 date
}

export interface MonthlySummary {
  month: string;    // Format: "YYYY-MM"
  total: string;    // Total amount as string (for precision)
}

export interface ExpenseReport {
  period: {
    from: string;    // ISO 8601 date
    to: string;      // ISO 8601 date
  };
  summary: {
    totalExpenses: number;        // Total amount
    totalTransactions: number;   // Count of expenses
    averageExpense: number;       // Average per transaction
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;           // Percentage of total
  }>;
  monthlyBreakdown: Array<{
    month: string;                // Format: "YYYY-MM"
    amount: number;
  }>;
}

// Common expense categories as per documentation
export const EXPENSE_CATEGORIES = [
  "Rent",
  "Utilities",
  "Office Supplies",
  "Marketing",
  "Transportation",
  "Food & Beverages",
  "Equipment",
  "Maintenance",
  "Insurance",
  "Salaries",
  "Other"
] as const;

export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number];
