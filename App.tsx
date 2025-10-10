// App.tsx

import React, { useEffect } from 'react';
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { Linking } from 'react-native';
import { RootStackParamList, HomeStackParamList, TabParamList, StoreOwnerStackParamList, AdminStackParamList } from './src/types/navigation';

// Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';
import HomeScreen from './src/screens/shared/HomeScreen';
import ScannerScreen from './src/screens/shared/scanner';
import SearchScreen from './src/screens/shared/SearchScreen';
import ProfileScreen from './src/screens/shared/ProfileScreen';
import ProfileEditScreen from './src/screens/shared/ProfileEditScreen';
import StartupScreen from './src/screens/auth/Startup';
import AddProductScreen from './src/screens/storeowner/AddProductScreen';
import ResultScreen from './src/screens/components/ResultScreen';
import MapScreen from './src/screens/components/Maps';
import MyShopScreen from './src/screens/storeowner/MyShopScreen';
import AssignProductsScreen from './src/screens/storeowner/AssignProductsScreen';
import AdminApprovalScreen from './src/screens/admin/AdminApprovalScreen';
import AdminDashboard from './src/screens/admin/AdminDashboard';
import CreateStoreScreen from './src/screens/storeowner/CreateStroreScreen';
import MyStoresScreen from './src/screens/storeowner/MyStoresScreen';
import StoreDetailsScreen from './src/screens/storeowner/StoreDetailsScreen';
import AllStoresScreen from './src/screens/admin/AllStoreScreen';
import ManageProductScreen from './src/screens/storeowner/ManageProductScreen';
import { View, TouchableOpacity } from 'react-native';
import StoreProductDetailsScreen from './src/screens/components/StoreProductDetailsScreen';
import AboutUsScreen from './src/screens/shared/AboutUsScreen';
import ContactUsScreen from './src/screens/shared/ContactUsScreen';

// Create navigators
const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const StoreOwnerStack = createNativeStackNavigator<StoreOwnerStackParamList>();
const AdminStack = createNativeStackNavigator<AdminStackParamList>();

// Store Owner Stack
function StoreOwnerStackScreen() {
  return (
    <StoreOwnerStack.Navigator screenOptions={{ headerShown: false }}>
      <StoreOwnerStack.Screen name="MyShop" component={MyShopScreen} />
      <StoreOwnerStack.Screen name="AddProduct" component={AddProductScreen} />
      <StoreOwnerStack.Screen name="CreateStore" component={CreateStoreScreen} />
      <StoreOwnerStack.Screen name="MyStores" component={MyStoresScreen} />
      <StoreOwnerStack.Screen name="StoreDetails" component={StoreDetailsScreen} />
      <StoreOwnerStack.Screen name="AssignProducts" component={AssignProductsScreen} />
      <StoreOwnerStack.Screen name="ManageProduct" component={ManageProductScreen} />
    </StoreOwnerStack.Navigator>
  );
}

// Home Stack
function HomeStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="HomeMain" component={HomeScreen} />
      <HomeStack.Screen name="Scanner" component={ScannerScreen} />
      <HomeStack.Screen name="ResultScreen" component={ResultScreen} />
      <HomeStack.Screen name="StoreOwner" component={StoreOwnerStackScreen} />
      <HomeStack.Screen name="MapScreen" component={MapScreen} />
      <HomeStack.Screen name="StoreDetails" component={StoreDetailsScreen} />
      <HomeStack.Screen name="StoreProductDetailsScreen" component={StoreProductDetailsScreen} />
    </HomeStack.Navigator>
  );
}

// Profile Stack - FIXED: Remove AboutUs and ContactUs from here
function ProfileStackScreen() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="ProfileMain" component={ProfileScreen} />
      {/* Remove AboutUs and ContactUs - they should only be in Root Stack */}
    </HomeStack.Navigator>
  );
}

// Tab Navigator - FIXED VERSION
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const routeName = getFocusedRouteNameFromRoute(route) ?? '';
        const hideOnScreens = [
          'Scanner',
          'StoreOwner',
          'ResultScreen',
          'MapScreen',
          'StoreProductDetailsScreen',
          'StoreDetails',
          'AboutUs', // Hide tab bar for AboutUs
          'ContactUs' // Hide tab bar for ContactUs
        ];

        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#ffffff',
            height: 70,
            borderTopWidth: 0,
            paddingBottom: 10,
            paddingTop: 10,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.1,
            shadowRadius: 12,
            elevation: 10,
            position: 'absolute',
            display: hideOnScreens.includes(routeName) ? 'none' : 'flex',
          },
          tabBarActiveTintColor: '#1f3c88',
          tabBarInactiveTintColor: '#8E8E93',
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            marginTop: 4,
          },
          tabBarIcon: ({ color, size, focused }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Search') {
              iconName = focused ? 'search' : 'search-outline';
            } else {
              iconName = focused ? 'person' : 'person-outline';
            }

            return (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: focused ? '#1f3c88' : 'transparent',
                shadowColor: focused ? '#1f3c88' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: focused ? 0.3 : 0,
                shadowRadius: 4,
                elevation: focused ? 4 : 0,
              }}>
                <Ionicons
                  name={iconName}
                  size={24}
                  color={focused ? '#ffffff' : color}
                />
              </View>
            );
          },
          tabBarButton: (props) => (
            <TouchableOpacity
              onPress={props.onPress}
              onLongPress={props.onLongPress ?? undefined}
              style={props.style}
              activeOpacity={0.7}
            >
              {props.children}
            </TouchableOpacity>
          ),
        };
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackScreen}
        options={{
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

// Root Navigator
function RootNavigator() {
  const { session, userRole } = useAuth();

  return (
    <RootStack.Navigator
      initialRouteName="Startup"
      screenOptions={{ headerShown: false }}
    >
      {/* ALWAYS include Startup screen first */}
      <RootStack.Screen name="Startup" component={StartupScreen} />

      {/* Auth screens */}
      <RootStack.Screen name="Login" component={LoginScreen} />
      <RootStack.Screen name="Signup" component={SignupScreen} />
      <RootStack.Screen name="ResetPassword" component={ResetPasswordScreen} />

      {/* Main app screens */}
      <RootStack.Screen name="Main" component={TabNavigator} />
      <RootStack.Screen name="EditProfile" component={ProfileEditScreen} />
      <RootStack.Screen name="StoreOwner" component={StoreOwnerStackScreen} />
      <RootStack.Screen name="ResultScreen" component={ResultScreen} />
      <RootStack.Screen name="MapScreen" component={MapScreen} />
      <RootStack.Screen name="AdminDashboard" component={AdminDashboard} />
      <RootStack.Screen name="Approvals" component={AdminApprovalScreen} />
      <RootStack.Screen name="AllStores" component={AllStoresScreen} />
      <RootStack.Screen name="StoreProductDetailsScreen" component={StoreProductDetailsScreen} />

      {/* AboutUs and ContactUs should ONLY be here (outside tabs) */}
      <RootStack.Screen name="AboutUs" component={AboutUsScreen} />
      <RootStack.Screen name="ContactUs" component={ContactUsScreen} />
    </RootStack.Navigator>
  );
}

function AdminStackScreen() {
  return (
    <AdminStack.Navigator screenOptions={{ headerShown: false }}>
      <AdminStack.Screen name="AdminDashboard" component={AdminDashboard} />
      <AdminStack.Screen name="Approvals" component={AdminApprovalScreen} />
    </AdminStack.Navigator>
  );
}

// App Entry Point
export default function App() {
  const linking = {
    prefixes: ['scanwizard://'],
    config: {
      screens: {
        ResetPassword: 'reset-password',
        Login: 'login',
        // Add other deep link routes as needed
      },
    },
  };

  useEffect(() => {
    // Handle deep links when app is not running (cold start)
    const getInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('Initial URL:', url);
      }
    };

    getInitialURL();

    // Handle deep links when app is running
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      console.log('Received URL:', url);
    });

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer linking={linking}>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}