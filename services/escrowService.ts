import { supabase } from './supabaseClient';
// import { paymentService } from './paymentService'; // TODO: Create paymentService

export interface EscrowTransaction {
  id: string;
  payerId: string;
  payeeId: string;
  amount: number;
  currency: string;
  serviceType: 'video_call' | 'content_purchase' | 'custom_service';
  serviceReference: string; // Reference to service or content being purchased
  status: 'created' | 'funded' | 'in_progress' | 'completed' | 'disputed' | 'refunded' | 'cancelled';
  escrowFeesPercentage: number;
  platformFees: number;
  payoutAmount: number; // Amount creator receives after fees
  sessionMetadata?: Record<string, any>;
  disputeReason?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EscrowSession {
  id: string;
  escrowTransactionId: string;
  sessionType: 'video_call' | 'chat_session';
  startTime: string;
  endTime?: string;
  duration?: number; // in minutes
  ratePerMinute: number;
  finalAmount: number;
  sessionStatus: 'active' | 'ended' | 'cancelled';
  participantData: {
    payerId: string;
    payeeId: string;
  };
}

class EscrowService {
  private readonly PLATFORM_FEE_PERCENTAGE = 0.15; // 15% platform fee
  private readonly ESCROW_FEE_PERCENTAGE = 0.05; // 5% escrow processing fee

  // Create escrow transaction
  async createEscrowTransaction(data: {
    payerId: string;
    payeeId: string;
    amount: number;
    serviceType: EscrowTransaction['serviceType'];
    serviceReference: string;
    sessionMetadata?: Record<string, any>;
  }): Promise<EscrowTransaction> {
    try {
      const platformFees = data.amount * this.PLATFORM_FEE_PERCENTAGE;
      const escrowFees = data.amount * this.ESCROW_FEE_PERCENTAGE;
      const payoutAmount = data.amount - platformFees - escrowFees;

      const escrowData = {
        payer_id: data.payerId,
        payee_id: data.payeeId,
        amount: data.amount,
        currency: 'KES',
        service_type: data.serviceType,
        service_reference: data.serviceReference,
        status: 'created',
        escrow_fees_percentage: this.ESCROW_FEE_PERCENTAGE,
        platform_fees: platformFees,
        payout_amount: payoutAmount,
        session_metadata: data.sessionMetadata,
      };

      const { data: escrow, error } = await supabase
        .from('escrow_transactions')
        .insert([escrowData])
        .select()
        .single();

      if (error || !escrow) throw error || new Error('Failed to create escrow transaction');

      const typedEscrow = escrow;
      return {
        id: typedEscrow.id,
        payerId: typedEscrow.payer_id,
        payeeId: typedEscrow.payee_id,
        amount: typedEscrow.amount,
        currency: typedEscrow.currency || 'KES',
        serviceType: typedEscrow.service_type as EscrowTransaction['serviceType'],
        serviceReference: typedEscrow.service_reference || '',
        status: (typedEscrow.status || 'created') as EscrowTransaction['status'],
        escrowFeesPercentage: typedEscrow.escrow_fees_percentage || 0,
        platformFees: typedEscrow.platform_fees || 0,
        payoutAmount: typedEscrow.payout_amount || 0,
        sessionMetadata: typedEscrow.session_metadata as Record<string, any> | undefined,
        disputeReason: typedEscrow.dispute_reason || undefined,
        completedAt: typedEscrow.completed_at || undefined,
        createdAt: typedEscrow.created_at || new Date().toISOString(),
        updatedAt: typedEscrow.updated_at || new Date().toISOString(),
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Fund escrow transaction (process payment)
  async fundEscrowTransaction(escrowId: string, paymentData: {
    paymentMethodId?: string;
    phone?: string;
    paymentType: 'card' | 'mpesa';
  }): Promise<{ transaction: any; paymentResponse?: any }> {
    try {
      // Get escrow transaction
      const { data: escrow, error: escrowError } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (escrowError) throw escrowError;

      // Process payment through payment service
      if (paymentData.paymentType === 'card') {
        const accountReference = `ESCROW_${escrowId.substring(0, 8)}`;
        
        // Create transaction record
        // TODO: Implement paymentService
        const transaction = null as any;
        // const transaction = await paymentService.createTransaction({
        //   user_id: escrow.payer_id,
        //   transaction_type: 'escrow',
        //   amount: escrow.amount,
        //   currency: escrow.currency,
        //   status: 'pending',
        //   payment_method: 'card',
        //   reference_id: accountReference,
        //   metadata: { escrow_id: escrowId },
        // });

        // Update escrow status to funded (in production, wait for payment confirmation)
        await (supabase
          .from('escrow_transactions') as any)
          .update({ 
            status: 'funded',
            updated_at: new Date().toISOString()
          })
          .eq('id', escrowId);

        return { transaction };
      } else if (paymentData.paymentType === 'mpesa') {
        // TODO: Implement M-Pesa payment
        const transaction = null as any;
        
        // Update escrow status to funded
        await (supabase
          .from('escrow_transactions') as any)
          .update({ 
            status: 'funded',
            updated_at: new Date().toISOString()
          })
          .eq('id', escrowId);

        return { transaction };
      }

      throw new Error('Unsupported payment type');
    } catch (error) {
      
      throw error;
    }
  }

  // Start service session (for video calls, etc.)
  async startSession(escrowId: string, sessionData: {
    sessionType: 'video_call' | 'chat_session';
    ratePerMinute: number;
  }): Promise<EscrowSession> {
    try {
      // Update escrow status to in_progress
      await (supabase
        .from('escrow_transactions') as any)
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      // Create session record
      const { data: escrow } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (!escrow) throw new Error('Escrow transaction not found');

      const typedEscrow = escrow as any;
      const sessionRecord = {
        escrow_transaction_id: escrowId,
        session_type: sessionData.sessionType,
        start_time: new Date().toISOString(),
        rate_per_minute: sessionData.ratePerMinute,
        final_amount: 0,
        session_status: 'active',
        participant_data: {
          payerId: typedEscrow.payer_id,
          payeeId: typedEscrow.payee_id,
        },
      };

      const { data: session, error } = await (supabase
        .from('escrow_sessions') as any)
        .insert([sessionRecord])
        .select()
        .single();

      if (error || !session) throw error || new Error('Failed to create session');

      const typedSession = session as any;
      return {
        id: typedSession.id,
        escrowTransactionId: typedSession.escrow_transaction_id,
        sessionType: typedSession.session_type,
        startTime: typedSession.start_time,
        endTime: typedSession.end_time,
        duration: typedSession.duration,
        ratePerMinute: typedSession.rate_per_minute,
        finalAmount: typedSession.final_amount,
        sessionStatus: typedSession.session_status,
        participantData: typedSession.participant_data,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // End service session and calculate final payment
  async endSession(sessionId: string): Promise<{
    session: EscrowSession;
    finalAmount: number;
    duration: number;
  }> {
    try {
      // Get session data
      const { data: session } = await supabase
        .from('escrow_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (!session) throw new Error('Session not found');

      // Type assertion for session properties
      const typedSession = session as any;

      const endTime = new Date();
      const startTime = new Date(typedSession.start_time);
      const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60));
      // Get the escrow transaction to get the amount
      const { data: escrowTransaction } = await supabase
        .from('escrow_transactions')
        .select('amount')
        .eq('id', typedSession.escrow_transaction_id)
        .single();
      
      if (!escrowTransaction) throw new Error('Escrow transaction not found');
      
      const typedEscrowTransaction = escrowTransaction as any;
      const maxAmount = typedEscrowTransaction.amount || 0;
      const finalAmount = Math.min(durationMinutes * typedSession.rate_per_minute, maxAmount);

      // Update session
      await (supabase
        .from('escrow_sessions') as any)
        .update({
          end_time: endTime.toISOString(),
          duration: durationMinutes,
          final_amount: finalAmount,
          session_status: 'ended',
        })
        .eq('id', sessionId);

      return {
        session: {
          ...typedSession,
          endTime: endTime.toISOString(),
          duration: durationMinutes,
          finalAmount,
          sessionStatus: 'ended',
        } as EscrowSession,
        finalAmount,
        duration: durationMinutes,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Complete escrow transaction and release funds
  async completeEscrowTransaction(escrowId: string): Promise<void> {
    try {
      const { error } = await (supabase
        .from('escrow_transactions') as any)
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      if (error) throw error;

      // In production, this would trigger payout to creator
      // For now, we'll just mark as completed
    } catch (error) {
      
      throw error;
    }
  }

  // Dispute escrow transaction
  async disputeEscrowTransaction(escrowId: string, reason: string): Promise<void> {
    try {
      const { error } = await (supabase
        .from('escrow_transactions') as any)
        .update({ 
          status: 'disputed',
          dispute_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      if (error) throw error;
    } catch (error) {
      
      throw error;
    }
  }

  // Cancel escrow transaction (before funding or during creation)
  async cancelEscrowTransaction(escrowId: string): Promise<void> {
    try {
      const { error } = await (supabase
        .from('escrow_transactions') as any)
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      if (error) throw error;
    } catch (error) {
      
      throw error;
    }
  }

  // Get user's escrow transactions
  async getUserEscrowTransactions(userId: string, role: 'payer' | 'payee' | 'both' = 'both'): Promise<EscrowTransaction[]> {
    try {
      let query = supabase.from('escrow_transactions').select('*');

      if (role === 'payer') {
        query = query.eq('payer_id', userId);
      } else if (role === 'payee') {
        query = query.eq('payee_id', userId);
      } else {
        query = query.or(`payer_id.eq.${userId},payee_id.eq.${userId}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((item: any) => ({
        id: item.id,
        payerId: item.payer_id,
        payeeId: item.payee_id,
        amount: item.amount,
        currency: item.currency || 'KES',
        serviceType: item.service_type as EscrowTransaction['serviceType'],
        serviceReference: item.service_reference || '',
        status: (item.status || 'created') as EscrowTransaction['status'],
        escrowFeesPercentage: item.escrow_fees_percentage || 0,
        platformFees: item.platform_fees || 0,
        payoutAmount: item.payout_amount || 0,
        sessionMetadata: item.session_metadata as Record<string, any> | undefined,
        disputeReason: item.dispute_reason || undefined,
        completedAt: item.completed_at || undefined,
        createdAt: item.created_at || new Date().toISOString(),
        updatedAt: item.updated_at || new Date().toISOString(),
      }));
    } catch (error) {
      
      throw error;
    }
  }

  // Get active session for user
  async getActiveSession(userId: string): Promise<EscrowSession | null> {
    try {
      const { data, error } = await supabase
        .from('escrow_sessions')
        .select(`
          *,
          escrow_transaction:escrow_transactions!inner(
            payer_id,
            payee_id,
            status
          )
        `)
        .eq('session_status', 'active')
        .or(`escrow_transaction.payer_id.eq.${userId},escrow_transaction.payee_id.eq.${userId}`)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      const typedData = data as any;
      return {
        id: typedData.id,
        escrowTransactionId: typedData.escrow_transaction_id,
        sessionType: typedData.session_type,
        startTime: typedData.start_time,
        endTime: typedData.end_time,
        duration: typedData.duration,
        ratePerMinute: typedData.rate_per_minute,
        finalAmount: typedData.final_amount,
        sessionStatus: typedData.session_status,
        participantData: typedData.participant_data,
      };
    } catch (error) {
      
      return null;
    }
  }

  // Calculate fees breakdown
  calculateFees(amount: number): {
    originalAmount: number;
    platformFees: number;
    escrowFees: number;
    totalFees: number;
    payoutAmount: number;
  } {
    const platformFees = Math.round(amount * this.PLATFORM_FEE_PERCENTAGE);
    const escrowFees = Math.round(amount * this.ESCROW_FEE_PERCENTAGE);
    const totalFees = platformFees + escrowFees;
    const payoutAmount = amount - totalFees;

    return {
      originalAmount: amount,
      platformFees,
      escrowFees,
      totalFees,
      payoutAmount,
    };
  }

  // Purchase content with escrow protection
  async purchaseContentWithEscrow(data: {
    buyerId: string;
    sellerId: string;
    contentId: string;
    amount: number;
    phone?: string;
  }): Promise<{
    escrow: EscrowTransaction;
    paymentResponse?: any;
  }> {
    try {
      // Create escrow transaction
      const escrow = await this.createEscrowTransaction({
        payerId: data.buyerId,
        payeeId: data.sellerId,
        amount: data.amount,
        serviceType: 'content_purchase',
        serviceReference: data.contentId,
        sessionMetadata: { contentType: 'premium_content' },
      });

      // Fund the escrow
      const payment = await this.fundEscrowTransaction(escrow.id, {
        phone: data.phone,
        paymentType: 'mpesa',
      });

      return {
        escrow,
        paymentResponse: payment.paymentResponse,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Book video call with escrow
  async bookVideoCallWithEscrow(data: {
    bookerId: string;
    creatorId: string;
    serviceId: string;
    estimatedDuration: number; // in minutes
    ratePerMinute: number;
    phone?: string;
  }): Promise<{
    escrow: EscrowTransaction;
    session: EscrowSession;
    paymentResponse?: any;
  }> {
    try {
      const estimatedAmount = data.estimatedDuration * data.ratePerMinute;

      // Create escrow transaction
      const escrow = await this.createEscrowTransaction({
        payerId: data.bookerId,
        payeeId: data.creatorId,
        amount: estimatedAmount,
        serviceType: 'video_call',
        serviceReference: data.serviceId,
        sessionMetadata: {
          estimatedDuration: data.estimatedDuration,
          ratePerMinute: data.ratePerMinute,
        },
      });

      // Fund the escrow
      const payment = await this.fundEscrowTransaction(escrow.id, {
        phone: data.phone,
        paymentType: 'mpesa',
      });

      // Create session
      const session = await this.startSession(escrow.id, {
        sessionType: 'video_call',
        ratePerMinute: data.ratePerMinute,
      });

      return {
        escrow,
        session,
        paymentResponse: payment.paymentResponse,
      };
    } catch (error) {
      
      throw error;
    }
  }

  // Get escrow transaction by ID
  async getEscrowTransaction(escrowId: string): Promise<EscrowTransaction | null> {
    try {
      const { data, error } = await supabase
        .from('escrow_transactions')
        .select('*')
        .eq('id', escrowId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!data) return null;

      const typedEscrowData = data as any;
      return {
        id: typedEscrowData.id,
        payerId: typedEscrowData.payer_id,
        payeeId: typedEscrowData.payee_id,
        amount: typedEscrowData.amount,
        currency: typedEscrowData.currency,
        serviceType: typedEscrowData.service_type,
        serviceReference: typedEscrowData.service_reference,
        status: typedEscrowData.status,
        escrowFeesPercentage: typedEscrowData.escrow_fees_percentage,
        platformFees: typedEscrowData.platform_fees,
        payoutAmount: typedEscrowData.payout_amount,
        sessionMetadata: typedEscrowData.session_metadata,
        disputeReason: typedEscrowData.dispute_reason,
        completedAt: typedEscrowData.completed_at,
        createdAt: typedEscrowData.created_at,
        updatedAt: typedEscrowData.updated_at,
      };
    } catch (error) {
      
      return null;
    }
  }

  // Process automatic completion (for content purchases)
  async processAutomaticCompletion(escrowId: string, deliveryConfirmation?: any): Promise<void> {
    try {
      await (supabase
        .from('escrow_transactions') as any)
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString(),
          session_metadata: deliveryConfirmation,
          updated_at: new Date().toISOString()
        })
        .eq('id', escrowId);

      // Record earning for creator
      const escrow = await this.getEscrowTransaction(escrowId);
      if (escrow) {
        await this.recordCreatorEarning(escrow);
      }
    } catch (error) {
      
      throw error;
    }
  }

  // Record creator earning
  private async recordCreatorEarning(escrow: EscrowTransaction): Promise<void> {
    try {
      await (supabase
        .from('creator_earnings') as any)
        .insert([{
          creator_id: escrow.payeeId,
          source: escrow.serviceType,
          amount: escrow.payoutAmount,
          currency: escrow.currency,
          escrow_transaction_id: escrow.id,
          service_reference: escrow.serviceReference,
        }]);
    } catch (error) {
      
    }
  }
}

export const escrowService = new EscrowService();
