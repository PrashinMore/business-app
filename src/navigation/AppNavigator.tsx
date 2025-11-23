import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SaleDetailsScreen from '../screens/SaleDetailsScreen';
import LoadingScreen from '../screens/LoadingScreen';
import MainTabNavigator from './MainTabNavigator';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  ResetPassword: undefined;
  SaleDetails: { saleId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ headerShown: false }}
        initialRouteName={isAuthenticated ? 'MainTabs' : 'Login'}
      >
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
        />
        <Stack.Screen 
          name="SignUp" 
          component={SignUpScreen}
          options={{ headerShown: true, title: 'Sign Up' }}
        />
        <Stack.Screen 
          name="MainTabs" 
          component={MainTabNavigator}
        />
        <Stack.Screen 
          name="ResetPassword" 
          component={ResetPasswordScreen}
          options={{ headerShown: true, title: 'Reset Password' }}
        />
        <Stack.Screen 
          name="SaleDetails" 
          component={SaleDetailsScreen}
          options={{ headerShown: true, title: 'Sale Details' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

