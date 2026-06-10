/**
 * Age Range Picker for Date Mi Smart Filters
 * Features: Quick selection, visual range display, preset ranges
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import CustomSlider from '../common/CustomSlider';

interface AgeRangePickerProps {
  minAge: number;
  maxAge: number;
  onRangeChange: (min: number, max: number) => void;
  accentColor?: string;
}

interface PresetRange {
  label: string;
  min: number;
  max: number;
  icon: string;
}

const PRESET_RANGES: PresetRange[] = [
  { label: '18-24', min: 18, max: 24, icon: '🎓' },
  { label: '25-34', min: 25, max: 34, icon: '💼' },
  { label: '35-44', min: 35, max: 44, icon: '🏆' },
  { label: '45-54', min: 45, max: 54, icon: '🌟' },
  { label: '55+', min: 55, max: 60, icon: '👑' },
];

export const AgeRangePicker: React.FC<AgeRangePickerProps> = ({
  minAge,
  maxAge,
  onRangeChange,
  accentColor = '#6650A4',
}) => {
  const [showPicker, setShowPicker] = useState(false);
  const [localMin, setLocalMin] = useState(minAge);
  const [localMax, setLocalMax] = useState(maxAge);

  const handleConfirm = () => {
    onRangeChange(localMin, localMax);
    setShowPicker(false);
  };

  const handleCancel = () => {
    setLocalMin(minAge);
    setLocalMax(maxAge);
    setShowPicker(false);
  };

  const handlePresetSelect = (preset: PresetRange) => {
    setLocalMin(preset.min);
    setLocalMax(preset.max);
  };

  const handleMinChange = (value: number) => {
    const newMin = Math.round(value);
    if (newMin <= localMax) {
      setLocalMin(newMin);
    }
  };

  const handleMaxChange = (value: number) => {
    const newMax = Math.round(value);
    if (newMax >= localMin) {
      setLocalMax(newMax);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.pickerButton, { borderColor: accentColor }]}
        onPress={() => setShowPicker(true)}
        accessible={true}
        accessibilityLabel={`Age range: ${minAge} to ${maxAge} years`}
        accessibilityHint="Double tap to change age range"
        accessibilityRole="button"
      >
        <View style={styles.buttonContent}>
          <MaterialIcons name="people" size={20} color={accentColor} />
          <Text style={[styles.rangeText, { color: accentColor }]}>
            {minAge} - {maxAge} years
          </Text>
          <MaterialIcons name="arrow-drop-down" size={20} color={accentColor} />
        </View>
      </TouchableOpacity>

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
              <Text style={styles.modalTitle}>Age Range</Text>
              <TouchableOpacity onPress={handleCancel}>
                <MaterialIcons name="close" size={24} color="#666666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Preview */}
              <View style={[styles.preview, { backgroundColor: `${accentColor}10` }]}>
                <View style={styles.previewAgeContainer}>
                  <Text style={styles.previewLabel}>From</Text>
                  <Text style={[styles.previewAge, { color: accentColor }]}>{localMin}</Text>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewAgeContainer}>
                  <Text style={styles.previewLabel}>To</Text>
                  <Text style={[styles.previewAge, { color: accentColor }]}>{localMax}</Text>
                </View>
              </View>

              {/* Quick Presets */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quick Select</Text>
                <View style={styles.presetsGrid}>
                  {PRESET_RANGES.map((preset) => (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.presetChip,
                        localMin === preset.min && localMax === preset.max && {
                          backgroundColor: accentColor,
                          borderColor: accentColor,
                        },
                      ]}
                      onPress={() => handlePresetSelect(preset)}
                      accessible={true}
                      accessibilityLabel={`Age range ${preset.label}`}
                      accessibilityRole="button"
                    >
                      <Text style={styles.presetIcon}>{preset.icon}</Text>
                      <Text
                        style={[
                          styles.presetLabel,
                          localMin === preset.min &&
                            localMax === preset.max &&
                            styles.presetLabelActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Range Sliders */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Custom Range</Text>

                <View style={styles.sliderSection}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Minimum Age</Text>
                    <View style={[styles.ageBadge, { backgroundColor: `${accentColor}20` }]}>
                      <Text style={[styles.ageBadgeText, { color: accentColor }]}>
                        {localMin}
                      </Text>
                    </View>
                  </View>
                  <CustomSlider
                    style={styles.slider}
                    minimumValue={18}
                    maximumValue={60}
                    value={localMin}
                    onValueChange={handleMinChange}
                    minimumTrackTintColor={accentColor}
                    maximumTrackTintColor="#E0E0E0"
                    thumbTintColor={accentColor}
                  />
                </View>

                <View style={styles.sliderSection}>
                  <View style={styles.sliderHeader}>
                    <Text style={styles.sliderLabel}>Maximum Age</Text>
                    <View style={[styles.ageBadge, { backgroundColor: `${accentColor}20` }]}>
                      <Text style={[styles.ageBadgeText, { color: accentColor }]}>
                        {localMax}
                      </Text>
                    </View>
                  </View>
                  <CustomSlider
                    style={styles.slider}
                    minimumValue={18}
                    maximumValue={60}
                    value={localMax}
                    onValueChange={handleMaxChange}
                    minimumTrackTintColor={accentColor}
                    maximumTrackTintColor="#E0E0E0"
                    thumbTintColor={accentColor}
                  />
                </View>

                {/* Visual Range Bar */}
                <View style={styles.rangeBar}>
                  <View style={styles.rangeBarBackground}>
                    <View
                      style={[
                        styles.rangeBarFill,
                        {
                          backgroundColor: accentColor,
                          left: `${((localMin - 18) / (60 - 18)) * 100}%`,
                          width: `${((localMax - localMin) / (60 - 18)) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.rangeBarLabels}>
                    <Text style={styles.rangeBarLabel}>18</Text>
                    <Text style={styles.rangeBarLabel}>60</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
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
                  <Text style={styles.confirmButtonText}>Apply Range</Text>
                  <MaterialIcons name="check" size={18} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  pickerButton: {
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  rangeText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
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
  preview: {
    marginHorizontal: 24,
    marginTop: 20,
    padding: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  previewAgeContainer: {
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  previewAge: {
    fontSize: 32,
    fontWeight: '800',
  },
  previewDivider: {
    width: 2,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  section: {
    marginTop: 28,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 16,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 6,
  },
  presetIcon: {
    fontSize: 16,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  presetLabelActive: {
    color: '#FFFFFF',
  },
  sliderSection: {
    marginBottom: 24,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  ageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ageBadgeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  slider: {
    width: '100%',
    height: 40,
  },
  rangeBar: {
    marginTop: 12,
  },
  rangeBarBackground: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  rangeBarFill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 4,
  },
  rangeBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeBarLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 28,
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
    fontSize: 15,
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
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AgeRangePicker;
