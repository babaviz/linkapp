/**
 * ReportContentButton - Quick Report Button Component
 * Can be embedded in any content item (properties, jobs, services, stories)
 */

import React, { useState } from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import ReportContentModal from './ReportContentModal';

interface ReportContentButtonProps {
  contentId: string;
  contentType: 'property' | 'job' | 'service' | 'story' | 'profile' | 'message';
  reportedUserId: string;
  style?: 'button' | 'menu-item' | 'icon-only';
  size?: 'small' | 'medium' | 'large';
}

export default function ReportContentButton({
  contentId,
  contentType,
  reportedUserId,
  style = 'menu-item',
  size = 'medium'
}: ReportContentButtonProps) {
  const [showReportModal, setShowReportModal] = useState(false);

  const renderButton = () => {
    switch (style) {
      case 'button':
        return (
          <TouchableOpacity
            onPress={() => setShowReportModal(true)}
            style={[styles.button, size === 'small' && styles.smallButton, size === 'large' && styles.largeButton]}
            activeOpacity={0.7}
          >
            <View style={styles.buttonContent}>
              <Text style={styles.icon}>🚨</Text>
              <Text style={[styles.buttonText, size === 'small' && styles.smallText, size === 'large' && styles.largeText]}>
                Report
              </Text>
            </View>
          </TouchableOpacity>
        );

      case 'icon-only':
        return (
          <TouchableOpacity
            onPress={() => setShowReportModal(true)}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <Text style={styles.iconText}>🚨</Text>
          </TouchableOpacity>
        );

      case 'menu-item':
      default:
        return (
          <TouchableOpacity
            onPress={() => setShowReportModal(true)}
            style={[styles.menuItem, size === 'small' && styles.smallButton, size === 'large' && styles.largeButton]}
            activeOpacity={0.7}
          >
            <Text style={styles.menuIcon}>🚨</Text>
            <Text style={[styles.menuText, size === 'small' && styles.smallText, size === 'large' && styles.largeText]}>
              Report Content
            </Text>
          </TouchableOpacity>
        );
    }
  };

  return (
    <>
      {renderButton()}
      
      <ReportContentModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        contentId={contentId}
        contentType={contentType}
        reportedUserId={reportedUserId}
      />
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  smallButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  largeButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 18,
    marginRight: 8,
  },
  buttonText: {
    color: '#B91C1C',
    fontWeight: '500',
    fontSize: 14,
  },
  smallText: {
    fontSize: 12,
  },
  largeText: {
    fontSize: 16,
  },
  iconButton: {
    width: 32,
    height: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  menuText: {
    color: '#DC2626',
    fontWeight: '500',
    fontSize: 14,
  },
});
