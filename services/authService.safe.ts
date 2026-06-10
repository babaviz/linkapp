import { authService } from './authService';

// Re-export everything from the main auth service
export * from './authService';

// Export the service instance as default for safe importing
const safeAuthService = authService;
export default safeAuthService;
