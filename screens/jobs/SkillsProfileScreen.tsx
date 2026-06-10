import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  StatusBar,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { SKILL_CATEGORIES } from '../../config/constants';
import { jobService } from '../../services/jobService';
import { useAppSelector } from '../../redux/hooks';
import {
  spacing,
  fontSize
} from '../../utils/responsive';
import { getUserFacingError } from '../../utils/userFacingError';

type SkillsProfileNavigationProp = StackNavigationProp<any>;

interface UserSkill {
  id: string;
  skill: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  category: string;
  experience_years?: number;
  certification?: string;
  verified?: boolean;
}

const DEFAULT_SKILL_FORM = {
  skill: '',
  level: 'intermediate' as const,
  category: '',
  experience_years: 0,
  certification: '',
};

export default function SkillsProfileScreen() {
  const navigation = useNavigation<SkillsProfileNavigationProp>();
  const { user } = useAppSelector(state => state.auth);

  const [userSkills, setUserSkills] = useState<UserSkill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [newSkill, setNewSkill] = useState<{
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    category: string;
    experience_years: number;
    certification: string;
  }>(DEFAULT_SKILL_FORM);

  useEffect(() => {
    loadUserSkills();
  }, []);

  const loadUserSkills = async () => {
    if (!user?.id) {
      setError('Please log in to view your profile.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await jobService.getUserSkills(user.id);
      setUserSkills(response || []);
    } catch (err) {
      setError('Failed to load your skills. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingSkill(null);
    setNewSkill(DEFAULT_SKILL_FORM);
    setShowAddSkillModal(true);
  };

  const handleOpenEditModal = (skill: UserSkill) => {
    setEditingSkill(skill);
    setNewSkill({
      skill: skill.skill,
      level: skill.level,
      category: skill.category,
      experience_years: skill.experience_years ?? 0,
      certification: skill.certification ?? '',
    });
    setShowAddSkillModal(true);
  };

  const handleCancelModal = () => {
    setShowAddSkillModal(false);
    setEditingSkill(null);
    setNewSkill(DEFAULT_SKILL_FORM);
  };

  const handleSaveSkill = async () => {
    if (!newSkill.skill.trim()) {
      Alert.alert('Missing information', 'Please enter a skill name.');
      return;
    }
    if (!newSkill.category) {
      Alert.alert('Missing information', 'Please select a category.');
      return;
    }

    // Duplicate guard (only for new skills)
    if (!editingSkill) {
      const duplicate = userSkills.some(
        s => s.skill.trim().toLowerCase() === newSkill.skill.trim().toLowerCase()
      );
      if (duplicate) {
        Alert.alert('Duplicate skill', 'You have already added a skill with that name.');
        return;
      }
    }

    setIsSaving(true);
    try {
      if (editingSkill) {
        // Update existing skill
        await jobService.updateUserSkill(editingSkill.id, {
          skill: newSkill.skill.trim(),
          level: newSkill.level,
          category: newSkill.category,
          experience_years: newSkill.experience_years,
          certification: newSkill.certification.trim() || undefined,
        });
        setUserSkills(prev =>
          prev.map(s =>
            s.id === editingSkill.id
              ? {
                  ...s,
                  skill: newSkill.skill.trim(),
                  level: newSkill.level,
                  category: newSkill.category,
                  experience_years: newSkill.experience_years,
                  certification: newSkill.certification.trim() || undefined,
                }
              : s
          )
        );
      } else {
        // Create new skill
        const skillData = {
          user_id: user?.id,
          skill: newSkill.skill.trim(),
          level: newSkill.level,
          category: newSkill.category,
          experience_years: newSkill.experience_years,
          certification: newSkill.certification.trim() || undefined,
          verified: false,
        };
        const createdSkill = await jobService.createUserSkill(skillData);
        setUserSkills(prev => [createdSkill, ...prev]);
      }

      setShowAddSkillModal(false);
      setEditingSkill(null);
      setNewSkill(DEFAULT_SKILL_FORM);
    } catch (err) {
      const action = editingSkill ? 'update this skill' : 'add this skill';
      const friendly = getUserFacingError(err, { action, displayStyle: 'alert' });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSkill = (skillId: string) => {
    Alert.alert(
      'Delete Skill',
      'Are you sure you want to remove this skill from your profile?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await jobService.deleteUserSkill(skillId);
              setUserSkills(prev => prev.filter(s => s.id !== skillId));
            } catch (err) {
              const friendly = getUserFacingError(err, { action: 'delete this skill', displayStyle: 'alert' });
              Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
            }
          },
        },
      ]
    );
  };

  const handleUpdateSkillLevel = async (skillId: string, newLevel: UserSkill['level']) => {
    try {
      await jobService.updateUserSkill(skillId, { level: newLevel });
      setUserSkills(prev =>
        prev.map(s => s.id === skillId ? { ...s, level: newLevel } : s)
      );
    } catch (err) {
      const friendly = getUserFacingError(err, { action: 'update this skill level', displayStyle: 'alert' });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  const getLevelColor = (level: UserSkill['level']) => {
    switch (level) {
      case 'beginner': return { bg: '#FEE2E2', text: '#DC2626', border: '#F87171' };
      case 'intermediate': return { bg: '#FEF3C7', text: '#D97706', border: '#FBBF24' };
      case 'advanced': return { bg: '#DBEAFE', text: '#2563EB', border: '#60A5FA' };
      case 'expert': return { bg: '#D1FAE5', text: '#059669', border: '#34D399' };
      default: return { bg: '#F3F4F6', text: '#6B7280', border: '#D1D5DB' };
    }
  };

  const groupedSkills = userSkills.reduce((acc, skill) => {
    const cat = skill.category || 'General';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(skill);
    return acc;
  }, {} as Record<string, UserSkill[]>);

  const skillCategories = Object.keys(SKILL_CATEGORIES);

  const totalExperience = userSkills.reduce((sum, s) => sum + (s.experience_years || 0), 0);
  const avgExperience = userSkills.length > 0 ? Math.round(totalExperience / userSkills.length) : 0;

  const renderSkillCard = (skill: UserSkill) => (
    <View key={skill.id} style={styles.skillCard}>
      <View style={styles.skillCardHeader}>
        <View style={styles.skillCardInfo}>
          <View style={styles.skillNameRow}>
            <Text style={styles.skillName}>{skill.skill}</Text>
            {skill.verified && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons name="verified" size={14} color="#15803d" />
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>
          {skill.experience_years !== undefined && skill.experience_years > 0 && (
            <Text style={styles.experienceText}>
              {skill.experience_years} year{skill.experience_years !== 1 ? 's' : ''} experience
            </Text>
          )}
          {skill.certification ? (
            <Text style={styles.certificationText}>
              {skill.certification}
            </Text>
          ) : null}
        </View>
        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={() => handleOpenEditModal(skill)}
            style={styles.editButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="edit" size={16} color="#2563EB" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeleteSkill(skill.id)}
            style={styles.deleteButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons name="delete-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Skill Level Selector */}
      <View style={styles.levelSection}>
        <Text style={styles.levelLabel}>Skill Level:</Text>
        <View style={styles.levelRow}>
          {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map((level) => {
            const isSelected = skill.level === level;
            const color = getLevelColor(level);
            return (
              <TouchableOpacity
                key={level}
                onPress={() => handleUpdateSkillLevel(skill.id, level)}
                style={[
                  styles.levelChip,
                  {
                    backgroundColor: isSelected ? color.bg : '#FFFFFF',
                    borderColor: isSelected ? color.border : '#D1D5DB',
                  },
                ]}
              >
                <Text style={[
                  styles.levelChipText,
                  { color: isSelected ? color.text : '#6B7280' },
                ]}>
                  {level}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <LinearGradient colors={['#059669', '#047857', '#065F46']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="light-content" backgroundColor="#059669" />
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="white" />
            <Text style={styles.loadingText}>Loading your profile...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  if (error) {
    return (
      <LinearGradient colors={['#059669', '#047857', '#065F46']} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
          <StatusBar barStyle="light-content" backgroundColor="#059669" />
          <View style={styles.centerContainer}>
            <MaterialIcons name="error-outline" size={48} color="rgba(255,255,255,0.8)" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={loadUserSkills} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#059669', '#047857', '#065F46']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />

        {/* ── Add / Edit Skill Modal ── */}
        <Modal
          visible={showAddSkillModal}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={handleCancelModal}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderRow}>
                <TouchableOpacity onPress={handleCancelModal}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>
                  {editingSkill ? 'Edit Skill' : 'Add Skill'}
                </Text>
                <TouchableOpacity onPress={handleSaveSkill} disabled={isSaving}>
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : (
                    <Text style={styles.modalAddText}>
                      {editingSkill ? 'Save' : 'Add'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <KeyboardAvoidingView
              style={{ flex: 1 }}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
                contentInsetAdjustmentBehavior="automatic"
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Category Selection */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Category *</Text>
                  <View style={styles.categoryGrid}>
                    {skillCategories.map((category) => (
                      <TouchableOpacity
                        key={category}
                        onPress={() => setNewSkill(prev => ({ ...prev, category }))}
                        style={[
                          styles.categoryChip,
                          {
                            backgroundColor: newSkill.category === category ? '#059669' : '#FFFFFF',
                            borderColor: newSkill.category === category ? '#059669' : '#D1D5DB',
                          },
                        ]}
                      >
                        <Text style={[
                          styles.categoryChipText,
                          { color: newSkill.category === category ? '#FFFFFF' : '#374151' },
                        ]}>
                          {category}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Skill Name */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Skill Name *</Text>
                  <TextInput
                    value={newSkill.skill}
                    onChangeText={(text) => setNewSkill(prev => ({ ...prev, skill: text }))}
                    placeholder="e.g., Bricklaying, Pipe Installation, House Wiring"
                    placeholderTextColor="#9CA3AF"
                    style={styles.textInput}
                    autoCorrect={false}
                  />
                </View>

                {/* Skill Level */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Skill Level</Text>
                  <View style={styles.levelSelectRow}>
                    {(['beginner', 'intermediate', 'advanced', 'expert'] as const).map((level) => {
                      const isSelected = newSkill.level === level;
                      const color = getLevelColor(level);
                      return (
                        <TouchableOpacity
                          key={level}
                          onPress={() => setNewSkill(prev => ({ ...prev, level }))}
                          style={[
                            styles.levelSelectChip,
                            {
                              backgroundColor: isSelected ? color.bg : '#FFFFFF',
                              borderColor: isSelected ? color.border : '#D1D5DB',
                            },
                          ]}
                        >
                          <Text style={[
                            styles.levelSelectText,
                            { color: isSelected ? color.text : '#6B7280' },
                          ]}>
                            {level}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Experience Years */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Years of Experience</Text>
                  <TextInput
                    value={newSkill.experience_years > 0 ? newSkill.experience_years.toString() : ''}
                    onChangeText={(text) =>
                      setNewSkill(prev => ({ ...prev, experience_years: parseInt(text, 10) || 0 }))
                    }
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>

                {/* Certification */}
                <View style={styles.formSection}>
                  <Text style={styles.formLabel}>Certification (Optional)</Text>
                  <TextInput
                    value={newSkill.certification}
                    onChangeText={(text) => setNewSkill(prev => ({ ...prev, certification: text }))}
                    placeholder="e.g., Electrical Installation Certificate"
                    placeholderTextColor="#9CA3AF"
                    style={styles.textInput}
                    autoCorrect={false}
                  />
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity
              onPress={handleOpenAddModal}
              style={styles.addButton}
            >
              <MaterialIcons name="add" size={18} color="#059669" />
              <Text style={styles.addButtonText}>Add Skill</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Summary Card */}
          <View style={styles.profileSummary}>
            <View style={styles.profileAvatarContainer}>
              <View style={styles.profileAvatar}>
                <MaterialIcons name="person" size={28} color="#059669" />
              </View>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName} numberOfLines={1}>
                {user?.fullName || user?.email?.split('@')[0] || 'Job Seeker'}
              </Text>
              <Text style={styles.profileSubtitle}>
                {userSkills.length} skill{userSkills.length !== 1 ? 's' : ''}{' '}
                {userSkills.filter(s => s.verified).length} verified
              </Text>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{userSkills.length}</Text>
              <Text style={styles.statLabel}>Skills</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{Object.keys(groupedSkills).length}</Text>
              <Text style={styles.statLabel}>Categories</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{avgExperience}yr</Text>
              <Text style={styles.statLabel}>Avg Exp</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {/* Skills Overview Card */}
          {userSkills.length > 0 && (
            <View style={styles.overviewCard}>
              <Text style={styles.sectionTitle}>Skills Overview</Text>
              <View style={styles.overviewGrid}>
                {Object.entries(groupedSkills).map(([category, skills]) => (
                  <View key={category} style={styles.overviewItem}>
                    <Text style={styles.overviewCategory}>{category}</Text>
                    <Text style={styles.overviewCount}>{skills.length}</Text>
                    <Text style={styles.overviewLabel}>
                      skill{skills.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Skills by Category */}
          {Object.entries(groupedSkills).map(([category, skills]) => (
            <View key={category} style={styles.categorySection}>
              <View style={styles.categorySectionHeader}>
                <Text style={styles.categorySectionTitle}>{category}</Text>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {skills.length} skill{skills.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
              {skills.map(renderSkillCard)}
            </View>
          ))}

          {/* Empty State */}
          {userSkills.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialIcons name="work-outline" size={56} color="rgba(255,255,255,0.7)" />
              <Text style={styles.emptyTitle}>No Skills Added Yet</Text>
              <Text style={styles.emptyDescription}>
                Add your skills to improve your job match rate and help employers find you.
              </Text>
              <TouchableOpacity
                onPress={handleOpenAddModal}
                style={styles.emptyButton}
              >
                <MaterialIcons name="add" size={20} color="white" />
                <Text style={styles.emptyButtonText}>Add Your First Skill</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Tips Section */}
          {userSkills.length > 0 && (
            <View style={styles.tipsCard}>
              <View style={styles.tipsHeader}>
                <MaterialIcons name="lightbulb-outline" size={20} color="#1D4ED8" />
                <Text style={styles.tipsTitle}>Tips to Improve Your Profile</Text>
              </View>
              <View style={styles.tipsList}>
                <Text style={styles.tipItem}>Get your skills verified by completing certifications</Text>
                <Text style={styles.tipItem}>Add more skills to increase your job match rate</Text>
                <Text style={styles.tipItem}>Update your skill levels as you gain experience</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    marginTop: spacing.md,
  },
  errorText: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: spacing.md,
  },
  retryButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: spacing.lg,
  },
  retryButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: '600',
  },

  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
  },
  addButtonText: {
    color: '#059669',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  // Profile Summary
  profileSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  profileAvatarContainer: {
    marginRight: spacing.md,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileSubtitle: {
    fontSize: fontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },

  // Overview Card
  overviewCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: spacing.md,
  },
  overviewGrid: {
    gap: 12,
  },
  overviewItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: spacing.md,
  },
  overviewCategory: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  overviewCount: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#059669',
  },
  overviewLabel: {
    fontSize: fontSize.xs,
    color: '#6B7280',
  },

  // Category Section
  categorySection: {
    marginBottom: 24,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categorySectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  categoryBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 9999,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryBadgeText: {
    fontSize: fontSize.xs,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },

  // Skill Card
  skillCard: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  skillCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  skillCardInfo: {
    flex: 1,
  },
  skillNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 6,
  },
  skillName: {
    fontSize: fontSize.base,
    fontWeight: 'bold',
    color: '#111827',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 9999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 3,
  },
  verifiedText: {
    color: '#15803d',
    fontSize: fontSize.xs,
    fontWeight: '500',
  },
  experienceText: {
    fontSize: fontSize.sm,
    color: '#6B7280',
    marginBottom: 2,
  },
  certificationText: {
    fontSize: fontSize.sm,
    color: '#059669',
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editButton: {
    backgroundColor: '#EFF6FF',
    borderRadius: 9999,
    padding: 6,
  },
  deleteButton: {
    backgroundColor: '#FEF2F2',
    borderRadius: 9999,
    padding: 6,
  },
  levelSection: {
    marginTop: 4,
  },
  levelLabel: {
    fontSize: fontSize.xs,
    color: '#6B7280',
    marginBottom: 6,
  },
  levelRow: {
    flexDirection: 'row',
    gap: 6,
  },
  levelChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelChipText: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    textTransform: 'capitalize',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: spacing.lg,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    fontSize: fontSize.base,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyButtonText: {
    color: 'white',
    fontSize: fontSize.base,
    fontWeight: '600',
  },

  // Tips Card
  tipsCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.lg,
    marginTop: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  tipsTitle: {
    fontSize: fontSize.base,
    fontWeight: 'bold',
    color: '#1D4ED8',
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: fontSize.sm,
    color: '#1E40AF',
    paddingLeft: 8,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalCancelText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: fontSize.base,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalAddText: {
    color: '#059669',
    fontWeight: '600',
    fontSize: fontSize.base,
  },

  // Form
  formSection: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: fontSize.base,
    fontWeight: '600',
    color: '#111827',
    marginBottom: spacing.sm,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.base,
    color: '#111827',
  },
  levelSelectRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  levelSelectChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  levelSelectText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
