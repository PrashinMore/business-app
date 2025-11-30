import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMyInvites, respondToInviteById } from '../services/invites';
import { OrganizationInvite } from '../types/invites';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

type InvitesScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Invites'>;

const InvitesScreen: React.FC = () => {
  const navigation = useNavigation<InvitesScreenNavigationProp>();
  const { refreshUser, refreshInvitesCount } = useAuth();
  const [invites, setInvites] = useState<OrganizationInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);

  useEffect(() => {
    loadInvites();
  }, []);

  // Refresh invites count in context when invites change
  useEffect(() => {
    refreshInvitesCount();
  }, [invites.length, refreshInvitesCount]);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const pendingInvites = await getMyInvites();
      setInvites(pendingInvites);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load invites');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInvites();
    setRefreshing(false);
  };

  const handleRespond = async (inviteId: string, action: 'accept' | 'decline') => {
    try {
      setRespondingTo(inviteId);
      await respondToInviteById(inviteId, action);
      
      // Remove invite from list
      setInvites(prev => prev.filter(inv => inv.id !== inviteId));
      
      // Refresh user data to get updated organizations
      if (action === 'accept') {
        await refreshUser();
      }
      
      // Update invites count in context
      await refreshInvitesCount();
      
      Alert.alert(
        'Success',
        action === 'accept'
          ? 'You have been added to the organization'
          : 'Invite declined'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || `Failed to ${action} invite`);
    } finally {
      setRespondingTo(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const renderInviteItem = ({ item }: { item: OrganizationInvite }) => {
    const expired = isExpired(item.expiresAt);
    const isResponding = respondingTo === item.id;

    return (
      <View style={[styles.inviteCard, expired && styles.inviteCardExpired]}>
        <View style={styles.inviteHeader}>
          <View style={styles.inviteInfo}>
            <Text style={styles.organizationName}>
              {item.organization?.name || 'Unknown Organization'}
            </Text>
            <Text style={styles.inviteEmail}>Invited to: {item.email}</Text>
            <Text style={styles.inviteDate}>
              Expires: {formatDate(item.expiresAt)}
            </Text>
            {expired && (
              <Text style={styles.expiredText}>⚠️ This invite has expired</Text>
            )}
          </View>
        </View>

        {!expired && (
          <View style={styles.inviteActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.declineButton]}
              onPress={() => handleRespond(item.id, 'decline')}
              disabled={isResponding}
            >
              {isResponding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Decline</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleRespond(item.id, 'accept')}
              disabled={isResponding}
            >
              {isResponding ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Accept</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading invites...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Organization Invites</Text>
        <Text style={styles.headerSubtitle}>
          {invites.length} pending invite{invites.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {invites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📬</Text>
          <Text style={styles.emptyText}>No pending invites</Text>
          <Text style={styles.emptySubtext}>
            You'll see organization invitations here when admins invite you
          </Text>
        </View>
      ) : (
        <FlatList
          data={invites}
          keyExtractor={item => item.id}
          renderItem={renderInviteItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  listContent: {
    padding: 16,
  },
  inviteCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteCardExpired: {
    opacity: 0.6,
    backgroundColor: '#f9f9f9',
  },
  inviteHeader: {
    marginBottom: 12,
  },
  inviteInfo: {
    gap: 4,
  },
  organizationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  inviteEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  inviteDate: {
    fontSize: 12,
    color: '#999',
  },
  expiredText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
    fontWeight: '600',
  },
  inviteActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#ff3b30',
  },
  acceptButton: {
    backgroundColor: '#34c759',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default InvitesScreen;

