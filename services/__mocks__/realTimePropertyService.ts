/* eslint-env jest */

export const realTimePropertyService = {
  initialize: jest.fn(),

  // Listing/search
  getProperties: jest.fn(),
  searchProperties: jest.fn(),
  getPropertyById: jest.fn(),

  // CRUD
  createProperty: jest.fn(),
  updateProperty: jest.fn(),
  deleteProperty: jest.fn(),

  // Saved/favorites
  saveProperty: jest.fn(),
  unsaveProperty: jest.fn(),
  getSavedProperties: jest.fn(),

  // Realtime subscriptions
  subscribeToPropertyChanges: jest.fn(() => jest.fn()),
  unsubscribe: jest.fn(),
};

