import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { fonts } from '../styles/fonts';
import { getUserOrganizations } from '../services/organizations';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import SaleDetailsScreen from '../screens/SaleDetailsScreen';
import LoadingScreen from '../screens/LoadingScreen';
import ProductsListScreen from '../screens/ProductsListScreen';
import ProductFormScreen from '../screens/ProductFormScreen';
import InventoryScreen from '../screens/InventoryScreen';
import ExpensesListScreen from '../screens/ExpensesListScreen';
import ExpenseFormScreen from '../screens/ExpenseFormScreen';
import OrganizationsListScreen from '../screens/OrganizationsListScreen';
import OrganizationFormScreen from '../screens/OrganizationFormScreen';
import OrganizationDetailsScreen from '../screens/OrganizationDetailsScreen';
import UserSelectionScreen from '../screens/UserSelectionScreen';
import CategoriesListScreen from '../screens/CategoriesListScreen';
import CategoryFormScreen from '../screens/CategoryFormScreen';
import CategoryDetailsScreen from '../screens/CategoryDetailsScreen';
import InvitesScreen from '../screens/InvitesScreen';
import PrintBillScreen, { BillData } from '../screens/PrintBillScreen';
import TablesListScreen from '../screens/TablesListScreen';
import SupportScreen from '../screens/SupportScreen';
import MainTabNavigator from './MainTabNavigator';

export type RootStackParamList = {
  Login: undefined;
  SignUp: undefined;
  MainTabs: undefined;
  ResetPassword: undefined;
  Support: undefined;
  SaleDetails: { saleId: string };
  PrintBill: { billData: BillData };
  ProductsList: undefined;
  ProductForm: { productId?: string } | undefined;
  Inventory: undefined;
  ExpensesList: undefined;
  ExpenseForm: { expense?: any } | undefined;
  OrganizationsList: undefined;
  OrganizationForm: { organization?: any } | undefined;
  OrganizationDetails: { organization: any } | undefined;
  UserSelection: {
    organizationId: string;
    currentlyAssignedUserIds: string[];
    onUsersSelected: (selectedUserIds: string[]) => void;
  } | undefined;
  CategoriesList: undefined;
  CategoryForm: { category?: any } | undefined;
  CategoryDetails: { category: any } | undefined;
  Invites: undefined;
  TablesList: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const AppNavigator: React.FC = () => {
  const { isAuthenticated, loading, user } = useAuth();
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const prevAuthRef = useRef<boolean | null>(null);
  const [checkingOrganizations, setCheckingOrganizations] = useState(false);

  // Handle navigation when authentication state changes
  useEffect(() => {
    // Skip on initial load (when prevAuthRef is null)
    if (prevAuthRef.current === null) {
      prevAuthRef.current = isAuthenticated;
      return;
    }

    // Only navigate if authentication state actually changed and navigation is ready
    if (prevAuthRef.current !== isAuthenticated && !loading && navigationRef.current?.isReady()) {
      if (isAuthenticated && user) {
        // User just logged in/signed up - check if they have organizations
        setCheckingOrganizations(true);
        getUserOrganizations(user.id)
          .then((organizations) => {
            if (organizations.length === 0) {
              // New user with no organizations - redirect to OrganizationForm
              navigationRef.current?.reset({
                index: 0,
                routes: [{ name: 'OrganizationForm' }],
              });
            } else {
              // User has organizations - navigate to MainTabs
              navigationRef.current?.reset({
                index: 0,
                routes: [{ name: 'MainTabs' }],
              });
            }
          })
          .catch((error) => {
            console.error('Error checking organizations:', error);
            // On error, default to MainTabs
            navigationRef.current?.reset({
              index: 0,
              routes: [{ name: 'MainTabs' }],
            });
          })
          .finally(() => {
            setCheckingOrganizations(false);
          });
      } else {
        // User just logged out - navigate to Login
        navigationRef.current.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
      prevAuthRef.current = isAuthenticated;
    }
  }, [isAuthenticated, loading, user]);

  if (loading || checkingOrganizations) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          headerTitleStyle: {
            fontFamily: fonts.medium,
          },
        }}
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
          name="Support"
          component={SupportScreen}
          options={{ headerShown: true, title: 'Support' }}
        />
        <Stack.Screen 
          name="SaleDetails" 
          component={SaleDetailsScreen}
          options={{ headerShown: true, title: 'Sale Details' }}
        />
        <Stack.Screen 
          name="PrintBill" 
          component={PrintBillScreen}
          options={{ headerShown: true, title: 'Print Receipt' }}
        />
        <Stack.Screen 
          name="ProductsList" 
          component={ProductsListScreen}
          options={{ headerShown: true, title: 'Products' }}
        />
        <Stack.Screen 
          name="ProductForm" 
          component={ProductFormScreen}
          options={{ headerShown: true, title: 'Product' }}
        />
        <Stack.Screen
          name="Inventory"
          component={InventoryScreen}
          options={{ headerShown: true, title: 'Inventory' }}
        />
        <Stack.Screen
          name="ExpensesList"
          component={ExpensesListScreen}
          options={{ headerShown: true, title: 'Expenses' }}
        />
        <Stack.Screen
          name="ExpenseForm"
          component={ExpenseFormScreen}
          options={{ headerShown: true, title: 'Expense' }}
        />
        <Stack.Screen
          name="OrganizationsList"
          component={OrganizationsListScreen}
          options={{ headerShown: true, title: 'Organizations' }}
        />
        <Stack.Screen
          name="OrganizationForm"
          component={OrganizationFormScreen}
          options={{ headerShown: true, title: 'Organization' }}
        />
        <Stack.Screen
          name="OrganizationDetails"
          component={OrganizationDetailsScreen}
          options={{ headerShown: true, title: 'Organization Details' }}
        />
        <Stack.Screen
          name="UserSelection"
          component={UserSelectionScreen}
          options={{ headerShown: true, title: 'Select Users' }}
        />
        <Stack.Screen
          name="CategoriesList"
          component={CategoriesListScreen}
          options={{ headerShown: true, title: 'Categories' }}
        />
        <Stack.Screen
          name="CategoryForm"
          component={CategoryFormScreen}
          options={{ headerShown: true, title: 'Category' }}
        />
        <Stack.Screen
          name="CategoryDetails"
          component={CategoryDetailsScreen}
          options={{ headerShown: true, title: 'Category Details' }}
        />
        <Stack.Screen
          name="Invites"
          component={InvitesScreen}
          options={{ headerShown: true, title: 'Invites' }}
        />
        <Stack.Screen
          name="TablesList"
          component={TablesListScreen}
          options={{ headerShown: true, title: 'Tables' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

