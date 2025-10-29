# Class Diagram - System Architecture

## Entity Relationships

```mermaid
classDiagram
    class User {
        -id: string (UUID)
        -email: string
        -full_name: string
        -avatar_url: string (optional)
        -role: string (admin | store_owner | customer)
        -created_at: timestamp
        -updated_at: timestamp
        +getProfile(): Profile
        +updateProfile(data): void
        +logout(): void
    }

    class Administration {
        -id: string (UUID)
        -user_id: string (FK)
        -approval_status: string
        -created_at: timestamp
        +approvePendingStores(): void
        +approvePendingProducts(): void
        +viewAllStores(): Store[]
        +viewAllUsers(): User[]
        +manageApprovals(): void
        +getDashboardStats(): Stats
    }

    class StoreOwner {
        -id: string (UUID)
        -user_id: string (FK)
        -business_name: string (optional)
        -is_verified: boolean
        -created_at: timestamp
        +createStore(storeData): Store
        +updateStore(storeId, data): void
        +deleteStore(storeId): void
        +addProduct(productData): Product
        +manageProducts(): Product[]
        +assignProductsToStore(storeId, products): void
        +viewMyStores(): Store[]
        +viewMyProducts(): Product[]
    }

    class Store {
        -id: string (UUID)
        -owner_id: string (FK to StoreOwner)
        -name: string
        -address: string
        -latitude: number
        -longitude: number
        -phone: string (optional)
        -email: string (optional)
        -description: string (optional)
        -logo_url: string (optional)
        -is_verified: boolean
        -approval_status: string (pending | approved | rejected)
        -created_at: timestamp
        -updated_at: timestamp
        +getProducts(): Product[]
        +addProduct(productId): void
        +removeProduct(productId): void
        +getDetails(): StoreData
        +updateInfo(data): void
        +getLocation(): Coordinates
    }

    class Product {
        -id: string (UUID)
        -barcode: string (unique)
        -name: string
        -description: string
        -category: string (School Supplies | Food & Beverages | Hygiene & Personal Care | Cosmetics | Household Supplies | Motorcycle Accessories & Parts)
        -image_url: string (optional)
        -created_by: string (FK to StoreOwner)
        -is_approved: boolean
        -approval_status: string (pending | approved | rejected)
        -created_at: timestamp
        -updated_at: timestamp
        +getDetails(): ProductData
        +updateInfo(data): void
        +getAvailableStores(): Store[]
        +scan(): void
    }

    class StoreProduct {
        -id: string (UUID)
        -store_id: string (FK)
        -product_id: string (FK)
        -price: number (optional)
        -quantity: number (optional)
        -is_available: boolean
        -created_at: timestamp
        -updated_at: timestamp
    }

    class Profile {
        -id: string (UUID)
        -full_name: string
        -avatar_url: string
        -role: string
        -user_id: string (FK)
        +updateProfile(data): void
        +uploadAvatar(image): void
        +deleteAvatar(): void
    }

    %% Relationships
    User "1" --> "0..1" Administration : manages
    User "1" --> "0..1" StoreOwner : is
    User "1" --> "1" Profile : has

    StoreOwner "1" --> "0..*" Store : owns
    StoreOwner "1" --> "0..*" Product : creates

    Store "1" --> "0..*" StoreProduct : contains
    Product "1" --> "0..*" StoreProduct : appears_in

    Administration "1" --> "0..*" Store : approves
    Administration "1" --> "0..*" Product : approves
    Administration "1" --> "0..*" User : manages
```

## Entity-Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ PROFILE : has
    USER ||--o| ADMINISTRATION : has
    USER ||--o| STORE_OWNER : is
    STORE_OWNER ||--o{ STORE : creates
    STORE_OWNER ||--o{ PRODUCT : creates
    STORE ||--o{ STORE_PRODUCT : contains
    PRODUCT ||--o{ STORE_PRODUCT : appears_in
    ADMINISTRATION ||--o{ STORE : approves
    ADMINISTRATION ||--o{ PRODUCT : reviews

    USER {
        string id PK
        string email UK
        string full_name
        string avatar_url
        string role
        timestamp created_at
        timestamp updated_at
    }

    PROFILE {
        string id PK
        string user_id FK
        string full_name
        string avatar_url
        string role
        timestamp created_at
    }

    ADMINISTRATION {
        string id PK
        string user_id FK
        string approval_status
        timestamp created_at
    }

    STORE_OWNER {
        string id PK
        string user_id FK
        string business_name
        boolean is_verified
        timestamp created_at
    }

    STORE {
        string id PK
        string owner_id FK
        string name
        string address
        float latitude
        float longitude
        string phone
        string email
        string description
        string logo_url
        boolean is_verified
        string approval_status
        timestamp created_at
        timestamp updated_at
    }

    PRODUCT {
        string id PK
        string barcode UK
        string name
        string description
        string category
        string image_url
        string created_by FK
        boolean is_approved
        string approval_status
        timestamp created_at
        timestamp updated_at
    }

    STORE_PRODUCT {
        string id PK
        string store_id FK
        string product_id FK
        float price
        int quantity
        boolean is_available
        timestamp created_at
        timestamp updated_at
    }
```

## Key Relationships Explained

### User → Administration
- **Type**: One-to-One Optional
- **Meaning**: A User can have an Administration role (admin users only)
- **Example**: User with role="admin" creates an Administration record

### User → StoreOwner
- **Type**: One-to-One Optional
- **Meaning**: A User can be a StoreOwner (store owner users only)
- **Example**: User with role="store_owner" creates a StoreOwner record

### User → Profile
- **Type**: One-to-One Required
- **Meaning**: Every User has exactly one Profile
- **Example**: Extended user information like avatar, full name, role

### StoreOwner → Store (1:N)
- **Type**: One-to-Many
- **Meaning**: One StoreOwner can create and own multiple Stores
- **Example**: Maria can own "Maria's Bakery", "Maria's Cafe", etc.

### StoreOwner → Product (1:N)
- **Type**: One-to-Many
- **Meaning**: One StoreOwner can create multiple Products
- **Example**: Store owner creates products for their stores

### Store → StoreProduct (1:N)
- **Type**: One-to-Many
- **Meaning**: One Store can contain many Products (via StoreProduct junction table)
- **Example**: Maria's Bakery sells Bread, Pastries, Cakes, etc.

### Product → StoreProduct (1:N)
- **Type**: One-to-Many
- **Meaning**: One Product can be sold in many Stores (via StoreProduct junction table)
- **Example**: "Marlboro Cigarettes" is available in multiple stores

### Administration → Store (1:N)
- **Type**: One-to-Many
- **Meaning**: Admins can approve/reject multiple Stores
- **Example**: Admin reviews pending store registrations

### Administration → Product (1:N)
- **Type**: One-to-Many
- **Meaning**: Admins can approve/reject multiple Products
- **Example**: Admin reviews products for compliance

## Roles & Permissions

| Entity | Role | Actions | Approval Required |
|--------|------|---------|-------------------|
| **Administration** | admin | View all users, stores, products; Approve/reject stores & products | No |
| **StoreOwner** | store_owner | Create stores; Add/manage products; View own stores/products | Yes (store & products) |
| **User** | customer | View stores & products; Search; View profiles | No |

## Status Workflow

### Store Approval Workflow
```
pending → approved (by admin)
       ↘ rejected (by admin)
```

### Product Approval Workflow
```
pending → approved (by admin)
       ↘ rejected (by admin)
```

## Database Schema (PostgreSQL)

The system is built on PostgreSQL with Supabase integration, with the following main tables:
- `auth.users` - Supabase authentication
- `public.profiles` - Extended user information
- `public.store_owners` - Store owner records
- `public.administrators` - Admin records
- `public.stores` - Store information
- `public.products` - Product catalog
- `public.store_products` - Junction table for many-to-many relationship

---

# Use Case Diagram - System Functionality

## Main Use Case Diagram

```mermaid
graph TB
    subgraph "ScanWizard System"
        direction TB
        
        subgraph "Authentication"
            UC1["Login"]
            UC2["Sign Up"]
            UC3["Forgot Password"]
            UC4["Reset Password"]
            UC5["Logout"]
        end
        
        subgraph "Customer"
            UC6["Scan Product"]
            UC7["View Product Details"]
            UC8["Search Products"]
            UC9["View Nearby Stores"]
            UC10["View Store Details"]
            UC11["View Profile"]
            UC12["Edit Profile"]
            UC13["View About Us"]
            UC14["Contact Us"]
        end
        
        subgraph "Store Owner"
            UC15["Create Store"]
            UC16["Manage Stores"]
            UC17["Add Product"]
            UC18["Manage Products"]
            UC19["Assign Products to Store"]
            UC20["View My Shops"]
            UC21["Update Store Details"]
        end
        
        subgraph "Administration"
            UC22["View Dashboard"]
            UC23["Approve Stores"]
            UC24["Reject Stores"]
            UC25["Approve Products"]
            UC26["Reject Products"]
            UC27["View All Stores"]
            UC28["View All Users"]
            UC29["View Pending Approvals"]
        end
    end
    
    Customer["👤 Customer"]
    StoreOwner["🏪 Store Owner"]
    Admin["👨‍💼 Administrator"]
    
    %% Customer Use Cases
    Customer -->|uses| UC1
    Customer -->|uses| UC2
    Customer -->|uses| UC3
    Customer -->|uses| UC4
    Customer -->|uses| UC5
    Customer -->|performs| UC6
    Customer -->|performs| UC7
    Customer -->|performs| UC8
    Customer -->|performs| UC9
    Customer -->|performs| UC10
    Customer -->|performs| UC11
    Customer -->|performs| UC12
    Customer -->|performs| UC13
    Customer -->|performs| UC14
    
    %% Store Owner Use Cases
    StoreOwner -->|uses| UC1
    StoreOwner -->|uses| UC2
    StoreOwner -->|uses| UC3
    StoreOwner -->|uses| UC4
    StoreOwner -->|uses| UC5
    StoreOwner -->|performs| UC15
    StoreOwner -->|performs| UC16
    StoreOwner -->|performs| UC17
    StoreOwner -->|performs| UC18
    StoreOwner -->|performs| UC19
    StoreOwner -->|performs| UC20
    StoreOwner -->|performs| UC21
    StoreOwner -->|can perform| UC6
    StoreOwner -->|can perform| UC11
    
    %% Admin Use Cases
    Admin -->|uses| UC1
    Admin -->|uses| UC5
    Admin -->|performs| UC22
    Admin -->|performs| UC23
    Admin -->|performs| UC24
    Admin -->|performs| UC25
    Admin -->|performs| UC26
    Admin -->|performs| UC27
    Admin -->|performs| UC28
    Admin -->|performs| UC29
    
    style Customer fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style StoreOwner fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style Admin fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
```

## Detailed Use Case Diagram (Mermaid)

```mermaid
usecase diagram
    actor Customer as "Customer"
    actor StoreOwner as "Store Owner"
    actor Admin as "Administrator"
    actor System as "System"
    
    Customer -- (Scan Product)
    Customer -- (View Product Details)
    Customer -- (Search Products)
    Customer -- (View Nearby Stores)
    Customer -- (View Store Details)
    Customer -- (View Profile)
    Customer -- (Edit Profile)
    Customer -- (View About Us)
    Customer -- (Contact Us)
    
    StoreOwner -- (Create Store)
    StoreOwner -- (Manage Stores)
    StoreOwner -- (Add Product)
    StoreOwner -- (Manage Products)
    StoreOwner -- (Assign Products to Store)
    StoreOwner -- (View My Shops)
    
    Admin -- (View Dashboard)
    Admin -- (Approve/Reject Stores)
    Admin -- (View All Stores)
    Admin -- (View Pending Approvals)
    
    (Login) .> (Scan Product) : include
    (Login) .> (Create Store) : include
    (Login) .> (View Dashboard) : include
    
    (Manage Stores) .> (Update Store Details) : include
    (Manage Products) .> (View Product Details) : include
```

## Use Case Descriptions

### Authentication Use Cases

#### UC1: Login
- **Actor**: Customer, Store Owner, Administrator
- **Precondition**: User has valid credentials
- **Main Flow**:
  1. User enters email and password
  2. System validates credentials
  3. System checks user role
  4. System directs to appropriate dashboard
- **Postcondition**: User is authenticated and logged in
- **Alternative Flow**: 
  - Invalid credentials → Show error message
  - User doesn't exist → Suggest Sign Up

#### UC2: Sign Up
- **Actor**: Customer, Store Owner
- **Precondition**: User is not registered
- **Main Flow**:
  1. User enters full name, email, password
  2. System validates input
  3. System creates user account
  4. System creates profile
  5. User is automatically logged in
- **Postcondition**: New user account created and logged in

#### UC3: Forgot Password
- **Actor**: Customer, Store Owner
- **Precondition**: User is on login screen
- **Main Flow**:
  1. User clicks "Forgot Password"
  2. User enters email
  3. System sends reset link to email
  4. System shows confirmation message
- **Postcondition**: Password reset link sent to user's email

#### UC4: Reset Password
- **Actor**: Customer, Store Owner
- **Precondition**: User received password reset link
- **Main Flow**:
  1. User clicks reset link in email
  2. User enters new password
  3. System validates password requirements
  4. System updates password in database
  5. System shows success message
- **Postcondition**: Password reset successfully

#### UC5: Logout
- **Actor**: Customer, Store Owner, Administrator
- **Precondition**: User is logged in
- **Main Flow**:
  1. User clicks logout button
  2. System clears session data
  3. System redirects to login screen
- **Postcondition**: User is logged out

### Customer Use Cases

#### UC6: Scan Product
- **Actor**: Customer
- **Precondition**: User is logged in; device has camera permission
- **Main Flow**:
  1. User opens Scanner
  2. User points camera at barcode
  3. System scans and recognizes barcode
  4. System fetches product information
  5. System displays product details screen
- **Postcondition**: Product details displayed
- **Alternative Flow**:
  - Invalid barcode → Show "Product not found"
  - Camera permission denied → Request permission

#### UC7: View Product Details
- **Actor**: Customer, Store Owner
- **Precondition**: Product exists in system
- **Main Flow**:
  1. User views product information (name, description, category, image)
  2. System displays available stores selling this product
  3. System shows store locations and distances
- **Postcondition**: Product details and store information displayed

#### UC8: Search Products
- **Actor**: Customer
- **Precondition**: User is logged in
- **Main Flow**:
  1. User enters product name or category
  2. System searches product database
  3. System displays search results
  4. User selects product from results
- **Postcondition**: Product details displayed

#### UC9: View Nearby Stores
- **Actor**: Customer
- **Precondition**: User has location permission; GPS is enabled
- **Main Flow**:
  1. System retrieves user's current location
  2. System fetches all approved stores near user
  3. System displays stores on map
  4. System shows store details (name, address, distance)
- **Postcondition**: Store locations displayed on map

#### UC10: View Store Details
- **Actor**: Customer
- **Precondition**: Store is approved
- **Main Flow**:
  1. User selects store from search/map
  2. System displays store information (name, address, phone, products)
  3. System shows store location on map
  4. User can browse products available at store
- **Postcondition**: Store information displayed

#### UC11: View Profile
- **Actor**: Customer, Store Owner
- **Precondition**: User is logged in
- **Main Flow**:
  1. User opens Profile screen
  2. System displays user information (name, email, avatar, role)
  3. System shows profile completion status
- **Postcondition**: Profile information displayed

#### UC12: Edit Profile
- **Actor**: Customer, Store Owner
- **Precondition**: User is on Profile screen
- **Main Flow**:
  1. User clicks "Edit Profile"
  2. User modifies name, avatar, or contact information
  3. System validates new information
  4. System saves changes to database
  5. System shows success message
- **Postcondition**: Profile updated successfully

#### UC13: View About Us
- **Actor**: Customer
- **Precondition**: User is logged in
- **Main Flow**:
  1. User navigates to About Us section
  2. System displays application information and mission
- **Postcondition**: About information displayed

#### UC14: Contact Us
- **Actor**: Customer
- **Precondition**: User is logged in
- **Main Flow**:
  1. User navigates to Contact Us section
  2. System displays contact information and support options
  3. User can contact support via email/phone
- **Postcondition**: Contact information provided

### Store Owner Use Cases

#### UC15: Create Store
- **Actor**: Store Owner
- **Precondition**: User is logged in and verified; user role is store_owner
- **Main Flow**:
  1. User clicks "Add Store"
  2. User enters store name, address, latitude, longitude, phone, email
  3. System validates location data
  4. System creates store with approval_status = "pending"
  5. System sends notification to admin
  6. System shows success message
- **Postcondition**: Store created (pending admin approval)
- **Alternative Flow**:
  - Invalid coordinates → Show error
  - Missing required fields → Highlight fields and show error

#### UC16: Manage Stores
- **Actor**: Store Owner
- **Precondition**: Store owner has created stores
- **Main Flow**:
  1. User opens "My Stores"
  2. System displays list of user's stores
  3. User can select store to view/edit/delete
- **Postcondition**: Store list displayed

#### UC17: Add Product
- **Actor**: Store Owner
- **Precondition**: User is logged in; user role is store_owner
- **Main Flow**:
  1. User clicks "Add Product"
  2. User enters product name, barcode, description, category, image
  3. User can scan barcode or enter manually
  4. System validates barcode uniqueness
  5. System creates product with approval_status = "pending"
  6. System sends notification to admin
  7. System shows success message
- **Postcondition**: Product created (pending admin approval)
- **Alternative Flow**:
  - Barcode already exists → Show duplicate error
  - Invalid barcode format → Show format error

#### UC18: Manage Products
- **Actor**: Store Owner
- **Precondition**: Store owner has created products
- **Main Flow**:
  1. User opens "My Products" or "Manage Products"
  2. System displays list of user's products
  3. User can select product to view/edit/delete
- **Postcondition**: Product list displayed

#### UC19: Assign Products to Store
- **Actor**: Store Owner
- **Precondition**: Store owner has created products and stores
- **Main Flow**:
  1. User opens store details
  2. User clicks "Assign Products"
  3. System displays list of available products
  4. User selects products to add to store
  5. System updates store_products table
  6. System shows success message
- **Postcondition**: Products assigned to store

#### UC20: View My Shops
- **Actor**: Store Owner
- **Precondition**: Store owner is logged in
- **Main Flow**:
  1. User navigates to "My Shops"
  2. System displays all stores owned by user
  3. System shows store status (pending/approved/rejected)
  4. User can click store to view details
- **Postcondition**: Store list displayed with status

#### UC21: Update Store Details
- **Actor**: Store Owner
- **Precondition**: Store exists and is owned by user
- **Main Flow**:
  1. User selects store from "My Stores"
  2. User clicks "Edit"
  3. User modifies store information (name, address, phone, email, description, logo)
  4. System validates changes
  5. System saves changes
  6. System shows success message
- **Postcondition**: Store details updated

### Administration Use Cases

#### UC22: View Dashboard
- **Actor**: Administrator
- **Precondition**: Admin is logged in
- **Main Flow**:
  1. Admin opens Admin Dashboard
  2. System displays statistics:
     - Total stores count
     - Pending approvals count
     - Active stores count
  3. System displays last updated timestamp
  4. Admin can refresh data manually
- **Postcondition**: Dashboard statistics displayed

#### UC23: Approve Stores
- **Actor**: Administrator
- **Precondition**: There are pending stores
- **Main Flow**:
  1. Admin navigates to "Approvals"
  2. System displays pending stores
  3. Admin selects store and reviews details
  4. Admin clicks "Approve"
  5. System updates store status to "approved"
  6. System sends notification to store owner
  7. System shows success message
- **Postcondition**: Store approved and store owner notified

#### UC24: Reject Stores
- **Actor**: Administrator
- **Precondition**: There are pending stores
- **Main Flow**:
  1. Admin navigates to "Approvals"
  2. System displays pending stores
  3. Admin selects store and reviews details
  4. Admin enters rejection reason (optional)
  5. Admin clicks "Reject"
  6. System updates store status to "rejected"
  7. System sends notification to store owner with reason
  8. System shows success message
- **Postcondition**: Store rejected and store owner notified

#### UC25: Approve Products
- **Actor**: Administrator
- **Precondition**: There are pending products
- **Main Flow**:
  1. Admin navigates to "Approvals"
  2. System displays pending products
  3. Admin selects product and reviews details
  4. Admin clicks "Approve"
  5. System updates product status to "approved"
  6. System sends notification to store owner
  7. System shows success message
- **Postcondition**: Product approved and store owner notified

#### UC26: Reject Products
- **Actor**: Administrator
- **Precondition**: There are pending products
- **Main Flow**:
  1. Admin navigates to "Approvals"
  2. System displays pending products
  3. Admin selects product and reviews details
  4. Admin enters rejection reason (optional)
  5. Admin clicks "Reject"
  6. System updates product status to "rejected"
  7. System sends notification to store owner with reason
  8. System shows success message
- **Postcondition**: Product rejected and store owner notified

#### UC27: View All Stores
- **Actor**: Administrator
- **Precondition**: Admin is logged in
- **Main Flow**:
  1. Admin navigates to "All Stores"
  2. System displays all stores (approved, pending, rejected)
  3. System shows store owner information
  4. Admin can filter by status
  5. Admin can search stores by name
- **Postcondition**: Complete store list displayed

#### UC28: View All Users
- **Actor**: Administrator
- **Precondition**: Admin is logged in
- **Main Flow**:
  1. Admin navigates to user management section
  2. System displays all registered users
  3. System shows user role and registration date
  4. Admin can filter by role (customer, store_owner, admin)
  5. Admin can search users by name/email
- **Postcondition**: User list displayed with filters

#### UC29: View Pending Approvals
- **Actor**: Administrator
- **Precondition**: Admin is logged in
- **Main Flow**:
  1. Admin navigates to "Approvals"
  2. System displays all pending stores and products
  3. System shows pending count
  4. Admin can sort by date or priority
  5. Admin can filter by type (store/product)
- **Postcondition**: Pending items list displayed

## System Constraints

- **Authentication**: All use cases except Login, Sign Up, Forgot Password require user to be authenticated
- **Role-Based Access**: Each actor can only perform use cases assigned to their role
- **Approval Required**: Store Owner's created stores and products require Admin approval before they become visible to customers
- **Uniqueness**: Product barcodes must be unique across the system
- **Location Data**: Store creation requires valid latitude and longitude coordinates

## Actor Interactions

| Actor | Actions | Receives | Notes |
|-------|---------|----------|-------|
| **Customer** | Scan, Search, View, Browse | Product/Store info, Maps | Main end-user |
| **Store Owner** | Create, Manage, Assign, Submit | Approval status, Notifications | Needs approval from Admin |
| **Administrator** | View, Approve, Reject, Manage | Statistics, Pending items | Controls system approvals |
| **System** | Validate, Store, Notify, Route | Requests, Data updates | Backend services |

---

# Activity Diagram - System Workflows

## 1. Customer Product Scanning Flow

```mermaid
graph TD
    A["👤 Customer Starts"] --> B["Open Scanner"]
    B --> C["Request Camera Permission"]
    C --> D{Permission<br/>Granted?}
    D -->|No| E["Show Permission Error"]
    E --> F["End"]
    D -->|Yes| G["Point Camera at Barcode"]
    G --> H{Barcode<br/>Found?}
    H -->|No| I["Show 'No Barcode' Error"]
    I --> G
    H -->|Yes| J["Scan Barcode"]
    J --> K["Send Barcode to Server"]
    K --> L{Product<br/>Exists?}
    L -->|No| M["Show 'Product Not Found'"]
    M --> N["Suggest Manual Search"]
    N --> F
    L -->|Yes| O["Fetch Product Details"]
    O --> P["Get Available Stores"]
    P --> Q["Display Product Details Screen"]
    Q --> R["Show Nearby Stores with Product"]
    R --> S{User<br/>Action}
    S -->|View Store| T["Display Store Details"]
    T --> U["Show Store Location Map"]
    U --> F
    S -->|View More| V["View More Products"]
    V --> B
    S -->|Back| F
    
    style A fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style F fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
    style Q fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style M fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
```

## 2. Store Owner Registration & Store Creation Flow

```mermaid
graph TD
    A["🏪 Store Owner Starts"] --> B["Open App"]
    B --> C{Logged In?}
    C -->|No| D["Navigate to Login"]
    D --> E["Enter Email & Password"]
    E --> F{Credentials<br/>Valid?}
    F -->|No| G["Show Error"]
    G --> E
    F -->|Yes| H["Verify Store Owner Role"]
    H --> I{Role is<br/>store_owner?}
    I -->|No| J["Show Access Denied"]
    J --> K["End"]
    I -->|Yes| L["Load Store Owner Dashboard"]
    C -->|Yes| L
    L --> M["Click 'Add Store'"]
    M --> N["Enter Store Details"]
    N --> O["Enter: Name, Address, Lat/Long, Phone, Email"]
    O --> P["Upload Store Logo"]
    P --> Q{All Fields<br/>Valid?}
    Q -->|No| R["Show Validation Errors"]
    R --> O
    Q -->|Yes| S["Submit Store Creation"]
    S --> T["System Validates Location Data"]
    T --> U{Location Valid?}
    U -->|No| V["Show 'Invalid Coordinates'"]
    V --> O
    U -->|Yes| W["Create Store in Database"]
    W --> X["Set status = 'pending'"]
    X --> Y["Send Notification to Admin"]
    Y --> Z["Show Success Message"]
    Z --> AA["Store Added to 'My Stores'"]
    AA --> AB{Want to Add<br/>Another?}
    AB -->|Yes| M
    AB -->|No| AC["View My Stores"]
    AC --> K
    
    style A fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style K fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
    style Z fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
    style W fill:#8B5CF6,stroke:#6D28D9,stroke-width:2px,color:#fff
```

## 3. Product Creation & Approval Flow

```mermaid
graph TD
    A["🏪 Store Owner Creates Product"] --> B["Click 'Add Product'"]
    B --> C["Enter Product Info"]
    C --> D["Barcode, Name, Description, Category, Image"]
    D --> E{Scan or<br/>Manual?}
    E -->|Scan| F["Open Scanner"]
    F --> G["Scan Product Barcode"]
    E -->|Manual| H["Enter Barcode"]
    G --> I{Barcode<br/>Valid?}
    H --> I
    I -->|No| J["Show Error"]
    J --> D
    I -->|Yes| K["Check Barcode Uniqueness"]
    K --> L{Barcode<br/>Exists?}
    L -->|Yes| M["Show 'Duplicate Barcode'"]
    M --> D
    L -->|No| N["Submit Product"]
    N --> O["Create Product in Database"]
    O --> P["Set status = 'pending'"]
    P --> Q["Set is_approved = false"]
    Q --> R["Send Admin Notification"]
    R --> S["Show Success Message"]
    S --> T["Navigate to Admin Dashboard"]
    T --> U["👨‍💼 Admin Receives Notification"]
    U --> V["Review Pending Products"]
    V --> W["Select Product to Approve"]
    W --> X["View Product Details"]
    X --> Y{Approve<br/>or Reject?}
    Y -->|Approve| Z["Set status = 'approved'"]
    Z --> AA["Set is_approved = true"]
    Y -->|Reject| AB["Set status = 'rejected'"]
    AB --> AC["Enter Rejection Reason"]
    AC --> AA
    AA --> AD["Send Notification to Store Owner"]
    AD --> AE["Product Visible to Customers"]
    AE --> AF["End"]
    
    style A fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style U fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style Z fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
    style AB fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
    style AE fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
```

## 4. Admin Approval Workflow

```mermaid
graph TD
    A["👨‍💼 Admin Opens Dashboard"] --> B["View Pending Items"]
    B --> C["System Fetches Pending Stores & Products"]
    C --> D["Display Dashboard Statistics"]
    D --> E["Show: Total Stores, Pending, Active"]
    E --> F["Navigate to Approvals"]
    F --> G{Item Type?}
    G -->|Store| H["View Pending Stores"]
    G -->|Product| I["View Pending Products"]
    H --> J["Select Store from List"]
    I --> J
    J --> K["Display Item Details"]
    K --> L["Review: Name, Description, Owner Info, Location"]
    L --> M{Decision}
    M -->|Approve| N["Update status = 'approved'"]
    M -->|Reject| O["Update status = 'rejected'"]
    M -->|Request Info| P["Send Message to Owner"]
    N --> Q["Send Approval Notification"]
    O --> R["Send Rejection Notification"]
    P --> S["Wait for Owner Response"]
    Q --> T["Item Becomes Public"]
    R --> U["Item Hidden from Customers"]
    S --> V["Review Updated Info"]
    V --> K
    T --> W["Customer Can Now See Item"]
    U --> X["Store Owner Can Resubmit"]
    W --> Y{More Pending<br/>Items?}
    X --> Y
    Y -->|Yes| Z["Select Next Item"]
    Z --> K
    Y -->|No| AA["All Approvals Complete"]
    AA --> AB["Display Completion Message"]
    AB --> AC["End"]
    
    style A fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style N fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style O fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
    style T fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
    style U fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
```

## 5. User Authentication Flow

```mermaid
graph TD
    A["User Opens App"] --> B{Logged In<br/>Before?}
    B -->|Yes| C["Check Cached Session"]
    C --> D{Session<br/>Valid?}
    D -->|No| E["Clear Cache"]
    D -->|Yes| F["Load User Profile"]
    E --> G["Show Login Screen"]
    B -->|No| G
    G --> H{User Action}
    H -->|New User| I["Click Sign Up"]
    H -->|Existing| J["Enter Email & Password"]
    I --> K["Enter: Name, Email, Password"]
    K --> L["Verify Email Not Registered"]
    L --> M{Email<br/>Available?}
    M -->|No| N["Show 'Email Exists'"]
    N --> K
    M -->|Yes| O["Validate Password Requirements"]
    O --> P{Strong<br/>Password?}
    P -->|No| Q["Show Password Requirements"]
    Q --> K
    P -->|Yes| R["Create User Account"]
    R --> S["Create Profile Record"]
    S --> T["Set role = 'customer'"]
    T --> U["Auto-login User"]
    J --> V["Validate Credentials"]
    V --> W{Credentials<br/>Correct?}
    W -->|No| X["Show Login Error"]
    X --> J
    W -->|Yes| Y["Fetch User Profile"]
    Y --> Z["Check User Role"]
    U --> Z
    Z --> AA{Role?}
    AA -->|admin| AB["Load Admin Dashboard"]
    AA -->|store_owner| AC["Load Store Owner Dashboard"]
    AA -->|customer| AD["Load Home Screen"]
    AB --> AE["End - Admin Session"]
    AC --> AF["End - Store Owner Session"]
    AD --> AG["End - Customer Session"]
    
    style A fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style R fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style U fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
    style AE fill:#8B5CF6,stroke:#6D28D9,stroke-width:2px,color:#fff
    style AF fill:#8B5CF6,stroke:#6D28D9,stroke-width:2px,color:#fff
    style AG fill:#8B5CF6,stroke:#6D28D9,stroke-width:2px,color:#fff
```

## 6. Search & Map Feature Flow

```mermaid
graph TD
    A["👤 Customer Opens Search/Maps"] --> B{Feature}
    B -->|Search| C["Enter Search Query"]
    B -->|Maps| D["Request Location Permission"]
    C --> E["Search Products by Name/Category"]
    D --> F{Permission<br/>Granted?}
    F -->|No| G["Show 'Location Required'"]
    G --> H["End"]
    F -->|Yes| I["Get Current Location"]
    I --> J["Fetch All Approved Stores Near Location"]
    E --> K["Send Query to Server"]
    K --> L["Filter by Name/Category"]
    L --> M["Display Search Results"]
    J --> N["Display Stores on Map"]
    M --> O{User Selects<br/>Result}
    N --> O
    O -->|Store| P["Show Store Details"]
    O -->|Product| Q["Show Product Details"]
    O -->|Nothing| R["Return to Search/Map"]
    P --> S["Show Store Info: Name, Address, Phone, Products"]
    Q --> T["Show Product: Name, Description, Category, Available Stores"]
    S --> U["Show Store on Map"]
    T --> V["Show Available Stores on Map"]
    U --> W{User Action}
    V --> W
    W -->|Get Directions| X["Open Maps App"]
    W -->|View Details| Y["Load Full Details Page"]
    W -->|Back| R
    X --> H
    Y --> H
    R --> A
    
    style A fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style M fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style N fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style P fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
    style Q fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
    style H fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
```

## 7. Profile Management Flow

```mermaid
graph TD
    A["👤 User Opens Profile"] --> B["Display Current Profile Info"]
    B --> C["Show: Name, Email, Avatar, Role"]
    C --> D{User Action}
    D -->|Edit Profile| E["Click 'Edit Profile'"]
    D -->|Change Avatar| F["Click 'Change Avatar'"]
    D -->|View Settings| G["Click Settings"]
    D -->|Logout| H["Click Logout"]
    E --> I["Enable Edit Mode"]
    I --> J["Edit: Name, Bio, Contact Info"]
    J --> K["Validate Changes"]
    K --> L{Valid?}
    L -->|No| M["Show Validation Errors"]
    M --> J
    L -->|Yes| N["Save Changes to Database"]
    N --> O["Update Local Profile"]
    O --> P["Show Success Message"]
    F --> Q["Open Image Picker"]
    Q --> R["Select/Take Photo"]
    R --> S["Crop & Resize Image"]
    S --> T["Upload to Storage"]
    T --> U["Update avatar_url in Profile"]
    U --> P
    G --> V["Show App Settings"]
    V --> W["Language, Notifications, Theme, Privacy"]
    W --> X["Make Settings Changes"]
    X --> Y["Save Settings"]
    Y --> P
    H --> Z["Clear Session Data"]
    Z --> AA["Clear Cached User"]
    AA --> AB["Redirect to Login"]
    AB --> AC["End"]
    P --> D
    
    style A fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style N fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style P fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
    style AB fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
    style AC fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
```

## 8. Complete System Flow (High Level)

```mermaid
graph TB
    Start["🚀 System Start"] --> Auth["User Authentication"]
    Auth --> AuthCheck{Authenticated?}
    AuthCheck -->|No| Login["Show Login/Signup"]
    AuthCheck -->|Yes| RoleCheck{"User Role?"}
    Login --> Register["Create Account"]
    Register --> RoleSelect["Select Role"]
    RoleSelect --> Customer["ROLE: Customer"]
    RoleSelect --> StoreOwner["ROLE: Store Owner"]
    RoleSelect --> Admin["ROLE: Admin"]
    
    Customer --> CustHome["👤 Home Screen"]
    CustHome --> CustAction{Action}
    CustAction -->|Scan| Scan["Scan Product"]
    CustAction -->|Search| Search["Search Products"]
    CustAction -->|Map| Map["View Map"]
    CustAction -->|Profile| Profile["View Profile"]
    Scan --> ViewProduct["View Product Details"]
    Search --> ViewProduct
    Map --> ViewStores["View Nearby Stores"]
    Profile --> EditProfile["Edit Profile"]
    ViewProduct --> StoreList["See Available Stores"]
    
    StoreOwner --> OwnerHome["🏪 Owner Dashboard"]
    OwnerHome --> OwnerAction{Action}
    OwnerAction -->|Create Store| CreateStore["Create Store"]
    OwnerAction -->|Add Product| AddProduct["Add Product"]
    OwnerAction -->|Manage| ManageStores["Manage Stores/Products"]
    CreateStore --> PendingApproval1["PENDING APPROVAL"]
    AddProduct --> PendingApproval2["PENDING APPROVAL"]
    
    Admin --> AdminHome["👨‍💼 Admin Dashboard"]
    AdminHome --> AdminAction{Action}
    AdminAction -->|View Stats| ViewStats["View Dashboard"]
    AdminAction -->|Review| ReviewPending["Review Pending Items"]
    ReviewPending --> Approve["Approve/Reject"]
    Approve --> NotifyOwner["Notify Store Owner"]
    
    PendingApproval1 --> AdminQueue["In Admin Queue"]
    PendingApproval2 --> AdminQueue
    AdminQueue --> NotifyOwner
    NotifyOwner --> PublishItem["Item Published"]
    PublishItem --> CustomerVisible["✅ Visible to Customers"]
    
    ViewStats --> Monitor["Monitor System"]
    Monitor --> AdminActions["Manage Users & Content"]
    
    ViewProduct --> EndCust["End Session"]
    ViewStores --> EndCust
    EditProfile --> EndCust
    ManageStores --> OwnerEnd["End Session"]
    AdminActions --> AdminEnd["End Session"]
    
    style Start fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style Customer fill:#4F46E5,stroke:#312E81,stroke-width:2px,color:#fff
    style StoreOwner fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style Admin fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style PendingApproval1 fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style PendingApproval2 fill:#F59E0B,stroke:#D97706,stroke-width:2px,color:#fff
    style Approve fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style PublishItem fill:#06B6D4,stroke:#0E7490,stroke-width:2px,color:#fff
    style CustomerVisible fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff
    style EndCust fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
    style OwnerEnd fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
    style AdminEnd fill:#EF4444,stroke:#7F1D1D,stroke-width:2px,color:#fff
```

## Activity Diagram Key Symbols

| Symbol | Meaning | Usage |
|--------|---------|-------|
| 🟦 Rectangle | Activity/Action | Processing step |
| 🔷 Diamond | Decision Point | Conditional branching |
| ⭕ Circle | Start/End | Flow termination |
| ➡️ Arrow | Flow | Direction of activity |
| 🟫 Parallel Bar | Fork/Join | Concurrent activities |

## Workflow Sequences Summary

| Workflow | Actors | Steps | Approval | Time |
|----------|--------|-------|----------|------|
| **Product Scanning** | Customer | 5-7 | No | Instant |
| **Store Registration** | Store Owner, Admin | 8-10 | Yes | Minutes to Hours |
| **Product Creation** | Store Owner, Admin | 8-12 | Yes | Minutes to Hours |
| **Admin Approval** | Admin, System | 5-8 | N/A | Varies |
| **Authentication** | User, System | 4-8 | No | Instant |
| **Search/Browse** | Customer, System | 4-6 | No | Instant |
| **Profile Management** | User, System | 3-5 | No | Instant |

## Decision Points in System

### Store Owner Flow Decisions
- ✅ Location data valid?
- ✅ Barcode unique?
- ✅ All required fields filled?
- ✅ Image format acceptable?

### Admin Flow Decisions
- ✅ Store/Product meets requirements?
- ✅ Information complete?
- ✅ No policy violations?
- ✅ Ready for approval?

### Customer Flow Decisions
- ✅ Barcode successfully scanned?
- ✅ Product found in system?
- ✅ Stores available nearby?
- ✅ Continue shopping?

## Error Handling Points

| Error | Trigger | Recovery |
|-------|---------|----------|
| Invalid Barcode | Scan fails | Retry scan or manual entry |
| Duplicate Barcode | Barcode exists | Use unique barcode |
| Invalid Coordinates | Location data wrong | Re-enter correct coordinates |
| Camera Permission Denied | Permission blocked | Show permission request dialog |
| Product Not Found | No matching barcode | Suggest manual search |
| Invalid Email | Email format wrong | Show validation error |
| Weak Password | Password too simple | Show requirements |
| Network Error | Server unreachable | Retry or show offline message |

```
