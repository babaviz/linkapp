import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInputProps,
} from 'react-native';

interface Country {
  code: string;
  dial_code: string;
  name: string;
  flag: string;
}

// Comprehensive country list (African countries first, then global)
const COUNTRIES: Country[] = [
  // East Africa
  { code: 'KE', dial_code: '+254', name: 'Kenya', flag: '🇰🇪' },
  { code: 'UG', dial_code: '+256', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TZ', dial_code: '+255', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'RW', dial_code: '+250', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'ET', dial_code: '+251', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'SO', dial_code: '+252', name: 'Somalia', flag: '🇸🇴' },
  { code: 'SS', dial_code: '+211', name: 'South Sudan', flag: '🇸🇸' },
  { code: 'ER', dial_code: '+291', name: 'Eritrea', flag: '🇪🇷' },
  { code: 'DJ', dial_code: '+253', name: 'Djibouti', flag: '🇩🇯' },
  
  // West Africa
  { code: 'NG', dial_code: '+234', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', dial_code: '+233', name: 'Ghana', flag: '🇬🇭' },
  { code: 'CI', dial_code: '+225', name: 'Ivory Coast', flag: '🇨🇮' },
  { code: 'SN', dial_code: '+221', name: 'Senegal', flag: '🇸🇳' },
  { code: 'BF', dial_code: '+226', name: 'Burkina Faso', flag: '🇧🇫' },
  { code: 'ML', dial_code: '+223', name: 'Mali', flag: '🇲🇱' },
  { code: 'NE', dial_code: '+227', name: 'Niger', flag: '🇳🇪' },
  { code: 'TG', dial_code: '+228', name: 'Togo', flag: '🇹🇬' },
  { code: 'BJ', dial_code: '+229', name: 'Benin', flag: '🇧🇯' },
  { code: 'LR', dial_code: '+231', name: 'Liberia', flag: '🇱🇷' },
  { code: 'SL', dial_code: '+232', name: 'Sierra Leone', flag: '🇸🇱' },
  { code: 'GM', dial_code: '+220', name: 'Gambia', flag: '🇬🇲' },
  { code: 'GW', dial_code: '+245', name: 'Guinea-Bissau', flag: '🇬🇼' },
  { code: 'GN', dial_code: '+224', name: 'Guinea', flag: '🇬🇳' },
  
  // Southern Africa
  { code: 'ZA', dial_code: '+27', name: 'South Africa', flag: '🇿🇦' },
  { code: 'ZW', dial_code: '+263', name: 'Zimbabwe', flag: '🇿🇼' },
  { code: 'ZM', dial_code: '+260', name: 'Zambia', flag: '🇿🇲' },
  { code: 'BW', dial_code: '+267', name: 'Botswana', flag: '🇧🇼' },
  { code: 'NA', dial_code: '+264', name: 'Namibia', flag: '🇳🇦' },
  { code: 'MZ', dial_code: '+258', name: 'Mozambique', flag: '🇲🇿' },
  { code: 'MW', dial_code: '+265', name: 'Malawi', flag: '🇲🇼' },
  { code: 'LS', dial_code: '+266', name: 'Lesotho', flag: '🇱🇸' },
  { code: 'SZ', dial_code: '+268', name: 'Eswatini', flag: '🇸🇿' },
  
  // Central Africa
  { code: 'CD', dial_code: '+243', name: 'DR Congo', flag: '🇨🇩' },
  { code: 'CG', dial_code: '+242', name: 'Congo', flag: '🇨🇬' },
  { code: 'CM', dial_code: '+237', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'CF', dial_code: '+236', name: 'Central African Rep.', flag: '🇨🇫' },
  { code: 'TD', dial_code: '+235', name: 'Chad', flag: '🇹🇩' },
  { code: 'GA', dial_code: '+241', name: 'Gabon', flag: '🇬🇦' },
  { code: 'GQ', dial_code: '+240', name: 'Equatorial Guinea', flag: '🇬🇶' },
  { code: 'AO', dial_code: '+244', name: 'Angola', flag: '🇦🇴' },
  
  // North Africa
  { code: 'EG', dial_code: '+20', name: 'Egypt', flag: '🇪🇬' },
  { code: 'MA', dial_code: '+212', name: 'Morocco', flag: '🇲🇦' },
  { code: 'DZ', dial_code: '+213', name: 'Algeria', flag: '🇩🇿' },
  { code: 'TN', dial_code: '+216', name: 'Tunisia', flag: '🇹🇳' },
  { code: 'LY', dial_code: '+218', name: 'Libya', flag: '🇱🇾' },
  { code: 'SD', dial_code: '+249', name: 'Sudan', flag: '🇸🇩' },
  
  // Indian Ocean Islands
  { code: 'MU', dial_code: '+230', name: 'Mauritius', flag: '🇲🇺' },
  { code: 'SC', dial_code: '+248', name: 'Seychelles', flag: '🇸🇨' },
  { code: 'MG', dial_code: '+261', name: 'Madagascar', flag: '🇲🇬' },
  { code: 'KM', dial_code: '+269', name: 'Comoros', flag: '🇰🇲' },
  
  // Major International
  { code: 'US', dial_code: '+1', name: 'United States', flag: '🇺🇸' },
  { code: 'CA', dial_code: '+1', name: 'Canada', flag: '🇨🇦' },
  { code: 'GB', dial_code: '+44', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'FR', dial_code: '+33', name: 'France', flag: '🇫🇷' },
  { code: 'DE', dial_code: '+49', name: 'Germany', flag: '🇩🇪' },
  { code: 'IT', dial_code: '+39', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', dial_code: '+34', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', dial_code: '+31', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'BE', dial_code: '+32', name: 'Belgium', flag: '🇧🇪' },
  { code: 'CH', dial_code: '+41', name: 'Switzerland', flag: '🇨🇭' },
  { code: 'AT', dial_code: '+43', name: 'Austria', flag: '🇦🇹' },
  { code: 'SE', dial_code: '+46', name: 'Sweden', flag: '🇸🇪' },
  { code: 'NO', dial_code: '+47', name: 'Norway', flag: '🇳🇴' },
  { code: 'DK', dial_code: '+45', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', dial_code: '+358', name: 'Finland', flag: '🇫🇮' },
  { code: 'PL', dial_code: '+48', name: 'Poland', flag: '🇵🇱' },
  { code: 'RU', dial_code: '+7', name: 'Russia', flag: '🇷🇺' },
  { code: 'CN', dial_code: '+86', name: 'China', flag: '🇨🇳' },
  { code: 'IN', dial_code: '+91', name: 'India', flag: '🇮🇳' },
  { code: 'JP', dial_code: '+81', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', dial_code: '+82', name: 'South Korea', flag: '🇰🇷' },
  { code: 'AU', dial_code: '+61', name: 'Australia', flag: '🇦🇺' },
  { code: 'NZ', dial_code: '+64', name: 'New Zealand', flag: '🇳🇿' },
  { code: 'BR', dial_code: '+55', name: 'Brazil', flag: '🇧🇷' },
  { code: 'MX', dial_code: '+52', name: 'Mexico', flag: '🇲🇽' },
  { code: 'AR', dial_code: '+54', name: 'Argentina', flag: '🇦🇷' },
  { code: 'SA', dial_code: '+966', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'AE', dial_code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: 'IL', dial_code: '+972', name: 'Israel', flag: '🇮🇱' },
  { code: 'TR', dial_code: '+90', name: 'Turkey', flag: '🇹🇷' },
  { code: 'PK', dial_code: '+92', name: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', dial_code: '+880', name: 'Bangladesh', flag: '🇧🇩' },
  { code: 'ID', dial_code: '+62', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'MY', dial_code: '+60', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'SG', dial_code: '+65', name: 'Singapore', flag: '🇸🇬' },
  { code: 'TH', dial_code: '+66', name: 'Thailand', flag: '🇹🇭' },
  { code: 'VN', dial_code: '+84', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'PH', dial_code: '+63', name: 'Philippines', flag: '🇵🇭' },
];

interface PhoneInputProps extends Omit<TextInputProps, 'value' | 'onChangeText'> {
  value: string;
  onChangeText: (phone: string) => void;
  error?: boolean;
  defaultCountry?: string; // Country code like 'KE'
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChangeText,
  error,
  defaultCountry = 'KE',
  editable = true,
  ...textInputProps
}) => {
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES.find(c => c.code === defaultCountry) || COUNTRIES[0]
  );

  // Parse phone number to separate country code and local number
  const getLocalNumber = (fullNumber: string): string => {
    if (fullNumber.startsWith(selectedCountry.dial_code)) {
      return fullNumber.substring(selectedCountry.dial_code.length).trim();
    }
    return fullNumber;
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    // Update phone with new country code
    const localNumber = getLocalNumber(value);
    onChangeText(country.dial_code + localNumber);
    setShowCountryPicker(false);
  };

  const handleLocalNumberChange = (localNumber: string) => {
    // Enforce E.164 length using util
    const digitsOnly = localNumber.replace(/\D/g, '');
    const countryDigits = selectedCountry.dial_code.replace(/\D/g, '');
    const maxLocalDigits = Math.max(0, 15 - countryDigits.length);
    const limitedLocal = digitsOnly.slice(0, maxLocalDigits);

    const fullNumber = selectedCountry.dial_code + limitedLocal;
    onChangeText(fullNumber);
  };

  const localNumber = getLocalNumber(value);

  return (
    <View style={styles.container}>
      <View style={[styles.inputContainer, error && styles.inputContainerError]}>
        {/* Country Code Selector */}
        <TouchableOpacity
          style={styles.countrySelector}
          onPress={() => editable && setShowCountryPicker(true)}
          disabled={!editable}
          accessibilityLabel="Select country code"
          accessibilityHint="Opens country picker"
        >
          <Text style={styles.flag}>{selectedCountry.flag}</Text>
          <Text style={styles.dialCode}>{selectedCountry.dial_code}</Text>
          <Text style={styles.arrow}>▼</Text>
        </TouchableOpacity>

        {/* Phone Number Input */}
        <TextInput
          {...textInputProps}
          style={[styles.input, textInputProps.style]}
          value={localNumber}
          onChangeText={handleLocalNumberChange}
          keyboardType="phone-pad"
          placeholder="712 345 678"
          placeholderTextColor="#9CA3AF"
          editable={editable}
          accessibilityLabel="Phone number input"
        />
      </View>

      {/* Country Picker Modal */}
      <Modal
        visible={showCountryPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCountryPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country</Text>
              <TouchableOpacity
                onPress={() => setShowCountryPicker(false)}
                style={styles.closeButton}
                accessibilityLabel="Close country picker"
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.countryItem,
                    item.code === selectedCountry.code && styles.countryItemSelected,
                  ]}
                  onPress={() => handleCountrySelect(item)}
                  accessibilityLabel={`${item.name} ${item.dial_code}`}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryName}>{item.name}</Text>
                    <Text style={styles.countryDialCode}>{item.dial_code}</Text>
                  </View>
                  {item.code === selectedCountry.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={true}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 56,
  },
  inputContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    minWidth: 110,
  },
  flag: {
    fontSize: 24,
    marginRight: 6,
  },
  dialCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginRight: 4,
  },
  arrow: {
    fontSize: 10,
    color: '#6B7280',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  countryItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  countryFlag: {
    fontSize: 28,
    marginRight: 12,
  },
  countryInfo: {
    flex: 1,
  },
  countryName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  countryDialCode: {
    fontSize: 14,
    color: '#6B7280',
  },
  checkmark: {
    fontSize: 20,
    color: '#0284c7',
    fontWeight: '600',
  },
});

// Validation helper (re-export)
export { validatePhoneNumber } from '../../utils/phone';
