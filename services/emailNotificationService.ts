import { supabase } from './supabaseClient';

export interface EmailNotification {
  to: string;
  subject: string;
  htmlBody: string;
  textBody: string;
  type: 'transactional' | 'marketing';
  metadata?: Record<string, any>;
}

class EmailNotificationService {
  private emailServiceConfigured = false;

  constructor() {
    this.checkEmailServiceConfiguration();
  }

  private async checkEmailServiceConfiguration(): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: { test: true },
      });

      if (!error) {
        this.emailServiceConfigured = true;
      }
    } catch {
      this.emailServiceConfigured = false;
    }
  }

  async sendEmail(emailData: EmailNotification): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      if (!this.emailServiceConfigured) {
        return {
          success: false,
          message: 'Email service not configured',
        };
      }

      const { data, error } = await supabase.functions.invoke('send-email', {
        body: emailData,
      });

      if (error) {
        if (__DEV__) {
          console.error('[EmailNotificationService] Error sending email:', error);
        }
        return {
          success: false,
          message: error.message || 'Failed to send email',
        };
      }

      return {
        success: true,
        message: 'Email sent successfully',
      };
    } catch (error) {
      if (__DEV__) {
        console.error('[EmailNotificationService] Exception sending email:', error);
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async sendTransactionalEmail(
    to: string,
    subject: string,
    htmlBody: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; message?: string }> {
    const textBody = htmlBody.replace(/<[^>]*>/g, '');

    return this.sendEmail({
      to,
      subject,
      htmlBody,
      textBody,
      type: 'transactional',
      metadata,
    });
  }

  async sendSignInAlert(email: string, deviceInfo: Record<string, any>): Promise<void> {
    const subject = 'New Sign-In Detected';
    const htmlBody = `
      <h2>New Sign-In Alert</h2>
      <p>Your account was accessed from:</p>
      <ul>
        <li><strong>Device:</strong> ${deviceInfo.deviceName || 'Unknown'}</li>
        <li><strong>OS:</strong> ${deviceInfo.osName || 'Unknown'} ${deviceInfo.osVersion || ''}</li>
        <li><strong>Location:</strong> ${deviceInfo.location || 'Unknown'}</li>
        <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>If this wasn't you, please <a href="https://link-app.co/security">secure your account</a> immediately.</p>
    `;

    await this.sendTransactionalEmail(email, subject, htmlBody, { type: 'sign_in_alert' });
  }

  async sendPasswordChangedAlert(email: string): Promise<void> {
    const subject = 'Password Changed Successfully';
    const htmlBody = `
      <h2>Password Changed</h2>
      <p>Your password was successfully changed on ${new Date().toLocaleString()}.</p>
      <p>If you did not make this change, please <a href="https://link-app.co/support">contact support</a> immediately.</p>
    `;

    await this.sendTransactionalEmail(email, subject, htmlBody, { type: 'password_changed' });
  }

  async sendPaymentReceipt(
    email: string,
    amount: number,
    currency: string,
    reference: string,
    tier: string
  ): Promise<void> {
    const subject = `Payment Receipt - ${reference}`;
    const htmlBody = `
      <h2>Payment Successful</h2>
      <p>Thank you for your payment!</p>
      <table style="border-collapse: collapse; width: 100%; max-width: 400px;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Receipt #:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${reference}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Amount:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${amount} ${currency}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Subscription:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${tier}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Date:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleDateString()}</td>
        </tr>
      </table>
      <p>Your subscription is now active!</p>
    `;

    await this.sendTransactionalEmail(email, subject, htmlBody, {
      type: 'payment_receipt',
      amount,
      currency,
      reference,
    });
  }

  async sendSubscriptionActivated(email: string, tier: string, endDate: string): Promise<void> {
    const subject = `Welcome to ${tier}!`;
    const htmlBody = `
      <h2>🎉 Subscription Activated!</h2>
      <p>Welcome to <strong>${tier}</strong>! Your subscription is now active.</p>
      <p><strong>Valid until:</strong> ${new Date(endDate).toLocaleDateString()}</p>
      <p>Enjoy all premium features!</p>
      <p><a href="https://link-app.co/app">Start exploring now</a></p>
    `;

    await this.sendTransactionalEmail(email, subject, htmlBody, {
      type: 'subscription_activated',
      tier,
    });
  }

  async sendSubscriptionExpiringSoon(
    email: string,
    tier: string,
    daysRemaining: number
  ): Promise<void> {
    const subject = 'Your Subscription is Expiring Soon';
    const htmlBody = `
      <h2>Subscription Expiring</h2>
      <p>Your <strong>${tier}</strong> subscription expires in <strong>${daysRemaining} days</strong>.</p>
      <p>Renew now to continue enjoying premium features without interruption.</p>
      <p><a href="https://link-app.co/subscription/renew">Renew Subscription</a></p>
    `;

    await this.sendTransactionalEmail(email, subject, htmlBody, {
      type: 'subscription_expiring',
      tier,
      daysRemaining,
    });
  }

  async sendSubscriptionExpired(email: string, tier: string): Promise<void> {
    const subject = 'Your Subscription Has Expired';
    const htmlBody = `
      <h2>Subscription Expired</h2>
      <p>Your <strong>${tier}</strong> subscription has expired.</p>
      <p>Renew now to regain access to all premium features!</p>
      <p><a href="https://link-app.co/subscription/renew">Renew Now</a></p>
    `;

    await this.sendTransactionalEmail(email, subject, htmlBody, {
      type: 'subscription_expired',
      tier,
    });
  }

  isConfigured(): boolean {
    return this.emailServiceConfigured;
  }
}

export const emailNotificationService = new EmailNotificationService();
export default emailNotificationService;
