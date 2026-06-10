import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthScreenProps } from '../../types/navigation';
import { typography } from '../../theme';
import { wp } from '../../utils/responsive';

type CheckEmailScreenProps = AuthScreenProps<'CheckEmail'>;

export default function CheckEmailScreen({ navigation, route }: CheckEmailScreenProps) {
  const { email } = route.params;
  const { width, height } = useWindowDimensions();
  const isCompactHeight = height < 600;
  const horizontalPadding = Math.max(20, wp(6, width));
  const titleSize = Math.min(wp(6.5, width), 24);
  const iconSize = Math.min(wp(15, width), 60);
  const headerMarginBottom = isCompactHeight ? 24 : 36;
  const maskedEmail = email?.replace(/(.{2})(.*)(@.*)/, '$1***$3') || 'your email';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FF" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingTop: 16,
          },
        ]}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#1A237E" />
        </TouchableOpacity>

        <View style={[styles.header, { marginBottom: headerMarginBottom }]}>
          <View style={[styles.iconWrapper, { width: iconSize, height: iconSize, borderRadius: iconSize / 3.75 }]}>
            <MaterialIcons name="mark-email-read" size={Math.min(iconSize * 0.53, 32)} color="#1565C0" />
          </View>
          <Text style={[styles.title, { fontSize: titleSize }]}>Check Your Email</Text>
          <Text style={styles.subtitle}>
            We sent a verification link to{' '}
            <Text style={styles.emailText}>{maskedEmail}</Text>
            {' '}Click the link in the email to continue.
          </Text>
        </View>

        <View style={styles.hintBox}>
          <MaterialIcons name="info-outline" size={20} color="#546E7A" style={styles.hintIcon} />
          <Text style={styles.hintText}>
            Don&apos;t see the email? Check your spam folder, or go back and try again.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.navigate('EmailOTP')}
        >
          <Text style={styles.backLinkText}>Use a different email</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backButton: {
    marginTop: 8,
    padding: 4,
    alignSelf: 'flex-start',
  },
  header: {
    marginTop: 24,
    alignItems: 'flex-start',
  },
  iconWrapper: {
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: typography.fontWeight.bold,
    color: '#1A237E',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: '#546E7A',
    lineHeight: 24,
  },
  emailText: {
    fontWeight: '600',
    color: '#1A237E',
  },
  hintBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  hintIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  hintText: {
    flex: 1,
    fontSize: 14,
    color: '#37474F',
    lineHeight: 20,
  },
  backLink: {
    marginTop: 24,
    alignSelf: 'flex-start',
  },
  backLinkText: {
    fontSize: 15,
    color: '#1A237E',
    fontWeight: '600',
  },
});
