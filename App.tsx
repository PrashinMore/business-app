import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { SyncProvider } from './src/context/SyncContext';
import { DataProvider } from './src/context/DataContext';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DataProvider>
        <CartProvider>
          <SyncProvider>
            <StatusBar style="auto" />
            <AppNavigator />
          </SyncProvider>
        </CartProvider>
        </DataProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
