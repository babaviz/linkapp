import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Dimensions,
  StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { LineChart } from 'react-native-chart-kit';
import Material3Card from '../../components/common/Material3Card';
import Material3Button from '../../components/common/Material3Button';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../redux/hooks';
import { formatCurrency } from '../../utils/currencyHelpers';
// import { useSubscription } from '../../hooks/useSubscription';

const screenWidth = Dimensions.get('window').width;

interface CreatorStats {
  totalEarnings: number;
  thisMonthEarnings: number;
  totalSessions: number;
  averageRating: number;
  followers: number;
  profileViews: number;
  conversionRate: number;
}

interface EarningsData {
  labels: string[];
  datasets: Array<{
    data: number[];
    color?: (opacity?: number) => string;
    strokeWidth?: number;
  }>;
}

export default function CreatorDashboardScreen() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  // const { subscription, hasFeatureAccess } = useSubscription();
  const hasFeatureAccess = (_feature: string) => true; // TODO: Implement feature access
  const [creatorStats, setCreatorStats] = useState<CreatorStats>({
    totalEarnings: 0,
    thisMonthEarnings: 0,
    totalSessions: 0,
    averageRating: 0,
    followers: 0,
    profileViews: 0,
    conversionRate: 0,
  });
  const [earningsData, setEarningsData] = useState<EarningsData>({
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      data: [0, 0, 0, 0, 0, 0],
      color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
      strokeWidth: 2,
    }],
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCreatorData();
  }, []);

  const loadCreatorData = async () => {
    try {
      // Mock data - in production, this would come from analytics service
      setCreatorStats({
        totalEarnings: 45750,
        thisMonthEarnings: 12300,
        totalSessions: 89,
        averageRating: 4.8,
        followers: 234,
        profileViews: 1567,
        conversionRate: 23.5,
      });

      setEarningsData({
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          data: [5200, 7800, 6500, 9100, 11200, 12300],
          color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
          strokeWidth: 2,
        }],
      });
    } catch {
      // Error handling - in production, show user-friendly error message
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCreatorData();
  };

  const user = useAppSelector((state) => state.auth.user);
  const userCountry = user?.location?.county;

  const renderStatsOverview = () => (
    <View style={styles.style1}>
      <Text style={styles.style2}>Overview</Text>
      
      <View style={styles.style3}>
        <Material3Card style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <View style={styles.style4}>
            <Ionicons name="wallet-outline" size={24} color="#10B981" />
            <Text style={styles.style5}>
              {formatCurrency(creatorStats.totalEarnings, userCountry)}
            </Text>
            <Text style={styles.style6}>Total Earnings</Text>
          </View>
        </Material3Card>

        <Material3Card style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <View style={styles.style4}>
            <Ionicons name="trending-up" size={24} color="#F59E0B" />
            <Text style={styles.style5}>
              {formatCurrency(creatorStats.thisMonthEarnings, userCountry)}
            </Text>
            <Text style={styles.style6}>This Month</Text>
          </View>
        </Material3Card>
      </View>

      <View style={styles.style7}>
        <Material3Card style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <View style={styles.style4}>
            <Ionicons name="videocam-outline" size={24} color="#6366F1" />
            <Text style={styles.style5}>
              {creatorStats.totalSessions}
            </Text>
            <Text style={styles.style6}>Total Sessions</Text>
          </View>
        </Material3Card>

        <Material3Card style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
          <View style={styles.style4}>
            <Ionicons name="star" size={24} color="#EAB308" />
            <Text style={styles.style5}>
              {creatorStats.averageRating.toFixed(1)}
            </Text>
            <Text style={styles.style6}>Avg Rating</Text>
          </View>
        </Material3Card>
      </View>
    </View>
  );

  const renderEarningsChart = () => (
    <Material3Card style={{ ...styles.style1, backgroundColor: 'rgba(255,255,255,0.1)' }}>
      <View style={styles.style8}>
        <Text style={styles.style2}>Earnings Trend</Text>
        
        <LineChart
          data={earningsData}
          width={screenWidth - 80}
          height={200}
          chartConfig={{
            backgroundColor: 'transparent',
            backgroundGradientFrom: 'transparent',
            backgroundGradientTo: 'transparent',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#8B5CF6',
            },
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16,
          }}
        />
      </View>
    </Material3Card>
  );

  const renderCreatorTools = () => (
    <View style={styles.style1}>
      <Text style={styles.style2}>Creator Tools</Text>
      
      <View style={styles.style9}>
        <TouchableOpacity onPress={() => navigation.navigate('ServiceManagement')}>
          <Material3Card style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
            <View style={styles.style10}>
              <View style={styles.style11}>
                <Ionicons name="settings-outline" size={24} color="white" />
              </View>
              <View style={styles.style12}>
                <Text style={styles.style13}>Manage Services</Text>
                <Text style={styles.style14}>Set rates, availability, and service types</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Material3Card>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('ContentLibrary')}>
          <Material3Card style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
            <View style={styles.style10}>
              <View style={styles.style15}>
                <Ionicons name="images-outline" size={24} color="white" />
              </View>
              <View style={styles.style12}>
                <Text style={styles.style13}>Content Library</Text>
                <Text style={styles.style14}>Manage premium content and media</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Material3Card>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('PayoutSettings' as never)}>
          <Material3Card style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
            <View style={styles.style10}>
              <View style={styles.style16}>
                <Ionicons name="card-outline" size={24} color="white" />
              </View>
              <View style={styles.style12}>
                <Text style={styles.style13}>Payout Settings</Text>
                <Text style={styles.style14}>Configure payment methods and withdrawals</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </View>
          </Material3Card>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.style1}>
      <Text style={styles.style2}>Quick Actions</Text>
      
      <View style={styles.style7}>
        <Material3Button
          onPress={() => navigation.navigate('LiveSession' as never)}
          variant="filled"
          style={{ backgroundColor: '#EF4444', flex: 1 }}
        >
          Go Live
        </Material3Button>
        
        <Material3Button
          onPress={() => navigation.navigate('ContentUpload')}
          variant="filled"
          style={{ backgroundColor: '#8B5CF6', flex: 1 }}
        >
          Upload Content
        </Material3Button>
      </View>
    </View>
  );

  if (!hasFeatureAccess('creator_analytics')) {
    return (
      <SafeAreaView style={styles.style17}>
        <LinearGradient
          colors={['#6B46C1', '#553C9A', '#4C1D95']}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        
        <View style={styles.style18}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.style19}>Creator Dashboard</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.style20}>
          <View style={styles.style21}>
            <Ionicons name="diamond-outline" size={40} color="#8B5CF6" />
          </View>
          
          <Text style={styles.style22}>
            Premium Creator Tools
          </Text>
          
          <Text style={styles.style23}>
            Unlock advanced creator features including analytics dashboard, 
            content monetization tools, and earnings management with a Premium subscription.
          </Text>

          <Material3Button
            onPress={() => navigation.navigate('SubscriptionPurchase', {
              selectedTier: { id: 'premium', name: 'Premium', price: 20 },
              isUpgrade: true
            })}
            variant="filled"
            style={{ backgroundColor: '#8B5CF6', minWidth: 200 }}
          >
            Upgrade to Premium
          </Material3Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.style17}>
      <LinearGradient
        colors={['#6B46C1', '#553C9A', '#4C1D95']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      
      <View style={styles.style18}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.style19}>Creator Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreatorSettings' as never)}>
          <Ionicons name="settings-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.style24}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={handleRefresh}
            tintColor="white"
          />
        }
      >
        {renderStatsOverview()}
        {renderEarningsChart()}
        {renderCreatorTools()}
        {renderQuickActions()}
      </ScrollView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'marginBottom': 24
},
  style2: {
  'fontSize': 18,
  'fontWeight': '600',
  'marginBottom': 16,
  'color': '#FFFFFF'
},
  style3: {
  'flexDirection': 'row',
  'gap': 12,
  'marginBottom': 16
},
  style4: {
  'padding': 16,
  'alignItems': 'center'
},
  style5: {
  'fontSize': 24,
  'fontWeight': '700',
  'color': '#FFFFFF',
  'marginTop': 8
},
  style6: {
  'fontSize': 14,
  'color': '#D1D5DB'
},
  style7: {
  'flexDirection': 'row',
  'gap': 12
},
  style8: {
  'padding': 16
},
  style9: {
  'gap': 12
},
  style10: {
  'padding': 16,
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style11: {
  'width': 48,
  'height': 48,
  'borderRadius': 8,
  'alignItems': 'center',
  'justifyContent': 'center',
  'marginRight': 16
},
  style12: {
  'flex': 1
},
  style13: {
  'color': '#FFFFFF',
  'fontWeight': '600',
  'fontSize': 18
},
  style14: {
  'color': '#D1D5DB',
  'fontSize': 14
},
  style15: {
  'width': 48,
  'height': 48,
  'borderRadius': 8,
  'alignItems': 'center',
  'justifyContent': 'center',
  'marginRight': 16
},
  style16: {
  'width': 48,
  'height': 48,
  'backgroundColor': '#22C55E',
  'borderRadius': 8,
  'alignItems': 'center',
  'justifyContent': 'center',
  'marginRight': 16
},
  style17: {
  'flex': 1,
  'backgroundColor': '#FFFFFF'
},
  style18: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'paddingHorizontal': 16,
  'paddingVertical': 12
},
  style19: {
  'fontSize': 20,
  'fontWeight': '600',
  'color': '#FFFFFF'
},
  style20: {
  'flex': 1,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style21: {
  'width': 80,
  'height': 80,
  'backgroundColor': '#F3E8FF',
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center',
  'marginBottom': 24
},
  style22: {
  'fontSize': 24,
  'fontWeight': '700',
  'color': '#FFFFFF',
  'textAlign': 'center',
  'marginBottom': 16
},
  style23: {
  'color': '#D1D5DB',
  'textAlign': 'center'
},
  style24: {
  'flex': 1,
  'paddingHorizontal': 16,
  'paddingVertical': 16
},
});
