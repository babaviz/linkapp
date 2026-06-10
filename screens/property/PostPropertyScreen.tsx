/**
 * PostPropertyScreen - Property listing form for landlords/property owners
 * Refactored to use ListPropertyForm component
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { getDynamicDimensions, spacing } from '../../utils/responsive';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { createProperty } from '../../redux/slices/propertySlice';
import { PropertyFormData } from '../../types/property';
import ListPropertyForm from '../../components/property/ListPropertyForm';
import { colors } from '../../src/theme/colors';

export default function PostPropertyScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { width: screenWidth, isTablet } = getDynamicDimensions();
  const { isSubmitting } = useAppSelector(state => state.property);
  const { user } = useAppSelector(state => state.auth);

  // Handle form submission
  const handleSubmit = async (formData: PropertyFormData) => {
    try {
      if (!user?.id) {
        Alert.alert(
          'Authentication Required', 
          'Please log in to post a property.', 
          [{ text: 'OK' }]
        );
        throw new Error('User not authenticated');
      }

      // Dispatch the createProperty action
      const result = await dispatch(createProperty({
        propertyData: formData,
        ownerId: user.id
      })).unwrap();

      Alert.alert(
        'Success!',
        `Your property "${result.title}" has been posted successfully and is now live on LinkApp.`,
        [
          {
            text: 'View Properties',
            onPress: () => {
              // Navigate to user's properties or property listings
              navigation.goBack();
            }
          },
          {
            text: 'Post Another',
            style: 'default',
            onPress: () => {
              // Stay on the form to post another property
            }
          }
        ]
      );
    } catch (error: any) {

      let errorMessage = 'Failed to post your property. Please try again.';
      
      // Provide more specific error messages
      if (error.message) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('authentication') || error.message.includes('auth')) {
          errorMessage = 'Authentication error. Please log in and try again.';
        } else if (error.message.includes('validation')) {
          errorMessage = 'Please check your property details and try again.';
        } else if (error.message.includes('upload')) {
          errorMessage = 'Failed to upload property images. Please try with different images.';
        } else {
          errorMessage = error.message;
        }
      }

      console.error("❌ SUPABASE INSERT ERROR:", {
        message: error.message, // e.g., "new row violates check constraint..."
        code: error.code,       // e.g., "23514"
        details: error.details, // Tells you exactly which row failed
        hint: error.hint        // Database suggestions
      });
      
      Alert.alert(
        'Error Posting Property',
        errorMessage,
        [
          { text: 'OK' },
          {
            text: 'Retry',
            onPress: () => handleSubmit(formData)
          }
        ]
      );
      
      // Re-throw to let the form handle the error state
      throw error;
    }
  };

  // Handle form cancellation
  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Clean Header - Post Property */}
        <View style={styles.headerContainer}>
          <View style={styles.headerContent}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back" size={24} color={colors.modules.property.primary.main} />
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={[
                styles.title,
                {
                  fontSize: isTablet ? 28 : screenWidth < 360 ? 20 : 24,
                }
              ]}>
                Post Property
              </Text>
              <Text style={[
                styles.subtitle,
                {
                  fontSize: isTablet ? 15 : screenWidth < 360 ? 12 : 14,
                }
              ]}>
                List your property and reach thousands of potential tenants
              </Text>
            </View>
          </View>
        </View>

        {/* Property Form */}
        <ListPropertyForm
          mode="create"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.modules.property.background.secondary,
  },
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    backgroundColor: colors.modules.property.background.primary,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border.light,
    shadowColor: colors.common.shadow.sm,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.modules.property.primary.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    color: colors.common.text.primary,
    fontWeight: '700',
    letterSpacing: -0.3,
    marginBottom: spacing.xs / 2,
  },
  subtitle: {
    color: colors.common.text.secondary,
    fontWeight: '400',
    letterSpacing: 0,
    lineHeight: 18,
  },
});
