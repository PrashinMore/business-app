# CRM Mobile API Integration Guide

This document provides comprehensive API documentation for integrating the CRM (Customer Relationship Management) module into mobile applications.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Data Models](#data-models)
5. [Integration Flow](#integration-flow)
6. [Error Handling](#error-handling)
7. [Code Examples](#code-examples)

---

## Overview

The CRM module enables mobile apps to:
- Capture customer information during checkout
- View customer profiles and history
- Track customer visits and spending
- Manage customer notes and feedback
- Support loyalty programs

**Base URL**: `https://your-api-domain.com/api`

**Note**: CRM features must be enabled in organization settings (`enableCRM: true`). Check settings before making CRM API calls.

---

## Authentication

All CRM endpoints require JWT authentication. Include the token in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

For multi-outlet support, include the outlet ID in the `X-Outlet-Id` header:

```
X-Outlet-Id: <outlet-uuid>
```

---

## API Endpoints

### 1. CRM Dashboard Stats

Get overview statistics for the CRM module.

**Endpoint**: `GET /crm/dashboard`

**Headers**:
- `Authorization: Bearer <token>`
- `X-Outlet-Id: <outlet-id>` (optional)

**Response**:
```json
{
  "totalCustomers": 150,
  "newCustomersLast7Days": 12,
  "repeatRate": 65.5,
  "avgVisitsPerCustomer": 3.2
}
```

---

### 2. List Customers

Get a paginated list of customers with optional filters.

**Endpoint**: `GET /crm/customers`

**Query Parameters**:
- `search` (string, optional): Search by name, phone, or email
- `segment` (string, optional): Filter by segment
  - `first-time`: Customers with 0 visits
  - `regulars`: Customers with 5+ visits
  - `high-spenders`: Customers with ₹5000+ total spend
  - `inactive-30`: No visit in last 30 days
  - `inactive-60`: No visit in last 60 days
- `tag` (string, optional): Filter by tag
- `page` (number, optional): Page number (default: 1)
- `size` (number, optional): Items per page (default: 20)

**Example**:
```
GET /crm/customers?search=john&segment=regulars&page=1&size=20
```

**Response**:
```json
{
  "customers": [
    {
      "id": "uuid",
      "organizationId": "uuid",
      "name": "John Doe",
      "phone": "9876543210",
      "email": "john@example.com",
      "birthday": "1990-01-15",
      "gender": "MALE",
      "tags": ["VIP", "Regular"],
      "totalVisits": 10,
      "totalSpend": 5000.00,
      "avgOrderValue": 500.00,
      "lastVisitAt": "2024-01-15T10:30:00Z",
      "createdAt": "2023-06-01T08:00:00Z",
      "updatedAt": "2024-01-15T10:30:00Z",
      "loyaltyAccount": {
        "id": "uuid",
        "customerId": "uuid",
        "points": 50,
        "tier": "GOLD",
        "createdAt": "2023-06-01T08:00:00Z",
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    }
  ],
  "total": 150
}
```

---

### 3. Get Customer Details

Get detailed information about a specific customer.

**Endpoint**: `GET /crm/customers/:id`

**Path Parameters**:
- `id` (uuid): Customer ID

**Response**: Same as customer object in list response

---

### 4. Create Customer

Create a new customer record.

**Endpoint**: `POST /crm/customers`

**Request Body**:
```json
{
  "name": "John Doe",
  "phone": "9876543210",
  "email": "john@example.com",
  "birthday": "1990-01-15",
  "gender": "MALE",
  "tags": ["VIP"]
}
```

**Required Fields**:
- `name` (string): Customer name
- `phone` (string): Phone number (10-20 characters)

**Optional Fields**:
- `email` (string): Email address
- `birthday` (string): Date in ISO format (YYYY-MM-DD)
- `gender` (string): `MALE`, `FEMALE`, or `OTHER`
- `tags` (array of strings): Customer tags

**Response**: Customer object

**Note**: If a customer with the same phone number already exists, the API will return an error. Use `findOrCreateCustomer` during checkout instead.

---

### 5. Update Customer

Update customer information.

**Endpoint**: `PATCH /crm/customers/:id`

**Path Parameters**:
- `id` (uuid): Customer ID

**Request Body** (all fields optional):
```json
{
  "name": "John Doe Updated",
  "email": "newemail@example.com",
  "birthday": "1990-01-15",
  "gender": "FEMALE",
  "tags": ["VIP", "Regular"]
}
```

**Response**: Updated customer object

---

### 6. Get Customer Visits

Get visit history for a customer.

**Endpoint**: `GET /crm/customers/:id/visits`

**Path Parameters**:
- `id` (uuid): Customer ID

**Response**:
```json
[
  {
    "id": "uuid",
    "customerId": "uuid",
    "orderId": "uuid",
    "outletId": "uuid",
    "billAmount": 500.00,
    "visitType": "DINE_IN",
    "visitedAt": "2024-01-15T10:30:00Z",
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

**Visit Types**:
- `DINE_IN`: Customer dined in
- `TAKEAWAY`: Takeaway order
- `DELIVERY`: Delivery order

---

### 7. Create Customer Note

Add a note to a customer's profile.

**Endpoint**: `POST /crm/customers/:id/notes`

**Path Parameters**:
- `id` (uuid): Customer ID

**Request Body**:
```json
{
  "note": "Customer prefers less sugar in coffee"
}
```

**Response**:
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "createdByUserId": "uuid",
  "note": "Customer prefers less sugar in coffee",
  "createdAt": "2024-01-15T10:30:00Z",
  "createdBy": {
    "id": "uuid",
    "name": "Staff Name",
    "email": "staff@example.com"
  }
}
```

---

### 8. Get Customer Notes

Get all notes for a customer.

**Endpoint**: `GET /crm/customers/:id/notes`

**Path Parameters**:
- `id` (uuid): Customer ID

**Response**: Array of note objects (same structure as create response)

---

### 9. Create Customer Feedback

Submit feedback/rating for a customer.

**Endpoint**: `POST /crm/customers/:id/feedback`

**Path Parameters**:
- `id` (uuid): Customer ID

**Request Body**:
```json
{
  "rating": 5,
  "comment": "Great service!",
  "orderId": "uuid"
}
```

**Required Fields**:
- `rating` (number): Rating from 1-5

**Optional Fields**:
- `comment` (string): Feedback comment
- `orderId` (uuid): Related order ID

**Response**:
```json
{
  "id": "uuid",
  "customerId": "uuid",
  "orderId": "uuid",
  "rating": 5,
  "comment": "Great service!",
  "status": "OPEN",
  "createdAt": "2024-01-15T10:30:00Z"
}
```

---

### 10. Get Customer Feedback

Get all feedback for a customer.

**Endpoint**: `GET /crm/customers/:id/feedback`

**Path Parameters**:
- `id` (uuid): Customer ID

**Response**: Array of feedback objects

---

### 11. Update Feedback Status

Update feedback status (mark as resolved).

**Endpoint**: `PATCH /crm/feedback/:id`

**Path Parameters**:
- `id` (uuid): Feedback ID

**Request Body**:
```json
{
  "status": "RESOLVED"
}
```

**Status Values**:
- `OPEN`: Feedback is open
- `RESOLVED`: Feedback has been resolved

**Response**: Updated feedback object

---

## Integration with Sales/Checkout

### Customer Capture During Checkout

When creating a sale, you can link a customer by providing either:
1. `customerId`: Existing customer UUID
2. `customerPhone`: Phone number (will create/find customer automatically)

**Endpoint**: `POST /sales` (existing sales endpoint)

**Request Body** (additional fields for CRM):
```json
{
  "date": "2024-01-15T10:30:00Z",
  "items": [...],
  "totalAmount": 500.00,
  "soldBy": "user-uuid",
  "paymentType": "cash",
  "isPaid": true,
  "customerPhone": "9876543210",
  "visitType": "DINE_IN"
}
```

**CRM-Specific Fields**:
- `customerId` (uuid, optional): Existing customer ID
- `customerPhone` (string, optional): Phone number (auto-creates/finds customer)
- `visitType` (string, optional): `DINE_IN`, `TAKEAWAY`, or `DELIVERY` (default: `DINE_IN`)

**Behavior**:
- If `customerPhone` is provided, the system will:
  1. Search for existing customer with that phone number
  2. Create new customer if not found
  3. Automatically create a `CustomerVisit` record when sale is paid
  4. Update customer statistics (total visits, total spend, avg order value)
  5. Award loyalty points if loyalty program is enabled

**Note**: Customer visit is only created when `isPaid: true`. If payment is completed later, the visit will be created when the sale is updated to paid status.

---

## Data Models

### Customer

```typescript
interface Customer {
  id: string;                    // UUID
  organizationId: string;        // UUID
  name: string;                  // Customer name
  phone: string;                 // Phone number (primary identifier)
  email?: string | null;         // Email address
  birthday?: string | null;       // ISO date (YYYY-MM-DD)
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  tags: string[];                // Array of tags
  totalVisits: number;           // Total number of visits
  totalSpend: number;            // Total amount spent
  avgOrderValue: number;         // Average order value
  lastVisitAt?: string | null;   // ISO timestamp
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  loyaltyAccount?: LoyaltyAccount;
}
```

### CustomerVisit

```typescript
interface CustomerVisit {
  id: string;                    // UUID
  customerId: string;            // UUID
  orderId?: string | null;       // Sale/Order UUID
  outletId?: string | null;      // Outlet UUID
  billAmount: number;            // Bill amount
  visitType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  visitedAt: string;            // ISO timestamp
  createdAt: string;             // ISO timestamp
}
```

### CustomerNote

```typescript
interface CustomerNote {
  id: string;                    // UUID
  customerId: string;            // UUID
  createdByUserId: string;       // UUID
  note: string;                  // Note text
  createdAt: string;             // ISO timestamp
  createdBy?: {                  // User who created the note
    id: string;
    name: string;
    email: string;
  };
}
```

### CustomerFeedback

```typescript
interface CustomerFeedback {
  id: string;                    // UUID
  customerId: string;            // UUID
  orderId?: string | null;       // Related order UUID
  rating: number;               // 1-5
  comment?: string | null;       // Feedback text
  status: 'OPEN' | 'RESOLVED';  // Status
  createdAt: string;             // ISO timestamp
}
```

### LoyaltyAccount

```typescript
interface LoyaltyAccount {
  id: string;                    // UUID
  customerId: string;            // UUID
  points: number;               // Loyalty points
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

---

## Integration Flow

### 1. Checkout Flow with Customer Capture

```
1. User adds items to cart
2. At checkout, prompt for customer phone (optional but recommended)
3. Create sale with customerPhone field:
   POST /sales
   {
     ...saleData,
     "customerPhone": "9876543210",
     "visitType": "DINE_IN"
   }
4. System automatically:
   - Finds or creates customer
   - Links sale to customer
   - Creates visit record (if paid)
   - Updates customer stats
   - Awards loyalty points (if enabled)
```

### 2. View Customer Profile

```
1. Search for customer:
   GET /crm/customers?search=9876543210
2. Get customer details:
   GET /crm/customers/:id
3. Get visit history:
   GET /crm/customers/:id/visits
4. Get notes:
   GET /crm/customers/:id/notes
5. Get feedback:
   GET /crm/customers/:id/feedback
```

### 3. Add Customer Note

```
1. Get customer ID from search or profile
2. Create note:
   POST /crm/customers/:id/notes
   {
     "note": "Customer prefers window seat"
   }
```

### 4. Collect Feedback

```
1. After order completion, prompt for rating
2. Submit feedback:
   POST /crm/customers/:id/feedback
   {
     "rating": 5,
     "comment": "Great service!",
     "orderId": "sale-uuid"
   }
```

---

## Error Handling

### Common Error Responses

**400 Bad Request**:
```json
{
  "statusCode": 400,
  "message": "Customer with this phone number already exists"
}
```

**403 Forbidden**:
```json
{
  "statusCode": 403,
  "message": "CRM is not enabled for this organization"
}
```

**404 Not Found**:
```json
{
  "statusCode": 404,
  "message": "Customer uuid not found"
}
```

**401 Unauthorized**:
```json
{
  "statusCode": 401,
  "message": "Invalid or expired token"
}
```

### Error Handling Best Practices

1. **Check CRM Status**: Before making CRM calls, verify that CRM is enabled:
   ```typescript
   const settings = await getSettings();
   if (!settings.enableCRM) {
     // Hide CRM features or show message
   }
   ```

2. **Handle Phone Validation**: Phone numbers are normalized (digits only). Validate on client side:
   ```typescript
   const normalizedPhone = phone.replace(/\D/g, '');
   if (normalizedPhone.length < 10) {
     // Show validation error
   }
   ```

3. **Graceful Degradation**: If CRM API fails, allow checkout to proceed without customer linking:
   ```typescript
   try {
     await createSale({ ...saleData, customerPhone });
   } catch (error) {
     // Log error but allow sale creation without customer
     await createSale(saleData);
   }
   ```

---

## Code Examples

### React Native / TypeScript

```typescript
// API Client
const API_BASE = 'https://your-api.com/api';

async function createSaleWithCustomer(
  token: string,
  saleData: SaleData,
  customerPhone?: string
) {
  const response = await fetch(`${API_BASE}/sales`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Outlet-Id': getSelectedOutletId(),
    },
    body: JSON.stringify({
      ...saleData,
      customerPhone: customerPhone?.replace(/\D/g, ''),
      visitType: 'DINE_IN',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Search Customers
async function searchCustomers(
  token: string,
  query: string
): Promise<Customer[]> {
  const response = await fetch(
    `${API_BASE}/crm/customers?search=${encodeURIComponent(query)}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Outlet-Id': getSelectedOutletId(),
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to search customers');
  }

  const data = await response.json();
  return data.customers;
}

// Get Customer Profile
async function getCustomerProfile(
  token: string,
  customerId: string
): Promise<Customer> {
  const response = await fetch(`${API_BASE}/crm/customers/${customerId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Outlet-Id': getSelectedOutletId(),
    },
  });

  if (!response.ok) {
    throw new Error('Customer not found');
  }

  return response.json();
}

// Add Customer Note
async function addCustomerNote(
  token: string,
  customerId: string,
  note: string
) {
  const response = await fetch(`${API_BASE}/crm/customers/${customerId}/notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Outlet-Id': getSelectedOutletId(),
    },
    body: JSON.stringify({ note }),
  });

  if (!response.ok) {
    throw new Error('Failed to add note');
  }

  return response.json();
}
```

### Swift / iOS

```swift
struct CRMService {
    let baseURL = "https://your-api.com/api"
    let token: String
    let outletId: String?
    
    func createSaleWithCustomer(
        saleData: SaleData,
        customerPhone: String?
    ) async throws -> Sale {
        var url = URL(string: "\(baseURL)/sales")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let outletId = outletId {
            request.setValue(outletId, forHTTPHeaderField: "X-Outlet-Id")
        }
        
        var payload = saleData
        payload.customerPhone = customerPhone?.replacingOccurrences(
            of: "[^0-9]",
            with: "",
            options: .regularExpression
        )
        payload.visitType = "DINE_IN"
        
        request.httpBody = try JSONEncoder().encode(payload)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw CRMError.requestFailed
        }
        
        return try JSONDecoder().decode(Sale.self, from: data)
    }
    
    func searchCustomers(query: String) async throws -> [Customer] {
        var components = URLComponents(string: "\(baseURL)/crm/customers")!
        components.queryItems = [
            URLQueryItem(name: "search", value: query)
        ]
        
        var request = URLRequest(url: components.url!)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        if let outletId = outletId {
            request.setValue(outletId, forHTTPHeaderField: "X-Outlet-Id")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw CRMError.requestFailed
        }
        
        let result = try JSONDecoder().decode(CustomerListResponse.self, from: data)
        return result.customers
    }
}
```

### Kotlin / Android

```kotlin
class CRMService(private val apiBase: String, private val token: String) {
    
    suspend fun createSaleWithCustomer(
        saleData: SaleData,
        customerPhone: String?
    ): Sale {
        val client = HttpClient(CIO) {
            install(JsonFeature) {
                serializer = KotlinxSerializer()
            }
        }
        
        val normalizedPhone = customerPhone?.replace(Regex("[^0-9]"), "")
        
        val response = client.post<Sale>("$apiBase/sales") {
            header("Authorization", "Bearer $token")
            header("Content-Type", "application/json")
            outletId?.let { header("X-Outlet-Id", it) }
            body = saleData.copy(
                customerPhone = normalizedPhone,
                visitType = "DINE_IN"
            )
        }
        
        return response
    }
    
    suspend fun searchCustomers(query: String): List<Customer> {
        val client = HttpClient(CIO) {
            install(JsonFeature) {
                serializer = KotlinxSerializer()
            }
        }
        
        val response = client.get<CustomerListResponse>(
            "$apiBase/crm/customers?search=${URLEncoder.encode(query, "UTF-8")}"
        ) {
            header("Authorization", "Bearer $token")
            outletId?.let { header("X-Outlet-Id", it) }
        }
        
        return response.customers
    }
}
```

---

## Testing

### Test Scenarios

1. **Customer Creation During Checkout**:
   - Create sale with new phone number
   - Verify customer is created
   - Verify visit is recorded when paid

2. **Customer Lookup**:
   - Create sale with existing phone number
   - Verify existing customer is linked
   - Verify visit is added to customer history

3. **Customer Search**:
   - Search by name
   - Search by phone
   - Search by email
   - Verify results are filtered correctly

4. **Customer Notes**:
   - Add note to customer
   - Retrieve notes
   - Verify note appears in customer profile

5. **Feedback Collection**:
   - Submit feedback with rating
   - Submit feedback with comment
   - Update feedback status

---

## Notes

1. **Phone Number Normalization**: Phone numbers are automatically normalized (digits only). Store and display in user-friendly format, but send normalized version to API.

2. **Loyalty Points**: Points are awarded automatically when:
   - Sale is created with `isPaid: true` and customer is linked
   - Sale is updated to paid status with customer linked
   - Formula: `points = floor(billAmount / 100)`

3. **Tier Upgrades**: 
   - Silver: 0-499 points
   - Gold: 500-999 points
   - Platinum: 1000+ points

4. **Customer Segments**: Pre-built segments are available for filtering:
   - First-time customers
   - Regulars (5+ visits)
   - High spenders (₹5000+)
   - Inactive customers (30/60 days)

5. **Multi-Outlet Support**: Customers are shared across outlets within the same organization. Phone number is the unique identifier per organization.

---

## Support

For API issues or questions:
- Check organization settings: `enableCRM` must be `true`
- Verify JWT token is valid and not expired
- Ensure user has access to the organization
- Check outlet ID if using multi-outlet setup

---

**Last Updated**: January 2024
**API Version**: 1.0

