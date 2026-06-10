/**
 * InquiriesScreen - Manage property inquiries for both users and property owners
 * TaskMaster Task 8: Contact Management System Implementation
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Alert,
  StyleSheet
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { 
  fetchUserInquiries, 
  fetchOwnerInquiries, 
  closeInquiry, 
  deleteInquiry,
  setCurrentInquiry 
} from '../../redux/slices/messageSlice';
import { PropertyInquiry } from '../../types/property';
import { messageService } from '../../services/messageService';
import EmptyState from '../../components/common/EmptyState';
import { getUserFacingError } from '../../utils/userFacingError';
import { navigateToMainTab } from '../../navigation/mainTabNavigation';

interface InquiryItemProps {
  inquiry: PropertyInquiry;
  isOwner: boolean;
  onPress: () => void;
  onClose: () => void;
  onDelete?: () => void;
}

const InquiryItem: React.FC<InquiryItemProps> = ({ 
  inquiry, 
  isOwner, 
  onPress, 
  onClose, 
  onDelete 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#EA580C';
      case 'responded': return '#059669';
      case 'closed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'pending': return { backgroundColor: '#FED7AA', borderColor: '#FDBA74' };
      case 'responded': return { backgroundColor: '#A7F3D0', borderColor: '#6EE7B7' };
      case 'closed': return { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' };
      default: return { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' };
    }
  };

  return (
    <TouchableOpacity 
      onPress={onPress}
      style={styles.style1}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.style2}>
        <View style={styles.style3}>
          <Text style={styles.style4}>
            {isOwner ? 'Inquiry from:' : 'Property:'}
          </Text>
          <Text style={styles.style5}>
            {isOwner ? inquiry.contact_phone || inquiry.contact_email || 'Contact info provided' : 'Property inquiry'}
          </Text>
        </View>
        <View style={[styles.statusBadge, getStatusBadgeStyle(inquiry.status)]}>
          <Text style={[styles.statusText, { color: getStatusColor(inquiry.status) }]}>
            {inquiry.status}
          </Text>
        </View>
      </View>

      {/* Message Preview */}
      <Text style={styles.style6} numberOfLines={2}>
        {messageService.formatInquiryPreview(inquiry.message, 150)}
      </Text>

      {/* Footer */}
      <View style={styles.style7}>
        <Text style={styles.style8}>
          {messageService.getTimeSince(inquiry.created_at)}
        </Text>
        
        <View style={styles.style9}>
          {inquiry.status !== 'closed' && (
            <TouchableOpacity
              onPress={onClose}
              style={styles.style10}
            >
              <Text style={styles.style11}>Close</Text>
            </TouchableOpacity>
          )}
          
          {!isOwner && onDelete && (
            <TouchableOpacity
              onPress={onDelete}
              style={styles.style12}
            >
              <Text style={styles.style13}>Delete</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function InquiriesScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { 
    sentInquiries, 
    receivedInquiries, 
    isLoading, 
    error,
    unreadInquiries 
  } = useAppSelector(state => state.message);

  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch inquiries when screen focuses
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadInquiries();
      }
    }, [user?.id])
  );

  const loadInquiries = async () => {
    if (!user?.id) return;

    try {
      await Promise.all([
        dispatch(fetchUserInquiries(user.id)),
        dispatch(fetchOwnerInquiries(user.id))
      ]);
    } catch (error) {
      
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInquiries();
    setRefreshing(false);
  };

  const handleInquiryPress = (inquiry: PropertyInquiry) => {
    dispatch(setCurrentInquiry(inquiry));
    // Note: Future implementation will navigate to dedicated InquiryDetailsScreen
    // For now, showing details in alert dialog
    Alert.alert(
      'Inquiry Details',
      `Status: ${inquiry.status}\n\nMessage: ${inquiry.message}${inquiry.responded_at ? `\n\nResponded: ${new Date(inquiry.responded_at).toLocaleDateString()}` : ''}`,
      [{ text: 'OK' }]
    );
  };

  const handleCloseInquiry = async (inquiry: PropertyInquiry) => {
    if (!user?.id) return;

    Alert.alert(
      'Close Inquiry',
      'Are you sure you want to close this inquiry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Close',
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(closeInquiry({ inquiryId: inquiry.id, userId: user.id })).unwrap();
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
    if (!user?.id) return;

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
              await dispatch(deleteInquiry({ inquiryId: inquiry.id, userId: user.id })).unwrap();
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

  const renderInquiry = ({ item }: { item: PropertyInquiry }) => (
    <InquiryItem
      inquiry={item}
      isOwner={activeTab === 'received'}
      onPress={() => handleInquiryPress(item)}
      onClose={() => handleCloseInquiry(item)}
      onDelete={activeTab === 'sent' ? () => handleDeleteInquiry(item) : undefined}
    />
  );

  const currentInquiries = activeTab === 'sent' ? sentInquiries : receivedInquiries;

  if (!user) {
    return (
      <SafeAreaView style={styles.style14}>
        <View style={styles.style15}>
          <Text style={styles.style16}>
            Please log in to view your inquiries
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.style14}>
      {/* Header */}
      <View style={styles.style17}>
        <View style={styles.style18}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.style19}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.style21}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialIcons name="message" size={20} color="#111827" style={{marginRight: 8}} />
              <Text style={styles.style22}>Messages</Text>
            </View>
            <Text style={styles.style23}>Manage your property inquiries</Text>
          </View>
        </View>
      </View>

      {/* Tab Selector */}
      <View style={styles.style24}>
        <View style={styles.style25}>
          <TouchableOpacity
            onPress={() => setActiveTab('sent')}
            style={[
              styles.tabButton,
              { marginRight: 8 },
              activeTab === 'sent' ? styles.activeTab : styles.inactiveTab
            ]}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'sent' ? styles.activeTabText : styles.inactiveTabText
            ]}>
              Sent ({sentInquiries.length})
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            onPress={() => setActiveTab('received')}
            style={[
              styles.tabButton,
              { marginLeft: 8, position: 'relative' },
              activeTab === 'received' ? styles.activeTab : styles.inactiveTab
            ]}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'received' ? styles.activeTabText : styles.inactiveTabText
            ]}>
              Received ({receivedInquiries.length})
            </Text>
            {unreadInquiries > 0 && activeTab !== 'received' && (
              <View style={styles.style26}>
                <Text style={styles.style27}>
                  {unreadInquiries > 9 ? '9+' : unreadInquiries}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.style28}>
          <Text style={styles.style29}>{error}</Text>
        </View>
      )}

      {/* Content */}
      {isLoading && currentInquiries.length === 0 ? (
        <View style={styles.style30}>
          <Text style={styles.style31}>Loading inquiries...</Text>
        </View>
      ) : currentInquiries.length === 0 ? (
        <EmptyState
          tone="light"
          accentColor="#10B981"
          icon={<MaterialIcons name="inbox" size={56} color="#9CA3AF" />}
          title={`No ${activeTab === 'sent' ? 'sent' : 'received'} inquiries`}
          description={
            activeTab === 'sent'
              ? 'Browse properties and send an inquiry to connect with a property owner.'
              : 'When users inquire about your properties, their messages will appear here.'
          }
          primaryAction={{
            label: activeTab === 'sent' ? 'Browse Properties' : 'View My Properties',
            onPress: () => {
              if (activeTab === 'sent') {
                navigateToMainTab(navigation as any, 'PropertyHub');
                return;
              }
              (navigation as any).navigate('MyProperties');
            },
          }}
          secondaryAction={{
            label: activeTab === 'sent' ? 'Go Back' : 'Post a Property',
            onPress: () => {
              if (activeTab === 'sent') {
                (navigation as any).goBack();
                return;
              }
              (navigation as any).navigate('PostProperty');
            },
          }}
        />
      ) : (
        <FlatList
          data={currentInquiries}
          renderItem={renderInquiry}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#10B981']}
              tintColor="#10B981"
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'backgroundColor': '#FFFFFF',
  'borderRadius': 8,
  'padding': 16,
  'marginBottom': 12,
  'borderWidth': 1,
  'borderColor': '#E5E7EB'
},
  style2: {
  'flexDirection': 'row',
  'alignItems': 'flex-start',
  'justifyContent': 'space-between',
  'marginBottom': 8
},
  style3: {
  'flex': 1,
  'marginRight': 12
},
  style4: {
  'fontSize': 16,
  'fontWeight': '600',
  'color': '#111827',
  'marginBottom': 4
},
  style5: {
  'fontSize': 14,
  'color': '#4B5563'
},
  style6: {
  'color': '#374151',
  'marginBottom': 12
},
  style7: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between'
},
  style8: {
  'fontSize': 12,
  'color': '#6B7280'
},
  style9: {
  'flexDirection': 'row'
},
  style10: {
  'backgroundColor': '#F3F4F6',
  'paddingHorizontal': 12,
  'paddingVertical': 4,
  'borderRadius': 9999
},
  style11: {
  'color': '#4B5563',
  'fontSize': 12,
  'fontWeight': '500'
},
  style12: {
  'backgroundColor': '#FEE2E2',
  'paddingHorizontal': 12,
  'paddingVertical': 4,
  'borderRadius': 9999
},
  style13: {
  'color': '#DC2626',
  'fontSize': 12,
  'fontWeight': '500'
},
  style14: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style15: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center',
  'paddingHorizontal': 24
},
  style16: {
  'fontSize': 18,
  'color': '#4B5563',
  'marginBottom': 16,
  'textAlign': 'center'
},
  style17: {
  'paddingHorizontal': 24,
  'paddingVertical': 16
},
  style18: {
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style19: {
  'marginRight': 16,
  'padding': 8,
  'borderRadius': 9999
},
  style20: {
  'color': '#FFFFFF',
  'fontSize': 18,
  'fontWeight': '700'
},
  style21: {
  'flex': 1
},
  style22: {
  'fontSize': 24,
  'fontWeight': '700',
  'color': '#FFFFFF'
},
  style23: {
  'marginTop': 4
},
  style24: {
  'backgroundColor': '#FFFFFF',
  'borderBottomWidth': 1,
  'borderColor': '#E5E7EB'
},
  style25: {
  'flexDirection': 'row',
  'marginVertical': 16
},
  style26: {
  'position': 'absolute',
  'top': -8,
  'right': -8,
  'width': 20,
  'height': 20,
  'backgroundColor': '#EF4444',
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style27: {
  'color': '#FFFFFF',
  'fontSize': 12,
  'fontWeight': '700'
},
  style28: {
  'backgroundColor': '#FEF2F2',
  'borderWidth': 1,
  'borderColor': '#FECACA',
  'marginTop': 16,
  'padding': 12,
  'borderRadius': 8
},
  style29: {
  'color': '#DC2626',
  'textAlign': 'center'
},
  style30: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center'
},
  style31: {
  'color': '#6B7280',
  'fontSize': 18
},
  style32: {
  'marginBottom': 16
},
  style33: {
  'fontSize': 20,
  'fontWeight': '600',
  'color': '#1F2937',
  'marginBottom': 8,
  'textAlign': 'center'
},
  style34: {
  'color': '#4B5563',
  'textAlign': 'center',
  'marginBottom': 24
},
  style35: {
  'paddingHorizontal': 24,
  'paddingVertical': 12,
  'borderRadius': 8
},
  style36: {
  'color': '#FFFFFF',
  'fontWeight': '600'
},
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  activeTab: {
    backgroundColor: '#10B981'
  },
  inactiveTab: {
    backgroundColor: '#F3F4F6'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600'
  },
  activeTabText: {
    color: '#FFFFFF'
  },
  inactiveTabText: {
    color: '#6B7280'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize'
  }
});
