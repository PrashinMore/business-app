# Product & Inventory Management API Documentation

## Table of Contents
1. [Product Management APIs](#product-management-apis)
2. [Inventory Management APIs](#inventory-management-apis) *(Coming in Part 2)*
3. [Stock Operations](#stock-operations) *(Coming in Part 3)*
4. [Advanced Features](#advanced-features) *(Coming in Part 4)*

---

## Part 1: Product Management APIs

### Base URL
All endpoints are prefixed with: `{API_BASE_URL}/products`
- Default: `http://localhost:4000/products`
- Environment variable: `NEXT_PUBLIC_API_BASE_URL`

### Authentication
All endpoints require authentication via Bearer token:
```
Authorization: Bearer <token>
```

---

### 1. List Products

**Endpoint:** `GET /products`

**Description:** Retrieve a list of products with optional filtering.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | No | Search products by name (case-insensitive) |
| `category` | string | No | Filter by product category |
| `lowStock` | string | No | Filter low stock items only (`"true"` or `"false"`) |

**Example Request:**
```typescript
// Get all products
productsApi.list(token)

// Search products
productsApi.list(token, { search: "milk" })

// Filter by category
productsApi.list(token, { category: "Dairy" })

// Get low stock items only
productsApi.list(token, { lowStockOnly: true })

// Combined filters
productsApi.list(token, { 
  search: "milk", 
  category: "Dairy", 
  lowStockOnly: true 
})
```

**Response:**
```typescript
Product[] // Array of Product objects
```

**Product Type:**
```typescript
interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit: string; // e.g., "kg", "liters", "pieces"
  lowStockThreshold: number;
  imageUrl: string | null;
  createdAt: string; // ISO 8601 date string
  updatedAt: string; // ISO 8601 date string
  isLowStock?: boolean; // Computed field
}
```

**Example Response:**
```json
[
  {
    "id": "prod-123",
    "name": "Whole Milk",
    "category": "Dairy",
    "costPrice": 45.00,
    "sellingPrice": 60.00,
    "stock": 25,
    "unit": "liters",
    "lowStockThreshold": 10,
    "imageUrl": "/uploads/products/milk.jpg",
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-20T14:22:00Z",
    "isLowStock": false
  }
]
```

---

### 2. Create Product

**Endpoint:** `POST /products`

**Description:** Create a new product. Supports both JSON and multipart/form-data (for image upload).

**Request Body (JSON - without image):**
```typescript
{
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  imageUrl?: string | null; // Optional existing image URL
}
```

**Request Body (FormData - with image):**
- `image`: File (optional) - Image file (max 5MB, formats: JPEG, JPG, PNG, GIF, WebP)
- `name`: string
- `category`: string
- `costPrice`: string (number as string)
- `sellingPrice`: string (number as string)
- `stock`: string (number as string)
- `unit`: string
- `lowStockThreshold`: string (number as string)
- `imageUrl`: string (optional)

**Example Request (without image):**
```typescript
productsApi.create(token, {
  name: "Whole Milk",
  category: "Dairy",
  costPrice: 45.00,
  sellingPrice: 60.00,
  stock: 50,
  unit: "liters",
  lowStockThreshold: 10
})
```

**Example Request (with image):**
```typescript
const imageFile = event.target.files[0]; // File object from input
productsApi.create(token, {
  name: "Whole Milk",
  category: "Dairy",
  costPrice: 45.00,
  sellingPrice: 60.00,
  stock: 50,
  unit: "liters",
  lowStockThreshold: 10
}, imageFile)
```

**Response:**
```typescript
Product // Created product object
```

**Validation Rules:**
- `name`: Required, non-empty string
- `category`: Required, non-empty string
- `costPrice`: Required, positive number
- `sellingPrice`: Required, positive number
- `stock`: Required, non-negative number
- `unit`: Required, non-empty string
- `lowStockThreshold`: Required, non-negative number
- `image`: Optional, max 5MB, image formats only

---

### 3. Update Product

**Endpoint:** `PATCH /products/:id`

**Description:** Update an existing product. Supports partial updates and image replacement.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Product ID |

**Request Body (JSON - without image):**
```typescript
{
  name?: string;
  category?: string;
  costPrice?: number;
  sellingPrice?: number;
  stock?: number;
  unit?: string;
  lowStockThreshold?: number;
  imageUrl?: string | null;
}
```

**Request Body (FormData - with image):**
- `image`: File (optional) - New image file
- Any of the above fields as strings

**Example Request (without image):**
```typescript
productsApi.update(token, "prod-123", {
  sellingPrice: 65.00,
  stock: 75
})
```

**Example Request (with image):**
```typescript
const newImageFile = event.target.files[0];
productsApi.update(token, "prod-123", {
  name: "Premium Whole Milk",
  sellingPrice: 65.00
}, newImageFile)
```

**Response:**
```typescript
Product // Updated product object
```

**Notes:**
- All fields are optional (partial update)
- If `image` is provided, it replaces the existing image
- Old image file is automatically deleted when replaced

---

### 4. Delete Product

**Endpoint:** `DELETE /products/:id`

**Description:** Delete a product permanently.

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Product ID |

**Example Request:**
```typescript
productsApi.remove(token, "prod-123")
```

**Response:**
```typescript
void // No content (204 status)
```

**Notes:**
- Product image file is automatically deleted
- Associated sales records are preserved (for historical data)

---

---

## Part 2: Inventory Management & Stock Operations

### 5. Adjust Stock

**Endpoint:** `PATCH /products/:id/stock`

**Description:** Adjust product stock by a delta value (increase or decrease). This is useful for:
- Adding stock from new purchases
- Removing stock for damaged/expired items
- Correcting inventory discrepancies
- Manual stock adjustments

**URL Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | Product ID |

**Request Body:**
```typescript
{
  delta: number; // Positive to increase, negative to decrease
}
```

**Example Request (Increase stock):**
```typescript
// Add 20 units to stock
productsApi.adjustStock(token, "prod-123", 20)
```

**Example Request (Decrease stock):**
```typescript
// Remove 5 units from stock (e.g., damaged items)
productsApi.adjustStock(token, "prod-123", -5)
```

**Response:**
```typescript
Product // Updated product with new stock value
```

**Example Response:**
```json
{
  "id": "prod-123",
  "name": "Whole Milk",
  "category": "Dairy",
  "costPrice": 45.00,
  "sellingPrice": 60.00,
  "stock": 45, // Updated stock (was 25, added 20)
  "unit": "liters",
  "lowStockThreshold": 10,
  "imageUrl": "/uploads/products/milk.jpg",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-20T15:30:00Z",
  "isLowStock": false
}
```

**Validation Rules:**
- `delta`: Required, number (can be positive or negative)
- Final stock cannot be negative (will return error if adjustment would result in negative stock)

**Error Cases:**
- **400 Bad Request:** If adjustment would result in negative stock
  ```json
  {
    "message": "Stock cannot be negative"
  }
  ```

**Use Cases:**
1. **Receiving new inventory:**
   ```typescript
   // Received 50 units from supplier
   await productsApi.adjustStock(token, productId, 50);
   ```

2. **Removing damaged items:**
   ```typescript
   // 3 units damaged, remove from inventory
   await productsApi.adjustStock(token, productId, -3);
   ```

3. **Stock correction:**
   ```typescript
   // Physical count shows 10 more than system
   await productsApi.adjustStock(token, productId, 10);
   ```

---

### 6. Get Low Stock Products

**Endpoint:** `GET /products?lowStock=true`

**Description:** Retrieve all products that are below their low stock threshold. This is a specialized filter of the list endpoint.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `lowStock` | string | Yes | Must be `"true"` |

**Example Request:**
```typescript
// Get all low stock items
productsApi.list(token, { lowStockOnly: true })
```

**Response:**
```typescript
Product[] // Array of products where stock < lowStockThreshold
```

**Example Response:**
```json
[
  {
    "id": "prod-456",
    "name": "Bread",
    "category": "Bakery",
    "costPrice": 25.00,
    "sellingPrice": 40.00,
    "stock": 5, // Below threshold of 10
    "unit": "pieces",
    "lowStockThreshold": 10,
    "imageUrl": null,
    "createdAt": "2024-01-10T08:00:00Z",
    "updatedAt": "2024-01-20T12:00:00Z",
    "isLowStock": true
  }
]
```

**Business Logic:**
- A product is considered "low stock" when: `stock < lowStockThreshold`
- The `isLowStock` field is computed automatically
- Useful for generating reorder alerts and inventory reports

---

### 7. Inventory Dashboard Data

**Endpoint:** `GET /dashboard/low-stock`

**Description:** Get low stock products specifically formatted for dashboard display. This endpoint is optimized for dashboard widgets.

**Example Request:**
```typescript
dashboardApi.getLowStock(token)
```

**Response:**
```typescript
Array<{
  id: string;
  name: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  imageUrl: string | null;
}>
```

**Example Response:**
```json
[
  {
    "id": "prod-456",
    "name": "Bread",
    "category": "Bakery",
    "stock": 5,
    "lowStockThreshold": 10,
    "unit": "pieces",
    "imageUrl": null
  },
  {
    "id": "prod-789",
    "name": "Butter",
    "category": "Dairy",
    "stock": 8,
    "lowStockThreshold": 15,
    "unit": "packets",
    "imageUrl": "/uploads/products/butter.jpg"
  }
]
```

**Notes:**
- Returns only essential fields for dashboard performance
- Sorted by stock level (lowest first)
- Limited to products below threshold

---

### 8. Inventory Report

**Endpoint:** `GET /reports/inventory`

**Description:** Get comprehensive inventory report with stock valuation, movement analysis, and summary statistics.

**Example Request:**
```typescript
reportsApi.getInventoryReport(token)
```

**Response:**
```typescript
{
  summary: {
    totalProducts: number;
    totalStockValue: number; // Sum of (stock * costPrice) for all products
    lowStockItems: number; // Count of products below threshold
  };
  products: Array<{
    id: string;
    name: string;
    category: string;
    stock: number;
    unit: string;
    costPrice: number;
    stockValue: number; // stock * costPrice
    salesLast30Days: number; // Quantity sold in last 30 days
    movement: 'fast' | 'medium' | 'slow'; // Based on sales velocity
  }>;
}
```

**Example Response:**
```json
{
  "summary": {
    "totalProducts": 150,
    "totalStockValue": 125000.50,
    "lowStockItems": 12
  },
  "products": [
    {
      "id": "prod-123",
      "name": "Whole Milk",
      "category": "Dairy",
      "stock": 25,
      "unit": "liters",
      "costPrice": 45.00,
      "stockValue": 1125.00,
      "salesLast30Days": 120,
      "movement": "fast"
    },
    {
      "id": "prod-456",
      "name": "Specialty Cheese",
      "category": "Dairy",
      "stock": 5,
      "unit": "kg",
      "costPrice": 500.00,
      "stockValue": 2500.00,
      "salesLast30Days": 3,
      "movement": "slow"
    }
  ]
}
```

**Movement Classification:**
- **fast**: High sales velocity (top 33% of products)
- **medium**: Moderate sales velocity (middle 33%)
- **slow**: Low sales velocity (bottom 33%)

**Use Cases:**
- Inventory valuation for accounting
- Identifying slow-moving items
- Planning purchase orders
- Financial reporting

---

## Stock Management Best Practices

### 1. Regular Stock Audits
```typescript
// Compare system stock with physical count
const products = await productsApi.list(token);
// Perform physical count, then adjust:
await productsApi.adjustStock(token, productId, physicalCount - systemStock);
```

### 2. Automated Reordering
```typescript
// Check low stock items daily
const lowStockItems = await productsApi.list(token, { lowStockOnly: true });
// Generate purchase orders for items below threshold
```

### 3. Stock Movement Tracking
```typescript
// Always use adjustStock for manual changes (not direct update)
// This maintains audit trail
await productsApi.adjustStock(token, productId, quantity);
// vs (not recommended for inventory changes):
// await productsApi.update(token, productId, { stock: newValue });
```

### 4. Handling Negative Stock
```typescript
try {
  await productsApi.adjustStock(token, productId, -largeAmount);
} catch (error) {
  if (error.message.includes("negative")) {
    // Handle: Set stock to 0 first, then adjust
    const product = await productsApi.list(token).then(p => 
      p.find(p => p.id === productId)
    );
    await productsApi.update(token, productId, { stock: 0 });
  }
}
```

---

---

## Part 3: Advanced Features & Inventory Settings

### 9. Inventory Settings Management

**Base Endpoint:** `GET /settings` and `PATCH /settings/inventory`

**Description:** Manage global inventory settings that apply as defaults for new products and control inventory behavior.

#### Get Settings

**Endpoint:** `GET /settings`

**Example Request:**
```typescript
settingsApi.get(token)
```

**Response:**
```typescript
interface Settings {
  id: string;
  businessName: string | null;
  businessLogo: string | null;
  businessAddress: string | null;
  gstNumber: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  taxRate: number;
  invoicePrefix: string;
  invoiceFooter: string | null;
  currency: string;
  defaultDiscountType: string;
  defaultLowStockThreshold: number; // ⭐ Inventory setting
  defaultUnit: string; // ⭐ Inventory setting
  stockWarningAlerts: boolean; // ⭐ Inventory setting
  createdAt: string;
  updatedAt: string;
}
```

**Inventory-Related Fields:**
- `defaultLowStockThreshold`: Default threshold for new products
- `defaultUnit`: Default unit of measurement for new products
- `stockWarningAlerts`: Enable/disable low stock alerts

#### Update Inventory Settings

**Endpoint:** `PATCH /settings/inventory`

**Description:** Update inventory-specific settings that affect product defaults and system behavior.

**Request Body:**
```typescript
{
  defaultLowStockThreshold?: number;
  defaultUnit?: string;
  stockWarningAlerts?: boolean;
}
```

**Example Request:**
```typescript
settingsApi.updateInventory(token, {
  defaultLowStockThreshold: 15,
  defaultUnit: "pieces",
  stockWarningAlerts: true
})
```

**Response:**
```typescript
Settings // Updated settings object
```

**Example Response:**
```json
{
  "id": "settings-1",
  "defaultLowStockThreshold": 15,
  "defaultUnit": "pieces",
  "stockWarningAlerts": true,
  // ... other settings
}
```

**Impact:**
- `defaultLowStockThreshold`: Used when creating products without specifying threshold
- `defaultUnit`: Used when creating products without specifying unit
- `stockWarningAlerts`: Controls whether system generates alerts for low stock items

---

### 10. Advanced Product Filtering

**Endpoint:** `GET /products` (with multiple query parameters)

**Description:** Combine multiple filters for precise product queries.

**Available Filters:**
| Filter | Type | Description | Example |
|--------|------|-------------|---------|
| `search` | string | Search in product name | `"milk"` |
| `category` | string | Exact category match | `"Dairy"` |
| `lowStock` | string | Low stock filter | `"true"` |

**Combined Filter Examples:**

```typescript
// Search within a specific category
productsApi.list(token, {
  search: "organic",
  category: "Dairy"
})

// Find low stock items in a category
productsApi.list(token, {
  category: "Bakery",
  lowStockOnly: true
})

// Search for low stock items
productsApi.list(token, {
  search: "bread",
  lowStockOnly: true
})

// All filters combined
productsApi.list(token, {
  search: "milk",
  category: "Dairy",
  lowStockOnly: true
})
```

**Filter Logic:**
- All filters are combined with AND logic
- `search` is case-insensitive partial match
- `category` is exact match
- `lowStock` filters by `stock < lowStockThreshold`

---

### 11. Product Categories

**Description:** Categories are stored as strings in the product data. Common practices:

**Recommended Categories:**
- `"Dairy"`
- `"Bakery"`
- `"Beverages"`
- `"Snacks"`
- `"Frozen"`
- `"Produce"`
- `"Meat"`
- `"Pantry"`

**Getting Unique Categories:**
```typescript
// Get all products and extract unique categories
const products = await productsApi.list(token);
const categories = [...new Set(products.map(p => p.category))];
```

**Filtering by Category:**
```typescript
// Get all dairy products
const dairyProducts = await productsApi.list(token, { category: "Dairy" });
```

**Category Management Best Practices:**
1. Use consistent capitalization (e.g., always "Dairy" not "dairy" or "DAIRY")
2. Keep category names short and descriptive
3. Consider creating a categories management system if you have many categories

---

### 12. Stock Units

**Description:** Units are flexible strings that describe how products are measured.

**Common Units:**
- `"pieces"` or `"pcs"` - For countable items
- `"kg"` or `"kilograms"` - For weight
- `"liters"` or `"L"` - For volume
- `"grams"` or `"g"` - For small weight
- `"dozen"` - For items sold in dozens
- `"packets"` - For packaged items
- `"boxes"` - For boxed items

**Setting Default Unit:**
```typescript
// Set default unit for new products
await settingsApi.updateInventory(token, {
  defaultUnit: "pieces"
});
```

**Product-Specific Units:**
```typescript
// Create product with custom unit
await productsApi.create(token, {
  name: "Organic Eggs",
  category: "Dairy",
  costPrice: 80.00,
  sellingPrice: 120.00,
  stock: 30,
  unit: "dozen", // Custom unit
  lowStockThreshold: 5
});
```

---

### 13. Low Stock Threshold Management

**Description:** Each product has its own `lowStockThreshold`. When stock falls below this value, the product is marked as low stock.

**Setting Threshold Per Product:**
```typescript
// Create product with custom threshold
await productsApi.create(token, {
  name: "Premium Cheese",
  category: "Dairy",
  costPrice: 500.00,
  sellingPrice: 750.00,
  stock: 20,
  unit: "kg",
  lowStockThreshold: 5 // Alert when below 5 kg
});
```

**Updating Threshold:**
```typescript
// Adjust threshold based on sales velocity
await productsApi.update(token, productId, {
  lowStockThreshold: 10 // Increase threshold for fast-moving item
});
```

**Using Default Threshold:**
```typescript
// Get default from settings
const settings = await settingsApi.get(token);
const defaultThreshold = settings.defaultLowStockThreshold;

// Create product using default
await productsApi.create(token, {
  // ... other fields
  lowStockThreshold: defaultThreshold
});
```

**Threshold Best Practices:**
1. **Fast-moving items:** Higher threshold (e.g., 20-30 units)
2. **Slow-moving items:** Lower threshold (e.g., 3-5 units)
3. **Expensive items:** Lower threshold to minimize capital tied up
4. **Bulk items:** Higher threshold due to longer lead times

---

### 14. Image Management

**Description:** Products can have images uploaded during creation or update.

**Supported Formats:**
- JPEG / JPG
- PNG
- GIF
- WebP

**File Size Limit:** 5MB per image

**Uploading Image on Create:**
```typescript
const imageFile = event.target.files[0]; // From file input
await productsApi.create(token, productData, imageFile);
```

**Replacing Product Image:**
```typescript
const newImage = event.target.files[0];
await productsApi.update(token, productId, {
  // Can update other fields too
  name: "Updated Product Name"
}, newImage);
```

**Removing Image:**
```typescript
// Set imageUrl to null
await productsApi.update(token, productId, {
  imageUrl: null
});
```

**Image URL Format:**
- Stored as: `/uploads/products/{filename}`
- Full URL: `{API_BASE_URL}/uploads/products/{filename}`
- Old images are automatically deleted when replaced

---

### 15. Integration with Sales

**Description:** Product stock is automatically updated when sales are created.

**Stock Deduction:**
```typescript
// When creating a sale, stock is automatically reduced
await salesApi.create(token, {
  date: "2024-01-20",
  items: [
    { productId: "prod-123", quantity: 5, sellingPrice: 60.00 }
  ],
  totalAmount: 300.00,
  soldBy: userId
});

// Product stock is automatically reduced by 5 units
// No need to manually call adjustStock
```

**Stock Validation:**
- Sales will fail if product doesn't have enough stock
- Stock cannot go negative through sales
- Use `adjustStock` for manual corrections

**Checking Stock Before Sale:**
```typescript
const products = await productsApi.list(token);
const product = products.find(p => p.id === productId);

if (product.stock < quantity) {
  throw new Error(`Insufficient stock. Available: ${product.stock}`);
}
```

---

## Complete TypeScript Example: Inventory Management Workflow

```typescript
import { productsApi, settingsApi, dashboardApi } from '@/lib/api-client';

async function inventoryManagementWorkflow(token: string) {
  // 1. Get current inventory settings
  const settings = await settingsApi.get(token);
  console.log('Default threshold:', settings.defaultLowStockThreshold);
  console.log('Default unit:', settings.defaultUnit);

  // 2. Create a new product
  const newProduct = await productsApi.create(token, {
    name: "Organic Whole Milk",
    category: "Dairy",
    costPrice: 50.00,
    sellingPrice: 70.00,
    stock: 100,
    unit: settings.defaultUnit,
    lowStockThreshold: settings.defaultLowStockThreshold
  });

  // 3. Check low stock items
  const lowStockItems = await productsApi.list(token, { lowStockOnly: true });
  console.log(`Found ${lowStockItems.length} low stock items`);

  // 4. Adjust stock (receiving new inventory)
  const updatedProduct = await productsApi.adjustStock(token, newProduct.id, 50);
  console.log(`Stock updated to: ${updatedProduct.stock}`);

  // 5. Get inventory report
  const inventoryReport = await reportsApi.getInventoryReport(token);
  console.log('Total stock value:', inventoryReport.summary.totalStockValue);
  console.log('Low stock items:', inventoryReport.summary.lowStockItems);

  // 6. Update inventory settings
  await settingsApi.updateInventory(token, {
    defaultLowStockThreshold: 20,
    stockWarningAlerts: true
  });

  // 7. Get dashboard low stock data
  const dashboardLowStock = await dashboardApi.getLowStock(token);
  console.log('Dashboard low stock items:', dashboardLowStock);
}
```

---

---

## Part 4: Error Handling, Performance & Common Use Cases

### 16. Comprehensive Error Handling

#### Error Types and Handling

**Authentication Errors (401):**
```typescript
try {
  await productsApi.list(token);
} catch (error) {
  if (error.message.includes('Unauthorized')) {
    // Token expired or invalid
    // Redirect to login or refresh token
    await refreshAuthToken();
  }
}
```

**Not Found Errors (404):**
```typescript
try {
  await productsApi.update(token, productId, { stock: 10 });
} catch (error) {
  if (error.message.includes('not found')) {
    console.error('Product does not exist');
    // Handle: Show error message to user
  }
}
```

**Validation Errors (400):**
```typescript
try {
  await productsApi.create(token, {
    name: "", // Invalid: empty name
    costPrice: -10 // Invalid: negative price
  });
} catch (error) {
  // Error message will contain validation details
  console.error('Validation failed:', error.message);
  // Display to user: "Name is required" or "Price must be positive"
}
```

**Stock Adjustment Errors:**
```typescript
async function safeStockAdjustment(
  token: string, 
  productId: string, 
  delta: number
) {
  try {
    return await productsApi.adjustStock(token, productId, delta);
  } catch (error) {
    if (error.message.includes('negative')) {
      // Get current stock
      const products = await productsApi.list(token);
      const product = products.find(p => p.id === productId);
      
      if (product) {
        throw new Error(
          `Cannot adjust stock. Current: ${product.stock}, ` +
          `Attempted: ${product.stock + delta}`
        );
      }
    }
    throw error;
  }
}
```

**Image Upload Errors:**
```typescript
async function uploadProductImage(
  token: string,
  productId: string,
  file: File
) {
  // Validate file before upload
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size exceeds 5MB limit');
  }
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid image format. Allowed: JPEG, PNG, GIF, WebP');
  }
  
  try {
    return await productsApi.update(token, productId, {}, file);
  } catch (error) {
    console.error('Image upload failed:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
}
```

---

### 17. Performance Optimization

#### Caching Product Lists

```typescript
// Simple in-memory cache
let productCache: { data: Product[]; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute

async function getCachedProducts(token: string, filters?: ProductFilters) {
  const now = Date.now();
  
  // Return cached data if available and fresh
  if (productCache && (now - productCache.timestamp) < CACHE_DURATION) {
    // Apply filters to cached data
    if (!filters || Object.keys(filters).length === 0) {
      return productCache.data;
    }
    // Filter cached data (for simple filters)
    return applyFilters(productCache.data, filters);
  }
  
  // Fetch fresh data
  const products = await productsApi.list(token, filters);
  productCache = { data: products, timestamp: now };
  return products;
}

function applyFilters(products: Product[], filters: ProductFilters): Product[] {
  let filtered = products;
  
  if (filters.search) {
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(filters.search!.toLowerCase())
    );
  }
  
  if (filters.category) {
    filtered = filtered.filter(p => p.category === filters.category);
  }
  
  if (filters.lowStockOnly) {
    filtered = filtered.filter(p => p.isLowStock);
  }
  
  return filtered;
}
```

#### Batch Operations

```typescript
// Update multiple products efficiently
async function updateMultipleProducts(
  token: string,
  updates: Array<{ id: string; data: Partial<Product> }>
) {
  // Process in parallel (be careful with rate limits)
  const results = await Promise.allSettled(
    updates.map(({ id, data }) => 
      productsApi.update(token, id, data)
    )
  );
  
  const successful = results
    .filter((r): r is PromiseFulfilledResult<Product> => r.status === 'fulfilled')
    .map(r => r.value);
  
  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map(r => r.reason);
  
  return { successful, failed };
}
```

#### Debounced Search

```typescript
import { debounce } from 'lodash'; // or implement your own

const debouncedSearch = debounce(async (
  token: string,
  searchTerm: string,
  callback: (products: Product[]) => void
) => {
  try {
    const products = await productsApi.list(token, { search: searchTerm });
    callback(products);
  } catch (error) {
    console.error('Search failed:', error);
  }
}, 300); // Wait 300ms after user stops typing

// Usage in React component
const [searchTerm, setSearchTerm] = useState('');
const [results, setResults] = useState<Product[]>([]);

useEffect(() => {
  if (searchTerm) {
    debouncedSearch(token, searchTerm, setResults);
  } else {
    setResults([]);
  }
}, [searchTerm]);
```

---

### 18. Common Use Cases & Recipes

#### Use Case 1: Receiving Inventory from Supplier

```typescript
async function receiveInventory(
  token: string,
  items: Array<{ productId: string; quantity: number }>
) {
  const results = [];
  
  for (const item of items) {
    try {
      const updated = await productsApi.adjustStock(
        token, 
        item.productId, 
        item.quantity
      );
      results.push({
        productId: item.productId,
        success: true,
        newStock: updated.stock
      });
    } catch (error) {
      results.push({
        productId: item.productId,
        success: false,
        error: error.message
      });
    }
  }
  
  return results;
}

// Usage
await receiveInventory(token, [
  { productId: "prod-123", quantity: 50 },
  { productId: "prod-456", quantity: 30 }
]);
```

#### Use Case 2: Stock Audit & Reconciliation

```typescript
async function performStockAudit(
  token: string,
  physicalCounts: Record<string, number> // productId -> physical count
) {
  const products = await productsApi.list(token);
  const discrepancies = [];
  
  for (const [productId, physicalCount] of Object.entries(physicalCounts)) {
    const product = products.find(p => p.id === productId);
    if (!product) continue;
    
    const systemStock = product.stock;
    const difference = physicalCount - systemStock;
    
    if (difference !== 0) {
      discrepancies.push({
        productId,
        productName: product.name,
        systemStock,
        physicalCount,
        difference
      });
      
      // Adjust stock to match physical count
      await productsApi.adjustStock(token, productId, difference);
    }
  }
  
  return {
    totalChecked: Object.keys(physicalCounts).length,
    discrepanciesFound: discrepancies.length,
    discrepancies
  };
}
```

#### Use Case 3: Low Stock Alert System

```typescript
async function checkLowStockAndAlert(token: string) {
  const lowStockItems = await productsApi.list(token, { lowStockOnly: true });
  
  if (lowStockItems.length === 0) {
    return { hasAlerts: false, items: [] };
  }
  
  // Group by category
  const byCategory = lowStockItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, Product[]>);
  
  // Generate alert message
  const alertMessage = Object.entries(byCategory)
    .map(([category, items]) => 
      `${category}: ${items.length} item(s) low on stock`
    )
    .join('\n');
  
  return {
    hasAlerts: true,
    totalItems: lowStockItems.length,
    byCategory,
    alertMessage
  };
}

// Run periodically (e.g., daily)
setInterval(async () => {
  const alerts = await checkLowStockAndAlert(token);
  if (alerts.hasAlerts) {
    // Send notification (email, push, etc.)
    console.log('Low Stock Alert:', alerts.alertMessage);
  }
}, 24 * 60 * 60 * 1000); // Every 24 hours
```

#### Use Case 4: Product Import from CSV

```typescript
async function importProductsFromCSV(
  token: string,
  csvData: string,
  hasHeader: boolean = true
) {
  const lines = csvData.split('\n');
  const startIndex = hasHeader ? 1 : 0;
  const results = [];
  
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const [name, category, costPrice, sellingPrice, stock, unit, threshold] = 
      line.split(',');
    
    try {
      const product = await productsApi.create(token, {
        name: name.trim(),
        category: category.trim(),
        costPrice: parseFloat(costPrice),
        sellingPrice: parseFloat(sellingPrice),
        stock: parseInt(stock),
        unit: unit.trim(),
        lowStockThreshold: parseInt(threshold) || 10
      });
      
      results.push({ line: i + 1, success: true, product });
    } catch (error) {
      results.push({ 
        line: i + 1, 
        success: false, 
        error: error.message 
      });
    }
  }
  
  return {
    total: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    details: results
  };
}
```

#### Use Case 5: Inventory Valuation Report

```typescript
async function generateInventoryValuationReport(token: string) {
  const products = await productsApi.list(token);
  const report = {
    totalProducts: products.length,
    totalStockValue: 0,
    byCategory: {} as Record<string, {
      count: number;
      stockValue: number;
      items: Array<{ name: string; stock: number; value: number }>;
    }>,
    lowStockValue: 0,
    topItems: [] as Array<{ name: string; value: number }>
  };
  
  products.forEach(product => {
    const stockValue = product.stock * product.costPrice;
    report.totalStockValue += stockValue;
    
    if (product.isLowStock) {
      report.lowStockValue += stockValue;
    }
    
    if (!report.byCategory[product.category]) {
      report.byCategory[product.category] = {
        count: 0,
        stockValue: 0,
        items: []
      };
    }
    
    report.byCategory[product.category].count++;
    report.byCategory[product.category].stockValue += stockValue;
    report.byCategory[product.category].items.push({
      name: product.name,
      stock: product.stock,
      value: stockValue
    });
  });
  
  // Get top 10 items by value
  report.topItems = products
    .map(p => ({ name: p.name, value: p.stock * p.costPrice }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);
  
  return report;
}
```

---

### 19. Best Practices Summary

#### 1. Always Validate Before Operations
```typescript
// ✅ Good
const product = await productsApi.list(token).then(p => 
  p.find(p => p.id === productId)
);
if (!product) throw new Error('Product not found');
if (product.stock < quantity) throw new Error('Insufficient stock');

// ❌ Bad
await productsApi.adjustStock(token, productId, -1000); // May fail unexpectedly
```

#### 2. Use Appropriate Methods
```typescript
// ✅ Good: Use adjustStock for inventory changes
await productsApi.adjustStock(token, productId, 10);

// ❌ Bad: Direct update loses audit trail
await productsApi.update(token, productId, { stock: newValue });
```

#### 3. Handle Errors Gracefully
```typescript
// ✅ Good: Specific error handling
try {
  await productsApi.create(token, productData);
} catch (error) {
  if (error.message.includes('validation')) {
    showValidationError(error.message);
  } else {
    showGenericError('Failed to create product');
  }
}
```

#### 4. Optimize API Calls
```typescript
// ✅ Good: Batch operations when possible
const products = await productsApi.list(token);
// Process locally instead of multiple API calls

// ❌ Bad: Multiple individual calls
for (const id of productIds) {
  await productsApi.update(token, id, data); // Slow!
}
```

#### 5. Cache When Appropriate
```typescript
// ✅ Good: Cache product list for dashboard
const products = useMemo(() => 
  productsApi.list(token), 
  [token, refreshTrigger]
);

// ❌ Bad: Fetch on every render
const products = await productsApi.list(token); // In render function
```

---

## Complete API Reference Summary

### Product Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `list()` | `GET /products` | List products with filters |
| `create()` | `POST /products` | Create new product |
| `update()` | `PATCH /products/:id` | Update product |
| `adjustStock()` | `PATCH /products/:id/stock` | Adjust stock level |
| `remove()` | `DELETE /products/:id` | Delete product |

### Inventory Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| `getLowStock()` | `GET /products?lowStock=true` | Get low stock items |
| `getInventoryReport()` | `GET /reports/inventory` | Full inventory report |
| `getLowStock()` (dashboard) | `GET /dashboard/low-stock` | Dashboard low stock data |

### Settings
| Method | Endpoint | Description |
|--------|----------|-------------|
| `get()` | `GET /settings` | Get all settings |
| `updateInventory()` | `PATCH /settings/inventory` | Update inventory settings |

---

## Quick Reference Card

```typescript
// Import
import { productsApi, settingsApi, dashboardApi, reportsApi } from '@/lib/api-client';

// List products
const products = await productsApi.list(token, { search: "milk", category: "Dairy" });

// Create product
const product = await productsApi.create(token, { name, category, costPrice, sellingPrice, stock, unit, lowStockThreshold });

// Update product
const updated = await productsApi.update(token, productId, { stock: 50 });

// Adjust stock
const adjusted = await productsApi.adjustStock(token, productId, 10); // +10
const adjusted = await productsApi.adjustStock(token, productId, -5); // -5

// Delete product
await productsApi.remove(token, productId);

// Low stock items
const lowStock = await productsApi.list(token, { lowStockOnly: true });

// Inventory report
const report = await reportsApi.getInventoryReport(token);

// Settings
const settings = await settingsApi.get(token);
await settingsApi.updateInventory(token, { defaultLowStockThreshold: 15 });
```

---

**Documentation Complete!** 🎉

This covers all Product & Inventory Management APIs available in your system. For additional help or questions, refer to the TypeScript types in `webFe/src/types/product.ts` and the API client implementation in `webFe/src/lib/api-client.ts`.

---

## Error Handling

All endpoints may return the following error responses:

**401 Unauthorized:**
```json
{
  "message": "Unauthorized"
}
```

**404 Not Found:**
```json
{
  "message": "Product not found"
}
```

**400 Bad Request:**
```json
{
  "message": "Validation error message"
}
```

**500 Internal Server Error:**
```json
{
  "message": "Internal server error"
}
```

---

## TypeScript Usage Example

```typescript
import { productsApi } from '@/lib/api-client';

// Get authentication token (from your auth context)
const token = getAuthToken();

// List all products
const products = await productsApi.list(token);

// Create a new product
const newProduct = await productsApi.create(token, {
  name: "Organic Eggs",
  category: "Dairy",
  costPrice: 80.00,
  sellingPrice: 120.00,
  stock: 30,
  unit: "dozen",
  lowStockThreshold: 5
});

// Update product stock
const updated = await productsApi.update(token, newProduct.id, {
  stock: 35
});

// Delete product
await productsApi.remove(token, newProduct.id);
```

