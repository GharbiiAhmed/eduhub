/**
 * Flouci Payment Gateway Client
 * Documentation: https://docs.flouci.com
 */

const FLOUCI_API_BASE = process.env.FLOUCI_API_BASE || 'https://developers.flouci.com/api'

export interface FlouciPaymentRequest {
  amount: number // Amount in TND (Tunisian Dinar)
  success_url: string
  fail_url: string
  app_token: string
  webhook_url?: string
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  metadata?: Record<string, any>
}

export interface FlouciPaymentResponse {
  success: boolean
  payment_request_id: string
  payment_url: string
  qr_code?: string
  message?: string
}

export interface FlouciPaymentStatus {
  success: boolean
  status: 'pending' | 'paid' | 'failed' | 'expired'
  amount: number
  currency: string
  payment_request_id: string
  transaction_id?: string
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  metadata?: Record<string, any>
}

export class FlouciClient {
  private appToken: string
  private appSecret: string

  constructor(appToken?: string, appSecret?: string) {
    this.appToken = appToken || process.env.FLOUCI_APP_TOKEN || ''
    this.appSecret = appSecret || process.env.FLOUCI_APP_SECRET || ''
  }

  /**
   * Create a payment request
   */
  async createPayment(paymentData: FlouciPaymentRequest): Promise<FlouciPaymentResponse> {
    try {
      const response = await fetch(`${FLOUCI_API_BASE}/generatePaymentLink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apppublic': this.appToken,
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          success_url: paymentData.success_url,
          fail_url: paymentData.fail_url,
          app_token: paymentData.app_token,
          webhook_url: paymentData.webhook_url,
          customer: paymentData.customer,
          metadata: paymentData.metadata,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create Flouci payment')
      }

      return {
        success: true,
        payment_request_id: data.payment_request_id || data.id,
        payment_url: data.link || data.payment_url,
        qr_code: data.qr_code,
        message: data.message,
      }
    } catch (error: any) {
      console.error('Flouci payment creation error:', error)
      throw new Error(error.message || 'Failed to create Flouci payment')
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentRequestId: string): Promise<FlouciPaymentStatus> {
    try {
      const response = await fetch(`${FLOUCI_API_BASE}/payment/getStatus/${paymentRequestId}`, {
        method: 'GET',
        headers: {
          'apppublic': this.appToken,
          'appsecret': this.appSecret,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to verify Flouci payment')
      }

      // Map Flouci status to our status
      let status: 'pending' | 'paid' | 'failed' | 'expired' = 'pending'
      if (data.status === 'SUCCESS' || data.status === 'paid') {
        status = 'paid'
      } else if (data.status === 'FAILED' || data.status === 'failed') {
        status = 'failed'
      } else if (data.status === 'EXPIRED' || data.status === 'expired') {
        status = 'expired'
      }

      return {
        success: data.success || status === 'paid',
        status,
        amount: data.amount || 0,
        currency: data.currency || 'TND',
        payment_request_id: paymentRequestId,
        transaction_id: data.transaction_id || data.id,
        customer: data.customer,
        metadata: data.metadata,
      }
    } catch (error: any) {
      console.error('Flouci payment verification error:', error)
      throw new Error(error.message || 'Failed to verify Flouci payment')
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    // Flouci webhook verification
    // You may need to implement signature verification based on Flouci's documentation
    // For now, we'll rely on the app secret
    return true // Implement proper signature verification
  }
}

// Export singleton instance
export const flouci = new FlouciClient()




















