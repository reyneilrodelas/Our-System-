//navigation.ts
import { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
    Startup: undefined;
    ResultScreen: { product: any };
    ProfileScreen: { refreshed?: number };
    Login: undefined;
    Signup: undefined;
    ResetPassword: undefined;
    MapScreen: { storeData: any[]; userLocation: any };
    Main: undefined;
    StoreOwner: NavigatorScreenParams<StoreOwnerStackParamList>;
    Admin: undefined;
    AdminSetup: undefined;
    EditProfile?: { onGoBack?: () => void }; // Allow optional onGoBack callback
    StoreProductDetailsScreen: undefined;
    AboutUs: undefined;
    ContactUs: undefined;
    ProfileMain: undefined;

} & StoreOwnerStackParamList & AdminStackParamList;

export type HomeStackParamList = {
    HomeMain: undefined;
    Scanner: undefined;
    AddProduct: undefined;
    AddStore: undefined;
    MyShop: undefined;
    ResultScreen: { product: any };
    MapScreen: { storeData: any[]; userLocation: any; focusStoreId?: string };
    StoreOwner: undefined;
    StoreProducts: { storeId: string };
    CreateStore: undefined;
    StoreDetails: { storeId: string };
    StoreProductDetailsScreen: { storeId: string };
    ProfileMain: undefined;
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

export type AdminStackParamList = {
    AdminDashboard: undefined;
    Approvals: undefined;
    AdminSetup: undefined;
    AllStores: undefined;

};