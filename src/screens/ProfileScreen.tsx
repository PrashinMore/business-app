import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../navigation/AppNavigator';

type ProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { user, logout, refreshUser, pendingInvitesCount, refreshInvitesCount } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call logout which will clear all data and set user to null
              await logout();
              // Navigation will be handled automatically by AppNavigator
              // when isAuthenticated changes (user becomes null)
            } catch (error: any) {
              console.error('Logout error:', error);
              // Even if logout fails, ensure user state is cleared
              // This will trigger navigation
              try {
                await logout();
              } catch (retryError) {
                console.error('Retry logout error:', retryError);
              }
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshUser();
      await refreshInvitesCount();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to refresh user data');
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.nameText}>{user.name}</Text>
        <Text style={styles.emailText}>{user.email}</Text>
        <View style={[styles.roleBadge, user.role === 'admin' && styles.roleBadgeAdmin]}>
          <Text style={styles.roleText}>{user.role.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account Information</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name:</Text>
          <Text style={styles.infoValue}>{user.name}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email:</Text>
          <Text style={styles.infoValue}>{user.email}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Role:</Text>
          <View style={[styles.roleBadgeSmall, user.role === 'admin' && styles.roleBadgeAdminSmall]}>
            <Text style={styles.roleTextSmall}>{user.role.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Member Since:</Text>
          <Text style={styles.infoValue}>
            {new Date(user.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Management</Text>
        
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('ProductsList')}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="cube" size={20} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Products</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('Inventory')}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="stats-chart" size={20} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Inventory</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => navigation.navigate('TablesList')}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="grid" size={20} color="#333" style={styles.menuItemIcon} />
            <Text style={styles.menuItemText}>Tables</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>

        {user?.role === 'admin' && (
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('OrganizationsList')}
          >
            <View style={styles.menuItemContent}>
              <Ionicons name="business" size={20} color="#333" style={styles.menuItemIcon} />
              <Text style={styles.menuItemText}>Organizations</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            navigation.getParent()?.navigate('Invites');
          }}
        >
          <View style={styles.menuItemContent}>
            <Ionicons name="mail" size={20} color="#333" style={styles.menuItemIcon} />
            <View style={styles.menuItemWithBadge}>
              <Text style={styles.menuItemText}>Invites</Text>
              {pendingInvitesCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingInvitesCount}</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.supportButton}
        onPress={() => {
          navigation.getParent()?.navigate('Support');
        }}
      >
        <Ionicons name="chatbubble" size={18} color="#34C759" style={{ marginRight: 8 }} />
        <Text style={styles.supportButtonText}>Support</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resetPasswordButton}
        onPress={() => {
          navigation.getParent()?.navigate('ResetPassword');
        }}
      >
        <Text style={styles.resetPasswordButtonText}>Reset Password</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  nameText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roleBadgeAdmin: {
    backgroundColor: '#fff3e0',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  roleBadgeSmall: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeAdminSmall: {
    backgroundColor: '#fff3e0',
  },
  roleTextSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976d2',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  menuItemWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#ff3b30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  supportButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  supportButtonText: {
    color: '#34C759',
    fontSize: 16,
    fontWeight: '600',
  },
  resetPasswordButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  resetPasswordButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ff3b30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProfileScreen;

