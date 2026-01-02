import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Customer, CustomerVisit, CustomerNote, CustomerFeedback } from '../types/crm';
import {
  getCustomerDetails,
  getCustomerVisits,
  getCustomerNotes,
  getCustomerFeedback,
  createCustomerNote,
  createCustomerFeedback,
  getLoyaltyTransactionHistory,
  adjustLoyaltyPoints,
  getRewards,
  redeemReward,
} from '../services/crm';
import { RootStackParamList } from '../navigation/AppNavigator';
import { fonts } from '../styles/fonts';

type CustomerProfileScreenRouteProp = RouteProp<RootStackParamList, 'CustomerProfile'>;
type CustomerProfileScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const CustomerProfileScreen: React.FC = () => {
  const route = useRoute<CustomerProfileScreenRouteProp>();
  const navigation = useNavigation<CustomerProfileScreenNavigationProp>();
  const { customerId } = route.params;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [visits, setVisits] = useState<CustomerVisit[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [feedback, setFeedback] = useState<CustomerFeedback[]>([]);
  const [loyaltyTransactions, setLoyaltyTransactions] = useState<Array<{
    id: string;
    type: 'EARNED' | 'REDEEMED' | 'ADJUSTED';
    points: number;
    billAmount?: number;
    discountAmount?: number;
    pointsBefore: number;
    pointsAfter: number;
    createdAt: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visits' | 'notes' | 'feedback' | 'loyalty'>('visits');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [showAdjustPointsModal, setShowAdjustPointsModal] = useState(false);
  const [adjustPoints, setAdjustPoints] = useState({ points: 0, description: '' });
  const [adjustingPoints, setAdjustingPoints] = useState(false);
  const [showRedeemRewardModal, setShowRedeemRewardModal] = useState(false);
  const [rewards, setRewards] = useState<Array<{
    id: string;
    name: string;
    type: string;
    pointsRequired: number;
    discountPercentage?: number;
    discountAmount?: number;
    freeItemName?: string;
    cashbackAmount?: number;
  }>>([]);
  const [redeemingReward, setRedeemingReward] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setLoading(true);
      const customerData = await getCustomerDetails(customerId);
      const [visitsData, notesData, feedbackData, transactionsData, rewardsData] = await Promise.all([
        getCustomerVisits(customerId),
        getCustomerNotes(customerId),
        getCustomerFeedback(customerId),
        customerData?.loyaltyAccount ? getLoyaltyTransactionHistory(customerId).catch(() => ({ transactions: [], total: 0 })) : Promise.resolve({ transactions: [], total: 0 }),
        getRewards(true).catch(() => []),
      ]);

      setCustomer(customerData);
      setVisits(visitsData);
      setNotes(notesData);
      setFeedback(feedbackData);
      setLoyaltyTransactions(transactionsData.transactions || []);
      setRewards(rewardsData);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load customer data');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      Alert.alert('Error', 'Please enter a note');
      return;
    }

    try {
      setAddingNote(true);
      const note = await createCustomerNote(customerId, { note: newNote.trim() });
      setNotes([note, ...notes]);
      setNewNote('');
      setShowNoteModal(false);
      Alert.alert('Success', 'Note added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add note');
    } finally {
      setAddingNote(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading customer profile...</Text>
      </View>
    );
  }

  if (!customer) {
    return (
      <View style={styles.container}>
        <Text>Customer not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Customer Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#007AFF" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.customerName}>{customer.name}</Text>
            <Text style={styles.customerPhone}>{customer.phone}</Text>
            {customer.email && <Text style={styles.customerEmail}>{customer.email}</Text>}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{customer.totalVisits}</Text>
            <Text style={styles.statLabel}>Visits</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(customer.totalSpend)}</Text>
            <Text style={styles.statLabel}>Total Spent</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{formatCurrency(customer.avgOrderValue)}</Text>
            <Text style={styles.statLabel}>Avg Order</Text>
          </View>
        </View>

        {/* Loyalty Account */}
        {customer.loyaltyAccount && (
          <View style={styles.loyaltyCard}>
            <Ionicons name="star" size={24} color="#FFD700" />
            <View style={styles.loyaltyInfo}>
              <Text style={styles.loyaltyTier}>{customer.loyaltyAccount.tier}</Text>
              <Text style={styles.loyaltyPoints}>{customer.loyaltyAccount.points} points</Text>
            </View>
            <View style={styles.loyaltyActions}>
              <TouchableOpacity
                style={styles.loyaltyActionButton}
                onPress={() => {
                  setAdjustPoints({ points: 0, description: '' });
                  setShowAdjustPointsModal(true);
                }}
              >
                <Text style={styles.loyaltyActionButtonText}>Adjust</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.loyaltyActionButton, styles.loyaltyActionButtonPrimary]}
                onPress={() => setShowRedeemRewardModal(true)}
              >
                <Text style={[styles.loyaltyActionButtonText, styles.loyaltyActionButtonTextPrimary]}>Redeem</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tags */}
        {customer.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {customer.tags.map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'visits' && styles.tabActive]}
          onPress={() => setActiveTab('visits')}
        >
          <Text style={[styles.tabText, activeTab === 'visits' && styles.tabTextActive]}>
            Visits ({visits.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'notes' && styles.tabActive]}
          onPress={() => setActiveTab('notes')}
        >
          <Text style={[styles.tabText, activeTab === 'notes' && styles.tabTextActive]}>
            Notes ({notes.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'feedback' && styles.tabActive]}
          onPress={() => setActiveTab('feedback')}
        >
          <Text style={[styles.tabText, activeTab === 'feedback' && styles.tabTextActive]}>
            Feedback ({feedback.length})
          </Text>
        </TouchableOpacity>
        {customer?.loyaltyAccount && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'loyalty' && styles.tabActive]}
            onPress={() => setActiveTab('loyalty')}
          >
            <Text style={[styles.tabText, activeTab === 'loyalty' && styles.tabTextActive]}>
              Loyalty
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'visits' && (
          <View>
            {visits.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No visits recorded</Text>
              </View>
            ) : (
              visits.map((visit) => (
                <View key={visit.id} style={styles.visitCard}>
                  <View style={styles.visitHeader}>
                    <Text style={styles.visitType}>{visit.visitType.replace('_', ' ')}</Text>
                    <Text style={styles.visitDate}>{formatDate(visit.visitedAt)}</Text>
                  </View>
                  <Text style={styles.visitAmount}>{formatCurrency(visit.billAmount)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'notes' && (
          <View>
            <TouchableOpacity
              style={styles.addNoteButton}
              onPress={() => setShowNoteModal(true)}
            >
              <Ionicons name="add-circle" size={20} color="#007AFF" />
              <Text style={styles.addNoteButtonText}>Add Note</Text>
            </TouchableOpacity>

            {notes.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No notes yet</Text>
              </View>
            ) : (
              notes.map((note) => (
                <View key={note.id} style={styles.noteCard}>
                  <Text style={styles.noteText}>{note.note}</Text>
                  <View style={styles.noteFooter}>
                    {note.createdBy && (
                      <Text style={styles.noteAuthor}>{note.createdBy.name}</Text>
                    )}
                    <Text style={styles.noteDate}>{formatDate(note.createdAt)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'feedback' && (
          <View>
            {feedback.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="star-outline" size={48} color="#ccc" />
                <Text style={styles.emptyStateText}>No feedback yet</Text>
              </View>
            ) : (
              feedback.map((item) => (
                <View key={item.id} style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.ratingContainer}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Ionicons
                          key={star}
                          name={star <= item.rating ? 'star' : 'star-outline'}
                          size={20}
                          color="#FFD700"
                        />
                      ))}
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        item.status === 'RESOLVED' && styles.statusBadgeResolved,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          item.status === 'RESOLVED' && styles.statusTextResolved,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                  {item.comment && <Text style={styles.feedbackComment}>{item.comment}</Text>}
                  <Text style={styles.feedbackDate}>{formatDate(item.createdAt)}</Text>
                </View>
              ))
            )}
          </View>
        )}

        {activeTab === 'loyalty' && (
          <View style={styles.tabContent}>
            {!customer?.loyaltyAccount ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No loyalty account</Text>
              </View>
            ) : loyaltyTransactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No transactions yet</Text>
              </View>
            ) : (
              <>
                <View style={styles.loyaltyBalanceCard}>
                  <Text style={styles.loyaltyBalanceLabel}>Current Balance</Text>
                  <Text style={styles.loyaltyBalanceValue}>
                    {customer.loyaltyAccount.points} points
                  </Text>
                  <Text style={styles.loyaltyTierText}>
                    Tier: {customer.loyaltyAccount.tier}
                  </Text>
                </View>
                <Text style={styles.sectionTitle}>Transaction History</Text>
                {loyaltyTransactions.map((transaction) => (
                  <View key={transaction.id} style={styles.transactionCard}>
                    <View style={styles.transactionHeader}>
                      <View
                        style={[
                          styles.transactionTypeBadge,
                          transaction.type === 'EARNED' && styles.transactionTypeEarned,
                          transaction.type === 'REDEEMED' && styles.transactionTypeRedeemed,
                        ]}
                      >
                        <Text style={styles.transactionTypeText}>{transaction.type}</Text>
                      </View>
                      <Text
                        style={[
                          styles.transactionPoints,
                          transaction.points > 0 ? styles.transactionPointsPositive : styles.transactionPointsNegative,
                        ]}
                      >
                        {transaction.points > 0 ? '+' : ''}{transaction.points} points
                      </Text>
                    </View>
                    {transaction.type === 'EARNED' && transaction.billAmount && (
                      <Text style={styles.transactionDetail}>
                        From purchase of ₹{Number(transaction.billAmount).toFixed(2)}
                      </Text>
                    )}
                    {transaction.type === 'REDEEMED' && transaction.discountAmount && (
                      <Text style={styles.transactionDetail}>
                        Discount applied: ₹{Number(transaction.discountAmount).toFixed(2)}
                      </Text>
                    )}
                    <Text style={styles.transactionBalance}>
                      Balance: {transaction.pointsBefore} → {transaction.pointsAfter} points
                    </Text>
                    <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                  </View>
                ))}
              </>
            )}
          </View>
        )}
      </View>

      {/* Adjust Points Modal */}
      <Modal
        visible={showAdjustPointsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAdjustPointsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Adjust Points</Text>
              <TouchableOpacity
                onPress={() => setShowAdjustPointsModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Enter positive number to add points, negative to deduct
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Points (e.g., 50 or -20)"
              value={adjustPoints.points !== 0 ? adjustPoints.points.toString() : ''}
              onChangeText={(text) => setAdjustPoints({ ...adjustPoints, points: parseInt(text) || 0 })}
              keyboardType="numeric"
            />
            <TextInput
              style={styles.noteInput}
              placeholder="Description (optional)"
              value={adjustPoints.description}
              onChangeText={(text) => setAdjustPoints({ ...adjustPoints, description: text })}
              multiline
              numberOfLines={2}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowAdjustPointsModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={async () => {
                  if (adjustPoints.points === 0) {
                    Alert.alert('Error', 'Please enter a non-zero point value');
                    return;
                  }
                  try {
                    setAdjustingPoints(true);
                    await adjustLoyaltyPoints(
                      customerId,
                      adjustPoints.points,
                      adjustPoints.description || undefined,
                    );
                    setShowAdjustPointsModal(false);
                    setAdjustPoints({ points: 0, description: '' });
                    loadCustomerData();
                    Alert.alert('Success', 'Points adjusted successfully');
                  } catch (error: any) {
                    Alert.alert('Error', error.message || 'Failed to adjust points');
                  } finally {
                    setAdjustingPoints(false);
                  }
                }}
                disabled={adjustingPoints}
              >
                <Text style={styles.modalButtonTextSave}>
                  {adjustingPoints ? 'Adjusting...' : 'Adjust Points'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Redeem Reward Modal */}
      <Modal
        visible={showRedeemRewardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRedeemRewardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Redeem Reward</Text>
              <TouchableOpacity
                onPress={() => setShowRedeemRewardModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Available Points: {customer?.loyaltyAccount?.points || 0}
            </Text>
            <ScrollView style={styles.rewardsList}>
              {rewards.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No active rewards available</Text>
                </View>
              ) : (
                rewards
                  .filter((r) => r.pointsRequired <= (customer?.loyaltyAccount?.points || 0))
                  .map((reward) => {
                    const getRewardDesc = () => {
                      if (reward.type === 'DISCOUNT_PERCENTAGE') return `${reward.discountPercentage}% discount`;
                      if (reward.type === 'DISCOUNT_FIXED') return `₹${reward.discountAmount} off`;
                      if (reward.type === 'FREE_ITEM') return `Free ${reward.freeItemName}`;
                      if (reward.type === 'CASHBACK') return `₹${reward.cashbackAmount} cashback`;
                      return '';
                    };
                    return (
                      <TouchableOpacity
                        key={reward.id}
                        style={styles.rewardCard}
                        onPress={async () => {
                          try {
                            setRedeemingReward(true);
                            await redeemReward(customerId, reward.id);
                            setShowRedeemRewardModal(false);
                            loadCustomerData();
                            Alert.alert('Success', `Reward "${reward.name}" redeemed successfully!`);
                          } catch (error: any) {
                            Alert.alert('Error', error.message || 'Failed to redeem reward');
                          } finally {
                            setRedeemingReward(false);
                          }
                        }}
                        disabled={redeemingReward}
                      >
                        <View style={styles.rewardCardContent}>
                          <Text style={styles.rewardCardName}>{reward.name}</Text>
                          <Text style={styles.rewardCardDesc}>{getRewardDesc()}</Text>
                          <Text style={styles.rewardCardPoints}>{reward.pointsRequired} points</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                      </TouchableOpacity>
                    );
                  })
              )}
              {rewards.filter((r) => r.pointsRequired <= (customer?.loyaltyAccount?.points || 0)).length === 0 && rewards.length > 0 && (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>No rewards available with current points</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Note Modal */}
      <Modal
        visible={showNoteModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Note</Text>
              <TouchableOpacity
                onPress={() => setShowNoteModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.noteInput}
              placeholder="Enter note..."
              value={newNote}
              onChangeText={setNewNote}
              multiline
              numberOfLines={4}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowNoteModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={handleAddNote}
                disabled={addingNote}
              >
                {addingNote ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextSave}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
    fontFamily: fonts.medium,
  },
  customerPhone: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  customerEmail: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
    fontFamily: fonts.medium,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  loyaltyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  loyaltyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  loyaltyActions: {
    flexDirection: 'row',
    gap: 8,
  },
  loyaltyActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  loyaltyActionButtonPrimary: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  loyaltyActionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    fontFamily: fonts.medium,
  },
  loyaltyActionButtonTextPrimary: {
    color: '#fff',
  },
  loyaltyTier: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 2,
    fontFamily: fonts.medium,
  },
  loyaltyPoints: {
    fontSize: 14,
    color: '#92400e',
    fontFamily: fonts.regular,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    color: '#4338ca',
    fontFamily: fonts.regular,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  tabTextActive: {
    color: '#007AFF',
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  content: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  visitCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  visitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  visitType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
    fontFamily: fonts.medium,
  },
  visitDate: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  visitAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    fontFamily: fonts.medium,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addNoteButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  noteCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noteText: {
    fontSize: 16,
    color: '#111827',
    marginBottom: 8,
    fontFamily: fonts.regular,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteAuthor: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  noteDate: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  feedbackCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  statusBadge: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusBadgeResolved: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  statusTextResolved: {
    color: '#059669',
  },
  feedbackComment: {
    fontSize: 14,
    color: '#111827',
    marginBottom: 8,
    fontFamily: fonts.regular,
  },
  feedbackDate: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: fonts.regular,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: fonts.medium,
  },
  modalCloseButton: {
    padding: 4,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    textAlignVertical: 'top',
    fontSize: 16,
    fontFamily: fonts.regular,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#f3f4f6',
  },
  modalButtonSave: {
    backgroundColor: '#007AFF',
  },
  modalButtonTextCancel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  modalButtonTextSave: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  loyaltyBalanceCard: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  loyaltyBalanceLabel: {
    fontSize: 14,
    color: '#92400e',
    fontFamily: fonts.regular,
    marginBottom: 4,
  },
  loyaltyBalanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#92400e',
    fontFamily: fonts.bold,
    marginBottom: 4,
  },
  loyaltyTierText: {
    fontSize: 14,
    color: '#92400e',
    fontFamily: fonts.medium,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    fontFamily: fonts.medium,
  },
  transactionCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transactionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  transactionTypeEarned: {
    backgroundColor: '#d1fae5',
  },
  transactionTypeRedeemed: {
    backgroundColor: '#dbeafe',
  },
  transactionTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
    fontFamily: fonts.medium,
  },
  transactionPoints: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
  transactionPointsPositive: {
    color: '#10b981',
  },
  transactionPointsNegative: {
    color: '#3b82f6',
  },
  transactionDetail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  transactionBalance: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
    fontFamily: fonts.regular,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    fontFamily: fonts.regular,
  },
  rewardsList: {
    maxHeight: 400,
    marginTop: 8,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rewardCardContent: {
    flex: 1,
  },
  rewardCardName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    fontFamily: fonts.medium,
  },
  rewardCardDesc: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
    fontFamily: fonts.regular,
  },
  rewardCardPoints: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '600',
    fontFamily: fonts.medium,
  },
});

export default CustomerProfileScreen;

