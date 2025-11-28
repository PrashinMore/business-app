import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { useOrganizations } from '../hooks/useOrganizations';
import { Organization, User } from '../types/organizations';
import { RootStackParamList } from '../navigation/AppNavigator';

type OrganizationDetailsScreenRouteProp = RouteProp<RootStackParamList, 'OrganizationDetails'>;
type OrganizationDetailsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OrganizationDetails'>;

const OrganizationDetailsScreen: React.FC = () => {
  const navigation = useNavigation<OrganizationDetailsScreenNavigationProp>();
  const route = useRoute<OrganizationDetailsScreenRouteProp>();
  const { user } = useAuth();
  const organization = route.params?.organization;

  const [refreshing, setRefreshing] = useState(false);

  const {
    organizationDetails,
    detailsLoading,
    detailsError,
    loadOrganizationDetails,
    removeUser,
    assignUser,
  } = useOrganizations();

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert(
        'Access Denied',
        'You need admin privileges to access this section.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
      return;
    }

    if (organization?.id) {
      loadOrganizationDetails(organization.id);
    }
  }, [organization?.id, isAdmin]);

  const handleRefresh = async () => {
    if (organization?.id) {
      setRefreshing(true);
      await loadOrganizationDetails(organization.id);
      setRefreshing(false);
    }
  };

  const handleRemoveUser = (userToRemove: User) => {
    if (!organization) return;

    Alert.alert(
      'Remove User',
      `Are you sure you want to remove ${userToRemove.name} from ${organization.name}? The user will remain in the system but won't be assigned to this organization.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeUser(organization.id, userToRemove.id);
              Alert.alert('Success', 'User removed from organization successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove user from organization');
            }
          },
        },
      ]
    );
  };

  const handleUsersSelected = async (selectedUserIds: string[]) => {
    if (!organization || selectedUserIds.length === 0) return;

    try {
      // Assign each selected user to the organization
      for (const userId of selectedUserIds) {
        await assignUser(organization.id, userId);
      }

      Alert.alert(
        'Success',
        `Successfully assigned ${selectedUserIds.length} user${selectedUserIds.length !== 1 ? 's' : ''} to ${organization.name}`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to assign some users to organization');
    }
  };

  const navigateToUserSelection = () => {
    if (!organization) return;

    const currentlyAssignedUserIds = displayOrganization?.users?.map(u => u.id) || [];

    navigation.navigate('UserSelection', {
      organizationId: organization.id,
      currentlyAssignedUserIds,
      onUsersSelected: handleUsersSelected,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.userRoleBadge}>
          <Text style={styles.userRoleText}>{item.role.toUpperCase()}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveUser(item)}
      >
        <Text style={styles.removeButtonText}>Remove</Text>
      </TouchableOpacity>
    </View>
  );

  // Don't render anything if user is not admin
  if (!isAdmin) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.accessDeniedText}>Access Denied</Text>
        <Text style={styles.accessDeniedSubtext}>Admin privileges required</Text>
      </View>
    );
  }

  // Use organizationDetails if available, otherwise fall back to route param
  const displayOrganization = organizationDetails || organization;

  if (!displayOrganization) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Organization not found</Text>
      </View>
    );
  }

  if (detailsLoading && !displayOrganization.users) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading organization details...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container} 
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Organization Header */}
      <View style={styles.header}>
        <Text style={styles.organizationName}>{displayOrganization.name}</Text>
        {displayOrganization.description && (
          <Text style={styles.organizationDescription}>{displayOrganization.description}</Text>
        )}
        <Text style={styles.userCount}>
          {displayOrganization.users?.length || 0} users assigned
        </Text>
      </View>

      {/* Organization Info */}
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Organization Details</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Created:</Text>
          <Text style={styles.infoValue}>{formatDate(displayOrganization.createdAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Last Updated:</Text>
          <Text style={styles.infoValue}>{formatDate(displayOrganization.updatedAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Organization ID:</Text>
          <Text style={styles.infoValue}>{displayOrganization.id}</Text>
        </View>
      </View>

      {/* Error Display */}
      {detailsError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{detailsError}</Text>
        </View>
      )}

      {/* Users Section */}
      <View style={styles.usersSection}>
        <View style={styles.usersHeader}>
          <Text style={styles.usersTitle}>Assigned Users</Text>
          <TouchableOpacity
            style={styles.addUserButton}
            onPress={navigateToUserSelection}
          >
            <Text style={styles.addUserButtonText}>+ Add User</Text>
          </TouchableOpacity>
        </View>

        {displayOrganization.users && displayOrganization.users.length > 0 ? (
          <FlatList
            data={displayOrganization.users}
            keyExtractor={(item) => item.id}
            renderItem={renderUserItem}
            scrollEnabled={false}
            contentContainerStyle={styles.usersList}
          />
        ) : (
          <View style={styles.noUsersContainer}>
            <Text style={styles.noUsersText}>No users assigned to this organization</Text>
            <TouchableOpacity
              style={styles.assignFirstButton}
              onPress={navigateToUserSelection}
            >
              <Text style={styles.assignFirstButtonText}>Assign First User</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('OrganizationForm', { organization: displayOrganization })}
        >
          <Text style={styles.editButtonText}>Edit Organization</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  accessDeniedText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  accessDeniedSubtext: {
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  organizationName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
  },
  organizationDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  userCount: {
    fontSize: 14,
    color: '#007AFF',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  infoSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  usersSection: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  usersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  usersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addUserButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addUserButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  usersList: {
    padding: 16,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginBottom: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  userRoleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e8',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  userRoleText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  removeButton: {
    backgroundColor: '#d32f2f',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  removeButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  noUsersContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noUsersText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  assignFirstButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  assignFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsSection: {
    padding: 16,
  },
  editButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OrganizationDetailsScreen;
