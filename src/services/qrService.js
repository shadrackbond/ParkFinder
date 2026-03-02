/**
 * qrService.js — QR Code Generation & Validation
 *
 * Handles QR code generation for booking tickets and
 * validation for parking attendants.
 *
 * QR Code Format: JSON string containing:
 *   { bookingId, lotId, userId, validUntil, checksum }
 */

/**
 * Generate a QR code data string for a booking.
 *
 * @param {Object} booking - { id, lotId, userId, endTime }
 * @returns {Promise<string>} QR code data string
 *
 * // TODO (Teammate Hole — QR Logic):
 * // 1. Create a JSON payload with booking details.
 * // 2. Add a cryptographic checksum (HMAC) to prevent forgery.
 * //    Use a server-side secret via Cloud Function.
 * // 3. Consider encoding as a signed JWT for tamper-proof validation.
 * // 4. The QR string should be compact but contain enough
 * //    info for offline validation by attendants.
 */
export async function generateBookingQR(booking) {
    console.warn('generateBookingQR() is a placeholder — implement secure QR generation');
    const payload = {
        bookingId: booking.id,
        lotId: booking.lotId || 'lot_001',
        userId: booking.userId || 'user_001',
        validUntil: booking.endTime || new Date(Date.now() + 3600000).toISOString(),
        checksum: 'PLACEHOLDER_CHECKSUM',
    };
    return JSON.stringify(payload);
}

/**
 * Validate a scanned QR code (Attendant/Provider action).
 *
 * @param {string} qrData - Raw QR string scanned by camera
 * @returns {Promise<Object>} { valid: boolean, booking: Object|null, message: string }
 *
 * // TODO (Teammate Hole — QR Validation):
 * // 1. Parse the QR JSON payload.
 * // 2. Verify the HMAC checksum against server secret.
 * // 3. Check if booking is still active (not cancelled/expired).
 * // 4. Verify the lot ID matches the attendant's assigned lot.
 * // 5. Mark booking as 'checked-in' in Firestore.
 * // 6. Return validation result with booking details.
 */
export async function validateQR(qrData) {
    console.warn('validateQR() is a placeholder — implement secure QR validation');
    try {
        const payload = JSON.parse(qrData);
        return {
            valid: true,
            booking: {
                id: payload.bookingId,
                lotId: payload.lotId,
                status: 'active',
                validUntil: payload.validUntil,
            },
            message: 'Booking verified successfully',
        };
    } catch {
        return {
            valid: false,
            booking: null,
            message: 'Invalid QR code format',
        };
    }
}
