import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../redux/store';
import { paystackService } from '../services/paystackService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface PaystackContextType {
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
  isInitialized: boolean;
  initializePayment: (
    tier: 'pro' | 'premium',
    billingCycle: 'monthly' | 'yearly',
    paymentMethod?: string
  ) => Promise<any>;
  verifyPayment: (reference: string) => Promise<boolean>;
  getLocalPricing: (tier: 'pro' | 'premium', billingCycle: 'monthly' | 'yearly') => any;
}

const PaystackContext = createContext<PaystackContextType | undefined>(undefined);

interface PaystackProviderProps {
  children: ReactNode;
}

export const PaystackProvider: React.FC<PaystackProviderProps> = ({ children }) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('KE');
  const [isInitialized, setIsInitialized] = useState(false);
  const user = useSelector((state: RootState) => state.auth.user);

  // Load saved country preference
  useEffect(() => {
    loadCountryPreference();
  }, []);

  // Save country preference when it changes
  useEffect(() => {
    if (selectedCountry) {
      saveCountryPreference(selectedCountry);
    }
  }, [selectedCountry]);

  const loadCountryPreference = async () => {
    try {
      const savedCountry = await AsyncStorage.getItem('user_country');
      if (savedCountry && ['KE', 'UG', 'TZ'].includes(savedCountry)) {
        setSelectedCountry(savedCountry);
      }
      setIsInitialized(true);
    } catch (error) {
      setIsInitialized(true);
    }
  };

  const saveCountryPreference = async (country: string) => {
    try {
      await AsyncStorage.setItem('user_country', country);
    } catch (error) {
      // Silently fail
    }
  };

  const initializePayment = async (
    tier: 'pro' | 'premium',
    billingCycle: 'monthly' | 'yearly',
    paymentMethod?: string
  ) => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to continue with your subscription.');
      return null;
    }

    try {
      const result = await paystackService.initializeTransaction(
        user.id,
        user.email || '',
        tier,
        billingCycle,
        selectedCountry,
        paymentMethod
      );

      if (result.status) {
        return result;
      } else {
        throw new Error(result.message || 'Payment initialization failed');
      }
    } catch (error: any) {
      Alert.alert(
        'Payment Error',
        error.message || 'Failed to initialize payment. Please try again.'
      );
      return null;
    }
  };

  const verifyPayment = async (reference: string): Promise<boolean> => {
    try {
      const result = await paystackService.verifyTransaction(reference);
      
      if (result.status && result.data.status === 'success') {
        // Payment successful
        return true;
      } else {
        // Payment failed or pending
        return false;
      }
    } catch (error: any) {
      Alert.alert(
        'Verification Error',
        'Failed to verify payment. Please contact support if you were charged.'
      );
      return false;
    }
  };

  const getLocalPricing = (tier: 'pro' | 'premium', billingCycle: 'monthly' | 'yearly') => {
    return paystackService.getSubscriptionPricing(tier, billingCycle, selectedCountry);
  };

  const value: PaystackContextType = {
    selectedCountry,
    setSelectedCountry,
    isInitialized,
    initializePayment,
    verifyPayment,
    getLocalPricing,
  };

  return (
    <PaystackContext.Provider value={value}>
      {children}
    </PaystackContext.Provider>
  );
};

export const usePaystack = () => {
  const context = useContext(PaystackContext);
  if (!context) {
    throw new Error('usePaystack must be used within a PaystackProvider');
  }
  return context;
};
