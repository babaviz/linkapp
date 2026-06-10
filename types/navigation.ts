import { NavigatorScreenParams } from '@react-navigation/native';
import { StackScreenProps } from '@react-navigation/stack';
import { PropertyStackParamList } from '../navigation/PropertyStackNavigator';
import { JobsStackParamList } from '../navigation/JobsStackNavigator';
import { ServicesStackParamList } from '../navigation/ServicesStackNavigator';
import { DateMiStackParamList } from '../navigation/DateMiTypes';
import { ProfileStackParamList } from '../navigation/ProfileStackNavigator';

// Auth Stack Parameter List
export type AuthStackParamList = {
  ReferralLink: { code?: string } | undefined;
  Welcome: undefined;
  VerificationChoice: undefined;
  PhoneVerification: undefined;
  EmailOTP: undefined;
  CheckEmail: { email: string };
  OTPVerification: {
    verificationMethod: 'sms' | 'email';
    identifier: string;
  };
  Login: undefined;
  SignUp:
    | {
        verificationToken?: string;
        verifiedIdentifier?: string;
        verifiedType?: 'phone' | 'email';
        fromOtpVerification?: boolean;
      }
    | undefined;
  ForgotPassword: undefined;
  EmailVerification: undefined;
  ResetPassword: undefined;
};


// Main Tab Navigator Parameter List - Core sections
export type MainTabParamList = {
  Property: NavigatorScreenParams<PropertyStackParamList>;
  Jobs: NavigatorScreenParams<JobsStackParamList>;
  Services: NavigatorScreenParams<ServicesStackParamList>;
  DateMi: NavigatorScreenParams<DateMiStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

// Root Stack Parameter List
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Main: NavigatorScreenParams<MainTabParamList>;
};

// Screen Props Types
export type AuthScreenProps<T extends keyof AuthStackParamList> = StackScreenProps<
  AuthStackParamList,
  T
>;

export type PropertyScreenProps<T extends keyof PropertyStackParamList> = StackScreenProps<
  PropertyStackParamList,
  T
>;

export type JobsScreenProps<T extends keyof JobsStackParamList> = StackScreenProps<
  JobsStackParamList,
  T
>;

export type ServicesScreenProps<T extends keyof ServicesStackParamList> = StackScreenProps<
  ServicesStackParamList,
  T
>;

export type DateMiScreenProps<T extends keyof DateMiStackParamList> = StackScreenProps<
  DateMiStackParamList,
  T
>;

export type ProfileScreenProps<T extends keyof ProfileStackParamList> = StackScreenProps<
  ProfileStackParamList,
  T
>;

// Specific screen prop types for easy import
export type LoginScreenProps = AuthScreenProps<'Login'>;
export type SignUpScreenProps = AuthScreenProps<'SignUp'>;
export type ForgotPasswordScreenProps = AuthScreenProps<'ForgotPassword'>;

// Navigation prop types for hooks
export type AuthNavigationProp = AuthScreenProps<keyof AuthStackParamList>['navigation'];
export type PropertyNavigationProp = PropertyScreenProps<keyof PropertyStackParamList>['navigation'];
export type JobsNavigationProp = JobsScreenProps<keyof JobsStackParamList>['navigation'];
export type ServicesNavigationProp = ServicesScreenProps<keyof ServicesStackParamList>['navigation'];
export type DateMiNavigationProp = DateMiScreenProps<keyof DateMiStackParamList>['navigation'];
export type ProfileNavigationProp = ProfileScreenProps<keyof ProfileStackParamList>['navigation'];

// Route prop types for hooks
export type AuthRouteProp<T extends keyof AuthStackParamList> = AuthScreenProps<T>['route'];
export type PropertyRouteProp<T extends keyof PropertyStackParamList> = PropertyScreenProps<T>['route'];
export type JobsRouteProp<T extends keyof JobsStackParamList> = JobsScreenProps<T>['route'];
export type ServicesRouteProp<T extends keyof ServicesStackParamList> = ServicesScreenProps<T>['route'];
export type DateMiRouteProp<T extends keyof DateMiStackParamList> = DateMiScreenProps<T>['route'];
export type ProfileRouteProp<T extends keyof ProfileStackParamList> = ProfileScreenProps<T>['route'];
