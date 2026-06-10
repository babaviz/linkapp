/**
 * NavigationService - Centralized navigation service for the app
 * Handles all navigation logic and provides helper methods
 */

import { LinkingService } from './linkingService';

class NavigationService {
  // Navigate to a specific screen
  navigate(name: string, params?: Record<string, unknown>) {
    LinkingService.navigate(name, params);
  }

  // Go back to previous screen
  goBack() {
    LinkingService.goBack();
  }

  // Push a new screen onto the stack
  push(name: string, params?: Record<string, unknown>) {
    // Best-effort: rely on root navigator to push a screen.
    this.navigate(name, params);
  }

  // Replace current screen with a new one
  replace(name: string, params?: Record<string, unknown>) {
    // Best-effort: for now treat as navigate.
    this.navigate(name, params);
  }

  // Reset navigation stack to a specific screen
  reset(name: string, params?: Record<string, unknown>) {
    // Best-effort: for now treat as navigate.
    this.navigate(name, params);
  }

  // Navigate to property details
  navigateToPropertyDetails(propertyId: string, property?: any) {
    this.navigate('PropertyDetails', { propertyId, property });
  }

  // Navigate to job details
  navigateToJobDetails(jobId: string, job?: any) {
    this.navigate('JobDetails', { jobId, job });
  }

  // Navigate to service details
  navigateToServiceDetails(serviceId: string, service?: any) {
    this.navigate('ServiceDetails', { serviceId, service });
  }

  // Navigate to chat
  navigateToChat(chatId?: string, userId?: string) {
    if (typeof chatId === 'string' && chatId.trim().length > 0) {
      // `chatId` is treated as either a Stream `cid` or a legacy chat identifier.
      this.navigate('ChatChannel', { chatId });
      return;
    }

    // If we only have a userId, we don't have enough info to deterministically open a channel here.
    // Fallback to a safe in-app screen.
    void userId;
    this.navigate('Inquiries');
  }

  // Navigate to chat channel by CID (direct, no intermediate screens)
  navigateToChatChannel(channelCid: string) {
    this.navigate('ChatChannel', { channelCid });
  }

  // Navigate to DateMi chat
  navigateToDateMiChat(matchId: string, profileId?: string) {
    this.navigate('DateMiChat', { matchId, profileId });
  }

  // Navigate to video call screen
  navigateToVideoCall(callId: string) {
    this.navigate('VideoCallScreen', { callId });
  }

  // Navigate to main tabs
  navigateToHome() {
    this.navigate('MainTabs');
  }

  // Navigate to profile
  navigateToProfile() {
    // Root stack uses `MainTabs` with a `ProfileMain` tab.
    this.navigate('MainTabs', { screen: 'ProfileMain' });
  }

  // Navigate to settings
  navigateToSettings() {
    this.navigate('Settings');
  }

  // Navigate to notifications
  navigateToNotifications() {
    this.navigate('Notifications');
  }

  // Navigate to search
  navigateToSearch(type?: string) {
    this.navigate('Search', { type });
  }

  // Navigate to filter
  navigateToFilter(category?: string) {
    this.navigate('Filter', { category });
  }

  // Navigate to payment
  navigateToPayment(amount: number, type: string) {
    this.navigate('PaymentScreen', { amount, type });
  }

  // Navigate to book service
  navigateToBookService(serviceId: string) {
    this.navigate('BookService', { serviceId });
  }

  // Navigate to map view
  navigateToMapView(properties?: any[]) {
    this.navigate('MapView', { properties });
  }

  // Check if can go back
  canGoBack(): boolean {
    return false;
  }

  // Get current route name
  getCurrentRoute(): string | undefined {
    return LinkingService.getCurrentRouteName();
  }

  // Get current route params
  getCurrentParams(): any {
    return undefined;
  }
}

// Export singleton instance
const navigationService = new NavigationService();
export default navigationService;
