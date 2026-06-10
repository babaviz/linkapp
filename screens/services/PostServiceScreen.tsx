import React, { useMemo, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import type { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { useServiceOperations } from '../../hooks/useServiceOperations';
import { normalizeCategoryKey } from '../../utils/normalizeCategoryKey';

export default function PostServiceScreen() {
  const navigation = useNavigation<StackNavigationProp<ServicesStackParamList, 'PostService'>>();
  const route = useRoute<RouteProp<ServicesStackParamList, 'PostService'>>();
  const { isTablet } = getDynamicDimensions();
  const initialCategory = useMemo(() => {
    const providedRaw = route.params?.category;
    const provided = providedRaw && providedRaw !== 'search' ? providedRaw : 'home_garden';
    return normalizeCategoryKey(provided);
  }, [route.params?.category]);
  const initialSubcategory = useMemo(() => {
    const provided = route.params?.subcategory;
    return provided ? normalizeCategoryKey(provided) : undefined;
  }, [route.params?.subcategory]);
  const [serviceTitle, setServiceTitle] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceLocation, setServiceLocation] = useState('');
  const [serviceCategory, setServiceCategory] = useState(initialCategory);
  const { createService, isLoading } = useServiceOperations();

  const handlePostService = async () => {
    if (!serviceTitle.trim()) {
      Alert.alert('Missing title', 'Please enter a service title.');
      return;
    }
    if (!serviceDescription.trim()) {
      Alert.alert('Missing description', 'Please add a short description.');
      return;
    }
    if (!serviceCategory.trim()) {
      Alert.alert('Missing category', 'Please choose a category for your service.');
      return;
    }

    const priceNum = Number(servicePrice || 0);
    const categoryKey = normalizeCategoryKey(serviceCategory);
    const created = await createService({
      serviceName: serviceTitle || 'New Service',
      description: serviceDescription,
      category: categoryKey,
      subcategory: initialSubcategory,
      location: serviceLocation || 'Nairobi',
      pricingInfo: { type: 'fixed', amount: isNaN(priceNum) ? 0 : priceNum, currency: 'KSH' },
      contactDetails: { preferredContactMethod: 'phone' } as any,
      status: 'active',
    });
    if (created) {
      navigation.navigate('ServiceCategories', {
        category: created.category,
        role: 'owner',
        createdServiceId: created.id,
        createdService: created,
      });
    } else {
      Alert.alert('Post failed', 'We could not post your service. Please try again.');
    }
  };

  return (
    <LinearGradient
      colors={['#6366F1', '#4F46E5', '#4338CA']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ flex: 1 }}>
          {/* Header */}
          <View style={{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingHorizontal: spacing.lg, 
            paddingTop: spacing.md,
            paddingBottom: spacing.md 
          }}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: 'rgba(255,255,255,0.2)',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: spacing.md
              }}
            >
              <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={{ 
              color: '#FFFFFF', 
              fontSize: isTablet ? 24 : 20, 
              fontWeight: '800',
              flex: 1
            }}>
              Post a Service
            </Text>
          </View>

          {/* Form */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg }} contentInsetAdjustmentBehavior="automatic">
            <View style={{
              backgroundColor: 'rgba(255,255,255,0.95)',
              borderRadius: 20,
              padding: spacing.lg,
              marginBottom: spacing.lg
            }}>
              {/* Service Title */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ 
                  fontSize: fontSize.md, 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: spacing.xs
                }}>
                  Service Title
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#F9FAFB'
                  }}
                  placeholder="Enter your service title"
                  value={serviceTitle}
                  onChangeText={setServiceTitle}
                />
              </View>

              {/* Service Description */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ 
                  fontSize: fontSize.md, 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: spacing.xs
                }}>
                  Description
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#F9FAFB',
                    minHeight: 120,
                    textAlignVertical: 'top'
                  }}
                  placeholder="Describe your service in detail"
                  value={serviceDescription}
                  onChangeText={setServiceDescription}
                  multiline
                  numberOfLines={5}
                />
              </View>

              {/* Category */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ 
                  fontSize: fontSize.md, 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: spacing.xs
                }}>
                  Category
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#F9FAFB'
                  }}
                  placeholder="e.g., home_garden"
                  value={serviceCategory}
                  onChangeText={setServiceCategory}
                  autoCapitalize="none"
                />
              </View>

              {/* Location */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ 
                  fontSize: fontSize.md, 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: spacing.xs
                }}>
                  Location
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#F9FAFB'
                  }}
                  placeholder="e.g., Westlands, Nairobi"
                  value={serviceLocation}
                  onChangeText={setServiceLocation}
                />
              </View>

              {/* Price */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ 
                  fontSize: fontSize.md, 
                  fontWeight: '600', 
                  color: '#111827',
                  marginBottom: spacing.xs
                }}>
                  Price (KSh)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#F9FAFB'
                  }}
                  placeholder="Enter price (e.g., 2500)"
                  value={servicePrice}
                  onChangeText={setServicePrice}
                  keyboardType="numeric"
                />
              </View>

              {/* Post Button */}
              <TouchableOpacity
                onPress={handlePostService}
                style={{
                  backgroundColor: '#6366F1',
                  paddingVertical: spacing.md,
                  borderRadius: 12,
                  alignItems: 'center',
                  shadowColor: '#6366F1',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                  opacity: isLoading ? 0.7 : 1
                }}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={{ 
                  color: '#FFFFFF', 
                  fontSize: fontSize.md, 
                  fontWeight: '700' 
                }}>
                  {isLoading ? 'Posting…' : 'Post Service'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
