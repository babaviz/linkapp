/* eslint-env jest */

export const realTimeJobService = {
  initialize: jest.fn(),
  subscribeToJobs: jest.fn(() => jest.fn()),
  subscribeToJobChanges: jest.fn(() => jest.fn()),
  unsubscribe: jest.fn(),
};

