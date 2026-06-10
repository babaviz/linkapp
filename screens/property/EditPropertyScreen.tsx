/**
 * EditPropertyScreen - Edit existing property details
 * Refactored to use ListPropertyForm component
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet
} from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { updateProperty } from '../../redux/slices/propertySlice';
import { colors } from '../../theme';
import { Property, PropertyFormData } from '../../types/property';
import ListPropertyForm from '../../components/property/ListPropertyForm';

interface RouteParams {
  property: Property;
}

export default function EditPropertyScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useAppDispatch();
  const { property } = route.params as RouteParams;
  const { isSubmitting } = useAppSelector(state => state.property);

  // Handle form submission
  const handleSubmit = async (formData: PropertyFormData) => {
    await dispatch(updateProperty({
      id: property.id,
      updates: formData
    })).unwrap();

    Alert.alert(
      'Success!',
      'Property has been updated successfully.',
      [
        {
          text: 'OK',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // Handle form cancellation
  const handleCancel = () => {
    navigation.goBack();
  };



  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Property</Text>
      </View>

      {/* Property Form */}
      <ListPropertyForm
        initialData={property}
        mode="edit"
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isSubmitting}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB'
  },
  header: {
    backgroundColor: colors.primary[600],
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    marginRight: 16
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
});
