/* eslint-env jest */

export const referralService = {
  generateReferralCode: jest.fn(),
  awardCashReward: jest.fn(),
  processRewardPayment: jest.fn(),
  grantPremiumAccess: jest.fn(),
  checkPremiumAccess: jest.fn(),
  getReferralStats: jest.fn(),
  getReferralHistory: jest.fn(),
  verifyReferralCode: jest.fn(),
};

export default referralService;

