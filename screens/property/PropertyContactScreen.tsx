import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert , StyleSheet } from 'react-native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { PropertyStackParamList } from '../../navigation/PropertyStackNavigator';
import { useAppSelector, useAppDispatch } from '../../redux/hooks';
import { submitInquiry } from '../../redux/slices/messageSlice';
import { Property } from '../../types/property';
import { formatPrice } from '../../utils/propertyHelpers';
import { getDynamicDimensions, spacing, fontSize } from '../../utils/responsive';
import { getUserFacingError } from '../../utils/userFacingError';

type PropertyContactNavigationProp = StackNavigationProp<PropertyStackParamList, 'PropertyContact'>;

interface RouteParams {
  property: Property;
}

export default function PropertyContactScreen() {
  const navigation = useNavigation<PropertyContactNavigationProp>();
  const route = useRoute();
  const dispatch = useAppDispatch();
  
  const { user } = useAppSelector(state => state.auth);
  const { isLoading } = useAppSelector(state => state.message);
  const { isTablet, width } = getDynamicDimensions();
  
  const { property } = (route.params as RouteParams);
  const isOwner = Boolean(user?.id && property?.owner_id && user.id === property.owner_id);

  useEffect(() => {
    if (isOwner) {
      Alert.alert(
        'Your Listing',
        'You cannot send an inquiry to your own property.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [isOwner, navigation]);
  
  const [formData, setFormData] = useState({
    name: user?.fullName || '',
    email: user?.email || '',
    phone: '',
    message: `Hi, I'm interested in your property "${property.title}". Could you please provide more details?`,
    inquiryType: 'general' as 'general' | 'viewing' | 'offer'
  });

  const inquiryTypes = [
    { key: 'general', label: 'General Inquiry', icon: '💬' },
    { key: 'viewing', label: 'Schedule Viewing', icon: '👁️' },
    { key: 'offer', label: 'Make Offer', icon: '💰' }
  ];

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      Alert.alert('Required Fields', 'Please fill in all required fields.');
      return;
    }

    if (!user) {
      Alert.alert(
        'Login Required',
        'Please log in to send inquiries.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => navigation.navigate('Auth' as never) }
        ]
      );
      return;
    }
    if (user.id === property.owner_id) {
      Alert.alert('Your Listing', 'You cannot send an inquiry to your own property.');
      return;
    }

    // Check if this is a demo property (non-UUID IDs)
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidPattern.test(property.id) || !uuidPattern.test(property.owner_id)) {
      Alert.alert(
        'Demo Property',
        'This is a demo property listing. Inquiries can only be sent for real property listings. Please post your own property or contact property owners directly.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    try {
      await dispatch(submitInquiry({
        inquiryData: {
          property_id: property.id,
          inquirer_id: user.id,
          owner_id: property.owner_id,
          message: formData.message,
          contact_phone: formData.phone,
          contact_email: formData.email
        },
        inquirerName: formData.name
      })).unwrap();

      Alert.alert(
        'Inquiry Sent!',
        'Your inquiry has been sent to the property owner. They will contact you soon.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error: any) {
      const friendly = getUserFacingError(error, {
        action: 'send your inquiry',
        displayStyle: 'alert',
      });
      Alert.alert(friendly.title, friendly.message, [{ text: 'OK', style: 'cancel' }]);
    }
  };

  if (isOwner) {
    return (
      <SafeAreaView style={styles.style1}>
        <View style={styles.style2}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.style4}>
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.style6}>Your Listing</Text>
          <Text style={styles.style7}>You cannot send an inquiry to your own property.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.style1}>
      {/* Header */}
      <View style={styles.style2}>
        <View style={styles.style3}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={styles.style4}
          >
            <Icon name="arrow-back" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.style6}>Contact Owner</Text>
        </View>
        <Text style={styles.style7}>
          Send an inquiry about this property
        </Text>
      </View>

      <ScrollView style={styles.style8} showsVerticalScrollIndicator={false}>
        {/* Property Summary */}
        <View style={styles.style9}>
          <Text style={styles.style10}>
            {property.title}
          </Text>
          <Text style={styles.style11}>
            {formatPrice(property.price, property.price_period)}
          </Text>
          <Text style={styles.style12}>
            {property.location.address}
          </Text>
        </View>

        <View style={styles.style13}>
          {/* Inquiry Type */}
          <View>
            <Text style={styles.style14}>Type of Inquiry</Text>
            <View style={styles.style15}>
              {inquiryTypes.map((type) => (
                <TouchableOpacity
                  key={type.key}
                  onPress={() => setFormData(prev => ({ ...prev, inquiryType: type.key as any }))}
                  style={[
                    styles.inquiryTypeButton,
                    formData.inquiryType === type.key 
                      ? styles.inquiryTypeButtonActive 
                      : styles.inquiryTypeButtonInactive
                  ]}
                >
                  <Text style={styles.style16}>{type.icon}</Text>
                  <Text style={[
                    styles.inquiryTypeButtonText,
                    { color: formData.inquiryType === type.key ? '#047857' : '#374151' }
                  ]}>
                    {type.label}
                  </Text>
                  {formData.inquiryType === type.key && (
                    <Icon name="check" size={16} color="#059669" style={styles.style17} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Contact Information */}
          <View>
            <Text style={styles.style14}>Your Contact Information</Text>
            
            <View style={styles.style18}>
              <View>
                <Text style={styles.style19}>Full Name *</Text>
                <TextInput
                  value={formData.name}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your full name"
                  style={[styles.style20, { fontSize: fontSize.base }]}
                />
              </View>

              <View>
                <Text style={styles.style19}>Email Address *</Text>
                <TextInput
                  value={formData.email}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                  placeholder="your@email.com"
                  keyboardType="email-address"
                  style={[styles.style20, { fontSize: fontSize.base }]}
                />
              </View>

              <View>
                <Text style={styles.style19}>Phone Number</Text>
                <TextInput
                  value={formData.phone}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
                  placeholder="+254 712 345 678"
                  keyboardType="phone-pad"
                  style={[styles.style20, { fontSize: fontSize.base }]}
                />
              </View>
            </View>
          </View>

          {/* Message */}
          <View>
            <Text style={styles.style14}>Your Message *</Text>
            <TextInput
              value={formData.message}
              onChangeText={(text) => setFormData(prev => ({ ...prev, message: text }))}
              placeholder="Write your message here..."
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              style={[styles.style20, { fontSize: fontSize.base, minHeight: 120 }]}
            />
            <Text style={styles.style21}>
              Be specific about your requirements and preferred contact method
            </Text>
          </View>

          {/* Quick Message Templates */}
          <View>
            <Text style={styles.style14}>Quick Templates</Text>
            <View style={styles.style15}>
              {[
                "I'd like to schedule a viewing for this property.",
                "Is this property still available? I'm interested in renting.",
                "Could you please share more photos of the interior?",
                "What are the lease terms and move-in requirements?"
              ].map((template, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setFormData(prev => ({ ...prev, message: template }))}
                  style={styles.style22}
                >
                  <Text style={styles.style23}>{template}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Privacy Notice */}
          <View style={styles.style24}>
            <Text style={styles.style25}>🔒 Privacy Notice</Text>
            <Text style={styles.style26}>
              Your contact information will only be shared with the property owner. 
              We respect your privacy and will not use your information for marketing purposes.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.style27}>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isLoading}
          style={[
            styles.submitButton,
            { backgroundColor: isLoading ? '#9CA3AF' : '#059669' }
          ]}
        >
          <Text style={styles.style28}>
            {isLoading ? 'Sending Inquiry...' : 'Send Inquiry'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  style1: {
  'flex': 1,
  'backgroundColor': '#F9FAFB'
},
  style2: {
  'paddingHorizontal': 16,
  'paddingVertical': 16
},
  style3: {
  'flexDirection': 'row',
  'alignItems': 'center',
  'marginBottom': 8
},
  style4: {
  'marginRight': 12,
  'padding': 8
},
  style5: {
  'color': '#FFFFFF',
  'fontSize': 20
},
  style6: {
  'color': '#111827',
  'fontSize': 20,
  'fontWeight': '700'
},
  style7: {
  'fontSize': 14,
  'color': '#6B7280'
},
  style8: {
  'flex': 1
},
  style9: {
  'backgroundColor': '#FFFFFF',
  'marginHorizontal': 16,
  'marginVertical': 16,
  'padding': 16,
  'borderRadius': 8,
  'borderWidth': 1,
  'borderColor': '#E5E7EB'
},
  style10: {
  'fontSize': 18,
  'fontWeight': '600',
  'color': '#111827',
  'marginBottom': 8
},
  style11: {
  'fontSize': 20,
  'fontWeight': '700',
  'marginBottom': 8
},
  style12: {
  'fontSize': 14,
  'color': '#4B5563'
},
  style13: {
  'paddingHorizontal': 16
},
  style14: {
  'color': '#374151',
  'fontWeight': '600',
  'marginBottom': 12
},
  style15: {
  'gap': 8
},
  style16: {
  'fontSize': 24,
  'marginRight': 12
},
  style17: {
  'fontSize': 18
},
  style18: {
  'gap': 16
},
  style19: {
  'color': '#4B5563',
  'fontWeight': '500',
  'marginBottom': 8
},
  style20: {
  'backgroundColor': '#FFFFFF',
  'padding': 16,
  'borderRadius': 8,
  'borderWidth': 1,
  'borderColor': '#E5E7EB'
},
  style21: {
  'fontSize': 12,
  'color': '#6B7280',
  'marginTop': 8
},
  style22: {
  'backgroundColor': '#F9FAFB',
  'padding': 12,
  'borderRadius': 8,
  'borderWidth': 1,
  'borderColor': '#E5E7EB'
},
  style23: {
  'color': '#374151',
  'fontSize': 14
},
  style24: {
  'backgroundColor': '#EFF6FF',
  'padding': 16,
  'borderRadius': 8,
  'borderWidth': 1,
  'borderColor': '#BFDBFE'
},
  style25: {
  'fontWeight': '500',
  'marginBottom': 8
},
  style26: {
  'color': '#1D4ED8',
  'fontSize': 14
},
  style27: {
  'backgroundColor': '#FFFFFF',
  'borderTopWidth': 1,
  'borderColor': '#E5E7EB',
  'padding': 16
},
  style28: {
  'color': '#FFFFFF',
  'fontWeight': '600',
  'textAlign': 'center',
  'fontSize': 18
},
  inquiryTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1
  },
  inquiryTypeButtonActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#6EE7B7'
  },
  inquiryTypeButtonInactive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB'
  },
  inquiryTypeButtonText: {
    fontWeight: '500'
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8
  }
});
