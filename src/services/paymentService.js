/**
 * paymentService.js — M-Pesa Payment Integration
 *
 * Handles M-Pesa STK Push, payment verification, and wallet operations.
 * All payment processing MUST go through Cloud Functions for security.
 *
 * // TODO (Teammate Hole — Payment Integration):
 * // The M-Pesa Daraja API integration should be server-side only.
 * // These client functions should call Firebase Cloud Functions
 * // which in turn call the Daraja API.
 */

/**
 * Initiate an M-Pesa STK Push payment.
 *
 * @param {Object} paymentData - { phoneNumber, amount, bookingId, description }
 * @returns {Promise<Object>} { checkoutRequestId, merchantRequestId }
 *
 * // TODO (Teammate Hole — M-Pesa Integration):
 * // 1. Call Cloud Function 'initiateMpesaPayment'.
 * // 2. Cloud Function should:
 * //    a. Format phone to 254XXXXXXXXX
 * //    b. Generate OAuth token from Daraja API
 * //    c. Send STK Push request
 * //    d. Store the checkoutRequestId for callback validation
 * //    e. Return checkoutRequestId to client
 * // 3. Set up M-Pesa callback URL in Cloud Functions
 * //    to receive payment confirmations.
 */
export async function processMpesaPayment() {
    console.warn('processMpesaPayment() is a placeholder — implement via Cloud Function');
    return {
        checkoutRequestId: `sim_${Date.now()}`,
        merchantRequestId: `mr_${Date.now()}`,
        status: 'pending',
    };
}

/**
 * Check the status of a payment.
 *
 * @param {string} checkoutRequestId
 * @returns {Promise<Object>} { status: 'success' | 'failed' | 'pending' }
 *
 * // TODO (Teammate Hole):
 * // 1. Query Cloud Function 'checkPaymentStatus'.
 * // 2. Function should query M-Pesa Transaction Status API.
 */
export async function checkPaymentStatus() {
    console.warn('checkPaymentStatus() is a placeholder');
    return { status: 'success' };
}

/**
 * Get user's wallet balance.
 *
 * @param {string} userId
 * @returns {Promise<Object>} { balance: number, currency: 'KES' }
 *
 * // TODO (Teammate Hole):
 * // 1. Read from Firestore: doc(db, 'wallets', userId)
 * // 2. If no wallet doc exists, return { balance: 0 }.
 */
export async function getWalletBalance() {
    console.warn('getWalletBalance() is a placeholder');
    return { balance: 2500, currency: 'KES' };
}

/**
 * Get transaction history for a user.
 *
 * @param {string} userId
 * @returns {Promise<Array>}
 *
 * // TODO (Teammate Hole):
 * // 1. Query Firestore: collection('transactions').where('userId', '==', userId)
 * // 2. Order by timestamp descending.
 */
export async function getTransactionHistory() {
    console.warn('getTransactionHistory() is a placeholder');
    return [
        { id: 'tx_001', type: 'payment', amount: -200, description: 'Westlands Mall - 2hrs', date: new Date() },
        { id: 'tx_002', type: 'topup', amount: 1000, description: 'M-Pesa Top Up', date: new Date(Date.now() - 86400000) },
        { id: 'tx_003', type: 'refund', amount: 150, description: 'Cancelled - Sarit Centre', date: new Date(Date.now() - 172800000) },
    ];
}
