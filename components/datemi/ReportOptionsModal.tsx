import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface ReportOptionsModalProps {
  visible: boolean;
  onClose: () => void;
  onReportPress: () => void;
  onViewReportsPress: () => void;
  onBlockPress?: () => void;
  profileName: string;
  reportCount: number;
}

export const ReportOptionsModal: React.FC<ReportOptionsModalProps> = ({
  visible,
  onClose,
  onReportPress,
  onViewReportsPress,
  onBlockPress,
  profileName,
  reportCount
}) => {
  const handleReport = () => {
    onClose();
    setTimeout(() => onReportPress(), 300); // Small delay for smooth transition
  };

  const handleViewReports = () => {
    onClose();
    setTimeout(() => onViewReportsPress(), 300);
  };

  const handleBlock = () => {
    onClose();
    setTimeout(() => onBlockPress?.(), 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={styles.container}>
          {/* Header */}
          <View style={{
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: '#F3F4F6'
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: '#171717'
                }}>
                  Report Options
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: '#737373',
                  marginTop: 4
                }}>
                  Choose an action for {profileName}'s profile
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  backgroundColor: '#F5F5F5',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <MaterialIcons name="close" size={18} color="#737373" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Options */}
          <View style={{ padding: 12 }}>

            {/* View Reports Option */}
            <TouchableOpacity
              onPress={handleViewReports}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: '#F0F9FF',
                borderRadius: 12,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: '#BAE6FD'
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#0EA5E9',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14
              }}>
                <MaterialIcons name="visibility" size={24} color="#FFF" />
                {reportCount > 0 && (
                  <View style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    minWidth: 20,
                    height: 20,
                    borderRadius: 10,
                    backgroundColor: '#EF4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: 4
                  }}>
                    <Text style={{
                      color: '#FFF',
                      fontSize: 10,
                      fontWeight: '700'
                    }}>
                      {reportCount > 99 ? '99+' : reportCount}
                    </Text>
                  </View>
                )}
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#075985',
                  marginBottom: 2
                }}>
                  View Comments
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: '#0C4A6E'
                }}>
                  {reportCount > 0 
                    ? `See ${reportCount} report${reportCount !== 1 ? 's' : ''} from other users`
                    : 'Check if this profile has been reported'
                  }
                </Text>
              </View>
              
              <MaterialIcons name="chevron-right" size={24} color="#0EA5E9" />
            </TouchableOpacity>

            {/* Block User Option */}
            {onBlockPress && (
              <TouchableOpacity
                onPress={handleBlock}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  backgroundColor: '#FEF3C7',
                  borderRadius: 12,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: '#FDE68A'
                }}
              >
                <View style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#F59E0B',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 14
                }}>
                  <MaterialIcons name="block" size={24} color="#FFF" />
                </View>
                
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: '600',
                    color: '#92400E',
                    marginBottom: 2
                  }}>
                    Block User
                  </Text>
                  <Text style={{
                    fontSize: 13,
                    color: '#78350F'
                  }}>
                    Stop seeing {profileName}'s profile
                  </Text>
                </View>
                
                <MaterialIcons name="chevron-right" size={24} color="#F59E0B" />
              </TouchableOpacity>
            )}

            {/* Report User Option */}
            <TouchableOpacity
              onPress={handleReport}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                backgroundColor: '#FEF2F2',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#FECACA'
              }}
            >
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#EF4444',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 14
              }}>
                <MaterialIcons name="flag" size={24} color="#FFF" />
              </View>
              
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: '#991B1B',
                  marginBottom: 2
                }}>
                  Report User
                </Text>
                <Text style={{
                  fontSize: 13,
                  color: '#7F1D1D'
                }}>
                  Help keep our community safe
                </Text>
              </View>
              
              <MaterialIcons name="chevron-right" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>

          {/* Info Section */}
          <View style={{
            backgroundColor: '#F9FAFB',
            padding: 16,
            borderBottomLeftRadius: 20,
            borderBottomRightRadius: 20,
            borderTopWidth: 1,
            borderTopColor: '#E5E5E5'
          }}>
            <View style={{ flexDirection: 'row' }}>
              <MaterialIcons name="info" size={16} color="#6B7280" style={{ marginTop: 2 }} />
              <Text style={{
                flex: 1,
                fontSize: 12,
                color: '#6B7280',
                marginLeft: 8,
                lineHeight: 18
              }}>
                Reports help us identify and remove profiles that violate our community guidelines. 
                All reports are anonymous and reviewed within 24 hours.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 340,
    elevation: 10,
  },
});
