/**
 * PropertyInquiryCard Component
 * Displays property inquiry in a Material 3 compliant card format
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { PropertyInquiry } from '../../types/property';
import { formatDistanceToNow } from 'date-fns';

interface PropertyInquiryCardProps {
  inquiry: PropertyInquiry;
  onPress?: () => void;
  onReply?: () => void;
  showPropertyTitle?: boolean;
}

const PropertyInquiryCard: React.FC<PropertyInquiryCardProps> = ({
  inquiry,
  onPress,
  onReply,
  showPropertyTitle = false
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'responded': return { backgroundColor: '#D1FAE5', color: '#047857' };
      case 'closed': return { backgroundColor: '#F3F4F6', color: '#1F2937' };
      default: return { backgroundColor: '#F3F4F6', color: '#1F2937' };
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'responded': return '✅';
      case 'closed': return '🔒';
      default: return '❓';
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.card}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarIcon}>💬</Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName} numberOfLines={1}>
              Inquiry from User
            </Text>
            <Text style={styles.timestamp}>
              {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
            </Text>
          </View>
        </View>
        
        {/* Status Badge */}
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(inquiry.status).backgroundColor }
        ]}>
          <Text style={[
            styles.statusText,
            { color: getStatusColor(inquiry.status).color }
          ]}>
            {getStatusIcon(inquiry.status)} {inquiry.status.charAt(0).toUpperCase() + inquiry.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Property Title (if shown) */}
      {showPropertyTitle && (
        <View style={styles.propertyTitle}>
          <Text style={styles.propertyTitleText}>Property Inquiry</Text>
        </View>
      )}

      {/* Message Preview */}
      <View style={styles.messagePreview}>
        <Text style={styles.messageText} numberOfLines={2}>
          {inquiry.message}
        </Text>
      </View>

      {/* Contact Info */}
      {(inquiry.contact_phone || inquiry.contact_email) && (
        <View style={styles.contactInfo}>
          {inquiry.contact_phone && (
            <View style={styles.contactItem}>
              <Text style={styles.contactIcon}>📞</Text>
              <Text style={styles.contactText}>{inquiry.contact_phone}</Text>
            </View>
          )}
          {inquiry.contact_email && (
            <View style={styles.contactItem}>
              <Text style={styles.contactIcon}>✉️</Text>
              <Text style={styles.contactText}>{inquiry.contact_email}</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.actionText}>View Details</Text>
        </TouchableOpacity>
        
        {inquiry.status === 'pending' && onReply && (
          <TouchableOpacity 
            onPress={onReply}
            style={styles.replyButton}
          >
            <Text style={styles.replyButtonText}>Reply</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    backgroundColor: '#F0FDFA',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarIcon: {
    color: '#0D9488',
    fontSize: 18,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: '600',
    color: '#111827',
    fontSize: 16,
  },
  timestamp: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  propertyTitle: {
    marginBottom: 8,
  },
  propertyTitleText: {
    fontSize: 14,
    color: '#0D9488',
    fontWeight: '500',
  },
  messagePreview: {
    marginBottom: 12,
  },
  messageText: {
    color: '#374151',
    fontSize: 14,
    lineHeight: 20,
  },
  contactInfo: {
    marginBottom: 12,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  contactIcon: {
    color: '#6B7280',
    marginRight: 8,
  },
  contactText: {
    fontSize: 14,
    color: '#4B5563',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionText: {
    color: '#0D9488',
    fontWeight: '500',
    fontSize: 14,
  },
  replyButton: {
    backgroundColor: '#0D9488',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  replyButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 14,
  },
});

export default PropertyInquiryCard;
