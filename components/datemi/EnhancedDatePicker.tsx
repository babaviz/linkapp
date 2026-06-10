/**
 * Enhanced Date Picker for Date Mi
 * Features: Easy year selection, intuitive month/day picking, Material 3 design
 * Optimized for selecting birth dates and age-related dates
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  Dimensions,
  Animated,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface EnhancedDatePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'birthdate';
  label?: string;
  placeholder?: string;
  textColor?: string;
  accentColor?: string;
}

const { width: screenWidth } = Dimensions.get('window');
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const EnhancedDatePicker: React.FC<EnhancedDatePickerProps> = ({
  value,
  onChange,
  minimumDate = new Date(1900, 0, 1),
  maximumDate = new Date(),
  mode = 'date',
  label = 'Select Date',
  placeholder = 'Tap to select',
  textColor = '#333333',
  accentColor = '#9C27B0',
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedYear, setSelectedYear] = useState(value.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(value.getMonth());
  const [selectedDay, setSelectedDay] = useState(value.getDate());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];

  // Generate year range
  const years = React.useMemo(() => {
    const startYear = minimumDate.getFullYear();
    const endYear = maximumDate.getFullYear();
    const yearsArray = [];
    for (let year = endYear; year >= startYear; year--) {
      yearsArray.push(year);
    }
    return yearsArray;
  }, [minimumDate, maximumDate]);

  // Calculate days in selected month
  const daysInSelectedMonth = React.useMemo(() => {
    const isLeapYear = (year: number) => {
      return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    };
    
    let days = DAYS_IN_MONTH[selectedMonth];
    if (selectedMonth === 1 && isLeapYear(selectedYear)) {
      days = 29;
    }
    return days;
  }, [selectedYear, selectedMonth]);

  // Adjust selected day if it exceeds days in month
  useEffect(() => {
    if (selectedDay > daysInSelectedMonth) {
      setSelectedDay(daysInSelectedMonth);
    }
  }, [daysInSelectedMonth, selectedDay]);

  const handleConfirm = () => {
    const newDate = new Date(selectedYear, selectedMonth, selectedDay);
    onChange(newDate);
    setShowPicker(false);
    
    // Haptic feedback animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCancel = () => {
    setSelectedYear(value.getFullYear());
    setSelectedMonth(value.getMonth());
    setSelectedDay(value.getDate());
    setShowPicker(false);
  };

  const formatDisplayDate = () => {
    return value.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateAge = (birthDate: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  return (
    <View style={styles.container}>
      {label && <Text style={[styles.label, { color: textColor }]}>{label}</Text>}
      
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.dateButton, { borderColor: accentColor }]}
          onPress={() => setShowPicker(true)}
          activeOpacity={0.8}
          accessible={true}
          accessibilityLabel={`${label}: ${formatDisplayDate()}`}
          accessibilityHint="Double tap to change date"
          accessibilityRole="button"
        >
          <View style={styles.dateButtonContent}>
            <MaterialIcons name="event" size={24} color={accentColor} />
            <View style={styles.dateTextContainer}>
              <Text style={[styles.dateText, { color: textColor }]}>
                {formatDisplayDate()}
              </Text>
              {mode === 'birthdate' && (
                <Text style={styles.ageText}>
                  {calculateAge(value)} years old
                </Text>
              )}
            </View>
            <MaterialIcons name="arrow-drop-down" size={24} color={accentColor} />
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Enhanced Date Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancel}
      >
        <View style={styles.modalOverlay}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
                <MaterialIcons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            {/* Date Preview */}
            <View style={[styles.datePreview, { backgroundColor: `${accentColor}15` }]}>
              <Text style={[styles.datePreviewText, { color: accentColor }]}>
                {MONTHS[selectedMonth]} {selectedDay}, {selectedYear}
              </Text>
              {mode === 'birthdate' && (
                <Text style={styles.agePreviewText}>
                  Age: {calculateAge(new Date(selectedYear, selectedMonth, selectedDay))} years
                </Text>
              )}
            </View>

            {/* Year Selector */}
            <View style={styles.selectorSection}>
              <Text style={styles.selectorLabel}>Year</Text>
              <TouchableOpacity
                style={[styles.yearButton, { borderColor: accentColor }]}
                onPress={() => setShowYearPicker(true)}
              >
                <Text style={[styles.yearButtonText, { color: accentColor }]}>
                  {selectedYear}
                </Text>
                <MaterialIcons name="unfold-more" size={20} color={accentColor} />
              </TouchableOpacity>
            </View>

            {/* Month Selector */}
            <View style={styles.selectorSection}>
              <Text style={styles.selectorLabel}>Month</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.monthScroll}
                contentContainerStyle={styles.monthScrollContent}
              >
                {MONTHS.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthChip,
                      selectedMonth === index && {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                      },
                    ]}
                    onPress={() => setSelectedMonth(index)}
                    accessible={true}
                    accessibilityLabel={month}
                    accessibilityState={{ selected: selectedMonth === index }}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.monthText,
                        selectedMonth === index && styles.monthTextActive,
                      ]}
                    >
                      {month.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Day Selector */}
            <View style={styles.selectorSection}>
              <Text style={styles.selectorLabel}>Day</Text>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.dayScroll}
                contentContainerStyle={styles.dayScrollContent}
              >
                {Array.from({ length: daysInSelectedMonth }, (_, i) => i + 1).map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayChip,
                      selectedDay === day && {
                        backgroundColor: accentColor,
                        borderColor: accentColor,
                      },
                    ]}
                    onPress={() => setSelectedDay(day)}
                    accessible={true}
                    accessibilityLabel={`Day ${day}`}
                    accessibilityState={{ selected: selectedDay === day }}
                    accessibilityRole="button"
                  >
                    <Text
                      style={[
                        styles.dayText,
                        selectedDay === day && styles.dayTextActive,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.confirmButton, { overflow: 'hidden' }]}
                onPress={handleConfirm}
              >
                <LinearGradient
                  colors={[accentColor, `${accentColor}DD`]}
                  style={styles.confirmButtonGradient}
                >
                  <Text style={styles.confirmButtonText}>Confirm</Text>
                  <MaterialIcons name="check" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowYearPicker(false)}
      >
        <SafeAreaView style={styles.yearModalOverlay} edges={['top', 'bottom']}>
          <View style={styles.yearModalContent}>
            <View style={styles.yearModalHeader}>
              <Text style={styles.yearModalTitle}>Select Year</Text>
              <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                <MaterialIcons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.yearList} showsVerticalScrollIndicator={true}>
              {years.map((year) => (
                <TouchableOpacity
                  key={year}
                  style={[
                    styles.yearItem,
                    selectedYear === year && {
                      backgroundColor: `${accentColor}15`,
                      borderColor: accentColor,
                    },
                  ]}
                  onPress={() => {
                    setSelectedYear(year);
                    setShowYearPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.yearItemText,
                      selectedYear === year && { color: accentColor, fontWeight: '700' },
                    ]}
                  >
                    {year}
                  </Text>
                  {selectedYear === year && (
                    <MaterialIcons name="check" size={20} color={accentColor} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateButton: {
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  dateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  ageText: {
    fontSize: 13,
    color: '#666666',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  datePreview: {
    marginHorizontal: 24,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  datePreviewText: {
    fontSize: 22,
    fontWeight: '700',
  },
  agePreviewText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 4,
  },
  selectorSection: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  selectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  yearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  yearButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  monthScroll: {
    marginBottom: 8,
  },
  monthScrollContent: {
    gap: 8,
    paddingRight: 24,
  },
  monthChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  monthTextActive: {
    color: '#FFFFFF',
  },
  dayScroll: {
    marginBottom: 8,
  },
  dayScrollContent: {
    gap: 8,
    paddingRight: 24,
  },
  dayChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 32,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  confirmButton: {
    flex: 1,
    borderRadius: 12,
  },
  confirmButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  yearModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  yearModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  yearModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  yearModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  yearList: {
    maxHeight: 400,
  },
  yearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  yearItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
});

export default EnhancedDatePicker;
