import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import EmptyState from '../../components/common/EmptyState';
import { useAppSelector } from '../../redux/hooks';
import { serviceInquiryService } from '../../services/serviceInquiryService';
import type { ServiceInquiry } from '../../types/service';

type InquiryFilter = 'All' | 'New' | 'Active' | 'Completed';

export default function ServiceInquiriesScreen() {
  const navigation = useNavigation<StackNavigationProp<ServicesStackParamList>>();
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const [activeFilter, setActiveFilter] = useState<InquiryFilter>('All');
  const [inquiries, setInquiries] = useState<ServiceInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAppSelector((state) => state.auth);

  const fetchInquiries = useCallback(async () => {
    if (!user?.id) {
      setInquiries([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await serviceInquiryService.getOwnerInquiries(user.id);
      setInquiries(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load inquiries.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchInquiries();
    }, [fetchInquiries])
  );

  const getFilteredInquiries = (): ServiceInquiry[] => {
    switch (activeFilter) {
      case 'New':
        return inquiries.filter((i) => i.status === 'pending');
      case 'Active':
        return inquiries.filter((i) =>
          ['quoted', 'confirmed', 'in_progress'].includes(i.status)
        );
      case 'Completed':
        return inquiries.filter((i) => i.status === 'completed');
      default:
        return inquiries;
    }
  };

  const getFilterCount = (filter: InquiryFilter): number => {
    switch (filter) {
      case 'New':
        return inquiries.filter((i) => i.status === 'pending').length;
      case 'Active':
        return inquiries.filter((i) =>
          ['quoted', 'confirmed', 'in_progress'].includes(i.status)
        ).length;
      case 'Completed':
        return inquiries.filter((i) => i.status === 'completed').length;
      default:
        return inquiries.length;
    }
  };

  const getStatusColor = (status: ServiceInquiry['status']): string => {
    switch (status) {
      case 'pending': return '#EF4444';
      case 'quoted': return '#6366F1';
      case 'confirmed': return '#8B5CF6';
      case 'in_progress': return '#3B82F6';
      case 'completed': return '#10B981';
      case 'closed': return '#6B7280';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: ServiceInquiry['status']): string => {
    switch (status) {
      case 'pending': return 'New';
      case 'quoted': return 'Quoted';
      case 'confirmed': return 'Confirmed';
      case 'in_progress': return 'In Progress';
      case 'completed': return 'Completed';
      case 'closed': return 'Closed';
      default: return status;
    }
  };

  const formatTimestamp = (isoString: string): string => {
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(isoString).toLocaleDateString();
  };

  const handleUpdateStatus = async (
    item: ServiceInquiry,
    newStatus: ServiceInquiry['status']
  ) => {
    try {
      const updated = await serviceInquiryService.updateInquiryStatus(item.id, newStatus);
      setInquiries((prev) =>
        prev.map((i) => (i.id === updated.id ? updated : i))
      );
    } catch (err: any) {
      Alert.alert('Update Failed', err?.message || 'Could not update status.');
    }
  };

  const handleCall = (item: ServiceInquiry) => {
    const phone = item.contact_phone;
    if (!phone) {
      Alert.alert('No Phone Number', 'This inquiry does not have a phone number.');
      return;
    }
    Alert.alert('Call Customer', `Call ${item.inquirer_name ?? 'customer'} at ${phone}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Call',
        onPress: () => {
          Linking.openURL(`tel:${phone.replace(/\s/g, '')}`).catch(() => {
            Alert.alert('Call Failed', 'Could not start the call.');
          });
        },
      },
    ]);
  };

  const renderInquiryItem = ({ item }: { item: ServiceInquiry }) => (
    <TouchableOpacity
      style={{
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: spacing.lg,
        marginBottom: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      }}
      onPress={() => {
        Alert.alert(
          'Inquiry Details',
          `Customer: ${item.inquirer_name ?? 'Unknown'}\nService: ${item.service_name ?? ''}\nMessage: ${item.message}${item.contact_phone ? `\n\nContact: ${item.contact_phone}` : ''}`,
          [
            { text: 'Close', style: 'cancel' },
            {
              text: 'Reply',
              onPress: () => {
                navigation.navigate('ServiceChat', {
                  service: {
                    id: item.service_id,
                    title: item.service_name ?? 'Service',
                    category: 'Services',
                    provider_id: item.owner_id,
                    provider_name: item.inquirer_name ?? 'Customer',
                  },
                  recipientId: item.inquirer_id,
                  recipientName: item.inquirer_name ?? 'Customer',
                });
              },
            },
          ]
        );
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fontSize.md, fontWeight: '700', color: '#111827', marginBottom: 2 }}>
            {item.inquirer_name ?? 'Customer'}
          </Text>
          <Text style={{ fontSize: fontSize.sm, color: '#6366F1', fontWeight: '600' }}>
            {item.service_name ?? ''}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{
            backgroundColor: getStatusColor(item.status),
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            marginBottom: 4,
          }}>
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.xs, fontWeight: '600' }}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.xs, color: '#6B7280' }}>
            {formatTimestamp(item.created_at)}
          </Text>
        </View>
      </View>

      <Text
        style={{ fontSize: fontSize.sm, color: '#6B7280', lineHeight: 20, marginBottom: spacing.md }}
        numberOfLines={2}
      >
        {item.message}
      </Text>

      {/* Status-specific actions */}
      {item.status === 'pending' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => handleUpdateStatus(item, 'quoted')}
            style={{ backgroundColor: '#6366F1', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              Send Quote
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCall(item)}
            style={{ backgroundColor: '#10B981', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              Call
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'quoted' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => handleUpdateStatus(item, 'confirmed')}
            style={{ backgroundColor: '#6366F1', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              Confirm
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCall(item)}
            style={{ backgroundColor: '#10B981', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              Contact
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'confirmed' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => handleUpdateStatus(item, 'in_progress')}
            style={{ backgroundColor: '#3B82F6', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              Start Service
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCall(item)}
            style={{ backgroundColor: '#8B5CF6', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              Call
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'in_progress' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => handleUpdateStatus(item, 'completed')}
            style={{ backgroundColor: '#10B981', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              Complete
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleCall(item)}
            style={{ backgroundColor: '#3B82F6', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              Call
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'completed' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={() => handleUpdateStatus(item, 'closed')}
            style={{ backgroundColor: '#10B981', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              View Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert('Review Request Sent', 'A review request has been sent to the customer.')}
            style={{ backgroundColor: '#F59E0B', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: 8, flex: 1 }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' }}>
              Request Review
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  const activeCount = inquiries.filter((i) =>
    ['pending', 'quoted', 'confirmed', 'in_progress'].includes(i.status)
  ).length;

  return (
    <LinearGradient colors={['#6366F1', '#4F46E5', '#4338CA']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.md,
          }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md,
              }}
            >
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ color: '#FFFFFF', fontSize: isTablet ? 24 : 20, fontWeight: '800', flex: 1 }}>
              Service Inquiries
            </Text>
            {activeCount > 0 && (
              <View style={{
                backgroundColor: '#EF4444',
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Text style={{ color: '#FFFFFF', fontSize: fontSize.xs, fontWeight: '700' }}>
                  {activeCount}
                </Text>
              </View>
            )}
          </View>

          {/* Filter Tabs */}
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <View style={{
              flexDirection: 'row',
              backgroundColor: 'rgba(255,255,255,0.2)',
              borderRadius: 12,
              padding: 4,
            }}>
              {(['All', 'New', 'Active', 'Completed'] as InquiryFilter[]).map((filter) => {
                const isActive = activeFilter === filter;
                const count = getFilterCount(filter);
                return (
                  <TouchableOpacity
                    key={filter}
                    onPress={() => setActiveFilter(filter)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'transparent',
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        color: '#FFFFFF',
                        fontSize: fontSize.sm,
                        fontWeight: isActive ? '700' : '600',
                        textAlign: 'center',
                      }}>
                        {filter}
                      </Text>
                      {count > 0 && (
                        <View style={{
                          backgroundColor: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
                          minWidth: 18,
                          height: 18,
                          borderRadius: 9,
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 2,
                        }}>
                          <Text style={{ color: isActive ? '#6366F1' : '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
                            {count}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Content */}
          <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
            {loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={{ color: 'rgba(255,255,255,0.8)', marginTop: spacing.sm, fontSize: fontSize.sm }}>
                  Loading inquiries...
                </Text>
              </View>
            ) : error ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <MaterialIcons name="error-outline" size={48} color="rgba(255,255,255,0.6)" />
                <Text style={{ color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '600', marginTop: spacing.md, textAlign: 'center' }}>
                  {error}
                </Text>
                <TouchableOpacity
                  onPress={fetchInquiries}
                  style={{
                    marginTop: spacing.md,
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    paddingHorizontal: spacing.lg,
                    paddingVertical: spacing.sm,
                    borderRadius: 12,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: fontSize.sm }}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={getFilteredInquiries()}
                keyExtractor={(item) => item.id}
                renderItem={renderInquiryItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                ListEmptyComponent={() => (
                  <EmptyState
                    tone="dark"
                    accentColor="#6366F1"
                    icon={<Text style={{ fontSize: 64 }}>💬</Text>}
                    title="No inquiries yet"
                    description="When customers message you about your services, you'll see and respond to them here."
                    style={{ flex: 0, paddingVertical: spacing.xl * 2 }}
                    primaryAction={{
                      label: 'Post a Service',
                      onPress: () => navigation.navigate('PostService'),
                    }}
                    secondaryAction={{
                      label: 'View My Services',
                      onPress: () => navigation.navigate('MyServices'),
                    }}
                  />
                )}
              />
            )}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
