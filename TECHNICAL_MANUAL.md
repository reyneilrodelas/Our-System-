# TECHNICAL MANUAL
## ScanWizard: Product Locator with Customizable Distance Tracker

**Version:** 1.0.0  
**Last Updated:** December 6, 2025  
**Framework:** React Native with Expo  
**Database:** Supabase (PostgreSQL)

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Technology Stack](#3-technology-stack)
4. [Database Schema](#4-database-schema)
5. [Authentication System](#5-authentication-system)
6. [Core Features](#6-core-features)
7. [Navigation Structure](#7-navigation-structure)
8. [API Integration](#8-api-integration)
9. [Performance Optimization](#9-performance-optimization)
10. [Installation & Setup](#10-installation--setup)
11. [Configuration](#11-configuration)
12. [Security Implementation](#12-security-implementation)
13. [Error Handling](#13-error-handling)
14. [Testing Guidelines](#14-testing-guidelines)
15. [Deployment](#15-deployment)
16. [Troubleshooting](#16-troubleshooting)
17. [API Reference](#17-api-reference)
18. [Maintenance & Support](#18-maintenance--support)

---

## 1. System Overview

### 1.1 Purpose
ScanWizard is a mobile application designed to help users locate products within stores by scanning barcodes/QR codes. The system provides real-time distance tracking, customizable search radius, and store-product management capabilities.

### 1.2 Key Stakeholders
- **Customers**: Search and locate products within specified distance
- **Store Owners**: Manage stores and product inventory
- **Administrators**: Approve stores, products, and manage system users

### 1.3 System Capabilities
- Barcode/QR code scanning with multi-format support
- Geolocation-based store search
- Distance-based filtering (1km, 3km, 5km, 10km)
- Real-time map visualization
- Store and product management
- Multi-role authentication system
- Admin approval workflow
- Offline caching for improved performance

---

## 2. Architecture

### 2.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Mobile Application                        │
│                   (React Native + Expo)                      │
├─────────────────────────────────────────────────────────────┤
│  Presentation Layer                                          │
│  ├── Auth Screens (Login, Signup, Password Reset)           │
│  ├── Shared Screens (Home, Scanner, Search, Profile)        │
│  ├── Store Owner Screens (Shop Management, Products)        │
│  └── Admin Screens (Approvals, Dashboard)                   │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer                                        │
│  ├── AuthContext (Session Management)                       │
│  ├── Navigation Logic                                        │
│  ├── Cache Utilities                                         │
│  └── Data Validation                                         │
├─────────────────────────────────────────────────────────────┤
│  Data Access Layer                                           │
│  ├── Supabase Client                                         │
│  ├── AsyncStorage (Local Cache)                             │
│  └── API Integration                                         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Backend Services                          │
│                  (Supabase Platform)                         │
├─────────────────────────────────────────────────────────────┤
│  Authentication Service (JWT + PKCE)                         │
│  Database (PostgreSQL)                                       │
│  Storage Service (Images/Assets)                             │
│  Real-time Subscriptions                                     │
│  Row Level Security (RLS)                                    │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Component Architecture

```
App.tsx (Root)
    │
    ├── AuthProvider (Context)
    │   └── AuthContext (Session, User, Profile, Role)
    │
    ├── NavigationContainer
    │   └── RootStack Navigator
    │       ├── Startup Screen
    │       ├── Auth Stack
    │       │   ├── Login
    │       │   ├── Signup
    │       │   ├── ForgotPassword
    │       │   └── ResetPassword
    │       │
    │       └── Main Tab Navigator
    │           ├── Home Stack
    │           │   ├── HomeMain
    │           │   ├── Scanner
    │           │   ├── ResultScreen
    │           │   ├── MapScreen
    │           │   └── StoreOwner Stack
    │           │
    │           ├── Search Tab
    │           │
    │           └── Profile Tab
    │               ├── ProfileMain
    │               ├── ProfileEdit
    │               ├── AboutUs
    │               └── ContactUs
    │
    └── Global Components
        ├── StyledAlert
        ├── CameraOverlay
        └── Maps
```

---

## 3. Technology Stack

### 3.1 Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1.0 | UI framework |
| **React Native** | 0.81.4 | Mobile platform |
| **Expo** | 54.0.13 | Development platform |
| **TypeScript** | 5.9.2 | Type safety |
| **React Navigation** | 7.x | Navigation management |

### 3.2 Backend & Services

| Service | Purpose |
|---------|---------|
| **Supabase** | Backend-as-a-Service (BaaS) |
| **PostgreSQL** | Relational database |
| **Supabase Auth** | Authentication service |
| **Supabase Storage** | Image/file storage |

### 3.3 Key Libraries

| Library | Purpose |
|---------|---------|
| `@supabase/supabase-js` | Database & auth client |
| `expo-camera` | Barcode scanning |
| `expo-location` | GPS & geolocation |
| `react-native-maps` | Map visualization |
| `@react-native-async-storage/async-storage` | Local storage |
| `expo-image-picker` | Image selection |
| `react-native-paper` | UI components |
| `expo-linear-gradient` | Gradient effects |
| `lodash` | Utility functions |

### 3.4 Development Tools

```json
{
  "devDependencies": {
    "@types/react": "~19.1.0",
    "@types/lodash": "^4.17.20",
    "typescript": "~5.9.2",
    "react-native-dotenv": "^3.4.11",
    "patch-package": "^8.0.1"
  }
}
```

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
USER (1) ──────── (0..1) PROFILE
  │
  ├──── (0..1) ADMINISTRATION
  │
  └──── (0..1) STORE_OWNER
           │
           ├──── (0..*) STORE
           │        │
           │        └──── (0..*) STORE_PRODUCT
           │
           └──── (0..*) PRODUCT
                    │
                    └──── (0..*) STORE_PRODUCT
```

### 4.2 Table Definitions

#### **users** (Supabase Auth)
```sql
-- Managed by Supabase Auth
- id: UUID (PK)
- email: STRING (UNIQUE)
- encrypted_password: STRING
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### **profiles**
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT CHECK (role IN ('admin', 'store_owner', 'customer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **administration**
```sql
CREATE TABLE administration (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    approval_status TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **store_owners**
```sql
CREATE TABLE store_owners (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    business_name TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **stores**
```sql
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID REFERENCES store_owners(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    phone TEXT,
    email TEXT,
    description TEXT,
    logo_url TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_stores_owner_id ON stores(owner_id);
CREATE INDEX idx_stores_location ON stores USING GIST (point(longitude, latitude));
CREATE INDEX idx_stores_approval_status ON stores(approval_status);
```

#### **products**
```sql
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barcode TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK (category IN (
        'School Supplies',
        'Food & Beverages',
        'Hygiene & Personal Care',
        'Cosmetics',
        'Household Supplies',
        'Motorcycle Accessories & Parts'
    )),
    image_url TEXT,
    created_by UUID REFERENCES store_owners(id) ON DELETE SET NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE UNIQUE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_approval_status ON products(approval_status);
```

#### **store_products** (Junction Table)
```sql
CREATE TABLE store_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2),
    quantity INTEGER,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(store_id, product_id)
);

-- Indexes
CREATE INDEX idx_store_products_store_id ON store_products(store_id);
CREATE INDEX idx_store_products_product_id ON store_products(product_id);
```

### 4.3 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

-- Example policies
CREATE POLICY "Public profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Store owners can manage own stores"
    ON stores FOR ALL
    USING (owner_id IN (
        SELECT id FROM store_owners WHERE user_id = auth.uid()
    ));

CREATE POLICY "Approved stores are viewable by everyone"
    ON stores FOR SELECT
    USING (approval_status = 'approved');
```

---

## 5. Authentication System

### 5.1 Authentication Flow

```
┌─────────┐
│ Startup │
└────┬────┘
     │
     ├──── Has Session? ──YES──> Load Profile ──> Main App
     │                                  │
     └──── NO ──────────────────────────┘
                                        │
                                   Login Screen
                                        │
                          ┌─────────────┼─────────────┐
                          │             │             │
                       Login        Signup    Forgot Password
                          │             │             │
                          └─────────────┴─────────────┘
                                        │
                              Authenticate with Supabase
                                        │
                                   Success? ──YES──> Main App
                                        │
                                        NO
                                        │
                                   Show Error
```

### 5.2 AuthContext Implementation

**File:** `src/context/AuthContext.tsx`

```typescript
export type AuthContextType = {
    session: Session | null;      // Current session
    user: User | null;             // Current user
    profile: Profile | null;       // User profile
    isLoading: boolean;            // Loading state
    userRole: string | null;       // User role (admin/store_owner/customer)
};

// Key Features:
- Session persistence using AsyncStorage
- Auto-refresh token mechanism
- Real-time auth state changes
- Role-based access control
- Profile data caching
```

### 5.3 Authentication Methods

#### Login
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password
});
```

#### Signup
```typescript
const { data, error } = await supabase.auth.signUp({
    email: email,
    password: password,
    options: {
        data: {
            full_name: fullName,
            role: 'customer' // Default role
        }
    }
});
```

#### Password Reset Flow
```typescript
// 1. Request reset link
await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'yourapp://reset-password'
});

// 2. Verify token and update password
await supabase.auth.updateUser({
    password: newPassword
});
```

#### Logout
```typescript
const { error } = await supabase.auth.signOut();
```

### 5.4 Session Management

```typescript
// Supabase client configuration
export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY, {
    auth: {
        storage: AsyncStorage,          // Persist session
        autoRefreshToken: true,          // Auto-refresh before expiry
        persistSession: true,            // Keep session across restarts
        detectSessionInUrl: true,        // Handle deep links
        flowType: 'pkce',               // PKCE flow for security
    },
});
```

### 5.5 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| **customer** | - Scan products<br>- Search stores<br>- View maps<br>- Edit own profile |
| **store_owner** | - All customer permissions<br>- Create/manage stores<br>- Add products<br>- Assign products to stores<br>- View own stores analytics |
| **admin** | - All permissions<br>- Approve/reject stores<br>- Approve/reject products<br>- View all users<br>- Access admin dashboard |

### 5.6 Protected Routes

```typescript
// Navigation guards in App.tsx
function RootNavigator() {
    const { session, isLoading, userRole } = useAuth();
    
    if (isLoading) return <StartupScreen />;
    
    if (!session) {
        // Show auth screens
        return <AuthStack />;
    }
    
    // Role-based navigation
    if (userRole === 'admin') {
        return <AdminNavigator />;
    }
    
    return <MainNavigator />;
}
```

---

## 6. Core Features

### 6.1 Barcode Scanner

**File:** `src/screens/shared/scanner.tsx`

#### Supported Barcode Types
- Aztec
- EAN-13
- EAN-8
- QR Code
- PDF417
- UPC-E
- Data Matrix
- Code 39
- Code 93
- ITF-14
- Codabar
- Code 128
- UPC-A

#### Scanner Features
- **Auto-focus**: Continuous autofocus for accurate scanning
- **Torch/Flashlight**: Toggle flash for low-light conditions
- **Timeout**: 20-second scan timeout with retry option
- **Camera permissions**: Runtime permission requests
- **Overlay**: Visual scanning guide overlay
- **Vibration feedback**: Haptic feedback on successful scan

#### Implementation Details
```typescript
const SCAN_TIMEOUT = 20000; // 20 seconds
const SUPPORTED_BARCODE_TYPES: BarcodeType[] = [
    'ean13', 'ean8', 'qr', 'code128', 'upc_a', // ... others
];

const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    // 1. Stop scanning to prevent duplicates
    setIsScanning(false);
    
    // 2. Query database for product
    const { data } = await supabase
        .from('products')
        .select('*, store_products(stores(*))')
        .eq('barcode', result.data)
        .single();
    
    // 3. Navigate to results
    navigation.navigate('ResultScreen', { product: data });
};
```

#### Error Handling
- **No permission**: Request camera access
- **Timeout**: Show retry dialog
- **Product not found**: Display "Add Product" option
- **Network error**: Show offline message

---

### 6.2 Store Locator & Maps

**File:** `src/screens/components/Maps.tsx`

#### Map Features
- **Real-time location**: User's current GPS position
- **Distance circles**: Visual radius overlay (1km, 3km, 5km, 10km)
- **Store markers**: Custom markers for each store
- **Distance calculation**: Haversine formula for accurate distance
- **Map types**: Standard, Satellite, Hybrid
- **Clustering**: Group nearby markers for better performance
- **Auto-focus**: Center on specific store when navigated from results

#### Distance Calculation
```typescript
const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        0.5 -
        Math.cos(dLat) / 2 +
        Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        (1 - Math.cos(dLon)) / 2;
    return R * 2 * Math.asin(Math.sqrt(a));
};
```

#### Distance Filter Options
```typescript
const distances = [
    { label: '1 km', value: 1, icon: '📍', description: 'Very close' },
    { label: '3 km', value: 3, icon: '🗺️', description: 'Nearby area' },
    { label: '5 km', value: 5, icon: '🌍', description: 'Wider range' },
    { label: '10 km', value: 10, icon: '🌎', description: 'Extended area' },
];
```

#### Map Navigation Flow
```
Scanner ──> Product Found ──> Result Screen ──> View on Map
                                      │
                                      └──> Filter by Distance
                                             │
                                             └──> Show Stores within Radius
                                                      │
                                                      └──> Select Store
                                                             │
                                                             └──> View Details
```

---

### 6.3 Product Management (Store Owner)

**File:** `src/screens/storeowner/AddProductScreen.tsx`

#### Add Product Flow
```
1. Scan Barcode (or Manual Entry)
   │
2. Check if Product Exists
   │
   ├──> EXISTS: Show confirmation + existing details
   │
   └──> NEW: Enter Product Details
        │
        ├── Product Name (Required)
        ├── Description (Required)
        └── Category (Required - Dropdown)
             │
             ├── School Supplies
             ├── Food & Beverages
             ├── Hygiene & Personal Care
             ├── Cosmetics
             ├── Household Supplies
             └── Motorcycle Accessories & Parts
   │
3. Submit for Admin Approval
   │
4. Pending Status (approval_status = 'pending')
```

#### Product Categories
```typescript
const CATEGORIES = [
    'School Supplies',
    'Food & Beverages',
    'Hygiene & Personal Care',
    'Cosmetics',
    'Household Supplies',
    'Motorcycle Accessories & Parts'
];
```

#### Product Validation
```typescript
// Required fields
- barcode: Must be unique
- name: Min 3 characters
- description: Min 10 characters
- category: Must be from predefined list
```

#### Assign Products to Store
**File:** `src/screens/storeowner/AssignProductsScreen.tsx`

```typescript
// Store owners can:
1. View all their approved products
2. Select products to assign to specific store
3. Set price and quantity per store
4. Toggle availability status
```

---

### 6.4 Store Management

#### Create Store Flow
**File:** `src/screens/storeowner/CreateStoreScreen.tsx`

```
1. Enter Store Details
   │
   ├── Store Name (Required)
   ├── Address (Required)
   ├── Phone (Optional)
   ├── Email (Optional)
   ├── Description (Optional)
   └── Logo (Optional - Image Upload)
   │
2. Set Location (GPS)
   │
   ├── Auto-detect current location
   └── Or manually select on map
   │
3. Submit for Admin Approval
   │
4. Pending Status (approval_status = 'pending')
```

#### Store Details Screen
**File:** `src/screens/storeowner/StoreDetailsScreen.tsx`

Features:
- View store information
- Edit store details (name, address, contact)
- Update location
- Manage assigned products
- View store statistics
- Delete store (with confirmation)

---

### 6.5 Admin Dashboard

**File:** `src/screens/admin/AdminDashboard.tsx`

#### Admin Capabilities

```
Admin Dashboard
│
├── Pending Approvals
│   ├── Stores (pending count)
│   └── Products (pending count)
│
├── All Stores
│   ├── View all stores
│   ├── Filter by status
│   └── Store analytics
│
├── User Management
│   ├── View all users
│   ├── Assign roles
│   └── Deactivate accounts
│
└── System Statistics
    ├── Total stores
    ├── Total products
    ├── Active store owners
    └── Total customers
```

#### Approval Workflow
**File:** `src/screens/admin/AdminApprovalScreen.tsx`

```typescript
// Store Approval
const approveStore = async (storeId: string) => {
    await supabase
        .from('stores')
        .update({ 
            approval_status: 'approved',
            is_verified: true 
        })
        .eq('id', storeId);
};

// Product Approval
const approveProduct = async (productId: string) => {
    await supabase
        .from('products')
        .update({ 
            approval_status: 'approved',
            is_approved: true 
        })
        .eq('id', productId);
};
```

---

### 6.6 Search Functionality

**File:** `src/screens/shared/SearchScreen.tsx`

#### Search Features
- **Product search**: By name, barcode, category
- **Store search**: By name, address
- **Distance filter**: Within selected radius
- **Category filter**: Filter products by category
- **Real-time results**: Debounced search queries
- **Recent searches**: Cache recent search terms

#### Search Implementation
```typescript
const searchProducts = async (query: string, category?: string) => {
    let queryBuilder = supabase
        .from('products')
        .select('*, store_products(stores(*))')
        .eq('approval_status', 'approved')
        .ilike('name', `%${query}%`);
    
    if (category) {
        queryBuilder = queryBuilder.eq('category', category);
    }
    
    const { data } = await queryBuilder.limit(20);
    return data;
};
```

---

## 7. Navigation Structure

### 7.1 Navigation Hierarchy

```
RootStack (Native Stack)
│
├── Startup (Initial Loading)
│
├── Auth Stack
│   ├── Login
│   ├── Signup
│   ├── ForgotPassword
│   └── ResetPassword
│
└── Main (Tab Navigator)
    │
    ├── Home Tab (Stack)
    │   ├── HomeMain
    │   ├── Scanner
    │   ├── ResultScreen
    │   ├── MapScreen
    │   ├── StoreProductDetailsScreen
    │   └── StoreOwner Stack
    │       ├── MyShop
    │       ├── AddProduct
    │       ├── CreateStore
    │       ├── MyStores
    │       ├── StoreDetails
    │       ├── AssignProducts
    │       └── ManageProduct
    │
    ├── Search Tab
    │   └── SearchScreen
    │
    └── Profile Tab (Stack)
        ├── ProfileMain
        ├── ProfileEdit
        ├── AboutUs
        └── ContactUs
```

### 7.2 Navigation Types

**File:** `src/types/navigation.ts`

```typescript
export type RootStackParamList = {
    Startup: undefined;
    Login: undefined;
    Signup: undefined;
    ForgotPassword: undefined;
    ResetPassword: { token?: string; type?: string; email?: string } | undefined;
    Main: undefined;
    ResultScreen: { product: any };
    MapScreen: { 
        storeData: any[]; 
        userLocation: any;
        focusStoreId?: string;
        selectedDistance?: number;
    };
    StoreProductDetailsScreen: { storeId: string };
    AboutUs: undefined;
    ContactUs: undefined;
};

export type TabParamList = {
    Home: undefined;
    Search: undefined;
    Profile: { refreshed?: number };
};

export type StoreOwnerStackParamList = {
    MyShop: undefined;
    AddProduct: undefined;
    AssignProducts: { storeId: number };
    CreateStore: undefined;
    MyStores: undefined;
    StoreDetails: { storeId: string };
    ManageProduct: { storeId: string };
};
```

### 7.3 Deep Linking

#### URL Schemes
```typescript
// app.config.js
export default {
    scheme: 'scanwizard',
    // Deep link examples:
    // scanwizard://reset-password?token=xxx
    // scanwizard://store/123
    // scanwizard://product/456
};
```

#### Handle Deep Links
```typescript
// App.tsx
useEffect(() => {
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
}, []);

const handleDeepLink = (event: { url: string }) => {
    const { path, queryParams } = Linking.parse(event.url);
    
    if (path === 'reset-password') {
        navigation.navigate('ResetPassword', queryParams);
    }
};
```

---

## 8. API Integration

### 8.1 Supabase Client Configuration

**File:** `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ENV from '../config/env';

export const supabase = createClient(
    ENV.SUPABASE_URL, 
    ENV.SUPABASE_ANON_KEY, 
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
        },
    }
);
```

### 8.2 Common API Patterns

#### Fetch Data
```typescript
// Get all approved stores
const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false });
```

#### Insert Data
```typescript
// Create new product
const { data, error } = await supabase
    .from('products')
    .insert({
        barcode: '123456789',
        name: 'Product Name',
        description: 'Description',
        category: 'School Supplies',
        created_by: userId,
        approval_status: 'pending'
    })
    .select()
    .single();
```

#### Update Data
```typescript
// Update store details
const { error } = await supabase
    .from('stores')
    .update({ 
        name: 'New Name',
        address: 'New Address',
        updated_at: new Date().toISOString()
    })
    .eq('id', storeId);
```

#### Delete Data
```typescript
// Delete product
const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);
```

#### Complex Queries with Joins
```typescript
// Get product with associated stores
const { data } = await supabase
    .from('products')
    .select(`
        *,
        store_products (
            price,
            quantity,
            is_available,
            stores (
                id,
                name,
                address,
                latitude,
                longitude,
                phone
            )
        )
    `)
    .eq('barcode', scannedBarcode)
    .single();
```

#### Real-time Subscriptions
```typescript
// Listen to new stores
const subscription = supabase
    .channel('stores_channel')
    .on('postgres_changes', 
        { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'stores' 
        },
        (payload) => {
            console.log('New store:', payload.new);
            // Update UI
        }
    )
    .subscribe();

// Cleanup
return () => {
    subscription.unsubscribe();
};
```

### 8.3 Error Handling Pattern

```typescript
const fetchData = async () => {
    try {
        setLoading(true);
        
        const { data, error } = await supabase
            .from('table')
            .select('*');
        
        if (error) throw error;
        
        setData(data);
    } catch (error) {
        console.error('Error:', error.message);
        setAlertTitle('Error');
        setAlertMessage(error.message);
        setAlertVisible(true);
    } finally {
        setLoading(false);
    }
};
```

---

## 9. Performance Optimization

### 9.1 Caching Strategy

**File:** `src/utils/cacheUtils.ts`

#### Cache Utility Functions
```typescript
// Get cached data with auto-expiration
const getCacheData = async (key: string, duration: number) => {
    const cached = await AsyncStorage.getItem(key);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > duration) {
        await AsyncStorage.removeItem(key);
        return null;
    }
    
    return data;
};

// Store data in cache
const setCacheData = async (key: string, data: any) => {
    await AsyncStorage.setItem(key, JSON.stringify({
        data,
        timestamp: Date.now()
    }));
};

// Clear specific cache
const clearCache = async (key: string) => {
    await AsyncStorage.removeItem(key);
};

// Clear cache by prefix
const clearCacheByPrefix = async (prefix: string) => {
    const keys = await AsyncStorage.getAllKeys();
    const matchingKeys = keys.filter(k => k.startsWith(prefix));
    await AsyncStorage.multiRemove(matchingKeys);
};
```

#### Cache Durations
```typescript
export const CACHE_DURATIONS = {
    SHORT: 60 * 1000,          // 1 minute
    MEDIUM: 5 * 60 * 1000,     // 5 minutes (default)
    LONG: 15 * 60 * 1000,      // 15 minutes
    VERY_LONG: 60 * 60 * 1000, // 1 hour
};
```

### 9.2 Optimized Queries

#### Before Optimization
```typescript
// Fetches all fields (200KB+ payload)
const { data } = await supabase
    .from('stores')
    .select('*')
    .eq('approval_status', 'approved');
```

#### After Optimization
```typescript
// Selective fields only (60KB payload - 70% reduction)
const cached = await getCacheData('approved_stores', CACHE_DURATIONS.MEDIUM);
if (cached) setStores(cached); // Show cached immediately

const { data } = await supabase
    .from('stores')
    .select('id, name, address, latitude, longitude, phone')
    .eq('approval_status', 'approved')
    .order('created_at', { ascending: false });

if (data) {
    setStores(data);
    await setCacheData('approved_stores', data);
}
```

### 9.3 Pagination

#### Offset-based Pagination
```typescript
const PAGE_SIZE = 20;

const fetchStores = async (page: number = 0) => {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    
    const { data, error, count } = await supabase
        .from('stores')
        .select('*', { count: 'exact' })
        .range(from, to)
        .order('created_at', { ascending: false });
    
    return { data, totalCount: count };
};
```

#### Infinite Scroll Implementation
```typescript
<FlatList
    data={stores}
    renderItem={renderItem}
    onEndReached={loadMore}
    onEndReachedThreshold={0.5}
    ListFooterComponent={loading ? <ActivityIndicator /> : null}
/>
```

### 9.4 Debouncing & Throttling

```typescript
// Debounce search input
const debouncedSearch = debounce((query: string) => {
    searchProducts(query);
}, 300);

// Throttle location updates
const throttledLocationUpdate = throttle((location) => {
    updateUserLocation(location);
}, 1000);
```

### 9.5 Image Optimization

```typescript
import * as ImageManipulator from 'expo-image-manipulator';

const optimizeImage = async (uri: string) => {
    const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 800 } }], // Resize to max width 800px
        { 
            compress: 0.7,  // 70% quality
            format: ImageManipulator.SaveFormat.JPEG 
        }
    );
    return manipulated.uri;
};
```

### 9.6 Performance Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **First Load** | 3-5s | 1-2s | 50-70% |
| **Repeated Load** | 2-3s | <100ms | 95% |
| **Network Payload** | 200KB+ | 60KB | 70% |
| **Memory Usage** | Growing | Stable | ✅ |
| **Scrolling FPS** | Jumpy | 60fps | ✅ |

---

## 10. Installation & Setup

### 10.1 Prerequisites

```bash
# Required software
- Node.js >= 18.x
- npm >= 9.x or yarn >= 1.22.x
- Expo CLI
- Git

# For iOS development
- macOS
- Xcode >= 14
- CocoaPods

# For Android development
- Android Studio
- Android SDK
- JDK 11 or higher
```

### 10.2 Clone Repository

```bash
git clone https://github.com/reyneilrodelas/Our-System-.git
cd Our-System-
```

### 10.3 Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 10.4 Environment Configuration

Create `.env` file in root directory:

```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 10.5 Run Application

```bash
# Start Expo development server
npm start
# or
expo start

# Run on specific platform
npm run android  # Android
npm run ios      # iOS
npm run web      # Web browser
```

### 10.6 Build for Production

```bash
# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios

# Build for both
eas build --platform all
```

---

## 11. Configuration

### 11.1 Environment Variables in Monolithic Applications

Your ScanWizard project follows a **monolithic application architecture** where all code exists in a single repository and builds into one application. Environment variables are crucial for managing configuration across different environments (development, staging, production) without hardcoding sensitive data.

#### What are Environment Variables?

Environment variables are key-value pairs stored outside your codebase that configure your application's behavior based on the environment it's running in. They help:

- **Separate Configuration from Code** - Keep sensitive data out of version control
- **Environment-Specific Settings** - Different configs for dev/staging/production
- **Security** - Protect API keys, database credentials, and secrets
- **Flexibility** - Change configuration without rebuilding the app

#### Environment Variable Structure in Monolithic Apps

In a monolithic application like yours, environment variables are typically managed through:

1. **`.env` File** - Local development configuration (NOT committed to Git)
2. **`@env` Module** - React Native environment variable access
3. **Build-time Injection** - Variables embedded during build process

#### Your Project's Environment Configuration

**File Structure:**
```
Our-System-/
├── .env                    # Environment variables (gitignored)
├── .env.example           # Template for required variables
├── babel.config.js        # Babel plugin for @env access
├── src/
│   └── config/
│       └── env.ts         # Environment variable exports
└── .gitignore             # Excludes .env from version control
```

#### Setting Up Environment Variables

**Step 1: Create `.env` file** (Root directory)
```env
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-specific-password

# Optional: Third-party Services
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
GOOGLE_MAPS_API_KEY=AIzaSyC...

# Environment Type
NODE_ENV=development
```

**Step 2: Configure Babel** (Already in your `babel.config.js`)
```javascript
module.exports = function(api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            ['module:react-native-dotenv', {
                moduleName: '@env',           // Import as: import { VAR } from '@env'
                path: '.env',                 // Path to .env file
                safe: false,                  // Don't require .env.example
                allowUndefined: true,         // Allow undefined variables
                verbose: false                // Don't log loaded variables
            }]
        ]
    };
};
```

**Step 3: TypeScript Declaration** (`src/types/env.d.ts`)
```typescript
declare module '@env' {
    export const SUPABASE_URL: string;
    export const SUPABASE_ANON_KEY: string;
    export const SMTP_HOST: string;
    export const SMTP_PORT: string;
    export const SMTP_USER: string;
    export const SMTP_PASS: string;
    export const SENTRY_DSN: string;
    export const GOOGLE_MAPS_API_KEY: string;
    export const NODE_ENV: 'development' | 'production' | 'test';
}
```

**Step 4: Environment Config Module** (`src/config/env.ts`)
```typescript
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

const ENV = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    // Add validation
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
};

// Validate required variables
if (!ENV.SUPABASE_URL) {
    throw new Error('Missing SUPABASE_URL environment variable');
}

if (!ENV.SUPABASE_ANON_KEY) {
    throw new Error('Missing SUPABASE_ANON_KEY environment variable');
}

export default ENV;
```

**Step 5: Usage in Application** (`src/lib/supabase.ts`)
```typescript
import { createClient } from '@supabase/supabase-js';
import ENV from '../config/env';

export const supabase = createClient(
    ENV.SUPABASE_URL,      // From environment variable
    ENV.SUPABASE_ANON_KEY, // From environment variable
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
        },
    }
);
```

#### Environment-Specific Configurations

For different environments, you can create multiple `.env` files:

```
.env                 # Local development (default)
.env.development     # Development environment
.env.staging         # Staging environment
.env.production      # Production environment
```

**Load specific environment:**
```bash
# Development
cp .env.development .env
npm start

# Production
cp .env.production .env
npm run build
```

#### Best Practices for Monolithic Apps

**✅ DO:**
- Use `.env` for local development
- Add `.env` to `.gitignore`
- Create `.env.example` as a template
- Validate required variables on app startup
- Use meaningful variable names (e.g., `SUPABASE_URL` not `API_URL`)
- Document all environment variables
- Use different values per environment

**❌ DON'T:**
- Commit `.env` files to Git
- Hardcode sensitive data in source code
- Use environment variables for constants that never change
- Share production credentials in development
- Store passwords in plain text (use secrets managers for production)

#### Security Considerations

```typescript
// ❌ BAD - Hardcoded credentials
const supabase = createClient(
    'https://myproject.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
);

// ✅ GOOD - Environment variables
const supabase = createClient(
    ENV.SUPABASE_URL,
    ENV.SUPABASE_ANON_KEY
);
```

#### Accessing Environment Variables

```typescript
// Direct import
import { SUPABASE_URL } from '@env';

// Through config module (recommended)
import ENV from '../config/env';
console.log(ENV.SUPABASE_URL);

// Runtime check
if (__DEV__) {
    console.log('Development mode');
} else {
    console.log('Production mode');
}
```

#### Updating Environment Variables

```bash
# 1. Update .env file
echo "NEW_API_KEY=abc123" >> .env

# 2. Clear Metro bundler cache
npx expo start -c

# 3. Restart development server
npx expo start
```

#### Production Deployment Variables

For production builds, environment variables are injected through your build system:

**EAS Build (Expo):**
```bash
# Set secrets in EAS
eas secret:create --name SUPABASE_URL --value "https://prod.supabase.co"
eas secret:create --name SUPABASE_ANON_KEY --value "prod-key"

# Build with secrets
eas build --platform all
```

**eas.json Configuration:**
```json
{
    "build": {
        "production": {
            "env": {
                "NODE_ENV": "production"
            }
        },
        "development": {
            "env": {
                "NODE_ENV": "development"
            }
        }
    }
}
```

#### Troubleshooting Environment Variables

**Issue: "undefined" values**
```bash
# Solution: Clear cache and restart
npx expo start -c
```

**Issue: TypeScript errors**
```typescript
// Solution: Ensure env.d.ts exists and is properly declared
declare module '@env' {
    export const VARIABLE_NAME: string;
}
```

**Issue: Variables not updating**
```bash
# Solution: 
1. Stop the server
2. Clear cache: npx expo start -c
3. Verify .env file has correct values
4. Restart server
```

#### Example: Complete Environment Setup

**`.env.example`** (Commit this to Git as template)
```env
# Supabase Configuration (Required)
SUPABASE_URL=https://yourproject.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-password-here

# Third-party APIs (Optional)
GOOGLE_MAPS_API_KEY=
SENTRY_DSN=

# Environment
NODE_ENV=development
```

**`.gitignore`** (Ensure .env is excluded)
```
# Environment variables
.env
.env.local
.env.*.local

# But include example
!.env.example
```

This configuration approach ensures your monolithic application remains secure, flexible, and easy to deploy across different environments while keeping sensitive data protected.

---

### 11.2 App Configuration

**File:** `app.config.js`

```javascript
export default {
    name: "ScanWizard",
    slug: "capstone_project",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
        image: "./assets/splash.png",
        resizeMode: "contain",
        backgroundColor: "#ffffff"
    },
    assetBundlePatterns: [
        "**/*"
    ],
    ios: {
        supportsTablet: true,
        bundleIdentifier: "com.yourcompany.scanwizard",
        infoPlist: {
            NSCameraUsageDescription: "We need camera access to scan barcodes",
            NSLocationWhenInUseUsageDescription: "We need your location to find nearby stores"
        }
    },
    android: {
        adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#ffffff"
        },
        package: "com.yourcompany.scanwizard",
        permissions: [
            "CAMERA",
            "ACCESS_FINE_LOCATION",
            "ACCESS_COARSE_LOCATION"
        ]
    },
    plugins: [
        "expo-camera",
        "expo-location",
        [
            "expo-image-picker",
            {
                "photosPermission": "Allow app to access your photos"
            }
        ]
    ],
    scheme: "scanwizard"
};
```

### 11.3 TypeScript Configuration

**File:** `tsconfig.json`

```json
{
    "extends": "expo/tsconfig.base",
    "compilerOptions": {
        "strict": true,
        "target": "esnext",
        "lib": ["esnext"],
        "jsx": "react-native",
        "moduleResolution": "node",
        "noEmit": true,
        "skipLibCheck": true,
        "resolveJsonModule": true,
        "allowSyntheticDefaultImports": true,
        "esModuleInterop": true,
        "isolatedModules": true
    },
    "include": [
        "**/*.ts",
        "**/*.tsx",
        ".expo/types/**/*.ts",
        "expo-env.d.ts"
    ],
    "exclude": [
        "node_modules"
    ]
}
```

### 11.4 Babel Configuration

**File:** `babel.config.js`

```javascript
module.exports = function(api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            ['module:react-native-dotenv', {
                moduleName: '@env',
                path: '.env',
            }]
        ]
    };
};
```

### 11.5 EAS Configuration

**File:** `eas.json`

```json
{
    "cli": {
        "version": ">= 5.0.0"
    },
    "build": {
        "development": {
            "developmentClient": true,
            "distribution": "internal"
        },
        "preview": {
            "distribution": "internal",
            "android": {
                "buildType": "apk"
            }
        },
        "production": {
            "android": {
                "buildType": "app-bundle"
            }
        }
    },
    "submit": {
        "production": {}
    }
}
```

---

## 12. Security Implementation

### 12.1 Row Level Security (RLS)

All database tables have RLS enabled to ensure data access control:

```sql
-- Example: Stores table policies
CREATE POLICY "Store owners can create stores"
    ON stores FOR INSERT
    WITH CHECK (
        owner_id IN (
            SELECT id FROM store_owners WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Store owners can update own stores"
    ON stores FOR UPDATE
    USING (
        owner_id IN (
            SELECT id FROM store_owners WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Everyone can view approved stores"
    ON stores FOR SELECT
    USING (approval_status = 'approved' OR owner_id IN (
        SELECT id FROM store_owners WHERE user_id = auth.uid()
    ));
```

### 12.2 Authentication Security

- **Password Requirements**: Minimum 6 characters (configurable)
- **JWT Tokens**: Secure token-based authentication
- **PKCE Flow**: Proof Key for Code Exchange for mobile security
- **Auto-refresh**: Tokens auto-refresh before expiration
- **Session Persistence**: Encrypted session storage

### 12.3 API Security

```typescript
// All API calls require authentication
const headers = {
    Authorization: `Bearer ${session.access_token}`,
    apikey: ENV.SUPABASE_ANON_KEY
};
```

### 12.4 Input Validation

```typescript
// Example: Email validation
const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

// Example: Barcode validation
const validateBarcode = (barcode: string) => {
    return barcode.length >= 8 && /^\d+$/.test(barcode);
};
```

### 12.5 Sensitive Data Handling

- Environment variables for API keys
- No hardcoded credentials
- Secure storage for tokens
- HTTPS-only communication

---

## 13. Error Handling

### 13.1 Global Error Handler

```typescript
// Custom Alert Component
<StyledAlert
    visible={alertVisible}
    title={alertTitle}
    message={alertMessage}
    onClose={() => setAlertVisible(false)}
    onConfirm={alertCallback}
/>
```

### 13.2 Common Error Patterns

#### Network Errors
```typescript
try {
    const { data, error } = await supabase.from('table').select();
    if (error) throw error;
} catch (error) {
    if (error.message.includes('Failed to fetch')) {
        setAlertMessage('No internet connection. Please check your network.');
    } else {
        setAlertMessage(error.message);
    }
    setAlertVisible(true);
}
```

#### Authentication Errors
```typescript
const { error } = await supabase.auth.signInWithPassword({...});

if (error) {
    switch (error.message) {
        case 'Invalid login credentials':
            setAlertMessage('Incorrect email or password');
            break;
        case 'Email not confirmed':
            setAlertMessage('Please verify your email first');
            break;
        default:
            setAlertMessage(error.message);
    }
}
```

#### Permission Errors
```typescript
const { status } = await Location.requestForegroundPermissionsAsync();

if (status !== 'granted') {
    setAlertTitle('Permission Denied');
    setAlertMessage('Location permission is required to show nearby stores.');
    setAlertVisible(true);
}
```

### 13.3 Error Logging

```typescript
// Production error logging
if (__DEV__) {
    console.error('Error:', error);
} else {
    // Send to error tracking service (e.g., Sentry)
    logError(error);
}
```

---

## 14. Testing Guidelines

### 14.1 Unit Testing

```bash
# Install testing libraries
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native

# Run tests
npm test
```

#### Example Test
```typescript
import { render, fireEvent } from '@testing-library/react-native';
import LoginScreen from '../src/screens/auth/LoginScreen';

describe('LoginScreen', () => {
    it('should render login form', () => {
        const { getByPlaceholderText } = render(<LoginScreen />);
        expect(getByPlaceholderText('Email')).toBeTruthy();
        expect(getByPlaceholderText('Password')).toBeTruthy();
    });
    
    it('should show error for invalid email', async () => {
        const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);
        
        const emailInput = getByPlaceholderText('Email');
        const submitButton = getByText('Login');
        
        fireEvent.changeText(emailInput, 'invalid-email');
        fireEvent.press(submitButton);
        
        const errorMessage = await findByText('Invalid email format');
        expect(errorMessage).toBeTruthy();
    });
});
```

### 14.2 Integration Testing

Test complete user flows:

```typescript
describe('Product Search Flow', () => {
    it('should scan barcode and show product results', async () => {
        // 1. Navigate to scanner
        // 2. Mock barcode scan
        // 3. Verify API call
        // 4. Check navigation to results
        // 5. Verify product display
    });
});
```

### 14.3 Manual Testing Checklist

#### Authentication
- [ ] User can signup with valid credentials
- [ ] User can login with existing account
- [ ] Password reset flow works correctly
- [ ] Session persists after app restart
- [ ] User can logout successfully

#### Scanner
- [ ] Camera permissions requested properly
- [ ] Barcode scanning works for all supported types
- [ ] Torch toggle functions correctly
- [ ] Timeout dialog appears after 20 seconds
- [ ] Product found navigates to results

#### Maps
- [ ] User location displayed accurately
- [ ] Distance filter works correctly
- [ ] Store markers show correct information
- [ ] Navigation to store details works
- [ ] Map types switch properly

#### Store Owner
- [ ] Can create new store
- [ ] Can add products
- [ ] Can assign products to stores
- [ ] Can edit store details
- [ ] Pending approvals show correctly

#### Admin
- [ ] Can view pending stores
- [ ] Can approve/reject stores
- [ ] Can approve/reject products
- [ ] Dashboard statistics display correctly
- [ ] Can view all users

---

## 15. Deployment

### 15.1 Pre-deployment Checklist

- [ ] Update version number in `app.config.js`
- [ ] Test on physical devices (iOS & Android)
- [ ] Verify all API endpoints work in production
- [ ] Check environment variables are set correctly
- [ ] Run performance tests
- [ ] Validate all user flows
- [ ] Update documentation

### 15.2 Android Deployment

#### Build APK for Testing
```bash
eas build --platform android --profile preview
```

#### Build AAB for Play Store
```bash
eas build --platform android --profile production
```

#### Submit to Google Play
```bash
eas submit --platform android
```

### 15.3 iOS Deployment

#### Build for TestFlight
```bash
eas build --platform ios --profile preview
```

#### Build for App Store
```bash
eas build --platform ios --profile production
```

#### Submit to App Store
```bash
eas submit --platform ios
```

### 15.4 Over-the-Air (OTA) Updates

```bash
# Publish update to all users
eas update --branch production --message "Bug fixes and improvements"

# Publish to specific channel
eas update --channel production --message "New features"
```

### 15.5 Backend Deployment (Supabase)

Supabase handles all backend infrastructure:
- **Database**: Automatically scaled PostgreSQL
- **Authentication**: Managed auth service
- **Storage**: CDN-backed file storage
- **Real-time**: WebSocket connections
- **Edge Functions**: Serverless functions

#### Migration Management
```bash
# Create new migration
supabase migration new migration_name

# Apply migrations
supabase db push

# Rollback migration
supabase migration revert
```

---

## 16. Troubleshooting

### 16.1 Common Issues

#### Camera Not Working
```
Issue: Camera shows black screen
Solution:
1. Check permissions in app settings
2. Restart the app
3. Clear app cache
4. Reinstall the app
```

#### Location Not Detecting
```
Issue: "Could not get location" error
Solution:
1. Enable location services in device settings
2. Grant location permission to app
3. Check if GPS is enabled
4. Move to area with better GPS signal
```

#### Products Not Showing
```
Issue: No products found after scanning
Solution:
1. Verify barcode is readable
2. Check internet connection
3. Ensure product exists in database
4. Try scanning again with better lighting
```

#### App Crashes on Startup
```
Issue: App crashes immediately after launch
Solution:
1. Clear app data and cache
2. Uninstall and reinstall
3. Check device OS version compatibility
4. Verify Supabase services are running
```

### 16.2 Performance Issues

#### Slow Loading
```
Solution:
1. Clear cache: await clearCacheByPrefix('cache_')
2. Check network speed
3. Reduce query complexity
4. Enable pagination
```

#### Memory Leaks
```
Solution:
1. Clean up useEffect subscriptions
2. Remove event listeners on unmount
3. Cancel pending API requests
4. Clear large image caches
```

### 16.3 Development Issues

#### Metro Bundler Error
```bash
# Clear Metro cache
npx react-native start --reset-cache

# Or
expo start -c
```

#### TypeScript Errors
```bash
# Regenerate TypeScript types
npx expo customize tsconfig.json

# Check for errors
npx tsc --noEmit
```

#### Build Errors
```bash
# Clean build
cd android && ./gradlew clean && cd ..
cd ios && pod install && cd ..

# Rebuild
expo run:android
expo run:ios
```

---

## 17. API Reference

### 17.1 Authentication APIs

#### Sign Up
```typescript
POST /auth/signup
Body: {
    email: string,
    password: string,
    options: {
        data: {
            full_name: string,
            role: 'customer' | 'store_owner'
        }
    }
}
Response: { user, session }
```

#### Sign In
```typescript
POST /auth/signin
Body: {
    email: string,
    password: string
}
Response: { user, session }
```

#### Sign Out
```typescript
POST /auth/signout
Response: { success: boolean }
```

### 17.2 Store APIs

#### Get Approved Stores
```typescript
GET /rest/v1/stores
Query: approval_status=eq.approved
Response: Store[]
```

#### Create Store
```typescript
POST /rest/v1/stores
Body: {
    name: string,
    address: string,
    latitude: number,
    longitude: number,
    owner_id: string,
    approval_status: 'pending'
}
Response: Store
```

#### Update Store
```typescript
PATCH /rest/v1/stores?id=eq.{storeId}
Body: { name?, address?, ...updateFields }
Response: Store
```

### 17.3 Product APIs

#### Search Products
```typescript
GET /rest/v1/products
Query: 
    - name=ilike.*searchTerm*
    - category=eq.categoryName
    - approval_status=eq.approved
Response: Product[]
```

#### Get Product by Barcode
```typescript
GET /rest/v1/products
Query: barcode=eq.{barcodeValue}
Response: Product
```

#### Create Product
```typescript
POST /rest/v1/products
Body: {
    barcode: string,
    name: string,
    description: string,
    category: string,
    created_by: string,
    approval_status: 'pending'
}
Response: Product
```

### 17.4 Store-Product APIs

#### Get Products in Store
```typescript
GET /rest/v1/store_products
Query: 
    - store_id=eq.{storeId}
    - select=*,products(*),stores(*)
Response: StoreProduct[]
```

#### Assign Product to Store
```typescript
POST /rest/v1/store_products
Body: {
    store_id: string,
    product_id: string,
    price: number,
    quantity: number,
    is_available: boolean
}
Response: StoreProduct
```

---

## 18. Maintenance & Support

### 18.1 Regular Maintenance Tasks

#### Daily
- Monitor error logs
- Check server uptime
- Review user feedback

#### Weekly
- Review performance metrics
- Check database size and optimize if needed
- Update dependencies (security patches)
- Backup database

#### Monthly
- Full system audit
- Performance optimization review
- Update documentation
- Review and respond to user reviews

### 18.2 Database Maintenance

```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM stores WHERE approval_status = 'approved';

-- Vacuum and analyze tables
VACUUM ANALYZE stores;
VACUUM ANALYZE products;

-- Check table sizes
SELECT 
    table_name, 
    pg_size_pretty(pg_total_relation_size(table_name::regclass))
FROM information_schema.tables
WHERE table_schema = 'public';

-- Index maintenance
REINDEX TABLE stores;
REINDEX TABLE products;
```

### 18.3 Monitoring

#### Key Metrics to Monitor
- API response times
- Error rates
- Active users
- Database query performance
- Cache hit rates
- Storage usage
- Network latency

#### Tools
- Supabase Dashboard: Built-in monitoring
- Google Analytics: User behavior
- Sentry: Error tracking (optional)
- LogRocket: Session replay (optional)

### 18.4 Support Channels

#### For Users
- **Email**: support@scanwizard.com
- **In-app**: Contact Us screen
- **FAQ**: Available in app

#### For Developers
- **Documentation**: This manual
- **GitHub Issues**: Bug reports and feature requests
- **Slack/Discord**: Team communication

### 18.5 Backup Strategy

#### Database Backups
```bash
# Supabase provides automatic daily backups
# Manual backup:
supabase db dump -f backup_$(date +%Y%m%d).sql

# Restore from backup:
supabase db reset
psql -f backup_20231206.sql
```

#### Code Backups
- Git repository (primary)
- Weekly full repository backup
- Tag releases for easy rollback

---

## Appendix A: Glossary

| Term | Definition |
|------|------------|
| **Barcode** | Machine-readable representation of data in visual format |
| **BaaS** | Backend-as-a-Service - cloud-based backend infrastructure |
| **Haversine Formula** | Formula for calculating distances between coordinates on Earth |
| **JWT** | JSON Web Token - secure authentication token format |
| **OTA** | Over-the-Air update - app updates without app store |
| **PKCE** | Proof Key for Code Exchange - secure OAuth flow for mobile |
| **RLS** | Row Level Security - database-level access control |
| **UUID** | Universally Unique Identifier - unique database ID |

---

## Appendix B: Environment Variables

```env
# Required
SUPABASE_URL=              # Your Supabase project URL
SUPABASE_ANON_KEY=         # Your Supabase anonymous key

# Optional
SENTRY_DSN=                # Error tracking (if using Sentry)
GOOGLE_MAPS_API_KEY=       # Maps API key (if needed)
```

---

## Appendix C: Database Queries Examples

### Get Stores Within Radius
```sql
SELECT *,
    (
        6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
        )
    ) AS distance
FROM stores
WHERE approval_status = 'approved'
HAVING distance < $3
ORDER BY distance;
```

### Get Popular Products
```sql
SELECT p.*, COUNT(sp.id) as store_count
FROM products p
LEFT JOIN store_products sp ON p.id = sp.product_id
WHERE p.approval_status = 'approved'
GROUP BY p.id
ORDER BY store_count DESC
LIMIT 10;
```

### Store Owner Statistics
```sql
SELECT 
    so.id,
    COUNT(DISTINCT s.id) as total_stores,
    COUNT(DISTINCT p.id) as total_products,
    COUNT(DISTINCT sp.id) as total_assignments
FROM store_owners so
LEFT JOIN stores s ON so.id = s.owner_id
LEFT JOIN products p ON so.id = p.created_by
LEFT JOIN store_products sp ON s.id = sp.store_id
WHERE so.user_id = $1
GROUP BY so.id;
```

---

## Appendix D: Code Style Guide

### TypeScript
```typescript
// Use explicit types
const handleSubmit = async (data: FormData): Promise<void> => {
    // Implementation
};

// Prefer interfaces over types for objects
interface User {
    id: string;
    email: string;
    role: UserRole;
}

// Use enums for constants
enum UserRole {
    ADMIN = 'admin',
    STORE_OWNER = 'store_owner',
    CUSTOMER = 'customer'
}
```

### React Components
```typescript
// Use functional components with hooks
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
    const [state, setState] = useState<Type>(initialValue);
    
    useEffect(() => {
        // Effect logic
        return () => {
            // Cleanup
        };
    }, [dependencies]);
    
    return <View>...</View>;
};
```

### Naming Conventions
- Components: PascalCase (e.g., `LoginScreen`)
- Functions: camelCase (e.g., `handleSubmit`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_URL`)
- Files: PascalCase for components, camelCase for utilities

---

## Appendix E: Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Dec 2025 | Initial release |
| | | - Barcode scanning |
| | | - Store locator |
| | | - Multi-role authentication |
| | | - Admin approval system |
| | | - Performance optimization |

---

## Contact & Support

**Project Repository**: https://github.com/reyneilrodelas/Our-System-

**Developer**: Reyneil Rodelas

**Last Updated**: December 6, 2025

---

*End of Technical Manual*
