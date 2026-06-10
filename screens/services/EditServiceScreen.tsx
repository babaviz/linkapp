import React, { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import type { ServicesStackParamList } from '../../navigation/ServicesStackNavigator';
import { useServiceOperations } from '../../hooks/useServiceOperations';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { normalizeCategoryKey } from '../../utils/normalizeCategoryKey';

export default function EditServiceScreen() {
  const navigation = useNavigation<StackNavigationProp<ServicesStackParamList, 'EditService'>>();
  const route = useRoute<RouteProp<ServicesStackParamList, 'EditService'>>();
  const { isTablet } = getDynamicDimensions();
  const insets = useSafeAreaInsets();
  const { serviceId } = route.params || {};

  const { getServiceDetails, updateService, isLoading, error, clearError } = useServiceOperations();

  const [isResolving, setIsResolving] = useState(true);
  const [resolvedOnce, setResolvedOnce] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const isBusy = isResolving || isLoading;
  const tabAwareBottomSpacing = Math.max(insets.bottom + 88, spacing.xl + 56);

  const priceNum = useMemo(() => {
    const n = Number(price || 0);
    return Number.isFinite(n) ? n : 0;
  }, [price]);

  const resolveService = useCallback(async () => {
    if (!serviceId) return;
    setIsResolving(true);
    clearError();
    try {
      const svc = await getServiceDetails(serviceId);
      setResolvedOnce(true);

      if (!svc) {
        return;
      }

      setServiceName(svc.serviceName || '');
      setDescription(svc.description || '');
      setLocation(svc.location || '');
      setCategory(svc.category || '');
      setStatus(svc.status === 'inactive' ? 'inactive' : 'active');
      const amount = (svc.pricingInfo as any)?.amount ?? (svc.pricingInfo as any)?.hourlyRate ?? '';
      setPrice(amount === '' ? '' : String(amount));
    } finally {
      setIsResolving(false);
    }
  }, [serviceId, clearError, getServiceDetails, navigation]);

  useFocusEffect(
    useCallback(() => {
      void resolveService();
      return undefined;
    }, [resolveService])
  );

  const handleSave = async () => {
    if (!serviceId) return;

    if (!serviceName.trim()) {
      Alert.alert('Missing title', 'Please enter a service title.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Missing description', 'Please add a short description.');
      return;
    }
    if (!category.trim()) {
      Alert.alert('Missing category', 'Please choose a category for your service.');
      return;
    }
    if (!location.trim()) {
      Alert.alert('Missing location', 'Please enter a location for your service.');
      return;
    }

    const updated = await updateService(serviceId, {
      serviceName: serviceName.trim(),
      description: description.trim(),
      category: normalizeCategoryKey(category),
      location: location.trim(),
      pricingInfo: { type: 'fixed', amount: priceNum, currency: 'KSH' },
      status,
    });

    if (updated) {
      Alert.alert('Saved', 'Your service has been updated.', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
      return;
    }

    Alert.alert('Save failed', 'We could not save your changes. Please try again.');
  };

  return (
    <LinearGradient colors={['#6366F1', '#4F46E5', '#4338CA']} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
          >
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: spacing.lg,
                paddingTop: spacing.md,
                paddingBottom: spacing.md,
              }}
            >
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: spacing.md,
                }}
              >
                <MaterialIcons name="arrow-back" size={20} color="#FFFFFF" />
              </TouchableOpacity>
              <Text
                style={{
                  color: '#FFFFFF',
                  fontSize: isTablet ? 24 : 20,
                  fontWeight: '800',
                  flex: 1,
                }}
              >
                Edit Service
              </Text>
            </View>

            <ScrollView
              style={{ flex: 1 }}
              contentInsetAdjustmentBehavior="automatic"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: spacing.lg, paddingBottom: tabAwareBottomSpacing + 24 }}
            >
              {!!error && resolvedOnce && (
                <View
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.18)',
                    borderWidth: 1,
                    borderColor: 'rgba(239, 68, 68, 0.35)',
                    borderRadius: 16,
                    padding: spacing.md,
                    marginBottom: spacing.lg,
                  }}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', marginBottom: 4 }}>Couldn’t load service</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.9)' }}>{error}</Text>
                  <TouchableOpacity
                    onPress={() => void resolveService()}
                    style={{
                      marginTop: spacing.sm,
                      alignSelf: 'flex-start',
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.xs,
                      borderRadius: 999,
                      backgroundColor: 'rgba(255,255,255,0.2)',
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 20,
                  padding: spacing.lg,
                  borderWidth: 1,
                  borderColor: 'rgba(17, 24, 39, 0.08)',
                }}
              >
              {/* Service Title */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#111827', marginBottom: spacing.xs }}>
                  Service Title
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                  }}
                  placeholder="Enter your service title"
                  placeholderTextColor="#6B7280"
                  selectionColor="#4F46E5"
                  value={serviceName}
                  onChangeText={setServiceName}
                />
              </View>

              {/* Description */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#111827', marginBottom: spacing.xs }}>
                  Description
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#FFFFFF',
                    minHeight: 120,
                    textAlignVertical: 'top',
                    color: '#111827',
                  }}
                  placeholder="Describe your service"
                  placeholderTextColor="#6B7280"
                  selectionColor="#4F46E5"
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={5}
                />
              </View>

              {/* Category */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#111827', marginBottom: spacing.xs }}>
                  Category
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                  }}
                  placeholder="e.g., home_garden"
                  placeholderTextColor="#6B7280"
                  selectionColor="#4F46E5"
                  value={category}
                  onChangeText={setCategory}
                  autoCapitalize="none"
                />
              </View>

              {/* Location */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#111827', marginBottom: spacing.xs }}>
                  Location
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                  }}
                  placeholder="e.g., Westlands, Nairobi"
                  placeholderTextColor="#6B7280"
                  selectionColor="#4F46E5"
                  value={location}
                  onChangeText={setLocation}
                />
              </View>

              {/* Price */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#111827', marginBottom: spacing.xs }}>
                  Price (KSh)
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: '#D1D5DB',
                    borderRadius: 12,
                    padding: spacing.md,
                    fontSize: fontSize.md,
                    backgroundColor: '#FFFFFF',
                    color: '#111827',
                  }}
                  placeholder="Enter price (e.g., 2500)"
                  placeholderTextColor="#6B7280"
                  selectionColor="#4F46E5"
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                />
              </View>

              {/* Status */}
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={{ fontSize: fontSize.md, fontWeight: '600', color: '#111827', marginBottom: spacing.xs }}>
                  Status
                </Text>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <TouchableOpacity
                    onPress={() => setStatus('active')}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: status === 'active' ? '#10B981' : '#F3F4F6',
                      borderWidth: 1,
                      borderColor: status === 'active' ? '#059669' : '#E5E7EB',
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: status === 'active' ? '#FFFFFF' : '#111827', fontWeight: '700' }}>Active</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setStatus('inactive')}
                    style={{
                      flex: 1,
                      paddingVertical: 12,
                      borderRadius: 12,
                      alignItems: 'center',
                      backgroundColor: status === 'inactive' ? '#F59E0B' : '#F3F4F6',
                      borderWidth: 1,
                      borderColor: status === 'inactive' ? '#D97706' : '#E5E7EB',
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={{ color: status === 'inactive' ? '#FFFFFF' : '#111827', fontWeight: '700' }}>Paused</Text>
                  </TouchableOpacity>
                </View>
              </View>
              </View>
            </ScrollView>

            {/* Sticky bottom CTA always above tab bar */}
            <View
              style={{
                position: 'absolute',
                left: spacing.lg,
                right: spacing.lg,
                bottom: tabAwareBottomSpacing - 12,
              }}
            >
              <TouchableOpacity
                onPress={handleSave}
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
                  opacity: isBusy ? 0.7 : 1,
                }}
                disabled={isBusy}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#FFFFFF', fontSize: fontSize.md, fontWeight: '700' }}>
                  {isBusy ? 'Saving…' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

