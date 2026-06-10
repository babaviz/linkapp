import { useSelector } from 'react-redux';
import { 
  selectIsAgeVerified, 
  selectAgeVerificationDate,
  selectNeedsAgeVerification,
  selectKycStatusLabel
} from '../redux/selectors/datemiSelectors';

/**
 * Hook to check if user has verified their age for Date Mi module
 * Now uses computed selectors from auth.user.kycStatus for single source of truth
 * 
 * @returns Object containing age verification status and related data
 */
export const useAgeVerification = () => {
  const isAgeVerified = useSelector(selectIsAgeVerified);
  const ageVerificationDate = useSelector(selectAgeVerificationDate);
  const needsVerification = useSelector(selectNeedsAgeVerification);
  const statusLabel = useSelector(selectKycStatusLabel);

  return {
    isAgeVerified,
    ageVerificationDate,
    needsVerification,
    statusLabel,
  };
};

export default useAgeVerification;
