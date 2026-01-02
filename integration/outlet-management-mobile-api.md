# Outlet Management API - Mobile App Integration Guide

## Overview

This document provides comprehensive API documentation for integrating outlet management functionality into mobile applications. The outlet management system allows organizations to manage multiple outlets (branches/locations), with data isolation per outlet for sales, expenses, and inventory.

## Base URL

```
http://localhost:4000/api
```

**Note:** Replace with your production API URL in production builds.

## Authentication

All endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Outlet Context Header

**Important:** For operations that are outlet-scoped (sales, expenses, inventory), you MUST include the selected outlet ID in the request header:

```
X-Outlet-Id: <outlet_uuid>
```

This header is automatically used by the backend to filter and scope data to the selected outlet.

---

## Data Models

### Outlet

```typescript
interface Outlet {
  id: string;                    // UUID
  organizationId: string;        // UUID of parent organization
  name: string;                  // Outlet name (e.g., "Downtown Branch")
  address?: string | null;       // Physical address
  contactNumber?: string | null; // Contact phone number
  isActive: boolean;             // Whether outlet is active
  isPrimary: boolean;            // Whether this is the primary outlet
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}
```

---

## API Endpoints

### 1. List All Outlets

Get a list of all outlets for the user's organization(s).

**Endpoint:** `GET /outlets`

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
    "name": "Main Outlet",
    "address": "123 Main Street, City",
    "contactNumber": "+91 1234567890",
    "isActive": true,
    "isPrimary": true,
    "createdAt": "2025-01-15T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:00:00.000Z"
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
    "name": "Downtown Branch",
    "address": "456 Downtown Ave, City",
    "contactNumber": "+91 9876543210",
    "isActive": true,
    "isPrimary": false,
    "createdAt": "2025-01-16T10:00:00.000Z",
    "updatedAt": "2025-01-16T10:00:00.000Z"
  }
]
```

**Notes:**
- Returns outlets sorted by `isPrimary` (DESC) then `name` (ASC)
- Only returns outlets from organizations the user belongs to
- Inactive outlets are included in the response

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User not assigned to any organization

---

### 2. Get Outlet Details

Get detailed information about a specific outlet.

**Endpoint:** `GET /outlets/:id`

**Path Parameters:**
- `id` (string, UUID) - Outlet ID

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
  "name": "Main Outlet",
  "address": "123 Main Street, City",
  "contactNumber": "+91 1234567890",
  "isActive": true,
  "isPrimary": true,
  "createdAt": "2025-01-15T10:00:00.000Z",
  "updatedAt": "2025-01-15T10:00:00.000Z"
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not have access to this outlet
- `404 Not Found` - Outlet not found

---

### 3. Create Outlet

Create a new outlet for the organization.

**Endpoint:** `POST /outlets`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Downtown Branch",
  "address": "456 Downtown Ave, City",
  "contactNumber": "+91 9876543210",
  "isPrimary": false
}
```

**Request Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Outlet name, max 120 characters |
| `address` | string | No | Physical address |
| `contactNumber` | string | No | Contact phone, max 20 characters |
| `isPrimary` | boolean | No | Set as primary outlet (default: false) |

**Validation Rules:**
- `name`: Required, must be a non-empty string, maximum 120 characters
- `address`: Optional, can be null
- `contactNumber`: Optional, maximum 20 characters
- `isPrimary`: Optional, if set to true, other primary outlets in the organization will be unset

**Response:** `201 Created`
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
  "name": "Downtown Branch",
  "address": "456 Downtown Ave, City",
  "contactNumber": "+91 9876543210",
  "isActive": true,
  "isPrimary": false,
  "createdAt": "2025-01-16T10:00:00.000Z",
  "updatedAt": "2025-01-16T10:00:00.000Z"
}
```

**Notes:**
- If this is the first outlet for the organization, it will automatically be set as primary
- If `isPrimary` is true, all other primary outlets in the organization will be unset
- New outlets are created with `isActive: true` by default

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User not assigned to any organization

---

### 4. Update Outlet

Update outlet information.

**Endpoint:** `PATCH /outlets/:id`

**Path Parameters:**
- `id` (string, UUID) - Outlet ID

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Downtown Branch - Updated",
  "address": "789 New Street, City",
  "contactNumber": "+91 1111111111",
  "isActive": true,
  "isPrimary": true
}
```

**Request Fields:** (all optional)
- `name` (string) - Outlet name, max 120 characters
- `address` (string) - Physical address
- `contactNumber` (string) - Contact phone, max 20 characters
- `isActive` (boolean) - Whether outlet is active
- `isPrimary` (boolean) - Set as primary outlet

**Response:** `200 OK`
```json
{
  "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "organizationId": "13df4863-961c-45c0-9da7-d0d14379d8fc",
  "name": "Downtown Branch - Updated",
  "address": "789 New Street, City",
  "contactNumber": "+91 1111111111",
  "isActive": true,
  "isPrimary": true,
  "createdAt": "2025-01-16T10:00:00.000Z",
  "updatedAt": "2025-01-16T11:00:00.000Z"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid input data
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not have access to this outlet
- `404 Not Found` - Outlet not found

---

### 5. Delete Outlet

Soft delete an outlet (sets `isActive` to false).

**Endpoint:** `DELETE /outlets/:id`

**Path Parameters:**
- `id` (string, UUID) - Outlet ID

**Headers:**
```
Authorization: Bearer <token>
```

**Response:** `200 OK`
```json
{}
```

**Notes:**
- Cannot delete the last outlet in an organization
- If the deleted outlet was primary, another outlet will be automatically set as primary
- This is a soft delete - the outlet is marked as inactive, not permanently removed

**Error Responses:**
- `400 Bad Request` - Cannot delete the last outlet
- `401 Unauthorized` - Invalid or missing token
- `403 Forbidden` - User does not have access to this outlet
- `404 Not Found` - Outlet not found

---

## Outlet Selection & Context

### Selecting an Outlet

After login, the mobile app should:

1. **Fetch available outlets:**
   ```typescript
   const outlets = await fetchOutlets(token);
   ```

2. **Auto-select logic:**
   - If only 1 outlet → Auto-select it
   - If multiple outlets → Show selector to user
   - If user has a previously selected outlet → Restore it (if still valid)
   - Otherwise → Select primary outlet or first one

3. **Store selected outlet:**
   - Save outlet ID in local storage/secure storage
   - Include in all subsequent API requests via `X-Outlet-Id` header

### Outlet Context in Requests

For **outlet-scoped operations**, always include the `X-Outlet-Id` header:

**Operations that require outlet context:**
- Creating sales
- Listing sales
- Creating expenses
- Listing expenses
- Inventory operations (if implemented)
- Reports (filtered by outlet)

**Operations that don't require outlet context:**
- Listing outlets
- Creating/updating/deleting outlets
- User management
- Organization management
- Product management (products are organization-scoped)

---

## Mobile App Integration Examples

### Example 1: Fetch and Select Outlet

```typescript
// Fetch outlets after login
async function initializeOutlets(token: string) {
  try {
    const response = await fetch('http://localhost:4000/api/outlets', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch outlets');
    }
    
    const outlets: Outlet[] = await response.json();
    
    // Auto-select logic
    let selectedOutlet: Outlet | null = null;
    
    if (outlets.length === 1) {
      // Only one outlet - auto-select
      selectedOutlet = outlets[0];
    } else if (outlets.length > 1) {
      // Multiple outlets - check for saved selection
      const savedOutletId = await getStoredOutletId();
      if (savedOutletId) {
        selectedOutlet = outlets.find(o => o.id === savedOutletId) || null;
      }
      
      // If no saved selection, use primary or first
      if (!selectedOutlet) {
        selectedOutlet = outlets.find(o => o.isPrimary) || outlets[0];
      }
    }
    
    // Store selected outlet
    if (selectedOutlet) {
      await storeOutletId(selectedOutlet.id);
      return selectedOutlet;
    }
    
    return null;
  } catch (error) {
    console.error('Failed to initialize outlets:', error);
    throw error;
  }
}
```

### Example 2: Create Sale with Outlet Context

```typescript
async function createSale(
  token: string,
  outletId: string,
  saleData: {
    items: Array<{ productId: string; quantity: number; sellingPrice: number }>;
    totalAmount: number;
    soldBy: string;
    paymentType: 'cash' | 'UPI' | 'mixed';
  }
) {
  const response = await fetch('http://localhost:4000/api/sales', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Outlet-Id': outletId,  // Required for outlet-scoped operations
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      date: new Date().toISOString(),
      ...saleData
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create sale');
  }
  
  return await response.json();
}
```

### Example 3: Create Expense with Outlet Context

```typescript
async function createExpense(
  token: string,
  outletId: string,
  expenseData: {
    category: string;
    amount: number;
    note?: string;
    date: string;
    addedBy: string;
  }
) {
  const response = await fetch('http://localhost:4000/api/expenses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Outlet-Id': outletId,  // Required for outlet-scoped operations
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

### Example 4: List Sales Filtered by Outlet

```typescript
async function getSales(
  token: string,
  outletId: string,
  filters?: {
    from?: string;
    to?: string;
    page?: number;
    size?: number;
  }
) {
  const params = new URLSearchParams();
  if (filters?.from) params.set('from', filters.from);
  if (filters?.to) params.set('to', filters.to);
  if (filters?.page) params.set('page', filters.page.toString());
  if (filters?.size) params.set('size', filters.size.toString());
  
  const queryString = params.toString();
  const url = `http://localhost:4000/api/sales${queryString ? `?${queryString}` : ''}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Outlet-Id': outletId  // Sales are automatically filtered by outlet
    }
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch sales');
  }
  
  return await response.json(); // { sales: Sale[], total: number }
}
```

### Example 5: Outlet Selector Component (React Native)

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList } from 'react-native';

interface OutletSelectorProps {
  outlets: Outlet[];
  selectedOutlet: Outlet | null;
  onSelect: (outlet: Outlet) => void;
}

export function OutletSelector({ outlets, selectedOutlet, onSelect }: OutletSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  
  if (outlets.length <= 1) {
    // Don't show selector if only one outlet
    return null;
  }
  
  return (
    <View>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{
          padding: 12,
          backgroundColor: '#f3f4f6',
          borderRadius: 8,
          margin: 16
        }}
      >
        <Text style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>
          Current Outlet
        </Text>
        <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }}>
          {selectedOutlet?.name || 'Select Outlet'}
          {selectedOutlet?.isPrimary && (
            <Text style={{ fontSize: 12, color: '#6b7280' }}> (Primary)</Text>
          )}
        </Text>
      </TouchableOpacity>
      
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.5)'
        }}>
          <View style={{
            backgroundColor: 'white',
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
            maxHeight: '80%'
          }}>
            <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
              Select Outlet
            </Text>
            
            <FlatList
              data={outlets}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => {
                    onSelect(item);
                    setModalVisible(false);
                  }}
                  style={{
                    padding: 16,
                    backgroundColor: selectedOutlet?.id === item.id ? '#f3f4f6' : 'white',
                    borderRadius: 8,
                    marginBottom: 8,
                    borderWidth: selectedOutlet?.id === item.id ? 2 : 1,
                    borderColor: selectedOutlet?.id === item.id ? '#111827' : '#e5e7eb'
                  }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 16, fontWeight: '600' }}>
                      {item.name}
                    </Text>
                    {item.isPrimary && (
                      <Text style={{ fontSize: 12, color: '#6b7280' }}>
                        Primary
                      </Text>
                    )}
                  </View>
                  {item.address && (
                    <Text style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>
                      {item.address}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            />
            
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              style={{
                padding: 16,
                backgroundColor: '#111827',
                borderRadius: 8,
                marginTop: 16
              }}
            >
              <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
```

### Example 6: HTTP Client with Outlet Context

```typescript
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private outletId: string | null = null;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  setToken(token: string) {
    this.token = token;
  }
  
  setOutletId(outletId: string | null) {
    this.outletId = outletId;
  }
  
  async request<T>(
    endpoint: string,
    options: {
      method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
      body?: any;
      requiresOutlet?: boolean;
    } = {}
  ): Promise<T> {
    const { method = 'GET', body, requiresOutlet = false } = options;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    // Add outlet context for outlet-scoped operations
    if (requiresOutlet && this.outletId) {
      headers['X-Outlet-Id'] = this.outletId;
    }
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    
    if (response.status === 204) {
      return null as T;
    }
    
    return await response.json();
  }
  
  // Outlet operations (don't require outlet context)
  async getOutlets(): Promise<Outlet[]> {
    return this.request<Outlet[]>('/outlets');
  }
  
  async createOutlet(data: {
    name: string;
    address?: string;
    contactNumber?: string;
    isPrimary?: boolean;
  }): Promise<Outlet> {
    return this.request<Outlet>('/outlets', {
      method: 'POST',
      body: data
    });
  }
  
  // Sales operations (require outlet context)
  async createSale(data: any): Promise<Sale> {
    return this.request<Sale>('/sales', {
      method: 'POST',
      body: data,
      requiresOutlet: true  // This will add X-Outlet-Id header
    });
  }
  
  async getSales(filters?: any): Promise<{ sales: Sale[]; total: number }> {
    const params = new URLSearchParams(filters || {}).toString();
    return this.request<{ sales: Sale[]; total: number }>(
      `/sales${params ? `?${params}` : ''}`,
      { requiresOutlet: true }
    );
  }
  
  // Expenses operations (require outlet context)
  async createExpense(data: any): Promise<Expense> {
    return this.request<Expense>('/expenses', {
      method: 'POST',
      body: data,
      requiresOutlet: true
    });
  }
  
  async getExpenses(filters?: any): Promise<{ expenses: Expense[]; total: number }> {
    const params = new URLSearchParams(filters || {}).toString();
    return this.request<{ expenses: Expense[]; total: number }>(
      `/expenses${params ? `?${params}` : ''}`,
      { requiresOutlet: true }
    );
  }
}

// Usage
const apiClient = new ApiClient('http://localhost:4000/api');
apiClient.setToken(userToken);
apiClient.setOutletId(selectedOutletId);

// Create sale - outlet context automatically included
const sale = await apiClient.createSale({
  date: new Date().toISOString(),
  items: [...],
  totalAmount: 100.00,
  soldBy: userId,
  paymentType: 'cash'
});
```

---

## Outlet Selection Flow

### Initial Setup Flow

1. **User logs in** → Receive JWT token
2. **Fetch outlets** → `GET /outlets`
3. **Determine selection:**
   - If 1 outlet → Auto-select
   - If multiple → Check saved preference
   - If no saved preference → Select primary or first
4. **Store selection** → Save outlet ID locally
5. **Set outlet context** → Include `X-Outlet-Id` in all outlet-scoped requests

### Switching Outlets

1. **User selects different outlet** from selector
2. **Update stored outlet ID**
3. **Refresh data** → Reload sales, expenses, etc. for new outlet
4. **Update UI** → Show outlet name/context in app

### Handling Outlet Changes

- **Outlet deleted:** If selected outlet is deleted, auto-select primary or first available
- **Outlet deactivated:** If selected outlet becomes inactive, show warning and allow switch
- **New outlet created:** Refresh outlet list and allow selection

---

## Error Handling

### Common Error Scenarios

1. **Missing Outlet Selection**
   - Error: `400 Bad Request - X-Outlet-Id header is required`
   - Solution: Ensure outlet is selected before making outlet-scoped requests

2. **Invalid Outlet ID**
   - Error: `403 Forbidden - You do not have access to this outlet`
   - Solution: Verify outlet belongs to user's organization

3. **Outlet Not Found**
   - Error: `404 Not Found - Outlet {id} not found`
   - Solution: Refresh outlet list and re-select

4. **Cannot Delete Last Outlet**
   - Error: `400 Bad Request - Cannot delete the last outlet in an organization`
   - Solution: Inform user they must have at least one outlet

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "X-Outlet-Id header is required",
  "error": "Bad Request"
}
```

### Best Practices

1. **Always check outlet selection** before making outlet-scoped requests
2. **Handle outlet changes gracefully** - refresh data when outlet changes
3. **Show outlet context** in UI so users know which outlet they're working with
4. **Validate outlet access** - check if user has access before operations
5. **Cache outlet list** - but refresh periodically to catch changes

---

## Data Isolation Rules

### Outlet-Scoped Data

The following operations are automatically filtered by the `X-Outlet-Id` header:

- **Sales:** All sales operations (create, list, update)
- **Expenses:** All expense operations (create, list, update)
- **Reports:** Sales and expense reports are filtered by outlet

### Organization-Scoped Data

The following are shared across all outlets in an organization:

- **Products:** Products are organization-wide
- **Users:** User management is organization-wide
- **Settings:** Business settings are organization-wide
- **Categories:** Product categories are organization-wide

### Outlet Management

- **Outlet CRUD:** Creating/updating/deleting outlets doesn't require outlet context
- **Outlet selection:** Users can switch between outlets they have access to

---

## Testing

### Manual Testing Checklist

1. **Test outlet listing:**
   ```bash
   curl -X GET http://localhost:4000/api/outlets \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

2. **Test outlet creation:**
   ```bash
   curl -X POST http://localhost:4000/api/outlets \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test Outlet",
       "address": "Test Address",
       "contactNumber": "+91 1234567890"
     }'
   ```

3. **Test sale creation with outlet context:**
   ```bash
   curl -X POST http://localhost:4000/api/sales \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "X-Outlet-Id: OUTLET_ID" \
     -H "Content-Type: application/json" \
     -d '{
       "date": "2025-01-15T10:00:00.000Z",
       "items": [{"productId": "prod-id", "quantity": 1, "sellingPrice": 10.00}],
       "totalAmount": 10.00,
       "soldBy": "user-id",
       "paymentType": "cash"
     }'
   ```

4. **Test without outlet context (should fail for outlet-scoped operations):**
   ```bash
   curl -X POST http://localhost:4000/api/sales \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{...}'
   # Should return 400 Bad Request
   ```

---

## Best Practices

### 1. Outlet Selection UX

- **Show outlet selector prominently** when multiple outlets exist
- **Display current outlet** in app header/navigation
- **Allow quick switching** between outlets
- **Persist selection** across app sessions

### 2. Data Management

- **Cache outlet list** but refresh on app start
- **Clear outlet-scoped data** when switching outlets
- **Show loading states** when fetching outlet-specific data
- **Handle offline scenarios** - queue requests if outlet context is missing

### 3. Error Handling

- **Validate outlet selection** before operations
- **Handle outlet deletion gracefully** - auto-select another outlet
- **Show clear error messages** when outlet context is missing
- **Retry with proper context** if request fails due to missing outlet

### 4. Performance

- **Lazy load outlet data** - only fetch when needed
- **Cache outlet information** locally
- **Batch requests** when possible
- **Use pagination** for large datasets

---

## Related APIs

- **Sales API:** `/api/sales` - Create and manage sales (requires outlet context)
- **Expenses API:** `/api/expenses` - Create and manage expenses (requires outlet context)
- **Organizations API:** `/api/organizations` - Manage organizations
- **Products API:** `/api/products` - Manage products (organization-scoped)

---

## Notes

1. **Default Outlet:** When an organization is created, a default "Main Outlet" is automatically created
2. **Primary Outlet:** Only one outlet can be primary per organization
3. **Soft Delete:** Outlets are soft-deleted (marked inactive), not permanently removed
4. **Data Migration:** Existing sales and expenses are automatically assigned to the default outlet
5. **Multi-Organization:** Users can belong to multiple organizations, each with their own outlets

---

## Support

For API issues or questions:
- Check error responses for detailed error messages
- Verify authentication token is valid
- Ensure user is assigned to an organization
- Verify outlet belongs to user's organization
- Check that `X-Outlet-Id` header is included for outlet-scoped operations

---

## Changelog

- **2025-01-16**: Initial mobile integration guide created
- Includes outlet management API endpoints
- Includes outlet context handling
- Includes mobile app integration examples
- Includes React Native component examples

