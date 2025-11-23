/**
 * Paymee Payment Gateway Client
 * Documentation: https://www.paymee.tn
 * API Documentation: Available in Paymee dashboard (Swagger API)
 * 
 * To get your credentials:
 * 1. Log in to Paymee dashboard
 * 2. Go to "Intégration" → "Paramètre de l'API"
 * 3. Copy your "Clé API (Token)" and "Numéro du compte"
 */

const PAYMEE_API_BASE = process.env.PAYMEE_API_BASE || 'https://paymee.tn/api/v2'

export interface PaymeePaymentRequest {
  amount: number // Amount in TND (Tunisian Dinar)
  success_url: string
  fail_url: string
  cancel_url?: string
  webhook_url?: string
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  metadata?: Record<string, any>
  description?: string
}

export interface PaymeePaymentResponse {
  success: boolean
  payment_id: string
  payment_url: string
  qr_code?: string
  message?: string
}

export interface PaymeePaymentStatus {
  success: boolean
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled'
  amount: number
  currency: string
  payment_id: string
  transaction_id?: string
  customer?: {
    name?: string
    email?: string
    phone?: string
  }
  metadata?: Record<string, any>
}

export class PaymeeClient {
  private apiToken: string // Paymee uses "Token" as the API key
  private accountNumber: string // Paymee account number (merchant ID)

  constructor(apiToken?: string, accountNumber?: string) {
    // Paymee uses "Token" (API Key) and "Account Number" (Merchant ID)
    this.apiToken = apiToken || process.env.PAYMEE_API_KEY || process.env.PAYMEE_TOKEN || ''
    this.accountNumber = accountNumber || process.env.PAYMEE_ACCOUNT_NUMBER || process.env.PAYMEE_MERCHANT_ID || ''
  }

  /**
   * Create a payment request
   * Based on Paymee API structure - adjust based on Swagger documentation
   */
  async createPayment(paymentData: PaymeePaymentRequest): Promise<PaymeePaymentResponse> {
    try {
      // Paymee uses Token-based authentication
      // Check Swagger API in dashboard for exact endpoint and structure
      const response = await fetch(`${PAYMEE_API_BASE}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Paymee authentication - try Token format first
          // If this doesn't work, we'll see the error and adjust
          'Authorization': `Token ${this.apiToken}`,
          // Alternative: 'X-API-Key': this.apiToken,
          // Alternative: 'Authorization': `Bearer ${this.apiToken}`,
        },
        body: JSON.stringify({
          amount: paymentData.amount,
          currency: 'TND',
          success_url: paymentData.success_url,
          fail_url: paymentData.fail_url,
          cancel_url: paymentData.cancel_url || paymentData.fail_url,
          webhook_url: paymentData.webhook_url,
          customer: paymentData.customer,
          metadata: paymentData.metadata,
          description: paymentData.description,
          account_number: this.accountNumber, // Paymee account number
          // Alternative field names based on API:
          // merchant_id: this.accountNumber,
          // account_id: this.accountNumber,
        }),
      })

      const data = await response.json()

      // Log full response for debugging
      console.log('Paymee API Response:', {
        status: response.status,
        statusText: response.statusText,
        data: data
      })

      if (!response.ok) {
        const errorMessage = data.message || data.error || data.error_message || `HTTP ${response.status}: ${response.statusText}`
        console.error('Paymee API Error:', {
          status: response.status,
          error: errorMessage,
          fullResponse: data
        })
        throw new Error(errorMessage)
      }

      // Handle different response structures
      // Paymee might return success in different ways
      if (data.success === false || (data.status && data.status !== 'success' && data.status !== 'ok')) {
        const errorMessage = data.message || data.error || 'Payment creation failed'
        throw new Error(errorMessage)
      }

      return {
        success: true,
        payment_id: data.payment_id || data.id || data.paymentId || data.payment_id,
        payment_url: data.payment_url || data.url || data.link || data.paymentUrl || data.checkout_url,
        qr_code: data.qr_code || data.qrCode || data.qr_code_url,
        message: data.message,
      }
    } catch (error: any) {
      console.error('Paymee payment creation error:', {
        message: error.message,
        stack: error.stack,
        response: error.response
      })
      throw new Error(error.message || 'Failed to create Paymee payment')
    }
  }

  /**
   * Verify payment status
   * Check Swagger API for exact endpoint structure
   */
  async verifyPayment(paymentId: string): Promise<PaymeePaymentStatus> {
    try {
      const response = await fetch(`${PAYMEE_API_BASE}/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Token ${this.apiToken}`, // Paymee uses "Token" authentication
          // Alternative: 'X-API-Key': this.apiToken,
          // Or: 'Authorization': `Bearer ${this.apiToken}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to verify Paymee payment')
      }

      // Map Paymee status to our status
      let status: 'pending' | 'paid' | 'failed' | 'expired' | 'cancelled' = 'pending'
      const paymeeStatus = data.status?.toLowerCase() || data.payment_status?.toLowerCase()
      
      if (paymeeStatus === 'success' || paymeeStatus === 'paid' || paymeeStatus === 'completed') {
        status = 'paid'
      } else if (paymeeStatus === 'failed' || paymeeStatus === 'rejected') {
        status = 'failed'
      } else if (paymeeStatus === 'expired') {
        status = 'expired'
      } else if (paymeeStatus === 'cancelled' || paymeeStatus === 'canceled') {
        status = 'cancelled'
      }

      return {
        success: data.success || status === 'paid',
        status,
        amount: data.amount || 0,
        currency: data.currency || 'TND',
        payment_id: paymentId,
        transaction_id: data.transaction_id || data.transactionId || data.id,
        customer: data.customer,
        metadata: data.metadata,
      }
    } catch (error: any) {
      console.error('Paymee payment verification error:', error)
      throw new Error(error.message || 'Failed to verify Paymee payment')
    }
  }

  /**
   * Verify webhook signature
   * Paymee may use HMAC signature verification
   * Check Paymee documentation for exact signature method
   */
  verifyWebhookSignature(payload: any, signature: string): boolean {
    try {
      // Paymee webhook signature verification
      // Implementation depends on Paymee's actual method
      // They might use the API Token or a separate webhook secret
      if (!this.apiToken || !signature) {
        return false
      }
      
      // Use Node.js crypto module
      const crypto = require('crypto')
      const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload)
      
      // Try HMAC SHA256 with API token (common pattern)
      const expectedSignature = crypto
        .createHmac('sha256', this.apiToken)
        .update(payloadString)
        .digest('hex')
      
      // Compare signatures securely
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )
    } catch (error) {
      console.error('Paymee webhook signature verification error:', error)
      // In production, always verify signatures properly
      // For now, return false if verification fails
      return false
    }
  }
}

// Export singleton instance
export const paymee = new PaymeeClient()

