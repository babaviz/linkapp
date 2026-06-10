import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ProfileReport } from '../../redux/slices/datemiSlice';

interface ViewReportsModalProps {
  visible: boolean;
  onClose: () => void;
  profileName: string;
  reports: ProfileReport[];
  isLoading?: boolean;
}

const reportReasonLabels: Record<string, { label: string; icon: any; color: string; bgColor: string }> = {
  fake: { label: 'Fake Profile', icon: 'person-remove' as any, color: '#EF4444', bgColor: '#FFEDED' },
  inappropriate: { label: 'Inappropriate Content', icon: 'block' as any, color: '#F59E0B', bgColor: '#FFF7ED' },
  harassment: { label: 'Harassment', icon: 'warning' as any, color: '#EC4899', bgColor: '#FFEEF8' },
  spam: { label: 'Spam', icon: 'mail' as any, color: '#8B5CF6', bgColor: '#F3EDFF' },
  underage: { label: 'Underage', icon: 'child-care' as any, color: '#3B82F6', bgColor: '#EDF4FF' },
  custom: { label: 'Other Issue', icon: 'edit' as any, color: '#10B981', bgColor: '#EDFFF8' },
  other: { label: 'Other Issue', icon: 'edit' as any, color: '#10B981', bgColor: '#EDFFF8' },
};

export const ViewReportsModal: React.FC<ViewReportsModalProps> = ({
  visible,
  onClose,
  profileName,
  reports,
  isLoading = false
}) => {
  const insets = useSafeAreaInsets();
  const [selectedReport, setSelectedReport] = useState<ProfileReport | null>(null);

  const handleClose = () => {
    setSelectedReport(null);
    onClose();
  };

  const getTimeAgo = (timestamp: string) => {
    const now = new Date();
    const reportDate = new Date(timestamp);
    const diffMs = now.getTime() - reportDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'reviewed': return '#3B82F6';
      case 'resolved': return '#10B981';
      default: return '#737373';
    }
  };

  const renderReportSummary = () => {
    const reasonCounts: Record<string, number> = {};
    reports.forEach(report => {
      reasonCounts[report.reason] = (reasonCounts[report.reason] || 0) + 1;
    });

    return (
      <View style={{
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#991B1B',
          marginBottom: 12
        }}>
          Report Summary
        </Text>
        
        <View style={{ gap: 8 }}>
          {Object.entries(reasonCounts).map(([reason, count]) => {
            const reasonInfo = reportReasonLabels[reason] || reportReasonLabels.custom;
            return (
              <View key={reason} style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <View style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: reasonInfo.bgColor,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 10
                  }}>
                    <MaterialIcons name={reasonInfo.icon} size={16} color={reasonInfo.color} />
                  </View>
                  <Text style={{ 
                    color: '#525252', 
                    fontSize: 14,
                    flex: 1
                  }}>
                    {reasonInfo.label}
                  </Text>
                </View>
                <View style={{
                  backgroundColor: reasonInfo.color,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: 12
                }}>
                  <Text style={{ 
                    color: '#FFF', 
                    fontSize: 12,
                    fontWeight: '600'
                  }}>
                    {count}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        
        <View style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: '#FECACA'
        }}>
          <Text style={{ 
            color: '#991B1B', 
            fontSize: 13,
            fontWeight: '500'
          }}>
            Total Reports: {reports.length}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end'
      }}>
        <TouchableOpacity 
          style={{ flex: 1 }} 
          activeOpacity={1} 
          onPress={handleClose}
        />
        
        <View style={{
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          paddingTop: 8,
          maxHeight: '85%',
          paddingBottom: insets.bottom || 20
        }}>
          {/* Handle Bar */}
          <View style={{
            width: 40,
            height: 4,
            backgroundColor: '#E5E5E5',
            borderRadius: 2,
            alignSelf: 'center',
            marginBottom: 16
          }} />

          {/* Header */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            marginBottom: 20
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{
                fontSize: 24,
                fontWeight: '700',
                color: '#171717'
              }}>
                View Comments
              </Text>
              <Text style={{
                fontSize: 14,
                color: '#737373',
                marginTop: 4
              }}>
                What others have reported about {profileName}
              </Text>
            </View>
            
            <TouchableOpacity
              onPress={handleClose}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#F5F5F5',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <MaterialIcons name="close" size={20} color="#737373" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ paddingHorizontal: 20 }}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          >
            {isLoading ? (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 60
              }}>
                <ActivityIndicator size="large" color="#F87171" />
                <Text style={{
                  marginTop: 16,
                  fontSize: 14,
                  color: '#737373'
                }}>
                  Loading reports...
                </Text>
              </View>
            ) : reports.length === 0 ? (
              <View style={{
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 60,
                backgroundColor: '#F9FAFB',
                borderRadius: 16
              }}>
                <View style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: '#10B98120',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16
                }}>
                  <MaterialIcons name="verified-user" size={32} color="#10B981" />
                </View>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#262626',
                  marginBottom: 8
                }}>
                  No Reports Found
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: '#737373',
                  textAlign: 'center',
                  paddingHorizontal: 20
                }}>
                  This profile has not been reported by any users
                </Text>
              </View>
            ) : (
              <>
                {/* Summary Section */}
                {renderReportSummary()}

                {/* Individual Reports */}
                <View style={{ marginBottom: 20 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#262626',
                    marginBottom: 12
                  }}>
                    Recent Reports ({reports.length})
                  </Text>

                  <View style={{ gap: 12 }}>
                    {reports.slice(0, 10).map((report) => {
                      const reasonInfo = reportReasonLabels[report.reason] || reportReasonLabels.custom;
                      const isExpanded = selectedReport?.id === report.id;

                      return (
                        <TouchableOpacity
                          key={report.id}
                          onPress={() => setSelectedReport(isExpanded ? null : report)}
                          style={{
                            backgroundColor: '#F9FAFB',
                            borderRadius: 12,
                            padding: 14,
                            borderWidth: 1,
                            borderColor: isExpanded ? '#F87171' : '#E5E5E5'
                          }}
                        >
                          <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <View style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: reasonInfo.bgColor,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12
                              }}>
                                <MaterialIcons name={reasonInfo.icon} size={18} color={reasonInfo.color} />
                              </View>
                              
                              <View style={{ flex: 1 }}>
                                <Text style={{
                                  fontSize: 14,
                                  fontWeight: '500',
                                  color: '#262626'
                                }}>
                                  {reasonInfo.label}
                                </Text>
                                <Text style={{
                                  fontSize: 12,
                                  color: '#737373',
                                  marginTop: 2
                                }}>
                                  {getTimeAgo(report.timestamp)}
                                </Text>
                              </View>
                            </View>
                            
                            <View style={{ alignItems: 'flex-end' }}>
                              <View style={{
                                backgroundColor: getStatusColor(report.status),
                                paddingHorizontal: 8,
                                paddingVertical: 3,
                                borderRadius: 8,
                                marginBottom: 4
                              }}>
                                <Text style={{
                                  fontSize: 10,
                                  color: '#FFF',
                                  fontWeight: '600',
                                  textTransform: 'uppercase'
                                }}>
                                  {report.status}
                                </Text>
                              </View>
                              <MaterialIcons 
                                name={isExpanded ? "expand-less" : "expand-more"} 
                                size={20} 
                                color="#737373" 
                              />
                            </View>
                          </View>

                          {isExpanded && report.details && (
                            <View style={{
                              marginTop: 12,
                              paddingTop: 12,
                              borderTopWidth: 1,
                              borderTopColor: '#E5E5E5'
                            }}>
                              <Text style={{
                                fontSize: 12,
                                color: '#737373',
                                fontWeight: '500',
                                marginBottom: 6
                              }}>
                                Report Details:
                              </Text>
                              <Text style={{
                                fontSize: 14,
                                color: '#525252',
                                lineHeight: 20
                              }}>
                                {report.details}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {reports.length > 10 && (
                    <View style={{
                      marginTop: 16,
                      padding: 12,
                      backgroundColor: '#F3F4F6',
                      borderRadius: 8,
                      alignItems: 'center'
                    }}>
                      <Text style={{
                        fontSize: 13,
                        color: '#737373'
                      }}>
                        Showing 10 of {reports.length} reports
                      </Text>
                    </View>
                  )}
                </View>

                {/* Safety Notice */}
                <View style={{
                  backgroundColor: '#FEF3C7',
                  borderRadius: 12,
                  padding: 14,
                  flexDirection: 'row',
                  marginBottom: 20
                }}>
                  <MaterialIcons name="warning" size={20} color="#D97706" style={{ marginTop: 2 }} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{
                      fontSize: 13,
                      color: '#92400E',
                      fontWeight: '500',
                      marginBottom: 4
                    }}>
                      Safety Notice
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: '#78350F',
                      lineHeight: 18
                    }}>
                      These reports are from other users. Please use your best judgment when interacting with this profile.
                    </Text>
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
