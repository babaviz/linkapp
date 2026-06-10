/* eslint-env jest */

export const jobService = {
  // Listings/search
  fetchJobs: jest.fn(),
  getJobs: jest.fn(),
  getJobsByCategory: jest.fn(),
  getJobCategories: jest.fn(),
  getJobById: jest.fn(),

  // CRUD
  createJob: jest.fn(),
  updateJob: jest.fn(),
  deleteJob: jest.fn(),

  // Applications
  applyToJob: jest.fn(),
  applyForJob: jest.fn(),
  getUserApplications: jest.fn(),
  withdrawApplication: jest.fn(),
  updateApplicationStatus: jest.fn(),
};

