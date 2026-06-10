/**
 * ListPropertyForm - Comprehensive Property Form Component
 * Used for both creating new properties and editing existing ones
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  FlatList,
  Modal,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../theme';
import { colors as moduleColors } from '../../src/theme/colors';
import { useAppSelector } from '../../redux/hooks';
import { getUserFacingError } from '../../utils/userFacingError';
import { 
  PropertyType, 
  PropertyFormData, 
  Property,
  COMMON_AMENITIES, 
  KENYAN_COUNTIES,
  PROPERTY_CATEGORIES,
  MAX_PROPERTY_IMAGES
} from '../../types/property';
import LocationPicker from '../common/LocationPicker';

interface ListPropertyFormProps {
  initialData?: Property | null;
  mode: 'create' | 'edit';
  onSubmit: (data: PropertyFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

interface FormErrors {
  title?: string;
  description?: string;
  price?: string;
  property_type?: string;
  location?: string;
  images?: string;
  contact_phone?: string;
  contact_email?: string;
  bedrooms?: string;
  bathrooms?: string;
  area_sqm?: string;
}

const ListPropertyForm: React.FC<ListPropertyFormProps> = ({
  initialData,
  mode,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const { user } = useAppSelector(state => state.auth);

  // Form state
  const [formData, setFormData] = useState<PropertyFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    property_type: initialData?.property_type || 'houses',
    price: initialData?.price || 0,
    price_period: 'monthly',
    location: initialData?.location || {
      address: '',
      coordinates: { latitude: -1.286389, longitude: 36.817223 }, // Nairobi default
      county: 'Nairobi',
      town: '',
      neighborhood: ''
    },
    images: initialData?.images || [],
    amenities: initialData?.amenities || [],
    bedrooms: initialData?.bedrooms || undefined,
    bathrooms: initialData?.bathrooms || undefined,
    area_sqm: initialData?.area_sqm || undefined,
    contact_phone: initialData?.contact_phone || user?.phone || '',
    contact_email: initialData?.contact_email || user?.email || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showCountyModal, setShowCountyModal] = useState(false);
  const [showAmenitiesModal, setShowAmenitiesModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when initial data changes (for edit mode)
  useEffect(() => {
    if (initialData && mode === 'edit') {
      setFormData({
        title: initialData.title,
        description: initialData.description || '',
        property_type: initialData.property_type,
        price: initialData.price,
        price_period: 'monthly', // Default since it's not in Property interface
        location: initialData.location,
        images: initialData.images || [],
        amenities: initialData.amenities || [],
        bedrooms: initialData.bedrooms,
        bathrooms: initialData.bathrooms,
        area_sqm: initialData.area_sqm,
        contact_phone: initialData.contact_phone || user?.phone || '',
        contact_email: initialData.contact_email || user?.email || ''
      });
    }
  }, [initialData, mode, user]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    // Required fields with better validation
    if (!formData.title.trim()) {
      newErrors.title = 'Property title is required';
    } else if (formData.title.trim().length < 5) {
      newErrors.title = 'Property title must be at least 5 characters long';
    } else if (formData.title.trim().length > 100) {
      newErrors.title = 'Property title must be less than 100 characters';
    }

    if (!formData.price || formData.price <= 0) {
      newErrors.price = 'Valid price is required';
    } else if (formData.price < 1000) {
      newErrors.price = 'Price must be at least KSH 1,000';
    } else if (formData.price > 1000000000) {
      newErrors.price = 'Price cannot exceed KSH 1 billion';
    }

    if (!formData.property_type) {
      newErrors.property_type = 'Please select a property type';
    }

    if (!formData.location.address.trim()) {
      newErrors.location = 'Property address is required';
    } else if (formData.location.address.trim().length < 10) {
      newErrors.location = 'Please provide a more detailed address';
    }

    if (formData.images.length === 0) {
      newErrors.images = 'At least one property image is required';
    } else if (formData.images.length > MAX_PROPERTY_IMAGES) {
      newErrors.images = `Maximum ${MAX_PROPERTY_IMAGES} images allowed`;
    }

    // Contact validation - require at least one method
    const hasPhone = formData.contact_phone.trim().length > 0;
    const hasEmail = formData.contact_email.trim().length > 0;
    
    if (!hasPhone && !hasEmail) {
      newErrors.contact_phone = 'Phone number or email is required';
      newErrors.contact_email = 'Phone number or email is required';
    }

    // Phone validation if provided
    if (hasPhone) {
      const phoneRegex = /^(\+254|0)[7-9]\d{8}$/;
      const cleanPhone = formData.contact_phone.replace(/[\s-]/g, '');
      if (!phoneRegex.test(cleanPhone)) {
        newErrors.contact_phone = 'Enter a valid Kenyan phone number (e.g., +254712345678)';
      }
    }

    // Email validation if provided
    if (hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contact_email.trim())) {
        newErrors.contact_email = 'Please enter a valid email address';
      }
    }

    // Optional field validations
    if (formData.description.trim().length > 1000) {
      newErrors.description = 'Description must be less than 1000 characters';
    }

    if (formData.bedrooms && (formData.bedrooms < 0 || formData.bedrooms > 20)) {
      newErrors.bedrooms = 'Bedrooms must be between 0 and 20';
    }

    if (formData.bathrooms && (formData.bathrooms < 0 || formData.bathrooms > 20)) {
      newErrors.bathrooms = 'Bathrooms must be between 0 and 20';
    }

    if (formData.area_sqm && (formData.area_sqm < 1 || formData.area_sqm > 100000)) {
      newErrors.area_sqm = 'Area must be between 1 and 100,000 square meters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Image handling
  const pickImages = async () => {
    if (formData.images.length >= MAX_PROPERTY_IMAGES) {
      Alert.alert('Maximum Images', `You can only upload up to ${MAX_PROPERTY_IMAGES} images.`);
      return;
    }

    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      aspect: [16, 9],
    });

    if (!result.canceled && result.assets) {
      const newImages = result.assets
        .slice(0, MAX_PROPERTY_IMAGES - formData.images.length)
        .map(asset => asset.uri);
      
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Amenities handling
  const toggleAmenity = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  // Submit form
  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (error: any) {
      const action = mode === 'edit' ? 'update this property' : 'create this property';
      const friendly = getUserFacingError(error, { action, displayStyle: 'alert' });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
    >
      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        
        {/* Title */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Property Title *</Text>
          <TextInput
            value={formData.title}
            onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            placeholder="e.g., 3 Bedroom House in Karen"
            style={[styles.textInput, errors.title && styles.textInputError]}
            placeholderTextColor="#9CA3AF"
          />
          {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
        </View>

        {/* Property Type */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Property Type *</Text>
          <View style={styles.propertyTypeContainer}>
            {PROPERTY_CATEGORIES.map(category => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setFormData(prev => ({ ...prev, property_type: category.id as PropertyType }))}
                style={[
                  styles.propertyTypeButton,
                  formData.property_type === category.id && styles.propertyTypeButtonActive
                ]}
              >
                <Text style={styles.propertyTypeIcon}>{category.icon}</Text>
                <Text style={[
                  styles.propertyTypeText,
                  formData.property_type === category.id && styles.propertyTypeTextActive
                ]}>
                  {category.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {errors.property_type && <Text style={styles.errorText}>{errors.property_type}</Text>}
        </View>

        {/* Price */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Price (KSH) *</Text>
          <TextInput
            value={formData.price ? formData.price.toString() : ''}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              price: text ? parseInt(text.replace(/[^0-9]/g, '')) || 0 : 0 
            }))}
            placeholder="e.g., 50000"
            keyboardType="numeric"
            style={[styles.textInput, errors.price && styles.textInputError]}
            placeholderTextColor="#9CA3AF"
          />
          {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
        </View>

        {/* Price Period */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Price Period</Text>
          <View style={styles.periodContainer}>
            {[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
              { value: 'one_time', label: 'One-time' }
            ].map(period => (
              <TouchableOpacity
                key={period.value}
                onPress={() => setFormData(prev => ({ ...prev, price_period: period.value as 'monthly' | 'yearly' | 'one_time' }))}
                style={[
                  styles.periodButton,
                  formData.price_period === period.value && styles.periodButtonActive
                ]}
              >
                <Text style={[
                  styles.periodText,
                  formData.price_period === period.value && styles.periodTextActive
                ]}>
                  {period.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        
        {/* Interactive Location Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Property Location *</Text>
          <LocationPicker
            value={formData.location.coordinates && formData.location.address ? {
              latitude: formData.location.coordinates.latitude,
              longitude: formData.location.coordinates.longitude,
              address: formData.location.address
            } : null}
            onLocationSelect={(location) => {
              setFormData(prev => ({
                ...prev,
                location: {
                  ...prev.location,
                  address: location.address,
                  coordinates: {
                    latitude: location.latitude,
                    longitude: location.longitude
                  }
                }
              }));
            }}
            placeholder="Select property location on map"
            required={true}
          />
          {errors.location && <Text style={styles.errorText}>{errors.location}</Text>}
        </View>

        {/* County */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>County *</Text>
          <TouchableOpacity
            onPress={() => setShowCountyModal(true)}
            style={styles.selectInput}
          >
            <Text style={styles.selectInputText}>{formData.location.county}</Text>
            <MaterialIcons name="keyboard-arrow-down" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* Town/City */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Town/City</Text>
          <TextInput
            value={formData.location.town}
            onChangeText={(text) => setFormData(prev => ({
              ...prev,
              location: { ...prev.location, town: text }
            }))}
            placeholder="e.g., Nairobi"
            style={styles.textInput}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Neighborhood */}
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Neighborhood (Optional)</Text>
          <TextInput
            value={formData.location.neighborhood || ''}
            onChangeText={(text) => setFormData(prev => ({
              ...prev,
              location: { ...prev.location, neighborhood: text }
            }))}
            placeholder="e.g., Westlands, Karen, etc."
            style={styles.textInput}
            placeholderTextColor="#9CA3AF"
          />
        </View>
      </View>

      {/* Property Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Property Details</Text>
        
        <View style={styles.rowContainer}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Bedrooms</Text>
            <TextInput
              value={formData.bedrooms ? formData.bedrooms.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ 
                ...prev, 
                bedrooms: text ? parseInt(text) || undefined : undefined 
              }))}
              placeholder="e.g., 3"
              keyboardType="numeric"
              style={[styles.textInput, errors.bedrooms && styles.textInputError]}
              placeholderTextColor="#9CA3AF"
            />
            {errors.bedrooms && <Text style={styles.errorText}>{errors.bedrooms}</Text>}
          </View>
          
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.inputLabel}>Bathrooms</Text>
            <TextInput
              value={formData.bathrooms ? formData.bathrooms.toString() : ''}
              onChangeText={(text) => setFormData(prev => ({ 
                ...prev, 
                bathrooms: text ? parseInt(text) || undefined : undefined 
              }))}
              placeholder="e.g., 2"
              keyboardType="numeric"
              style={[styles.textInput, errors.bathrooms && styles.textInputError]}
              placeholderTextColor="#9CA3AF"
            />
            {errors.bathrooms && <Text style={styles.errorText}>{errors.bathrooms}</Text>}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Area (Square Meters)</Text>
          <TextInput
            value={formData.area_sqm ? formData.area_sqm.toString() : ''}
            onChangeText={(text) => setFormData(prev => ({ 
              ...prev, 
              area_sqm: text ? parseFloat(text) || undefined : undefined 
            }))}
            placeholder="e.g., 120"
            keyboardType="numeric"
            style={[styles.textInput, errors.area_sqm && styles.textInputError]}
            placeholderTextColor="#9CA3AF"
          />
          {errors.area_sqm && <Text style={styles.errorText}>{errors.area_sqm}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            value={formData.description}
            onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your property..."
            multiline
            numberOfLines={4}
            style={[styles.textInput, styles.textArea, errors.description && styles.textInputError]}
            placeholderTextColor="#9CA3AF"
          />
          {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          <Text style={styles.characterCount}>{formData.description.length}/1000 characters</Text>
        </View>
      </View>

      {/* Images */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Property Images *</Text>
          <Text style={styles.imageCount}>{formData.images.length}/{MAX_PROPERTY_IMAGES}</Text>
        </View>
        
        {formData.images.length > 0 && (
          <FlatList
            data={formData.images}
            horizontal
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item, index }) => (
              <View style={styles.imageContainer}>
                <Image source={{ uri: item }} style={styles.imagePreview} />
                <TouchableOpacity
                  onPress={() => removeImage(index)}
                  style={styles.removeImageButton}
                >
                  <Text style={styles.removeImageText}>×</Text>
                </TouchableOpacity>
              </View>
            )}
            showsHorizontalScrollIndicator={false}
            style={styles.imageList}
          />
        )}

        <TouchableOpacity
          onPress={pickImages}
          disabled={formData.images.length >= MAX_PROPERTY_IMAGES}
          style={[
            styles.addImageButton,
            formData.images.length >= MAX_PROPERTY_IMAGES && styles.addImageButtonDisabled
          ]}
        >
          <Text style={[
            styles.addImageIcon,
            formData.images.length >= MAX_PROPERTY_IMAGES && styles.addImageIconDisabled
          ]}>📷</Text>
          <Text style={[
            styles.addImageText,
            formData.images.length >= MAX_PROPERTY_IMAGES && styles.addImageTextDisabled
          ]}>
            {formData.images.length >= MAX_PROPERTY_IMAGES ? 'Maximum images reached' : 'Add Property Photos'}
          </Text>
          {formData.images.length < MAX_PROPERTY_IMAGES && (
            <Text style={styles.addImageSubtext}>
              Tap to add up to {MAX_PROPERTY_IMAGES - formData.images.length} more images
            </Text>
          )}
        </TouchableOpacity>
        {errors.images && <Text style={styles.errorText}>{errors.images}</Text>}
      </View>

      {/* Amenities */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <TouchableOpacity
            onPress={() => setShowAmenitiesModal(true)}
            style={styles.selectButton}
          >
            <Text style={styles.selectButtonText}>Select</Text>
          </TouchableOpacity>
        </View>
        
        {formData.amenities.length > 0 ? (
          <View style={styles.amenitiesContainer}>
            {formData.amenities.map((amenity, index) => (
              <View
                key={index}
                style={styles.amenityChip}
              >
                <Text style={styles.amenityText}>{amenity}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noAmenitiesText}>No amenities selected</Text>
        )}
      </View>

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            value={formData.contact_phone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contact_phone: text }))}
            placeholder="e.g., +254712345678"
            keyboardType="phone-pad"
            style={[styles.textInput, errors.contact_phone && styles.textInputError]}
            placeholderTextColor="#9CA3AF"
          />
          {errors.contact_phone && <Text style={styles.errorText}>{errors.contact_phone}</Text>}
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            value={formData.contact_email}
            onChangeText={(text) => setFormData(prev => ({ ...prev, contact_email: text }))}
            placeholder="e.g., your@email.com"
            keyboardType="email-address"
            style={[styles.textInput, errors.contact_email && styles.textInputError]}
            placeholderTextColor="#9CA3AF"
          />
          {errors.contact_email && <Text style={styles.errorText}>{errors.contact_email}</Text>}
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          onPress={onCancel}
          style={styles.cancelButton}
          disabled={isSubmitting || isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting || isLoading}
          style={[
            styles.submitButton,
            (isSubmitting || isLoading) && styles.submitButtonDisabled
          ]}
        >
          {(isSubmitting || isLoading) ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>
              {mode === 'create' ? 'Post Property' : 'Update Property'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* County Selection Modal */}
      <Modal
        visible={showCountyModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select County</Text>
            <TouchableOpacity onPress={() => setShowCountyModal(false)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={KENYAN_COUNTIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  setFormData(prev => ({
                    ...prev,
                    location: { ...prev.location, county: item }
                  }));
                  setShowCountyModal(false);
                }}
                style={[
                  styles.modalOption,
                  formData.location.county === item && styles.modalOptionSelected
                ]}
              >
                <Text style={[
                  styles.modalOptionText,
                  formData.location.county === item && styles.modalOptionTextSelected
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>

      {/* Amenities Selection Modal */}
      <Modal
        visible={showAmenitiesModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Amenities</Text>
            <TouchableOpacity onPress={() => setShowAmenitiesModal(false)}>
              <Text style={styles.modalDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={COMMON_AMENITIES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => toggleAmenity(item)}
                style={[
                  styles.modalOption,
                  formData.amenities.includes(item) && styles.modalOptionSelected
                ]}
              >
                <Text style={[
                  styles.modalOptionText,
                  formData.amenities.includes(item) && styles.modalOptionTextSelected
                ]}>
                  {item}
                </Text>
                {formData.amenities.includes(item) && (
                  <Text style={styles.modalOptionCheck}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryVariants[50],
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: colors.primaryVariants[900],
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.primaryVariants[100],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textInputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 4,
  },
  characterCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  propertyTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  propertyTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  propertyTypeButtonActive: {
    backgroundColor: colors.primaryVariants[600],
    borderColor: colors.primaryVariants[600],
  },
  propertyTypeIcon: {
    marginRight: 6,
    fontSize: 16,
  },
  propertyTypeText: {
    fontWeight: '500',
    color: '#374151',
  },
  propertyTypeTextActive: {
    color: '#FFFFFF',
  },
  periodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  periodButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: moduleColors.common.border.light,
    backgroundColor: moduleColors.modules.property.background.primary,
  },
  periodButtonActive: {
    backgroundColor: moduleColors.modules.property.primary.main,
    borderColor: moduleColors.modules.property.primary.main,
  },
  periodText: {
    fontWeight: '500',
    color: moduleColors.common.text.secondary,
  },
  periodTextActive: {
    color: moduleColors.modules.property.primary.contrast,
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: 16,
    color: '#1F2937',
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    flex: 1,
    marginRight: 8,
  },
  imageCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  imageList: {
    marginBottom: 12,
  },
  imageContainer: {
    marginRight: 12,
    position: 'relative',
  },
  imagePreview: {
    width: 96,
    height: 96,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addImageButton: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primaryVariants[300],
    borderRadius: 8,
    paddingVertical: 24,
    alignItems: 'center',
    backgroundColor: colors.primaryVariants[50],
  },
  addImageButtonDisabled: {
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  addImageIcon: {
    fontSize: 24,
    marginBottom: 8,
    color: colors.primaryVariants[600],
  },
  addImageIconDisabled: {
    color: '#D1D5DB',
  },
  addImageText: {
    fontWeight: '500',
    color: colors.primaryVariants[600],
  },
  addImageTextDisabled: {
    color: '#9CA3AF',
  },
  addImageSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  selectButton: {
    backgroundColor: colors.primaryVariants[600],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  selectButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  amenitiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  amenityChip: {
    backgroundColor: colors.primaryVariants[100],
    borderWidth: 1,
    borderColor: colors.primaryVariants[300],
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  amenityText: {
    color: colors.primaryVariants[700],
    fontSize: 14,
    fontWeight: '500',
  },
  noAmenitiesText: {
    color: '#6B7280',
  },
  actionContainer: {
    flexDirection: 'row',
    paddingTop: 20,
    paddingBottom: 28,
    gap: 16,
    marginHorizontal: 16,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: moduleColors.modules.property.primary.light,
    backgroundColor: moduleColors.modules.property.background.primary,
  },
  cancelButtonText: {
    color: moduleColors.modules.property.primary.main,
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: moduleColors.modules.property.primary.main,
  },
  submitButtonDisabled: {
    backgroundColor: moduleColors.common.text.disabled,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalDoneText: {
    color: colors.primaryVariants[600],
    fontWeight: '500',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalOptionSelected: {
    backgroundColor: colors.primaryVariants[50],
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  modalOptionTextSelected: {
    color: colors.primaryVariants[600],
    fontWeight: '500',
  },
  modalOptionCheck: {
    color: colors.primaryVariants[600],
    fontSize: 18,
  },
});

export default ListPropertyForm;
