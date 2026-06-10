import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons as Icon } from '@expo/vector-icons';
import { colors, spacing, typography, commonStyles } from '../theme';

export default function PaymentMethodsScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.placeholder}>
          <Icon name="payment" size={64} color={colors.primary} />
          <Text style={styles.placeholderTitle}>Payment Methods</Text>
          <Text style={styles.placeholderText}>
            Manage your payment methods including credit cards, mobile money, and other payment options for subscriptions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: spacing[2],
    marginRight: spacing[3],
  },
  headerTitle: {
    ...commonStyles.heading2,
  },
  content: {
    flex: 1,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[12],
  },
  placeholderTitle: {
    ...commonStyles.heading2,
    marginTop: spacing[5],
    marginBottom: spacing[3],
  },
  placeholderText: {
    ...commonStyles.bodyText,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});
