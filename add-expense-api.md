# Add New Expense API - Frontend Integration Documentation

## Overview

This document provides comprehensive API documentation for the **Add New Expense** endpoint, including frontend integration details, request/response formats, error handling, and implementation examples.

## Base URL

```
http://localhost:4000/api
```

**Note:** The base URL can be configured via the `NEXT_PUBLIC_API_BASE_URL` environment variable. Defaults to `http://localhost:4000` if not set.

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

The token is obtained from the authentication context and is automatically included in all API requests.

---

## API Endpoint

### Create Expense

**Endpoint:** `POST /expenses`

**Description:** Creates a new expense record for the authenticated user's organization.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "category": "Office Supplies",
  "amount": 150.50,
  "note": "Purchased stationery items",
  "date": "2025-01-15T10:30:00.000Z",
  "addedBy": "1f230a52-d156-4e81-a51f-60c04d39417c"
}
```

**Request Fields:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `category` | string | Yes | Expense category name | Max 64 characters, non-empty |
| `amount` | number | Yes | Expense amount | Must be a valid number |
| `note` | string | No | Optional note/description | String, can be null |
| `date` | string | Yes | Expense date/time | ISO 8601 date string |
| `addedBy` | string | Yes | User ID who created the expense | Must be valid UUID, non-empty |

**Validation Rules:**
- `category`: Required, must be a non-empty string, maximum 64 characters
- `amount`: Required, must be a valid number (will be rounded to 2 decimal places)
- `note`: Optional, can be null or empty string
- `date`: Required, must be a valid ISO 8601 date string
- `addedBy`: Required, must be a non-empty string (user ID)

**Response:** `201 Created`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "category": "Office Supplies",
  "amount": 150.50,
  "note": "Purchased stationery items",
  "date": "2025-01-15T10:30:00.000Z",
  "addedBy": "1f230a52-d156-4e81-a51f-60c04d39417c",
  "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
  "createdAt": "2025-01-15T10:30:15.123Z"
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique expense identifier |
| `category` | string | Expense category |
| `amount` | number | Expense amount (rounded to 2 decimal places) |
| `note` | string \| null | Optional note/description |
| `date` | string (ISO 8601) | Expense date/time |
| `addedBy` | string | User ID who created the expense |
| `organizationId` | string (UUID) | Organization ID (automatically assigned) |
| `createdAt` | string (ISO 8601) | Timestamp when expense was created |

**Error Responses:**

- `400 Bad Request` - Invalid input data or validation failure
  ```json
  {
    "statusCode": 400,
    "message": "category must be a string",
    "error": "Bad Request"
  }
  ```

- `401 Unauthorized` - Missing or invalid authentication token
  ```json
  {
    "statusCode": 401,
    "message": "Unauthorized"
  }
  ```

- `403 Forbidden` - User not assigned to any organization
  ```json
  {
    "statusCode": 403,
    "message": "You must be assigned to at least one organization"
  }
  ```

---

## Frontend Integration

### API Client Implementation

The frontend uses a centralized API client located at `webFe/src/lib/api-client.ts`. The expense API is exposed through the `expensesApi` object.

**TypeScript Interface:**
```typescript
interface Expense {
  id: string;
  category: string;
  amount: number;
  note?: string | null;
  date: string; // ISO string
  addedBy: string;
  createdAt: string;
}

type ExpensesFilters = {
  from?: string;
  to?: string;
  category?: string;
  page?: number;
  size?: number;
};

export const expensesApi = {
  create: (
    token: string,
    payload: Omit<Expense, 'id' | 'createdAt'> & { date: string }
  ): Promise<Expense> =>
    request<Expense>('/expenses', { method: 'POST', body: payload, token }),
  
  // ... other methods
};
```

### Frontend Component Implementation

The expense creation form is implemented in `webFe/src/app/expenses/new/page.tsx`.

**Key Features:**
- Form validation before submission
- Loading state during API call
- Error handling and display
- Automatic redirect to expenses list on success
- User-friendly date/time picker

**Component Structure:**
```typescript
'use client';

import { useAuth } from '@/contexts/auth-context';
import { expensesApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function NewExpensePage() {
  const { token, user } = useAuth();
  const router = useRouter();

  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !user) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      await expensesApi.create(token, {
        category,
        amount: Number(amount),
        note: note || undefined,
        date: new Date(date).toISOString(),
        addedBy: user.id,
      });
      router.push('/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create expense');
    } finally {
      setSubmitting(false);
    }
  }

  // ... form JSX
}
```

### Request Flow

1. **User fills out the form** with category, amount, date, and optional note
2. **Form submission** triggers `handleSubmit` function
3. **Validation** ensures all required fields are present
4. **API call** is made using `expensesApi.create()`:
   - Converts date string to ISO format
   - Converts amount string to number
   - Includes user ID from auth context
   - Sends request with JWT token
5. **Success handling**: Redirects to `/expenses` page
6. **Error handling**: Displays error message to user

### Data Transformation

**Frontend to Backend:**
- `date`: HTML datetime-local input → ISO 8601 string
  ```typescript
  date: new Date(date).toISOString()
  ```
- `amount`: String input → Number
  ```typescript
  amount: Number(amount)
  ```
- `note`: Empty string → `undefined` (optional field)
  ```typescript
  note: note || undefined
  ```

**Backend Processing:**
- `amount`: Rounded to 2 decimal places
  ```typescript
  amount: Math.round(dto.amount * 100) / 100
  ```
- `organizationId`: Automatically assigned from user's first organization
- `date`: Converted to Date object for storage

---

## Backend Implementation Details

### Controller

**Location:** `be/src/expenses/expenses.controller.ts`

```typescript
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  @Post()
  create(@Req() req: RequestWithUser, @Body() dto: CreateExpenseDto) {
    const organizationId = this.getFirstOrganizationId(req.user);
    return this.expensesService.create({ ...dto, organizationId });
  }
}
```

**Key Points:**
- Protected by `JwtAuthGuard` (requires authentication)
- Extracts organization ID from authenticated user
- Uses first organization if user belongs to multiple

### Service

**Location:** `be/src/expenses/expenses.service.ts`

```typescript
async create(dto: CreateExpenseDto & { organizationId: string }): Promise<Expense> {
  const entity = this.expenseRepo.create({
    category: dto.category,
    amount: Math.round(dto.amount * 100) / 100,
    note: dto.note ?? null,
    date: new Date(dto.date),
    addedBy: dto.addedBy,
    organizationId: dto.organizationId,
  });
  return this.expenseRepo.save(entity);
}
```

**Key Points:**
- Amount is rounded to 2 decimal places
- Note defaults to `null` if not provided
- Date is converted from ISO string to Date object
- Organization ID is automatically assigned

### DTO (Data Transfer Object)

**Location:** `be/src/expenses/dto/create-expense.dto.ts`

```typescript
export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  category: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  addedBy: string; // userId
}
```

**Validation Decorators:**
- `@IsString()` - Ensures category is a string
- `@IsNotEmpty()` - Ensures category is not empty
- `@MaxLength(64)` - Limits category to 64 characters
- `@IsNumber()` - Ensures amount is a number
- `@IsOptional()` - Makes note optional
- `@IsDateString()` - Validates date format

### Entity

**Location:** `be/src/expenses/entities/expense.entity.ts`

```typescript
@Entity()
export class Expense {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 64 })
  category: string;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ type: 'timestamptz' })
  date: Date;

  @Column({ length: 120 })
  addedBy: string;

  @ManyToOne(() => Organization, { nullable: false, onDelete: 'CASCADE' })
  organization!: Organization;

  @Column({ type: 'uuid' })
  organizationId!: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Database Schema:**
- `id`: UUID primary key
- `category`: VARCHAR(64)
- `amount`: DECIMAL(14, 2)
- `note`: TEXT (nullable)
- `date`: TIMESTAMPTZ
- `addedBy`: VARCHAR(120)
- `organizationId`: UUID (foreign key)
- `createdAt`: TIMESTAMPTZ (auto-generated)

---

## Usage Examples

### Example 1: Basic Expense Creation

```typescript
import { expensesApi } from '@/lib/api-client';

// Get token from auth context
const token = 'your-jwt-token';

// Create expense
const expense = await expensesApi.create(token, {
  category: 'Office Supplies',
  amount: 150.50,
  note: 'Purchased stationery items',
  date: new Date().toISOString(),
  addedBy: 'user-id-here'
});

console.log('Created expense:', expense);
```

### Example 2: Expense Creation with Error Handling

```typescript
import { expensesApi } from '@/lib/api-client';

async function createExpenseWithErrorHandling(token: string, expenseData: any) {
  try {
    const expense = await expensesApi.create(token, expenseData);
    console.log('Expense created successfully:', expense);
    return { success: true, data: expense };
  } catch (error) {
    if (error instanceof Error) {
      console.error('Failed to create expense:', error.message);
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}
```

### Example 3: Using Fetch Directly

```typescript
async function createExpenseDirect(token: string, expenseData: any) {
  const response = await fetch('http://localhost:4000/api/expenses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(expenseData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create expense');
  }

  return await response.json();
}
```

### Example 4: React Hook for Expense Creation

```typescript
import { useState } from 'react';
import { expensesApi } from '@/lib/api-client';
import { useAuth } from '@/contexts/auth-context';

export function useCreateExpense() {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createExpense = async (expenseData: {
    category: string;
    amount: number;
    note?: string;
    date: string;
  }) => {
    if (!token || !user) {
      throw new Error('Not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      const expense = await expensesApi.create(token, {
        ...expenseData,
        addedBy: user.id,
      });
      return expense;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create expense';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createExpense, loading, error };
}
```

---

## Error Handling Best Practices

### Frontend Error Handling

1. **Always check authentication** before making API calls
2. **Validate form data** on the client side before submission
3. **Display user-friendly error messages** based on error type
4. **Handle network errors** gracefully
5. **Show loading states** during API calls

**Example:**
```typescript
try {
  await expensesApi.create(token, expenseData);
  // Success handling
} catch (err) {
  if (err instanceof Error) {
    // Handle specific error types
    if (err.message.includes('Unauthorized')) {
      // Redirect to login
    } else if (err.message.includes('organization')) {
      // Show organization error
    } else {
      // Show generic error
    }
  }
}
```

### Common Error Scenarios

1. **Missing Authentication Token**
   - Error: `401 Unauthorized`
   - Solution: Ensure user is logged in and token is valid

2. **User Not Assigned to Organization**
   - Error: `403 Forbidden - You must be assigned to at least one organization`
   - Solution: Assign user to an organization

3. **Invalid Category**
   - Error: `400 Bad Request - category must be a string`
   - Solution: Ensure category is a non-empty string, max 64 characters

4. **Invalid Amount**
   - Error: `400 Bad Request - amount must be a number`
   - Solution: Ensure amount is a valid number

5. **Invalid Date Format**
   - Error: `400 Bad Request - date must be a valid ISO 8601 date string`
   - Solution: Use `new Date().toISOString()` or ensure date is in ISO format

---

## Testing

### Manual Testing

1. **Test with valid data:**
   ```bash
   curl -X POST http://localhost:4000/api/expenses \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "category": "Office Supplies",
       "amount": 150.50,
       "note": "Test expense",
       "date": "2025-01-15T10:30:00.000Z",
       "addedBy": "user-id"
     }'
   ```

2. **Test with missing required fields:**
   ```bash
   curl -X POST http://localhost:4000/api/expenses \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 150.50,
       "date": "2025-01-15T10:30:00.000Z",
       "addedBy": "user-id"
     }'
   ```

3. **Test without authentication:**
   ```bash
   curl -X POST http://localhost:4000/api/expenses \
     -H "Content-Type: application/json" \
     -d '{
       "category": "Office Supplies",
       "amount": 150.50,
       "date": "2025-01-15T10:30:00.000Z",
       "addedBy": "user-id"
     }'
   ```

### Frontend Testing

Test the expense creation form:
1. Navigate to `/expenses/new`
2. Fill out all required fields
3. Submit the form
4. Verify redirect to `/expenses` page
5. Verify expense appears in the list

---

## Related APIs

- **List Expenses:** `GET /expenses` - Get all expenses with optional filters
- **Update Expense:** `PATCH /expenses/:id` - Update an existing expense
- **Delete Expense:** `DELETE /expenses/:id` - Delete an expense
- **Monthly Summary:** `GET /expenses/summary/monthly` - Get monthly expense summary

---

## Notes

1. **Organization Assignment:** The expense is automatically assigned to the user's first organization. If the user belongs to multiple organizations, the first one is used.

2. **Amount Precision:** Amounts are stored with 2 decimal places precision (DECIMAL(14, 2) in database).

3. **Date Handling:** Dates are stored in UTC timezone (TIMESTAMPTZ). Frontend should convert local time to ISO 8601 format before sending.

4. **Category Management:** Categories are stored as plain strings. Consider implementing a category management system for better organization.

5. **Soft Delete:** Currently, expenses are hard-deleted. Consider implementing soft delete for audit purposes.

6. **Permissions:** All authenticated users can create expenses. Consider adding role-based permissions if needed.

---

## Support

For API issues or questions:
- Check the error response for detailed error messages
- Verify authentication token is valid
- Ensure user is assigned to an organization
- Review validation rules for each field

---

## Changelog

- **2025-01-15**: Initial documentation created
- Includes frontend integration details from `webFe/src/app/expenses/new/page.tsx`
- Includes backend implementation details from `be/src/expenses/`

