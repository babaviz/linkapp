import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthStackParamList } from '../types/navigation';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import EmailVerificationScreen from '../screens/auth/EmailVerificationScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import ReferralLinkScreen from '../screens/referrals/ReferralLinkScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import VerificationChoiceScreen from '../screens/auth/VerificationChoiceScreen';
import PhoneVerificationScreen from '../screens/auth/PhoneVerificationScreen';
import EmailOTPScreen from '../screens/auth/EmailOTPScreen';
import CheckEmailScreen from '../screens/auth/CheckEmailScreen';
import OTPVerificationScreen from '../screens/auth/OTPVerificationScreen';

const Stack = createStackNavigator<AuthStackParamList>();

type AuthNavigatorProps = {
  initialRouteName?: keyof AuthStackParamList;
};

export default function AuthNavigator({ initialRouteName = 'Welcome' }: AuthNavigatorProps) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName={initialRouteName}
    >
      {/* Referral deep link entry point */}
      <Stack.Screen name="ReferralLink" component={ReferralLinkScreen} />

      {/* Pre-auth onboarding & verification flow */}
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="VerificationChoice" component={VerificationChoiceScreen} />
      <Stack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
      <Stack.Screen name="EmailOTP" component={EmailOTPScreen} />
      <Stack.Screen name="CheckEmail" component={CheckEmailScreen} />
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />

      {/* Existing auth screens */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}
