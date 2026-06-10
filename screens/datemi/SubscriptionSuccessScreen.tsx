import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { colors } from '../../theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { paystackService } from '../../services/paystackService';

type SubscriptionSuccessScreenRouteProp = RouteProp<RootStackParamList, 'SubscriptionSuccess'>;
type SubscriptionSuccessScreenNavigationProp = StackNavigationProp<RootStackParamList, 'SubscriptionSuccess'>;

export default function SubscriptionSuccessScreen() {
  const navigation = useNavigation<SubscriptionSuccessScreenNavigationProp>();
  const route = useRoute<SubscriptionSuccessScreenRouteProp>();
  
  const { tier, billingCycle } = route.params;

  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }, 10000);

    return () => clearTimeout(timer);
  }, [navigation]);

  const features = paystackService.getSubscriptionFeatures(tier);

  const getTierColor = (): readonly [string, string, ...string[]] => {
    return tier === 'premium' ? ['#FFD700', '#FFA500'] as const : ['#9C27B0', '#673AB7'] as const;
  };

  const handleContinue = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  const handleViewSubscription = () => {
    navigation.reset({
      index: 1,
      routes: [{ name: 'MainTabs' }, { name: 'SubscriptionManagement' }],
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={getTierColor()}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View 
            entering={FadeInUp.duration(600).delay(200)}
            style={styles.iconContainer}
          >
            <View style={styles.successIconCircle}>
              <MaterialIcons name="check" size={80} color="#FFFFFF" />
            </View>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.duration(600).delay(400)}
            style={styles.contentContainer}
          >
            <Text style={styles.title}>Payment Successful!</Text>
            <Text style={styles.subtitle}>
              Welcome to {tier === 'premium' ? 'Premium' : 'Pro'}!
            </Text>
            <Text style={styles.description}>
              Your {billingCycle} subscription is now active. 
              You now have access to all premium features.
            </Text>
          </Animated.View>

          <Animated.View 
            entering={FadeInDown.duration(600).delay(600)}
            style={styles.featuresContainer}
          >
            <View style={styles.featuresCard}>
              <Text style={styles.featuresTitle}>Your Premium Features</Text>
              {features.map((feature, index) => (
                <Animated.View
                  key={index}
                  entering={FadeInDown.duration(400).delay(800 + index * 100)}
                  style={styles.featureItem}
                >
                  <MaterialIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.featureText}>{feature}</Text>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          <Animated.View 
            entering={FadeInUp.duration(600).delay(1200)}
            style={styles.actionContainer}
          >
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Start Exploring</Text>
              <MaterialIcons name="arrow-forward" size={24} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleViewSubscription}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>View Subscription Details</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  successIconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  contentContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    marginBottom: 32,
  },
  featuresCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  actionContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
