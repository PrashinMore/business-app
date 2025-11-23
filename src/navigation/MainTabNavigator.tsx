import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import MenuScreen from '../screens/MenuScreen';
import CartScreen from '../screens/CartScreen';
import SalesListScreen from '../screens/SalesListScreen';
import ProfileScreen from '../screens/ProfileScreen';
import { useCart } from '../context/CartContext';

export type MainTabParamList = {
  Home: undefined;
  Menu: undefined;
  Cart: undefined;
  Sales: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabNavigator: React.FC = () => {
  const { getCartItemCount } = useCart();
  const cartItemCount = getCartItemCount();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Menu"
        component={MenuScreen}
        options={{
          title: 'Menu',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>📋</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: 'Cart',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>🛒</Text>
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
            <Text style={{ fontSize: size, color }}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Text style={{ fontSize: size, color }}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;

