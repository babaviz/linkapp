/**
 * PropertyInquiryManager - Comprehensive inquiry management component
 * Handles CRUD operations for property inquiries with proper UI states
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme';
import { useAppDispatch, useAppSelector } from '../../redux/hooks';
import { getUserFacingError } from '../../utils/userFacingError';
import { 
  fetchOwnerInquiries,
  fetchUserInquiries,
  respondToInquiry,
  closeInquiry,
  deleteInquiry,
  fetchInquiryStats,
  setCurrentInquiry
} from '../../redux/slices/messageSlice';
import { PropertyInquiry } from '../../types/property';

interface PropertyInquiryManagerProps {
  userRole: 'owner' | 'inquirer';
  userId: string;
  propertyId?: string;
  onClose?: () => void;
}

const PropertyInquiryManager: React.FC<PropertyInquiryManagerProps> = ({
  userRole,
  userId,
  propertyId,
  onClose
}) => {
  const dispatch = useAppDispatch();
  const { 
    receivedInquiries, 
    sentInquiries, 
    isLoading, 
    isSubmitting,
    error,
    inquiryStats 
  } = useAppSelector(state => state.message);

  // Local state
  const [selectedInquiry, setSelectedInquiry] = useState<PropertyInquiry | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'responded' | 'closed'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Get appropriate inquiries based on user role
  const inquiries = userRole === 'owner' ? receivedInquiries : sentInquiries;

  // Filter inquiries based on selected status
  const filteredInquiries = inquiries.filter(inquiry => {
    if (filterStatus === 'all') return true;
    return inquiry.status === filterStatus;
  });

  // Load inquiries on component mount
  useEffect(() => {
    loadInquiries();
    if (userRole === 'owner') {
      loadStats();
    }
  }, [userRole, userId, propertyId]);

  const loadInquiries = useCallback(async () => {
    try {
      if (userRole === 'owner') {
        await dispatch(fetchOwnerInquiries(userId)).unwrap();
      } else {
        await dispatch(fetchUserInquiries(userId)).unwrap();
      }
    } catch (error) {
      
    }
  }, [dispatch, userRole, userId]);

  const loadStats = useCallback(async () => {
    if (userRole === 'owner') {
      try {
        await dispatch(fetchInquiryStats(userId)).unwrap();
      } catch (error) {
        
      }
    }
  }, [dispatch, userRole, userId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        loadInquiries(),
        userRole === 'owner' ? loadStats() : Promise.resolve()
      ]);
    } catch (error) {
      
    } finally {
      setRefreshing(false);
    }
  }, [loadInquiries, loadStats, userRole]);

  const handleInquiryPress = (inquiry: PropertyInquiry) => {
    setSelectedInquiry(inquiry);
    dispatch(setCurrentInquiry(inquiry));
  };

  const handleRespondToInquiry = () => {
    if (selectedInquiry && userRole === 'owner') {
      setShowResponseModal(true);
      setResponseText('');
    }
  };

  const submitResponse = async () => {
    if (!selectedInquiry || !responseText.trim()) {
      Alert.alert('Missing information', 'Please enter a response message.');
      return;
    }

    try {
      await dispatch(respondToInquiry({
        inquiryId: selectedInquiry.id,
        responseMessage: responseText.trim(),
        ownerId: userId
      })).unwrap();

      setShowResponseModal(false);
      setResponseText('');
      Alert.alert('Success', 'Response sent successfully!');
    } catch (error: any) {
      const friendly = getUserFacingError(error, {
        action: 'send your response',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const handleCloseInquiry = async (inquiry: PropertyInquiry) => {
    Alert.alert(
      'Close Inquiry',
      'Are you sure you want to close this inquiry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(closeInquiry({
                inquiryId: inquiry.id,
                userId: userId
              })).unwrap();
              Alert.alert('Success', 'Inquiry closed successfully.');
            } catch (error: any) {
              const friendly = getUserFacingError(error, {
                action: 'close this inquiry',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          }
        }
      ]
    );
  };

  const handleDeleteInquiry = async (inquiry: PropertyInquiry) => {
    if (userRole !== 'inquirer') return;

    Alert.alert(
      'Delete Inquiry',
      'Are you sure you want to delete this inquiry? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteInquiry({
                inquiryId: inquiry.id,
                userId: userId
              })).unwrap();
              Alert.alert('Success', 'Inquiry deleted successfully.');
            } catch (error: any) {
              const friendly = getUserFacingError(error, {
                action: 'delete this inquiry',
                displayStyle: 'alert',
              });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status: PropertyInquiry['status']) => {
    switch (status) {
      case 'pending': return colors.warning[500];
      case 'responded': return colors.info[500];
      case 'closed': return colors.secondary[500];
      default: return colors.secondary[500];
    }
  };

  const getStatusIcon = (status: PropertyInquiry['status']) => {
    switch (status) {
      case 'pending': return 'schedule';
      case 'responded': return 'reply';
      case 'closed': return 'check-circle';
      default: return 'help';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const renderInquiryItem = ({ item: inquiry }: { item: PropertyInquiry }) => (
    <TouchableOpacity
      style={styles.inquiryItem}
      onPress={() => handleInquiryPress(inquiry)}
    >
      <View style={styles.inquiryHeader}>
        <View style={styles.inquiryMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(inquiry.status) }]}>
            <Icon name={getStatusIcon(inquiry.status)} size={16} color={colors.white} />
            <Text style={styles.statusText}>{inquiry.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.inquiryDate}>{formatDate(inquiry.created_at)}</Text>
        </View>
        
        <View style={styles.inquiryActions}>
          {inquiry.status === 'pending' && userRole === 'owner' && (
            <TouchableOpacity
              onPress={() => {
                setSelectedInquiry(inquiry);
                handleRespondToInquiry();
              }}
              style={styles.actionButton}
            >
              <Icon name="reply" size={20} color={colors.primary[600]} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            onPress={() => handleCloseInquiry(inquiry)}
            style={styles.actionButton}
          >
            <Icon name="close" size={20} color={colors.secondary[600]} />
          </TouchableOpacity>
          
          {userRole === 'inquirer' && (
            <TouchableOpacity
              onPress={() => handleDeleteInquiry(inquiry)}
              style={styles.actionButton}
            >
              <Icon name="delete" size={20} color={colors.error[500]} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Text style={styles.inquiryMessage} numberOfLines={2}>
        {inquiry.message}
      </Text>
      
      {inquiry.contact_phone && (
        <Text style={styles.contactInfo}>📞 {inquiry.contact_phone}</Text>
      )}
      
      {inquiry.contact_email && (
        <Text style={styles.contactInfo}>✉️ {inquiry.contact_email}</Text>
      )}
    </TouchableOpacity>
  );

  const renderStats = () => {
    if (userRole !== 'owner' || !inquiryStats) return null;
    
    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Inquiry Overview</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{inquiryStats.total_inquiries}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.warning[500] }]}>
              {inquiryStats.pending_inquiries}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.info[500] }]}>
              {inquiryStats.responded_inquiries}
            </Text>
            <Text style={styles.statLabel}>Responded</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.secondary[500] }]}>
              {inquiryStats.closed_inquiries}
            </Text>
            <Text style={styles.statLabel}>Closed</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <Text style={styles.filtersLabel}>Filter by status:</Text>
      <View style={styles.filterButtons}>
        {(['all', 'pending', 'responded', 'closed'] as const).map(status => (
          <TouchableOpacity
            key={status}
            onPress={() => setFilterStatus(status)}
            style={[
              styles.filterButton,
              filterStatus === status && styles.filterButtonActive
            ]}
          >
            <Text style={[
              styles.filterButtonText,
              filterStatus === status && styles.filterButtonTextActive
            ]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Icon name="inbox" size={64} color={colors.secondary[300]} />
      <Text style={styles.emptyTitle}>No Inquiries</Text>
      <Text style={styles.emptySubtitle}>
        {userRole === 'owner' 
          ? 'You haven\'t received any inquiries yet.' 
          : 'You haven\'t sent any inquiries yet.'}
      </Text>
    </View>
  );

  if (isLoading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Loading inquiries...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {userRole === 'owner' ? 'Property Inquiries' : 'My Inquiries'}
        </Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.text.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats (Owner only) */}
      {renderStats()}

      {/* Filters */}
      {renderFilters()}

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Icon name="error" size={24} color={colors.error[500]} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Inquiries List */}
      <FlatList
        data={filteredInquiries}
        keyExtractor={(item) => item.id}
        renderItem={renderInquiryItem}
        ListEmptyComponent={!isLoading ? renderEmptyState : null}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary[600]]}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Response Modal */}
      <Modal
        visible={showResponseModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowResponseModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Respond to Inquiry</Text>
            <TouchableOpacity onPress={() => setShowResponseModal(false)}>
              <Icon name="close" size={24} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          {selectedInquiry && (
            <View style={styles.modalContent}>
              <Text style={styles.originalMessage}>Original Message:</Text>
              <Text style={styles.originalMessageText}>{selectedInquiry.message}</Text>
              
              <Text style={styles.responseLabel}>Your Response:</Text>
              <TextInput
                style={styles.responseInput}
                value={responseText}
                onChangeText={setResponseText}
                placeholder="Type your response here..."
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                placeholderTextColor={colors.secondary[500]}
              />
              
              <View style={styles.modalActions}>
                <TouchableOpacity
                  onPress={() => setShowResponseModal(false)}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  onPress={submitResponse}
                  disabled={isSubmitting || !responseText.trim()}
                  style={[
                    styles.sendButton,
                    (isSubmitting || !responseText.trim()) && styles.sendButtonDisabled
                  ]}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={styles.sendButtonText}>Send Response</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary[200],
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 4,
  },
  statsContainer: {
    backgroundColor: colors.white,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary[600],
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  filtersLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.secondary[300],
    backgroundColor: colors.white,
  },
  filterButtonActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  filterButtonText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.white,
  },
  listContainer: {
    padding: 16,
  },
  inquiryItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inquiryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  inquiryMeta: {
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.white,
    marginLeft: 4,
  },
  inquiryDate: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  inquiryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  inquiryMessage: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    maxWidth: 240,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
    margin: 16,
    backgroundColor: colors.error[50],
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: colors.error[600],
    textAlign: 'center',
    marginVertical: 8,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.error[500],
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.secondary[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  originalMessage: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  originalMessageText: {
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.secondary[100],
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    lineHeight: 20,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  responseInput: {
    borderWidth: 1,
    borderColor: colors.secondary[300],
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    backgroundColor: colors.white,
    minHeight: 120,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.secondary[300],
    borderRadius: 8,
    backgroundColor: colors.white,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  sendButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: colors.primary[600],
    borderRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.secondary[400],
  },
  sendButtonText: {
    fontSize: 16,
    color: colors.white,
    fontWeight: '600',
  },
});

export default PropertyInquiryManager;

