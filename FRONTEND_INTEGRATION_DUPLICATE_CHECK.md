# Frontend Integration Guide - Product Duplicate Check

This guide shows you exactly how to integrate the duplicate check API into your product creation and editing forms.

## Quick Overview

- **API Method**: `productsApi.checkDuplicate(token, name, excludeId?)`
- **When to Check**: After user types product name (debounced)
- **Response**: Returns `isDuplicate` boolean and similar product info if found

---

## Step 1: Add State Variables

Add these state variables to your `ProductsPage` component:

```typescript
// Add after your existing state declarations (around line 65)

// Duplicate check state for create form
const [duplicateWarning, setDuplicateWarning] = useState<{
  message: string;
  similarProduct: { id: string; name: string };
} | null>(null);
const [checkingDuplicate, setCheckingDuplicate] = useState(false);
const duplicateCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

// Duplicate check state for edit forms
const [editDuplicateWarnings, setEditDuplicateWarnings] = useState<
  Record<string, { message: string; similarProduct: { id: string; name: string } }>
>({});
const [checkingEditDuplicates, setCheckingEditDuplicates] = useState<Record<string, boolean>>({});
const editDuplicateTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
```

**Don't forget to import `useRef`:**

```typescript
// Update your imports at the top
import { FormEvent, useEffect, useMemo, useState, useCallback, useRef } from 'react';
```

---

## Step 2: Add Duplicate Check Functions

Add these functions after your `loadProducts` function (around line 104):

```typescript
// Add duplicate check function for create form
const checkDuplicate = useCallback(async (productName: string) => {
  if (!token || !productName.trim() || productName.trim().length < 2) {
    setDuplicateWarning(null);
    return;
  }

  // Clear previous timer
  if (duplicateCheckTimerRef.current) {
    clearTimeout(duplicateCheckTimerRef.current);
  }

  setCheckingDuplicate(true);

  // Debounce: wait 500ms after user stops typing
  duplicateCheckTimerRef.current = setTimeout(async () => {
    try {
      const result = await productsApi.checkDuplicate(token, productName.trim());
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
      setDuplicateWarning(null);
    } finally {
      setCheckingDuplicate(false);
    }
  }, 500);
}, [token]);

// Add duplicate check function for edit forms
const checkEditDuplicate = useCallback(async (productName: string, productId: string) => {
  if (!token || !productName.trim() || productName.trim().length < 2) {
    setEditDuplicateWarnings((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    return;
  }

  // Clear previous timer for this product
  if (editDuplicateTimersRef.current[productId]) {
    clearTimeout(editDuplicateTimersRef.current[productId]);
  }

  setCheckingEditDuplicates((prev) => ({ ...prev, [productId]: true }));

  // Debounce: wait 500ms after user stops typing
  editDuplicateTimersRef.current[productId] = setTimeout(async () => {
    try {
      const result = await productsApi.checkDuplicate(token, productName.trim(), productId);
      if (result.isDuplicate && result.similarProduct) {
        setEditDuplicateWarnings((prev) => ({
          ...prev,
          [productId]: {
            message: result.message || 'A product with a similar name may already exist',
            similarProduct: result.similarProduct,
          },
        }));
      } else {
        setEditDuplicateWarnings((prev) => {
          const next = { ...prev };
          delete next[productId];
          return next;
        });
      }
    } catch (err) {
      console.error('Failed to check duplicate:', err);
      setEditDuplicateWarnings((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    } finally {
      setCheckingEditDuplicates((prev) => {
        const next = { ...prev };
        delete next[productId];
        return next;
      });
    }
  }, 500);
}, [token]);

// Cleanup timers on unmount
useEffect(() => {
  return () => {
    if (duplicateCheckTimerRef.current) {
      clearTimeout(duplicateCheckTimerRef.current);
    }
    Object.values(editDuplicateTimersRef.current).forEach((timer) => {
      clearTimeout(timer);
    });
  };
}, []);
```

---

## Step 3: Update Create Form Name Input

Replace the name input in your create form (around line 364):

```typescript
// Replace the existing name input with this:
<div className="relative">
  <input
    required
    placeholder="Product name"
    value={createState.name}
    onChange={(event) => {
      const value = event.target.value;
      setCreateState((prev) => ({ ...prev, name: value }));
      checkDuplicate(value);
    }}
    className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
      duplicateWarning
        ? 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200'
        : 'border-zinc-200 focus:border-zinc-500 focus:ring-zinc-200'
    }`}
  />
  {checkingDuplicate && (
    <div className="absolute right-3 top-2.5">
      <svg
        className="h-4 w-4 animate-spin text-zinc-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  )}
</div>

{/* Add duplicate warning message after the input */}
{duplicateWarning && (
  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
    <p className="text-sm font-medium text-orange-800">
      ⚠️ {duplicateWarning.message}
    </p>
    <p className="mt-1 text-sm text-orange-700">
      Similar product found: <strong>{duplicateWarning.similarProduct.name}</strong>
    </p>
    <button
      type="button"
      onClick={() => {
        setCreateState((prev) => ({ ...prev, name: duplicateWarning.similarProduct.name }));
        setDuplicateWarning(null);
      }}
      className="mt-2 text-sm text-orange-600 underline hover:text-orange-700"
    >
      Use this name instead
    </button>
  </div>
)}
```

---

## Step 4: Update Edit Form Name Input

Find where you render the edit form inputs (search for where `editForms` is used). You'll need to update the name input in the edit form similarly.

Look for code that renders edit inputs, it should be something like:

```typescript
// Find the edit form section and update the name input
<input
  required
  placeholder="Product name"
  value={editForms[product.id]?.name || ''}
  onChange={(event) => {
    const value = event.target.value;
    setEditForms((prev) => ({
      ...prev,
      [product.id]: { ...prev[product.id], name: value },
    }));
    checkEditDuplicate(value, product.id);
  }}
  // ... existing className
/>
```

Replace it with:

```typescript
<div className="relative">
  <input
    required
    placeholder="Product name"
    value={editForms[product.id]?.name || ''}
    onChange={(event) => {
      const value = event.target.value;
      setEditForms((prev) => ({
        ...prev,
        [product.id]: { ...prev[product.id], name: value },
      }));
      checkEditDuplicate(value, product.id);
    }}
    className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
      editDuplicateWarnings[product.id]
        ? 'border-orange-300 bg-orange-50 focus:border-orange-500 focus:ring-orange-200'
        : 'border-zinc-200 focus:border-zinc-500 focus:ring-zinc-200'
    }`}
  />
  {checkingEditDuplicates[product.id] && (
    <div className="absolute right-3 top-2.5">
      <svg
        className="h-4 w-4 animate-spin text-zinc-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        ></path>
      </svg>
    </div>
  )}
</div>

{/* Add duplicate warning for edit form */}
{editDuplicateWarnings[product.id] && (
  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
    <p className="text-sm font-medium text-orange-800">
      ⚠️ {editDuplicateWarnings[product.id].message}
    </p>
    <p className="mt-1 text-sm text-orange-700">
      Similar product found: <strong>{editDuplicateWarnings[product.id].similarProduct.name}</strong>
    </p>
    <button
      type="button"
      onClick={() => {
        setEditForms((prev) => ({
          ...prev,
          [product.id]: {
            ...prev[product.id],
            name: editDuplicateWarnings[product.id].similarProduct.name,
          },
        }));
        setEditDuplicateWarnings((prev) => {
          const next = { ...prev };
          delete next[product.id];
          return next;
        });
      }}
      className="mt-2 text-sm text-orange-600 underline hover:text-orange-700"
    >
      Use this name instead
    </button>
  </div>
)}
```

---

## Step 5: Clear Warnings on Form Reset

Update your `handleCreate` function to clear the duplicate warning after successful creation:

```typescript
// In your handleCreate function, after successful creation, add:
setDuplicateWarning(null);
setCreateState(blankProduct);
// ... rest of your reset logic
```

Also clear warnings when starting to edit:

```typescript
// When setting editingProductId, clear any warnings
const handleStartEdit = (id: string) => {
  setEditingProductId(id);
  // Clear any existing warnings for this product
  setEditDuplicateWarnings((prev) => {
    const next = { ...prev };
    delete next[id];
    return next;
  });
};
```

---

## Complete Code Snippets

### Full Imports Section

```typescript
'use client';

import { FormEvent, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { productsApi } from '@/lib/api-client';
import { Product } from '@/types/product';
```

### State Variables (Add after line 65)

```typescript
// Duplicate check state
const [duplicateWarning, setDuplicateWarning] = useState<{
  message: string;
  similarProduct: { id: string; name: string };
} | null>(null);
const [checkingDuplicate, setCheckingDuplicate] = useState(false);
const duplicateCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

const [editDuplicateWarnings, setEditDuplicateWarnings] = useState<
  Record<string, { message: string; similarProduct: { id: string; name: string } }>
>({});
const [checkingEditDuplicates, setCheckingEditDuplicates] = useState<Record<string, boolean>>({});
const editDuplicateTimersRef = useRef<Record<string, NodeJS.Timeout>>({});
```

---

## Visual Preview

When a duplicate is detected, the user will see:

1. **Input field** turns orange with orange background
2. **Loading spinner** appears while checking
3. **Warning message** appears below the input:
   ```
   ⚠️ A product with a similar name may already exist
   Similar product found: Chocolate Waffle
   [Use this name instead]
   ```

---

## Testing Checklist

- [ ] Type a product name that exists → Should show warning
- [ ] Type a product name with typo (e.g., "Coffe" instead of "Coffee") → Should show warning
- [ ] Type "Chocolate Waffle" when "Nutella Waffle" exists → Should NOT show warning (different products)
- [ ] Clear the input → Warning should disappear
- [ ] Click "Use this name instead" → Should fill the input with suggested name
- [ ] Edit an existing product → Should exclude current product from check
- [ ] Create product successfully → Warning should clear

---

## Troubleshooting

### Warning not showing?
- Check browser console for errors
- Verify `token` is available
- Ensure product name is at least 2 characters
- Check network tab to see if API call is being made

### Too many API calls?
- Increase debounce delay from 500ms to 800ms
- Add minimum character check (already included: 2 chars)

### Warning persists after clearing?
- Make sure you're clearing state in `handleCreate`
- Check that `setDuplicateWarning(null)` is called

---

## Alternative: Simpler Implementation (Create Form Only)

If you only want to add it to the create form (not edit forms), here's a simpler version:

```typescript
// Add state
const [duplicateWarning, setDuplicateWarning] = useState<{
  message: string;
  similarProduct: { id: string; name: string };
} | null>(null);
const duplicateTimerRef = useRef<NodeJS.Timeout | null>(null);

// Add function
const checkDuplicate = useCallback(async (name: string) => {
  if (!token || !name.trim() || name.trim().length < 2) {
    setDuplicateWarning(null);
    return;
  }

  if (duplicateTimerRef.current) {
    clearTimeout(duplicateTimerRef.current);
  }

  duplicateTimerRef.current = setTimeout(async () => {
    try {
      const result = await productsApi.checkDuplicate(token, name.trim());
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
    }
  }, 500);
}, [token]);

// Update input onChange
onChange={(event) => {
  const value = event.target.value;
  setCreateState((prev) => ({ ...prev, name: value }));
  checkDuplicate(value);
}}
```

---

## Summary

1. ✅ Add state for duplicate warnings
2. ✅ Add debounced check functions
3. ✅ Update name inputs to call check function
4. ✅ Show warning UI when duplicate found
5. ✅ Clear warnings on form reset

The duplicate check will now work automatically as users type product names!

