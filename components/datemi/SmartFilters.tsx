/**
 * Smart Filters Component for Advanced Matching
 * Material 3 Design with AI-powered filtering suggestions
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
  TextInput,
  Dimensions,
  Animated,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { MatchingPreferences } from '../../services/matchingService';
import { material3Animations } from '../../utils/material3Animations';
import CustomSlider from '../../components/common/CustomSlider';
import usePremiumAccess from '../../hooks/usePremiumAccess';
import { AgeRangePicker } from './AgeRangePicker';

interface SmartFiltersProps {
  visible: boolean;
  onClose: () => void;
  preferences: MatchingPreferences;
  onPreferencesChange: (preferences: MatchingPreferences) => void;
  onApplyFilters: (preferences: MatchingPreferences) => void;
  userProfile?: any;
  onUpgradeRequired?: () => void;
}

interface FilterSuggestion {
  id: string;
  title: string;
  description: string;
  icon: string;
  changes: Partial<MatchingPreferences>;
  confidence: number;
}

const { width, height } = Dimensions.get('window');

export const SmartFilters: React.FC<SmartFiltersProps> = ({
  visible,
  onClose,
  preferences,
  onPreferencesChange,
  onApplyFilters,
  userProfile,
  onUpgradeRequired,
}) => {
  const [localPreferences, setLocalPreferences] = useState<MatchingPreferences>(preferences);
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'smart'>('basic');
  const [smartSuggestions, setSmartSuggestions] = useState<FilterSuggestion[]>([]);
  const scaleAnim = material3Animations.useScale();
  const premiumAccess = usePremiumAccess();

  useEffect(() => {
    if (visible) {
      generateSmartSuggestions();
    }
  }, [visible, userProfile]);

  const generateSmartSuggestions = () => {
    // AI-powered suggestions based on user behavior and profile
    const suggestions: FilterSuggestion[] = [
      {
        id: 'nearby_active',
        title: 'Active Nearby Users',
        description: 'Show profiles within 10km who were active in the last 24 hours',
        icon: 'location-on',
        changes: {
          maxDistance: 10,
          activityLevel: 'high',
        },
        confidence: 0.85,
      },
      {
        id: 'verified_creators',
        title: 'Verified Creators',
        description: 'Focus on verified content creators for premium interactions',
        icon: 'verified',
        changes: {
          verifiedOnly: true,
          creatorsOnly: true,
        },
        confidence: 0.78,
      },
      {
        id: 'similar_age_interests',
        title: 'Similar Age & Interests',
        description: 'Profiles within 5 years of your age with matching interests',
        icon: 'group',
        changes: {
          ageRange: {
            min: Math.max(18, (userProfile?.age || 25) - 5),
            max: Math.min(60, (userProfile?.age || 25) + 5),
          },
        },
        confidence: 0.92,
      },
      {
        id: 'serious_relationship',
        title: 'Serious Relationships',
        description: 'Users looking for long-term partnerships',
        icon: 'favorite',
        changes: {
          intentionPreference: ['long_term_partner'],
          verifiedOnly: true,
        },
        confidence: 0.75,
      },
      {
        id: 'quick_responders',
        title: 'Quick Responders',
        description: 'Active users who typically respond within an hour',
        icon: 'schedule',
        changes: {
          activityLevel: 'high',
          communicationStyle: ['quick', 'responsive'],
        },
        confidence: 0.80,
      },
    ];

    setSmartSuggestions(suggestions);
  };

  const handlePreferenceUpdate = (updates: Partial<MatchingPreferences>) => {
    const updated = { ...localPreferences, ...updates };
    setLocalPreferences(updated);
    onPreferencesChange(updated);
  };

  const applySuggestion = (suggestion: FilterSuggestion) => {
    handlePreferenceUpdate(suggestion.changes);
  };

  const resetFilters = () => {
    const defaultPrefs: MatchingPreferences = {
      ageRange: { min: 18, max: 35 },
      maxDistance: 50,
      genderPreference: 'any',
      intentionPreference: ['short_term_fun', 'long_term_partner', 'digital_services'],
      verifiedOnly: false,
      creatorsOnly: false,
      activityLevel: 'any',
      communicationStyle: [],
      lifestylePreferences: [],
      dealBreakers: [],
      preferredMeetingStyle: 'mixed',
    };
    setLocalPreferences(defaultPrefs);
    onPreferencesChange(defaultPrefs);
  };

  const renderBasicFilters = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      
      {/* Age Range - Enhanced Picker */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Age Range</Text>
        <AgeRangePicker
          minAge={localPreferences.ageRange.min}
          maxAge={localPreferences.ageRange.max}
          onRangeChange={(min, max) => handlePreferenceUpdate({
            ageRange: { min, max }
          })}
          accentColor="#6650A4"
        />
      </View>

      {/* Distance */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Maximum Distance</Text>
        <Text style={styles.filterSubtitle}>{localPreferences.maxDistance} km</Text>
        
        <CustomSlider
          style={styles.slider}
          minimumValue={1}
          maximumValue={100}
          value={localPreferences.maxDistance}
          onValueChange={(value) => handlePreferenceUpdate({ maxDistance: Math.round(value) })}
          minimumTrackTintColor="#6650A4"
          maximumTrackTintColor="#E0E0E0"
        />
      </View>

      {/* Gender Preference */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Gender Preference</Text>
        <View style={styles.optionsRow}>
          {['any', 'male', 'female'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.optionButton,
                localPreferences.genderPreference === gender && styles.optionButtonActive
              ]}
              onPress={() => handlePreferenceUpdate({ genderPreference: gender as any })}
            >
              <Text style={[
                styles.optionText,
                localPreferences.genderPreference === gender && styles.optionTextActive
              ]}>
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Toggle Options */}
      <View style={styles.filterSection}>
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Verified Only</Text>
            <Text style={styles.toggleSubtitle}>Show only verified profiles</Text>
          </View>
          <Switch
            value={localPreferences.verifiedOnly}
            onValueChange={(value) => handlePreferenceUpdate({ verifiedOnly: value })}
            trackColor={{ false: '#E0E0E0', true: '#6650A4' }}
            thumbColor="#FFFFFF"
          />
        </View>
        
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleTitle}>Creators Only</Text>
            <Text style={styles.toggleSubtitle}>Show only content creator profiles</Text>
          </View>
          <Switch
            value={localPreferences.creatorsOnly}
            onValueChange={(value) => handlePreferenceUpdate({ creatorsOnly: value })}
            trackColor={{ false: '#E0E0E0', true: '#6650A4' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </ScrollView>
  );

  const renderAdvancedFilters = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      
      {/* Activity Level */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Activity Level</Text>
        <View style={styles.optionsRow}>
          {['any', 'low', 'medium', 'high'].map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.optionButton,
                localPreferences.activityLevel === level && styles.optionButtonActive
              ]}
              onPress={() => handlePreferenceUpdate({ activityLevel: level as any })}
            >
              <Text style={[
                styles.optionText,
                localPreferences.activityLevel === level && styles.optionTextActive
              ]}>
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Meeting Style */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Preferred Meeting Style</Text>
        <View style={styles.optionsRow}>
          {['virtual', 'in_person', 'mixed'].map((style) => (
            <TouchableOpacity
              key={style}
              style={[
                styles.optionButton,
                localPreferences.preferredMeetingStyle === style && styles.optionButtonActive
              ]}
              onPress={() => handlePreferenceUpdate({ preferredMeetingStyle: style as any })}
            >
              <Text style={[
                styles.optionText,
                localPreferences.preferredMeetingStyle === style && styles.optionTextActive
              ]}>
                {style.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Relationship Intentions */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Relationship Intentions</Text>
        <View style={styles.intentionsGrid}>
          {[
            'short_term_fun',
            'long_term_partner',
            'digital_services',
            'networking',
            'mixed'
          ].map((intention) => (
            <TouchableOpacity
              key={intention}
              style={[
                styles.intentionChip,
                localPreferences.intentionPreference.includes(intention) && styles.intentionChipActive
              ]}
              onPress={() => {
                const current = localPreferences.intentionPreference;
                const updated = current.includes(intention)
                  ? current.filter(i => i !== intention)
                  : [...current, intention];
                handlePreferenceUpdate({ intentionPreference: updated });
              }}
            >
              <Text style={[
                styles.intentionText,
                localPreferences.intentionPreference.includes(intention) && styles.intentionTextActive
              ]}>
                {intention.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Deal Breakers */}
      <View style={styles.filterSection}>
        <Text style={styles.filterTitle}>Deal Breakers</Text>
        <Text style={styles.filterSubtitle}>Automatically exclude profiles with these interests</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g., smoking, party lifestyle"
          value={localPreferences.dealBreakers?.join(', ')}
          onChangeText={(text) => {
            const dealBreakers = text.split(',').map(item => item.trim()).filter(Boolean);
            handlePreferenceUpdate({ dealBreakers });
          }}
          multiline
        />
      </View>
    </ScrollView>
  );

  const renderSmartSuggestions = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.smartTitle}>AI-Powered Suggestions</Text>
      <Text style={styles.smartSubtitle}>
        Based on your profile and activity patterns, here are personalized filter recommendations:
      </Text>
      
      {smartSuggestions.map((suggestion) => (
        <Animated.View
          key={suggestion.id}
          style={[
            styles.suggestionCard,
            { transform: [{ scale: scaleAnim }] }
          ]}
        >
          <View style={styles.suggestionHeader}>
            <View style={styles.suggestionIcon}>
              <MaterialIcons 
                name={suggestion.icon as any} 
                size={24} 
                color="#6650A4" 
              />
            </View>
            <View style={styles.suggestionInfo}>
              <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
              <Text style={styles.suggestionDescription}>{suggestion.description}</Text>
            </View>
            <View style={styles.confidenceContainer}>
              <Text style={styles.confidenceText}>
                {Math.round(suggestion.confidence * 100)}%
              </Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.applySuggestionButton}
            onPress={() => applySuggestion(suggestion)}
            activeOpacity={0.8}
          >
            <Text style={styles.applySuggestionText}>Apply Filters</Text>
            <MaterialIcons name="arrow-forward" size={16} color="#6650A4" />
          </TouchableOpacity>
        </Animated.View>
      ))}
    </ScrollView>
  );

  const handleTabPress = (tabKey: string) => {
    if ((tabKey === 'advanced' || tabKey === 'smart') && !premiumAccess.canAccess('advancedFilters')) {
      Alert.alert(
        '🔒 Advanced Filters',
        'Upgrade to Pro to use advanced and smart filters for better matches!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          {
            text: 'Upgrade to Pro',
            style: 'default',
            onPress: () => {
              onClose();
              if (onUpgradeRequired) {
                onUpgradeRequired();
              }
            },
          },
        ]
      );
      return;
    }
    setActiveTab(tabKey as any);
  };

  const renderTabBar = () => (
    <View style={styles.tabBar}>
      {[
        { key: 'basic', label: 'Basic', icon: 'tune', requiresPro: false },
        { key: 'advanced', label: 'Advanced', icon: 'settings', requiresPro: true },
        { key: 'smart', label: 'Smart', icon: 'psychology', requiresPro: true },
      ].map((tab) => {
        const isLocked = tab.requiresPro && !premiumAccess.canAccess('advancedFilters');
        return (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab,
              isLocked && styles.lockedTab,
            ]}
            onPress={() => handleTabPress(tab.key)}
          >
            <View style={styles.tabIconContainer}>
              <MaterialIcons 
                name={tab.icon as any} 
                size={20} 
                color={activeTab === tab.key ? '#6650A4' : (isLocked ? '#9CA3AF' : '#666666')} 
              />
              {isLocked && (
                <View style={styles.lockBadge}>
                  <MaterialIcons name="lock" size={12} color="#9C27B0" />
                </View>
              )}
            </View>
            <Text style={[
              styles.tabText,
              activeTab === tab.key && styles.activeTabText,
              isLocked && styles.lockedTabText,
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return renderBasicFilters();
      case 'advanced':
        return renderAdvancedFilters();
      case 'smart':
        return renderSmartSuggestions();
      default:
        return renderBasicFilters();
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#333333" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Smart Filters</Text>
          
          <TouchableOpacity onPress={resetFilters} style={styles.resetButton}>
            <Text style={styles.resetText}>Reset</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        {renderTabBar()}

        {/* Tab Content */}
        <View style={styles.content}>
          {renderTabContent()}
        </View>

        {/* Footer Actions */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => {
              onApplyFilters(localPreferences);
              onClose();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.applyButtonText}>Apply Filters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  resetButton: {
    padding: 4,
  },
  resetText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6650A4',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6650A4',
  },
  lockedTab: {
    opacity: 0.6,
  },
  tabIconContainer: {
    position: 'relative',
  },
  lockBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#F3E5F5',
    borderRadius: 8,
    padding: 2,
    borderWidth: 1,
    borderColor: '#9C27B0',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  activeTabText: {
    color: '#6650A4',
    fontWeight: '600',
  },
  lockedTabText: {
    color: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 32,
    paddingTop: 24,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  filterSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  optionButtonActive: {
    backgroundColor: '#6650A4',
    borderColor: '#6650A4',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
  },
  optionTextActive: {
    color: '#FFFFFF',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  toggleInfo: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  toggleSubtitle: {
    fontSize: 13,
    color: '#666666',
  },
  intentionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intentionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  intentionChipActive: {
    backgroundColor: '#6650A4',
    borderColor: '#6650A4',
  },
  intentionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#666666',
  },
  intentionTextActive: {
    color: '#FFFFFF',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#FAFAFA',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  smartTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 8,
  },
  smartSubtitle: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 24,
  },
  suggestionCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(102, 80, 164, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  suggestionDescription: {
    fontSize: 13,
    color: '#666666',
    lineHeight: 18,
  },
  confidenceContainer: {
    backgroundColor: '#E8F5E8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E7D32',
  },
  applySuggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(102, 80, 164, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  applySuggestionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6650A4',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  applyButton: {
    backgroundColor: '#6650A4',
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
