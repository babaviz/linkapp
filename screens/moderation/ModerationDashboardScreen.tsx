/**
 * ModerationDashboardScreen - Community Moderation Dashboard
 * Phase 4: Enhanced Engagement & Community
 * Comprehensive moderation tools with Material 3 design
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  FlatList,
  StyleSheet
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { Material3Card } from '../../components/common';
import { getUserFacingError } from '../../utils/userFacingError';
import {
  fetchReports,
  fetchDashboardMetrics,
  takeModerationAction,
  setActiveFilters,
  clearError
} from '../../redux/slices/moderationSlice';
import {
  ContentReport,
  ReportReason,
  ReportStatus,
  ActionType,
  ModerationFilter
} from '../../types/moderation';

interface MetricCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  color: string;
  icon: string;
  onPress?: () => void;
}

// Helper function to get MaterialIcon by name
const getIconByName = (iconName: string) => {
  const iconMap: {[key: string]: string} = {
    'check-circle': 'check-circle',
    'access-time': 'access-time', 
    'warning': 'warning',
    'block': 'block',
    'dashboard': 'dashboard',
    'assignment': 'assignment',
    'flash-on': 'flash-on'
  };
  
  const iconMaterialName = iconMap[iconName] || 'help';
  return <MaterialIcons name={iconMaterialName as any} size={18} color="#6B7280" />;
};

export default function ModerationDashboardScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const {
    reports,
    totalReports,
    dashboardMetrics,
    activeFilters,
    isLoading,
    isSubmitting,
    error
  } = useAppSelector(state => state.moderation);
  const { user } = useAppSelector(state => state.auth);

  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'reports' | 'actions'>('dashboard');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ContentReport | null>(null);

  // Load data when screen focuses
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadDashboardData();
      }
    }, [user?.id])
  );

  const loadDashboardData = async () => {
    try {
      dispatch(fetchDashboardMetrics());
      dispatch(fetchReports({ filter: activeFilters }));
    } catch (error) {
      
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const handleTakeAction = async (
    reportId: string,
    targetUserId: string,
    actionType: ActionType,
    reason: string,
    duration?: number
  ) => {
    if (!user?.id) return;

    try {
      await dispatch(takeModerationAction({
        reportId,
        targetUserId,
        moderatorId: user.id,
        actionType,
        reason,
        duration
      })).unwrap();

      setSelectedReport(null);
      Alert.alert('Success', 'Moderation action taken successfully');
    } catch (error) {
      const friendly = getUserFacingError(error, {
        action: 'take this moderation action',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const MetricCard: React.FC<MetricCardProps> = ({ 
    title, 
    value, 
    subtitle, 
    color, 
    icon, 
    onPress 
  }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.metricCardTouchable}
    >
      <Material3Card
        variant="elevated"
        style={{ ...styles.style2 as any, backgroundColor: 'white' }}
      >
        <View style={styles.style3}>
          <View 
            style={[styles.style4, { backgroundColor: `${color}20` }]}
          >
            {getIconByName(icon)}
          </View>
          <Text 
            style={[styles.style6, { color }]}
          >
            {value}
          </Text>
        </View>
        <Text style={styles.style7}>
          {title}
        </Text>
        <Text style={styles.style8}>
          {subtitle}
        </Text>
      </Material3Card>
    </TouchableOpacity>
  );

  const ReportCard: React.FC<{ report: ContentReport }> = ({ report }) => (
    <TouchableOpacity
      onPress={() => setSelectedReport(report)}
      activeOpacity={0.7}
    >
      <Material3Card variant="outlined" >
        <View style={styles.style9}>
          <View style={styles.style10}>
            <View 
              style={[styles.style11, { backgroundColor: getPriorityColor(report.priority) }]}
            />
            <Text style={styles.style12}>
              {report.reason.replace('_', ' ')}
            </Text>
          </View>
          <View 
            style={[styles.style13, { backgroundColor: getStatusColor(report.status) + '20' }]}
          >
            <Text 
              style={[styles.style14, { color: getStatusColor(report.status) }]}
            >
              {report.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <Text style={styles.style15}>
          Content Type: <Text style={styles.style16}>{report.content_type}</Text>
        </Text>
        
        {report.description && (
          <Text style={styles.style15} numberOfLines={2}>
            {report.description}
          </Text>
        )}

        <Text style={styles.style8}>
          Reported {new Date(report.created_at).toLocaleDateString()}
        </Text>
      </Material3Card>
    </TouchableOpacity>
  );

  const getPriorityColor = (priority: 'low' | 'medium' | 'high' | 'urgent'): string => {
    const colors = {
      low: '#10B981',
      medium: '#F59E0B',
      high: '#EF4444',
      urgent: '#7C2D12'
    };
    return colors[priority] || colors.low;
  };

  const getStatusColor = (status: 'pending' | 'investigating' | 'resolved' | 'dismissed'): string => {
    const colors = {
      pending: '#F59E0B',
      investigating: '#3B82F6',
      resolved: '#10B981',
      dismissed: '#6B7280'
    };
    return colors[status] || colors.pending;
  };

  const TabButton: React.FC<{ 
    tab: string; 
    title: string;
    icon: string;
    isActive: boolean;
  }> = ({ tab, title, icon, isActive }) => (
    <TouchableOpacity
      onPress={() => setSelectedTab(tab as any)}
      style={[
        styles.tabButton,
        isActive ? styles.tabButtonActive : styles.tabButtonInactive
      ]}
    >
      <View style={styles.style17}>
        {getIconByName(icon)}
        <Text style={[
          styles.tabButtonText,
          isActive ? styles.tabButtonTextActive : styles.tabButtonTextInactive
        ]}>
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderDashboard = () => (
    <>
      {/* Header Stats */}
      <LinearGradient
        colors={['#DC2626', '#B91C1C']}
        style={styles.style19}
      >
        <View style={styles.style20}>
          <View style={styles.style21}>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              <MaterialIcons name="security" size={24} color="white" style={{marginRight: 8}} />
              <Text style={styles.style22}>
                Moderation Center
              </Text>
            </View>
            <Text style={styles.style23}>
              Keeping our community safe
            </Text>
          </View>
          <View style={styles.style17}>
            <Text style={styles.style24}>
              {dashboardMetrics?.pending_reports || 0}
            </Text>
            <Text style={styles.style25}>Pending</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Metrics Grid */}
      <View style={styles.style26}>
        <Text style={styles.style27}>
          Today's Activity
        </Text>
        <View style={styles.style28}>
          <MetricCard
            title="Resolved"
            value={dashboardMetrics?.resolved_reports || 0}
            subtitle="Total resolved"
            color="#10B981"
icon="check-circle"
            onPress={() => setSelectedTab('reports')}
          />
          <MetricCard
            title="Response Time"
            value={`${dashboardMetrics?.average_resolution_time || 0}h`}
            subtitle="Average"
            color="#3B82F6"
icon="access-time"
          />
          <MetricCard
            title="Pending"
            value={dashboardMetrics?.pending_reports || 0}
            subtitle="Awaiting review"
            color="#F59E0B"
icon="warning"
          />
          <MetricCard
            title="Dismissed"
            value={dashboardMetrics?.dismissed_reports || 0}
            subtitle="Not actionable"
            color="#6B7280"
icon="block"
          />
        </View>
      </View>

      {/* Top Violations */}
      <View style={styles.style26}>
        <Text style={styles.style27}>
          Top Violation Types (30 days)
        </Text>
        <Material3Card variant="elevated" >
          {dashboardMetrics?.reports_by_reason && Object.entries(dashboardMetrics.reports_by_reason).map(([reason, count], index) => (
            <View key={reason} style={styles.style29}>
              <Text style={styles.style30}>
                {reason.replace('_', ' ')}
              </Text>
              <View style={styles.style10}>
                <Text style={styles.style31}>
                  {count as number}
                </Text>
                <View 
                  style={styles.style32}
                >
                  <View
                    style={[styles.style33, {
                      width: `${Math.min(((count as number) / Math.max(...Object.values(dashboardMetrics.reports_by_reason).map(v => v as number))) * 100, 100)}%`
                    }]}
                  />
                </View>
              </View>
            </View>
          )) || (
            <Text style={styles.style34}>
              No violations data available
            </Text>
          )}
        </Material3Card>
      </View>
    </>
  );

  const renderReports = () => (
    <View style={styles.style35}>
      <View style={styles.style36}>
        <Text style={styles.style37}>
          Content Reports ({totalReports})
        </Text>
        <TouchableOpacity
          onPress={() => setShowFilters(true)}
          style={styles.style38}
        >
          <Text style={styles.style39}>Filters</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ReportCard report={item} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <Material3Card variant="outlined" >
            <Text style={styles.style40}>
              No reports found
            </Text>
            <Text style={styles.style41}>
              All caught up!
            </Text>
          </Material3Card>
        )}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.style42}>
      {/* Header */}
      <View style={styles.style43}>
        <View style={styles.style36}>
          <Text style={styles.style44}>
            Moderation
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <View style={styles.style45}>
              <MaterialIcons name="arrow-back" size={24} color="#111827" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.style47}>
          <TabButton 
            tab="dashboard" 
            title="Dashboard" 
icon="dashboard"
            isActive={selectedTab === 'dashboard'} 
          />
          <TabButton 
            tab="reports" 
            title="Reports" 
icon="assignment"
            isActive={selectedTab === 'reports'} 
          />
          <TabButton 
            tab="actions" 
            title="Actions" 
icon="flash-on"
            isActive={selectedTab === 'actions'} 
          />
        </View>
      </View>

      <ScrollView
        style={styles.style21}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#DC2626']}
            tintColor="#DC2626"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'dashboard' && renderDashboard()}
        {selectedTab === 'reports' && renderReports()}
        {selectedTab === 'actions' && (
          <View style={styles.style35}>
            <Text style={styles.style27}>
              Recent Actions
            </Text>
            <Material3Card variant="outlined" >
              <Text style={styles.style48}>
                Action history coming soon
              </Text>
            </Material3Card>
          </View>
        )}
      </ScrollView>

      {/* Report Detail Modal */}
      {selectedReport && (
        <Modal
          visible={true}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.style49}>
            <View style={styles.style50}>
              <Text style={styles.style51}>Report Details</Text>
              <TouchableOpacity
                onPress={() => setSelectedReport(null)}
                style={styles.style45}
              >
                <MaterialIcons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.style52}>
              <Material3Card variant="outlined" >
                <Text style={styles.style53}>
                  Violation: {selectedReport.reason.replace('_', ' ')}
                </Text>
                <Text style={styles.style15}>
                  Content Type: {selectedReport.content_type}
                </Text>
                <Text style={styles.style15}>
                  Status: {selectedReport.status}
                </Text>
                <Text style={styles.style15}>
                  Priority: {selectedReport.priority}
                </Text>
                {selectedReport.description && (
                  <Text style={styles.style54}>
                    Description: {selectedReport.description}
                  </Text>
                )}
              </Material3Card>

              <Text style={styles.style55}>Take Action</Text>
              <View style={styles.style56}>
                <TouchableOpacity
                  onPress={() => handleTakeAction(
                    selectedReport.id,
                    selectedReport.reported_user_id,
                    'warning',
                    'Content violated community guidelines'
                  )}
                  style={styles.style57}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <MaterialIcons name="warning" size={16} color="#F59E0B" style={{marginRight: 8}} />
                    <Text style={styles.style58}>Issue Warning</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleTakeAction(
                    selectedReport.id,
                    selectedReport.reported_user_id,
                    'content_removal',
                    'Content removed for policy violation'
                  )}
                  style={styles.style59}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <MaterialIcons name="delete" size={16} color="#EF4444" style={{marginRight: 8}} />
                    <Text style={styles.style60}>Remove Content</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleTakeAction(
                    selectedReport.id,
                    selectedReport.reported_user_id,
                    'temporary_suspension',
                    'Account suspended for policy violation',
                    24
                  )}
                  style={styles.style61}
                >
                  <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <MaterialIcons name="pause" size={16} color="#DC2626" style={{marginRight: 8}} />
                    <Text style={styles.style62}>Suspend User (24h)</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'width': '48%',
  'marginBottom': 16
},
  style2: {
  'padding': 16,
  'height': 96
},
  style3: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 8
},
  style4: {
  'width': 40,
  'height': 40,
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style5: {
  'fontSize': 18
},
  style6: {
  'fontSize': 24,
  'fontWeight': '700'
},
  style7: {
  'fontSize': 14,
  'fontWeight': '500',
  'color': '#374151',
  'marginBottom': 4
},
  style8: {
  'fontSize': 12,
  'color': '#6B7280'
},
  style9: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 12
},
  style10: {
  'flexDirection': 'row',
  'alignItems': 'center'
},
  style11: {
  'height': 12,
  'borderRadius': 9999,
  'marginRight': 8
},
  style12: {
  'fontSize': 14,
  'fontWeight': '600',
  'color': '#111827'
},
  style13: {
  'paddingHorizontal': 8,
  'paddingVertical': 4,
  'borderRadius': 9999
},
  style14: {
  'fontSize': 12,
  'fontWeight': '500'
},
  style15: {
  'fontSize': 14,
  'color': '#4B5563',
  'marginBottom': 8
},
  style16: {
  'fontWeight': '500'
},
  style17: {
  'alignItems': 'center'
},
  style18: {
  'fontSize': 16,
  'marginBottom': 4
},
  style19: {
  'marginHorizontal': 16,
  'marginTop': 16,
  'borderRadius': 12,
  'padding': 24
},
  style20: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between'
},
  style21: {
  'flex': 1
},
  style22: {
  'color': '#FFFFFF',
  'fontSize': 24,
  'fontWeight': '700',
  'marginBottom': 4
},
  style23: {
  'fontSize': 16
},
  style24: {
  'color': '#FFFFFF',
  'fontSize': 30,
  'fontWeight': '700'
},
  style25: {
  'fontSize': 14
},
  style26: {
  'paddingHorizontal': 16,
  'marginTop': 24
},
  style27: {
  'fontSize': 18,
  'fontWeight': '600',
  'color': '#111827',
  'marginBottom': 16
},
  style28: {
  'flexDirection': 'row',
  'justifyContent': 'space-between'
},
  style29: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'paddingVertical': 8
},
  style30: {
  'fontSize': 14,
  'fontWeight': '500',
  'color': '#374151'
},
  style31: {
  'fontSize': 14,
  'fontWeight': '700',
  'color': '#111827',
  'marginRight': 8
},
  style32: {
  'width': 64,
  'height': 8,
  'backgroundColor': '#E5E7EB',
  'borderRadius': 9999,
  'overflow': 'hidden'
},
  style33: {
  'height': '100%',
  'backgroundColor': '#EF4444',
  'borderRadius': 9999
},
  style34: {
  'textAlign': 'center',
  'color': '#6B7280',
  'paddingVertical': 16
},
  style35: {
  'paddingHorizontal': 16,
  'marginTop': 16
},
  style36: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'marginBottom': 16
},
  style37: {
  'fontSize': 18,
  'fontWeight': '600',
  'color': '#111827'
},
  style38: {
  'backgroundColor': '#FEE2E2',
  'paddingHorizontal': 12,
  'paddingVertical': 8,
  'borderRadius': 8
},
  style39: {
  'fontSize': 14,
  'fontWeight': '500'
},
  style40: {
  'textAlign': 'center',
  'color': '#6B7280',
  'fontSize': 16
},
  style41: {
  'textAlign': 'center',
  'color': '#9CA3AF',
  'fontSize': 14,
  'marginTop': 8
},
  style42: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style43: {
  'backgroundColor': '#FFFFFF',
  'paddingHorizontal': 24,
  'paddingVertical': 16,
  'borderBottomWidth': 1,
  'borderColor': '#F3F4F6'
},
  style44: {
  'fontSize': 24,
  'fontWeight': '700',
  'color': '#111827'
},
  style45: {
  'width': 32,
  'height': 32,
  'backgroundColor': '#F3F4F6',
  'borderRadius': 9999,
  'alignItems': 'center',
  'justifyContent': 'center'
},
  style46: {
  'color': '#4B5563',
  'fontSize': 18
},
  style47: {
  'flexDirection': 'row'
},
  style48: {
  'textAlign': 'center',
  'color': '#6B7280'
},
  style49: {
  'flex': 1,
  'backgroundColor': '#FFFFFF'
},
  style50: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'justifyContent': 'space-between',
  'padding': 16,
  'borderBottomWidth': 1,
  'borderColor': '#F3F4F6'
},
  style51: {
  'fontSize': 20,
  'fontWeight': '700',
  'color': '#111827'
},
  style52: {
  'flex': 1,
  'padding': 16
},
  style53: {
  'fontSize': 16,
  'fontWeight': '600',
  'marginBottom': 8
},
  style54: {
  'fontSize': 14,
  'color': '#374151',
  'marginTop': 12
},
  style55: {
  'fontSize': 18,
  'fontWeight': '600',
  'marginBottom': 12
},
  style56: {
  'gap': 8
},
  style57: {
  'backgroundColor': '#FEF3C7',
  'padding': 16,
  'borderRadius': 8
},
  style58: {
  'fontWeight': '500'
},
  style59: {
  'padding': 16,
  'borderRadius': 8
},
  style60: {
  'fontWeight': '500'
},
  style61: {
  'backgroundColor': '#FEE2E2',
  'padding': 16,
  'borderRadius': 8
},
  style62: {
    'fontWeight': '500'
  },
  metricCardTouchable: {
    width: '48%',
    marginBottom: 16
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4
  },
  tabButtonActive: {
    backgroundColor: '#DC2626'
  },
  tabButtonInactive: {
    backgroundColor: '#F3F4F6'
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500'
  },
  tabButtonTextActive: {
    color: '#FFFFFF'
  },
  tabButtonTextInactive: {
    color: '#374151'
  },
});
