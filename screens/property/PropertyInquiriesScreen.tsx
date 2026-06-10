/**
 * PropertyInquiriesScreen
 * Manage property inquiries for property owners
 * Material 3 compliant with enhanced UX
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  FlatList
, StyleSheet } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { fetchUserInquiries, updateInquiryStatus } from '../../redux/slices/propertySlice';
import { PropertyInquiryCard } from '../../components/property';
import { PropertyInquiry } from '../../types/property';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { getUserFacingError } from '../../utils/userFacingError';

export default function PropertyInquiriesScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { inquiries, isLoading } = useAppSelector(state => state.property);
  const { width, isTablet } = getDynamicDimensions();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'pending' | 'responded' | 'all'>('pending');

  useEffect(() => {
    if (user?.id) {
      loadInquiries();
    }
  }, [user?.id]);

  const loadInquiries = async () => {
    if (!user?.id) return;
    try {
      await dispatch(fetchUserInquiries(user.id)).unwrap();
    } catch (error) {
      
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInquiries();
    setRefreshing(false);
  };

  const handleInquiryPress = (inquiry: PropertyInquiry) => {
    // Handle inquiry details view
  };

  const handleQuickReply = (inquiry: PropertyInquiry) => {
    Alert.alert(
      'Quick Reply',
      'Choose a response option:',
      [
        {
          text: 'Accept Viewing',
          onPress: () => sendQuickReply(inquiry, 'I\'d be happy to arrange a viewing. What time works best for you?')
        },
        {
          text: 'Request More Info',
          onPress: () => sendQuickReply(inquiry, 'Thanks for your interest! Could you tell me a bit more about your requirements?')
        },
        {
          text: 'Custom Reply',
          onPress: () => {/* Handle reply functionality */}
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const sendQuickReply = async (inquiry: PropertyInquiry, message: string) => {
    try {
      await dispatch(updateInquiryStatus({
        inquiryId: inquiry.id,
        status: 'responded',
        response: message
      })).unwrap();
      Alert.alert('Success', 'Reply sent successfully!');
    } catch (error: any) {
      const friendly = getUserFacingError(error, {
        action: 'send your reply',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  // Filter inquiries based on selected tab
  const filteredInquiries = inquiries.filter(inquiry => {
    if (selectedTab === 'all') return true;
    return inquiry.status === selectedTab;
  });

  const getTabCounts = () => {
    const pending = inquiries.filter(i => i.status === 'pending').length;
    const responded = inquiries.filter(i => i.status === 'responded').length;
    return { pending, responded, all: inquiries.length };
  };

  const tabCounts = getTabCounts();

  return (
    <LinearGradient
      colors={['#0D9488', '#0F766E', '#134E4A']}
      style={styles.style1}
    >
      <SafeAreaView style={styles.style1}>
        {/* Header */}
        <View style={{
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md
        }}>
          <View style={styles.style2}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.style3}
            >
              <Icon name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={styles.style5}>
              Property Inquiries
            </Text>
            
            <View style={styles.style6} />
          </View>

          <Text style={styles.style7}>
            Manage inquiries for your properties
          </Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.style8}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 4 }}
          >
            {[
              { key: 'pending', label: 'Pending', count: tabCounts.pending },
              { key: 'responded', label: 'Responded', count: tabCounts.responded },
              { key: 'all', label: 'All', count: tabCounts.all }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setSelectedTab(tab.key as any)}
                style={[
                  styles.tabButton,
                  selectedTab === tab.key
                    ? styles.tabButtonActive
                    : styles.tabButtonInactive
                ]}
              >
                <Text style={[
                  styles.tabButtonLabel,
                  { color: selectedTab === tab.key ? '#0F766E' : '#FFFFFF' }
                ]}>
                  {tab.label}
                </Text>
                {tab.count > 0 && (
                  <View style={[
                    styles.tabBadge,
                    selectedTab === tab.key
                      ? styles.tabBadgeActive
                      : styles.tabBadgeInactive
                  ]}>
                    <Text style={[
                      styles.tabBadgeText,
                      { color: selectedTab === tab.key ? '#0F766E' : '#FFFFFF' }
                    ]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Content */}
        <View style={styles.style9}>
          {filteredInquiries.length === 0 ? (
            <View style={styles.style10}>
              <Text style={styles.style11}>📬</Text>
              <Text style={styles.style12}>
                {selectedTab === 'pending' ? 'No Pending Inquiries' : 
                 selectedTab === 'responded' ? 'No Responded Inquiries' : 'No Inquiries Yet'}
              </Text>
              <Text style={styles.style13}>
                {selectedTab === 'pending'
                  ? 'New inquiries from potential tenants will appear here.'
                  : selectedTab === 'responded'
                  ? 'Inquiries you\'ve responded to will show here.'
                  : 'When people contact you about your properties, their messages will appear here.'}
              </Text>
              
              {inquiries.length === 0 && (
                <TouchableOpacity
                  onPress={() => navigation.navigate('MyProperties' as never)}
                  style={styles.style14}
                >
                  <Text style={styles.style15}>View My Properties</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={filteredInquiries}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <PropertyInquiryCard
                  inquiry={item}
                  onPress={() => handleInquiryPress(item)}
                  onReply={() => handleQuickReply(item)}
                  showPropertyTitle={true}
                />
              )}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  colors={['#0D9488']}
                  tintColor="#0D9488"
                />
              }
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
const styles = StyleSheet.create({
  style1: {
  'flex': 1
},
  style2: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 16
},
  style3: {
  'width': 40,
  'height': 40,
  'borderRadius': 9999,
  'backgroundColor': '#FFFFFF',
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style4: {
  'color': '#FFFFFF',
  'fontSize': 20
},
  style5: {
  'color': '#FFFFFF',
  'fontSize': 20,
  'fontWeight': '700',
  'flex': 1,
  'textAlign': 'center'
},
  style6: {
  'width': 40
},
  style7: {
  'textAlign': 'center',
  'fontSize': 14
},
  style8: {
  'paddingHorizontal': 16,
  'marginBottom': 16
},
  style9: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style10: {
  'flex': 1,
  'justifyContent': 'center',
  'alignItems': 'center'
},
  style11: {
  'marginBottom': 16
},
  style12: {
  'fontSize': 20,
  'fontWeight': '600',
  'color': '#374151',
  'marginBottom': 8,
  'textAlign': 'center'
},
  style13: {
  'color': '#6B7280',
  'textAlign': 'center'
},
  style14: {
  'marginTop': 24,
  'backgroundColor': '#0D9488',
  'paddingHorizontal': 24,
  'paddingVertical': 12,
  'borderRadius': 8
},
  style15: {
  'color': '#FFFFFF',
  'fontWeight': '600'
},
  tabButton: {
    marginRight: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center'
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF'
  },
  tabButtonInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  tabButtonLabel: {
    fontWeight: '600'
  },
  tabBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 9999
  },
  tabBadgeActive: {
    backgroundColor: '#CCFBF1'
  },
  tabBadgeInactive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)'
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700'
  }
});
