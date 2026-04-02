/**
 * bookingService.js — Booking Management
 *
 * Firestore Collection: "bookings"
 *
 * NOTE: qrCode is set by the caller (BookingModal) after getting the doc ID.
 *       cancelBooking enforces RULE ZERO — customers cannot cancel active sessions.
 */

import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    getDoc,
    doc,
    serverTimestamp,
    writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { releaseSpot } from './spotService';

/**
 * Create a new booking document with status "reserving".
 * Caller must set qrCode: docId after calling this, and then call reserveSpot().
 * All fields (spotNumber, lotId, checkedOut, overchargePaid, etc.) are accepted as-is.
 */
export async function createBooking(bookingData) {
    try {
        const ref = await addDoc(collection(db, 'bookings'), {
            ...bookingData,
            createdAt: serverTimestamp(),
        });
        return { id: ref.id, ...bookingData };
    } catch (err) {
        console.error('Failed to create booking:', err);
        throw err;
    }
}

/**
 * Delete a booking document (used to clean up placeholder docs on error).
 */
export async function deleteBooking(bookingId) {
    try {
        await deleteDoc(doc(db, 'bookings', bookingId));
    } catch (err) {
        console.error('Failed to delete booking:', err);
    }
}

/**
 * Cancel an existing booking.
 *
 * Rules (RULE ZERO enforcement):
 *  - Cannot cancel a completed (checkedOut) session.
 *  - Cannot cancel an active session (today's date AND currentTime >= startTime).
 *  - Future bookings: release spot, set status to "cancelled".
 */
export async function cancelBooking(bookingId) {
    const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
    if (!bookingSnap.exists()) throw new Error('Booking not found.');

    const booking = bookingSnap.data();

    if (booking.checkedOut === true) {
        throw new Error('Cannot cancel a completed session.');
    }

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (booking.date === today) {
        const now = new Date();
        const currentMins = now.getHours() * 60 + now.getMinutes();
        const [sh, sm] = (booking.startTime || '00:00').split(':').map(Number);
        const startMins = sh * 60 + sm;
        if (currentMins >= startMins) {
            throw new Error('Cannot cancel an active session. Contact the parking provider.');
        }
    }

    // Release the spot (remove booking entry from spot sub-doc)
    if (booking.lotId && booking.spotNumber) {
        await releaseSpot(booking.lotId, booking.spotNumber, bookingId);
    }

    await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
    });
}

/**
 * Get all bookings for a user from Firestore (one-time fetch).
 * For real-time updates, use the useBookings hook (onSnapshot).
 */
export async function getBookingsByUser(userId) {
    try {
        const q = query(
            collection(db, 'bookings'),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('Failed to fetch bookings:', err);
        return [];
    }
}

/**
 * Mark all completed or cancelled bookings for a user as "customerCleared: true".
 * This removes them from the user's booking/history view but keeps the documents available
 * for providers and administrators.
 */
export async function clearUserHistory(userId) {
    if (!userId) throw new Error('User ID is required.');
    
    try {
        const q = query(
            collection(db, 'bookings'),
            where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        
        const batch = writeBatch(db);
        let count = 0;
        
        snapshot.docs.forEach((d) => {
            const data = d.data();
            // Only hide completed or cancelled bookings. Active bookings cannot be hidden.
            if ((data.status === 'completed' || data.status === 'cancelled') && !data.customerCleared) {
                batch.update(d.ref, { 
                    customerCleared: true,
                    updatedAt: serverTimestamp() 
                });
                count++;
            }
        });

        if (count > 0) {
            await batch.commit();
        }
        
        return count;
    } catch (err) {
        console.error('[bookingService] clearUserHistory error:', err);
        throw new Error('Failed to clear history.');
    }
}
