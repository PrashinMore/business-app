import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../styles/fonts';
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import CartScreen from '../screens/CartScreen';
import SalesListScreen from '../screens/SalesListScreen';
import InventoryScreen from '../screens/InventoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ExpensesListScreen from '../screens/ExpensesListScreen';
import { useCart } from '../context/CartContext';

export type MainTabParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  Sales: undefined;
  Inventory: undefined;
  Expenses: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const { getCartItemCount } = useCart();
  const cartItemCount = getCartItemCount();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerTitleStyle: {
          fontFamily: fonts.medium,
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60 + Math.max(insets.bottom, 0),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
          borderTopWidth: 1,
          borderTopColor: '#e0e0e0',
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          fontFamily: fonts.medium,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart" size={size} color={color} />
          ),
          tabBarBadge: cartItemCount > 0 ? cartItemCount : undefined,
        }}
      />
      <Tab.Screen
        name="Sales"
        component={SalesListScreen}
        options={{
          title: 'Sales',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="stats-chart" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Inventory"
        component={InventoryScreen}
        options={{
          title: 'Inventory',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Expenses"
        component={ExpensesListScreen}
        options={{
          title: 'Expenses',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="wallet" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;

