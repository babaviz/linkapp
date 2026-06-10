import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { showDialog, showPrompt } from '../../utils/dialogService';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import EmptyState from '../../components/common/EmptyState';

export default function MyServiceRequestsScreen() {
  const navigation = useNavigation<StackNavigationProp<ServicesStackParamList>>();
  const { isTablet } = getDynamicDimensions();
  const [activeFilter, setActiveFilter] = useState('All');

  const requests = [
    {
      id: '1',
      serviceName: 'Home Cleaning Service',
      providerName: 'CleanPro Services',
      message: 'Hi, I need cleaning service for my 3-bedroom apartment. When are you available?',
      requestDate: '2 days ago',
      status: 'Pending',
      amount: 'KSh 2,500'
    },
    {
      id: '2',
      serviceName: 'Garden Maintenance', 
      providerName: 'Green Thumb Landscaping',
      message: 'Can you help with lawn mowing and hedge trimming? What are your rates?',
      requestDate: '1 week ago',
      status: 'Quoted',
      amount: 'KSh 3,200'
    },
    {
      id: '3',
      serviceName: 'Plumbing Services',
      providerName: 'Quick Fix Plumbers',
      message: 'I have a leaking pipe in my kitchen. Can you fix it today?',
      requestDate: '3 days ago',
      status: 'Completed',
      amount: 'KSh 1,800'
    },
    {
      id: '4',
      serviceName: 'House Painting',
      providerName: 'Perfect Paint Co.',
      message: 'Need exterior painting for a 4-bedroom house. Please provide quotation.',
      requestDate: '5 days ago',
      status: 'In Progress',
      amount: 'KSh 25,000'
    },
    {
      id: '5',
      serviceName: 'Car Repair Service',
      providerName: 'AutoFix Garage',
      message: 'My car engine is making strange noises. Need diagnosis and repair.',
      requestDate: '1 day ago',
      status: 'Pending',
      amount: 'KSh 8,000'
    },
    {
      id: '6',
      serviceName: 'Event Photography',
      providerName: 'Perfect Moments Studio',
      message: 'Need photographer for wedding ceremony next month.',
      requestDate: '2 weeks ago',
      status: 'Confirmed',
      amount: 'KSh 15,000'
    },
    {
      id: '7',
      serviceName: 'Appliance Repair',
      providerName: 'TechFix Solutions',
      message: 'Washing machine not working properly. Need urgent repair.',
      requestDate: '1 month ago',
      status: 'Completed',
      amount: 'KSh 2,200'
    },
    {
      id: '8',
      serviceName: 'Catering Services',
      providerName: 'Delicious Bites',
      message: 'Need catering for office party, 50 people.',
      requestDate: '4 hours ago',
      status: 'Pending',
      amount: 'KSh 12,000'
    },
  ];

  // Filter requests based on active filter
  const getFilteredRequests = () => {
    if (activeFilter === 'All') return requests;
    if (activeFilter === 'Pending') return requests.filter(r => r.status === 'Pending');
    if (activeFilter === 'Active') return requests.filter(r => ['Quoted', 'Confirmed', 'In Progress'].includes(r.status));
    if (activeFilter === 'Completed') return requests.filter(r => r.status === 'Completed');
    return requests;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return '#F59E0B';
      case 'Quoted': return '#6366F1';
      case 'Confirmed': return '#8B5CF6';
      case 'In Progress': return '#3B82F6';
      case 'Completed': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Get count for each filter
  const getFilterCount = (filter: string) => {
    if (filter === 'All') return requests.length;
    if (filter === 'Pending') return requests.filter(r => r.status === 'Pending').length;
    if (filter === 'Active') return requests.filter(r => ['Quoted', 'Confirmed', 'In Progress'].includes(r.status)).length;
    if (filter === 'Completed') return requests.filter(r => r.status === 'Completed').length;
    return 0;
  };

  interface RequestItem {
    id: string;
    serviceName: string;
    providerName: string;
    message: string;
    requestDate: string;
    status: string;
    amount: string;
  }

  const renderRequestItem = ({ item }: { item: RequestItem }) => (
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
        elevation: 4
      }}
      onPress={async () => {
        await showDialog({
          title: 'Service Request Details',
          message: `Service: ${item.serviceName}\nProvider: ${item.providerName}\nMessage: ${item.message}\nAmount: ${item.amount}\nStatus: ${item.status}`,
          type: 'info',
          buttons: [
            { text: 'Close', style: 'cancel' },
            { 
              text: 'View Details', 
              onPress: () => {
                navigation.navigate('ServiceDetails', { serviceId: item.id });
              }
            }
          ]
        });
      }}
      activeOpacity={0.8}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text style={{ 
            fontSize: fontSize.md, 
            fontWeight: '700', 
            color: '#111827',
            marginBottom: 2
          }}>
            {item.serviceName}
          </Text>
          <Text style={{ 
            fontSize: fontSize.sm, 
            color: '#6366F1',
            fontWeight: '600'
          }}>
            {item.providerName}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <View style={{
            backgroundColor: getStatusColor(item.status),
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            marginBottom: 4
          }}>
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.xs, 
              fontWeight: '600' 
            }}>
              {item.status}
            </Text>
          </View>
          <Text style={{ fontSize: fontSize.xs, color: '#6B7280' }}>
            {item.requestDate}
          </Text>
        </View>
      </View>

      <Text style={{ 
        fontSize: fontSize.sm, 
        color: '#6B7280',
        lineHeight: 20,
        marginBottom: spacing.sm
      }} numberOfLines={2}>
        {item.message}
      </Text>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
        <Text style={{ 
          fontSize: fontSize.md, 
          fontWeight: '700', 
          color: '#10B981' 
        }}>
          {item.amount}
        </Text>
        <Text style={{ 
          fontSize: fontSize.xs, 
          color: '#6B7280',
          fontStyle: 'italic'
        }}>
          Requested {item.requestDate}
        </Text>
      </View>

      {item.status === 'Pending' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={async () => {
              await showDialog({
                title: 'Cancel Request',
                message: `Are you sure you want to cancel your request for ${item.serviceName}?`,
                type: 'warning',
                buttons: [
                  { text: 'No', style: 'cancel' },
                  { 
                    text: 'Yes, Cancel', 
                    style: 'destructive',
                    onPress: async () => {
                      await showDialog({
                        title: 'Request Cancelled',
                        message: 'Your service request has been cancelled.',
                        type: 'success',
                        buttons: [{ text: 'OK' }]
                      });
                    }
                  }
                ]
              });
            }}
            style={{
              backgroundColor: '#EF4444',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              await showPrompt({
                title: 'Update Request',
                message: `Add more details to your request for ${item.serviceName}:`,
                placeholder: 'Enter additional details...',
                inputType: 'plain-text',
                buttons: [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Update', 
                    onPress: async (text) => {
                      if (text && text.trim()) {
                        await showDialog({
                          title: 'Request Updated',
                          message: 'Your service request has been updated.',
                          type: 'success',
                          buttons: [{ text: 'OK' }]
                        });
                      }
                    }
                  }
                ]
              });
            }}
            style={{
              backgroundColor: '#6366F1',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Update
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'Quoted' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={async () => {
              await showDialog({
                title: 'Quote Details',
                message: `Service: ${item.serviceName}\nProvider: ${item.providerName}\nQuoted Amount: ${item.amount}\n\nThe provider has sent you a quote. Review the details and decide if you want to accept.`,
                type: 'info',
                buttons: [
                  { text: 'Decline', style: 'destructive', onPress: () => {} },
                  { text: 'Contact Provider', onPress: () => {} },
                  { text: 'Accept Quote', onPress: async () => {
                    await showDialog({
                      title: 'Quote Accepted',
                      message: 'You have accepted the service quote. The provider will be notified.',
                      type: 'success',
                      buttons: [{ text: 'OK' }]
                    });
                  }}
                ]
              });
            }}
            style={{
              backgroundColor: '#6366F1',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Review Quote
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              await showDialog({
                title: 'Accept Quote',
                message: `Accept the quote of ${item.amount} for ${item.serviceName}?`,
                type: 'info',
                buttons: [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Accept', 
                    onPress: async () => {
                      await showDialog({
                        title: 'Quote Accepted',
                        message: 'You have accepted the service quote. The provider will be notified.',
                        type: 'success',
                        buttons: [{ text: 'OK' }]
                      });
                    }
                  }
                ]
              });
            }}
            style={{
              backgroundColor: '#10B981',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Accept
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'Confirmed' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={async () => {
              await showDialog({
                title: 'Booking Confirmed',
                message: `Your booking for ${item.serviceName} has been confirmed.\n\nProvider: ${item.providerName}\nAmount: ${item.amount}\n\nThe service provider will contact you soon with the schedule.`,
                type: 'success',
                buttons: [
                  { text: 'OK' },
                  { text: 'Contact Provider', onPress: () => {} }
                ]
              });
            }}
            style={{
              backgroundColor: '#8B5CF6',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              View Details
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              await showDialog({
                title: 'Contact Provider',
                message: `Contact ${item.providerName} about your upcoming service?`,
                type: 'info',
                buttons: [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call', onPress: () => {} },
                  { text: 'Message', onPress: () => {} }
                ]
              });
            }}
            style={{
              backgroundColor: '#10B981',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Contact
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'In Progress' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={async () => {
              await showDialog({
                title: 'Service In Progress',
                message: `${item.serviceName} is currently in progress.\n\nProvider: ${item.providerName}\n\nYou can track the progress or contact the provider for updates.`,
                type: 'info',
                buttons: [
                  { text: 'OK' },
                  { text: 'Track Progress', onPress: () => {} },
                  { text: 'Contact Provider', onPress: () => {} }
                ]
              });
            }}
            style={{
              backgroundColor: '#3B82F6',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Track Progress
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              await showDialog({
                title: 'Contact Provider',
                message: `Contact ${item.providerName} about the service progress?`,
                type: 'info',
                buttons: [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call', onPress: () => {} },
                  { text: 'Message', onPress: () => {} }
                ]
              });
            }}
            style={{
              backgroundColor: '#10B981',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Contact
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {item.status === 'Completed' && (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TouchableOpacity
            onPress={async () => {
              await showDialog({
                title: 'Rate Service',
                message: `How was your experience with ${item.providerName}?`,
                type: 'info',
                buttons: [
                  { text: 'Later', style: 'cancel' },
                  { 
                    text: 'Rate Now', 
                    onPress: async () => {
                      await showDialog({
                        title: 'Thank You!',
                        message: 'Your rating helps other users find quality services.',
                        type: 'success',
                        buttons: [{ text: 'OK' }]
                      });
                    }
                  }
                ]
              });
            }}
            style={{
              backgroundColor: '#F59E0B',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Rate Service
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={async () => {
              await showDialog({
                title: 'Book Again',
                message: `Book ${item.providerName} again for ${item.serviceName}?`,
                type: 'info',
                buttons: [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Book Again', 
                    onPress: async () => {
                      await showDialog({
                        title: 'Booking Created',
                        message: 'A new service request has been created.',
                        type: 'success',
                        buttons: [{ text: 'OK' }]
                      });
                    }
                  }
                ]
              });
            }}
            style={{
              backgroundColor: '#10B981',
              paddingHorizontal: spacing.md,
              paddingVertical: spacing.xs,
              borderRadius: 8,
              flex: 1
            }}
          >
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: fontSize.sm, 
              fontWeight: '600',
              textAlign: 'center'
            }}>
              Book Again
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#6366F1', '#4F46E5', '#4338CA']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingHorizontal: spacing.lg, 
            paddingTop: spacing.md,
            paddingBottom: spacing.md 
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
                marginRight: spacing.md
              }}
            >
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: isTablet ? 24 : 20, 
              fontWeight: '800',
              flex: 1
            }}>
              My Service Requests
            </Text>
            <View style={{
              backgroundColor: '#F59E0B',
              width: 24,
              height: 24,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Text style={{ color: '#FFFFFF', fontSize: fontSize.xs, fontWeight: '700' }}>
                {requests.filter(r => ['Pending', 'Quoted', 'Confirmed', 'In Progress'].includes(r.status)).length}
              </Text>
            </View>
          </View>

          {/* Filter Tabs */}
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <View style={{ 
              flexDirection: 'row', 
              backgroundColor: 'rgba(255,255,255,0.2)', 
              borderRadius: 12,
              padding: 4
            }}>
              {['All', 'Pending', 'Active', 'Completed'].map((filter) => {
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
                      backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : 'transparent'
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{
                        color: '#FFFFFF',
                        fontSize: fontSize.sm,
                        fontWeight: isActive ? '700' : '600',
                        textAlign: 'center'
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
                          marginTop: 2
                        }}>
                          <Text style={{
                            color: isActive ? '#6366F1' : '#FFFFFF',
                            fontSize: 10,
                            fontWeight: '700'
                          }}>
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

          {/* Requests List */}
          <View style={{ flex: 1, paddingHorizontal: spacing.lg }}>
            <FlatList
              data={getFilteredRequests()}
              keyExtractor={(item) => item.id}
              renderItem={renderRequestItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={() => (
                  <EmptyState
                    tone="dark"
                    accentColor="#6366F1"
                    icon={<Text style={{ fontSize: 64 }}>📋</Text>}
                    title="No service requests yet"
                    description="When you request services from providers, you’ll be able to track them here."
                    style={{ flex: 0, paddingVertical: spacing.xl * 2 }}
                    primaryAction={{
                      label: 'Browse Services',
                      onPress: () => navigation.navigate('ServicesHome'),
                    }}
                    secondaryAction={{
                      label: 'View Saved Services',
                      onPress: () => navigation.navigate('SavedServices'),
                    }}
                  />
              )}
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
