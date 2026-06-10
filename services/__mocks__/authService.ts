/* eslint-env jest */

export const authService = {
  getCurrentUser: jest.fn(),
  getSessionUserBasic: jest.fn(),
  getSessionUserBasicResult: jest.fn(),
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn(),
  updateProfile: jest.fn(),
};

