/**
 * qrService.js — QR Code Validation & Check-In / Check-Out
 *
 * Firestore collection: "bookings"
 * Provider ownership:   booking.lotId === currentProviderId
 *                       (lot doc ID = provider Firebase Auth UID)
 *
 * Status flow:
 *   "active"     → scan → "checked-in"  (check-in)
 *   "checked-in" → scan → "completed"   (check-out)
 *   "completed"  → scan → rejected
 *
 * SECURITY NOTE:
 *   Provider ownership is enforced here on the client side.
 *   In production, Firestore Security Rules and/or a Cloud Function
 *   MUST replicate this validation server-side to prevent spoofed requests.
 */

import {
    collection,
    query,
    where,
    getDocs,
    doc,
    runTransaction,
    serverTimestamp,
    limit,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOKINGS = 'bookings';

/** Statuses that are eligible to be scanned. */
const SCANNABLE_STATUSES = new Set(['confirmed', 'checked-in']);

/** Maps current status → next status on scan. */
const STATUS_TRANSITION = {
    confirmed: 'checked-in',
    'checked-in': 'completed',
};

/** Human-readable action label per transition. */
const ACTION_LABEL = {
    confirmed: 'check-in',
    'checked-in': 'check-out',
};

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Build a structured QR validation error.
 * @param {string} message - UI-friendly error message.
 * @param {string|null} bookingId - Booking ID if known.
 * @returns {{ success: false, type: 'error', message: string, booking: null|{id} }}
 */
function buildError(message, bookingId = null) {
    return {
        success: false,
        type: 'error',
        message,
        booking: bookingId ? { id: bookingId, status: null, lotName: null, userId: null } : null,
    };
}

/**
 * Query Firestore for the booking matching a given QR string.
 * Returns the booking snapshot or null.
 *
 * @param {string} qrString
 * @returns {Promise<import('firebase/firestore').QueryDocumentSnapshot|null>}
 */
async function getBookingByQRCode(qrString) {
    // 1. Try finding by document ID first (for older bookings that lack a qrCode field) //
    try {
        const docRef = doc(db, BOOKINGS, qrString);
        const docSnap = await import('firebase/firestore').then(mod => mod.getDoc(docRef));
        if (docSnap.exists()) {
            return docSnap;
        }
    } catch (e) {
        // Ignored: qrString might not be a valid Firestore ID format.
    }

    // 2. Fall back to querying by the qrCode generated string field //
    const q = query(
        collection(db, BOOKINGS),
        where('qrCode', '==', qrString),
        limit(2)
    );
    const snap = await getDocs(q);

    if (snap.empty) return null;

    // Defensive: if someone duplicated a QR code in Firestore, log and use first.
    if (snap.size > 1) {
        console.warn(`[qrService] Duplicate QR code detected for: ${qrString}. Using first match.`);
    }

    return snap.docs[0];
}

/**
 * Assert that the booking belongs to the authenticated provider's lot.
 * Throws a descriptive error object (not a JS Error) if ownership fails.
 *
 * @param {{ id: string, lotId: string }} booking
 * @param {string} providerId
 */
function assertBelongsToProvider(booking, providerId) {
    if (!booking.lotId) {
        throw buildError('Booking is missing a lot reference. Contact support.');
    }
    if (booking.lotId !== providerId) {
        throw buildError('This booking does not belong to your lot.', booking.id);
    }
}

/**
 * Determine the next status transition for a booking.
 * Returns { nextStatus, actionType } or throws a structured error.
 *
 * @param {{ id: string, status: string }} booking
 * @returns {{ nextStatus: string, actionType: 'check-in'|'check-out' }}
 */
function getNextTransition(booking) {
    const { status, id } = booking;

    if (status === 'completed') {
        throw buildError('Booking is already completed.', id);
    }
    if (!SCANNABLE_STATUSES.has(status)) {
        throw buildError(
            `Booking status "${status}" is not eligible for scanning.`,
            id
        );
    }

    return {
        nextStatus: STATUS_TRANSITION[status],
        actionType: ACTION_LABEL[status],
    };
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Validate a scanned or manually entered QR code and perform check-in / check-out.
 *
 * This is the single public entry point called by QRScanner.jsx.
 * UI logic lives in the page; all business logic lives here.
 *
 * @param {string} qrString       - Raw QR code string from scanner or manual input.
 * @param {string} currentProviderId - Firebase Auth UID of the logged-in provider.
 * @returns {Promise<{
 *   success: boolean,
 *   type: 'check-in'|'check-out'|'error',
 *   message: string,
 *   booking: { id: string, status: string, lotName?: string, userId?: string } | null
 * }>}
 */
export async function validateQRCode(qrString, currentProviderId) {
    // ── Pre-flight guards ────────────────────────────────────────────────────
    const trimmed = (qrString || '').trim();
    if (!trimmed) {
        return buildError('QR code is empty. Please scan or enter a valid code.');
    }
    if (!currentProviderId) {
        return buildError('You are not authenticated as a provider. Please log in again.');
    }

    try {
        // ── Step 1: Look up the booking by QR code ───────────────────────────
        const bookingDoc = await getBookingByQRCode(trimmed);

        if (!bookingDoc) {
            return buildError('No booking found for this QR code.');
        }

        const bookingData = bookingDoc.data();
        const bookingId   = bookingDoc.id;

        // ── Step 2: Validate provider ownership ──────────────────────────────
        // Throws a structured error object (not a JS Error) on failure.
        assertBelongsToProvider({ id: bookingId, ...bookingData }, currentProviderId);

        // ── Step 3: Determine next transition ────────────────────────────────
        const { nextStatus, actionType } = getNextTransition({
            id: bookingId,
            status: bookingData.status,
        });

        // ── Step 4: Atomically update booking in a Firestore transaction ─────
        // The transaction re-reads the doc to guard against duplicate rapid scans
        // from multiple attendants concurrently.
        const bookingRef = doc(db, BOOKINGS, bookingId);

        await runTransaction(db, async (tx) => {
            const freshSnap = await tx.get(bookingRef);

            if (!freshSnap.exists()) {
                throw new Error('Booking disappeared during transaction.');
            }

            const freshData   = freshSnap.data();
            const freshStatus = freshData.status;

            // If another scan already advanced the status, reject to avoid double-transition.
            if (freshStatus !== bookingData.status) {
                throw new Error(
                    `Booking status changed to "${freshStatus}" while processing. Please rescan.`
                );
            }

            const updates = {
                status: nextStatus,
                updatedAt: serverTimestamp(),
            };

            // Stamp the appropriate timestamp for the action.
            if (actionType === 'check-in') {
                updates.checkedInAt = serverTimestamp();
            } else {
                updates.completedAt = serverTimestamp();
            }

            tx.update(bookingRef, updates);
        });

        // ── Step 5: Return structured success response ───────────────────────
        const actionLabel = actionType === 'check-in' ? 'Check-in' : 'Check-out';
        return {
            success: true,
            type: actionType,
            message: `${actionLabel} successful.`,
            booking: {
                id: bookingId,
                status: nextStatus,
                lotName: bookingData.lotName || null,
                userId: bookingData.userId || null,
                plateNumber: bookingData.plateNumber || null,
            },
        };

    } catch (err) {
        // Structured error objects thrown by internal helpers are returned directly.
        if (err && err.success === false && err.type === 'error') {
            return err;
        }

        // Network / Firestore / transaction errors become generic UI messages.
        console.error('[qrService] Unexpected error during QR validation:', err);
        return buildError(
            err?.message?.startsWith('Booking status changed')
                ? err.message
                : 'Validation failed due to a network or server error. Please try again.'
        );
    }
}

// Keep the old generateBookingQR export to avoid breaking the existing booking creation flow.
export async function generateBookingQR(booking) {
    const payload = {
        bookingId: booking.id,
        lotId: booking.lotId || '',
        userId: booking.userId || '',
        validUntil: booking.endTime || new Date(Date.now() + 3_600_000).toISOString(),
        // SECURITY NOTE: A real checksum / HMAC should be generated server-side
        // via a Cloud Function so the secret is never exposed to the client.
        checksum: 'PLACEHOLDER_CHECKSUM',
    };
    return JSON.stringify(payload);
}
