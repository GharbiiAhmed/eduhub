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

// Paymee API endpoints
const PAYMEE_API_BASE_SANDBOX = 'https://sandbox.paymee.tn/api/v2'
const PAYMEE_API_BASE_LIVE = 'https://app.paymee.tn/api/v2'
const PAYMEE_API_BASE = process.env.PAYMEE_API_BASE || (process.env.NODE_ENV === 'production' ? PAYMEE_API_BASE_LIVE : PAYMEE_API_BASE_SANDBOX)

export interface PaymeePaymentRequest {
  amount: number // Amount in TND (Tunisian Dinar)
  note: string // Note about the payment (required)
  first_name: string // Buyer's first name (required)
  last_name: string // Buyer's last name (required)
  email: string // Buyer's email (required)
  phone: string // Buyer's phone number (required)
  return_url: string // URL to redirect after payment (required)
  cancel_url: string // URL to redirect after cancel (required)
  webhook_url: string // URL for webhook notifications (required)
  order_id?: string // Optional order ID
}

export interface PaymeePaymentResponse {
  success: boolean
  payment_id?: string // Token from Paymee
  payment_url?: string // URL to redirect user
  order_id?: string
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
  async createPayment(request: PaymeePaymentRequest): Promise<PaymeePaymentResponse> {
    try {
      // Build request body according to Paymee API documentation
      const requestBody = {
        amount: request.amount,
        note: request.note,
        first_name: request.first_name,
        last_name: request.last_name,
        email: request.email,
        phone: request.phone,
        return_url: request.return_url,
        cancel_url: request.cancel_url,
        webhook_url: request.webhook_url,
        ...(request.order_id && { order_id: request.order_id }),
      }
      
      if (!this.apiToken) {
        throw new Error('Paymee API token is missing. Please set PAYMEE_API_KEY environment variable.')
      }

      const apiUrl = `${PAYMEE_API_BASE}/payments/create`
      console.log('Paymee API Request:', {
        url: apiUrl,
        method: 'POST',
        hasToken: !!this.apiToken,
        tokenLength: this.apiToken.length,
        tokenPreview: `${this.apiToken.substring(0, 8)}...`,
        apiBase: PAYMEE_API_BASE,
        body: { ...requestBody, phone: requestBody.phone ? '***' : 'missing' } // Don't log full phone
      })

      // Paymee authentication
      // Try Token format first (most common for Paymee)
      // If this fails with 401, check Paymee Swagger API docs for correct format
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${this.apiToken}`,
        },
        body: JSON.stringify(requestBody),
      })

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type') || ''
      let data: any

      if (contentType.includes('application/json')) {
        data = await response.json()
      } else {
        // Response is not JSON (probably HTML error page)
        const textResponse = await response.text()
        console.error('Paymee API returned non-JSON response:', {
          status: response.status,
          statusText: response.statusText,
          contentType: contentType,
          apiUrl: apiUrl,
          apiBase: PAYMEE_API_BASE,
          responsePreview: textResponse.substring(0, 500) // First 500 chars
        })
        
        // Provide helpful error message based on status code
        if (response.status === 404) {
          throw new Error(`Paymee API endpoint not found (404). The URL "${apiUrl}" does not exist. Please check your Paymee dashboard Swagger API documentation for the correct endpoint. Current API base: ${PAYMEE_API_BASE}`)
        } else {
          throw new Error(`Paymee API returned invalid response (${response.status}): Expected JSON but got ${contentType}. URL: ${apiUrl}`)
        }
      }

      // Log full response for debugging
      console.log('Paymee API Response:', {
        status: response.status,
        statusText: response.statusText,
        contentType: contentType,
        data: data
      })

      if (!response.ok) {
        const errorMessage = data.message || data.error || data.error_message || data.detail || `HTTP ${response.status}: ${response.statusText}`
        const fullError = {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          fullResponse: data,
          requestUrl: apiUrl,
          requestBody: {
            amount: request.amount,
            currency: 'TND',
            // Don't log full body for security, just structure
          }
        }
        console.error('Paymee API Error:', JSON.stringify(fullError, null, 2))
        throw new Error(`Paymee API Error (${response.status}): ${errorMessage}`)
      }

      // Paymee response structure: { status, message, code, data: { token, payment_url, ... } }
      if (!data.status || data.status !== true) {
        const errorMessage = data.message || 'Payment creation failed'
        throw new Error(errorMessage)
      }

      // Extract data from response
      const paymentData = data.data || {}
      
      return {
        success: true,
        payment_id: paymentData.token, // Paymee uses 'token' as payment ID
        payment_url: paymentData.payment_url,
        order_id: paymentData.order_id,
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

