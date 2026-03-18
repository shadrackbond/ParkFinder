/**
 * bookingService.js — Booking Management
 *
 * Firestore Collection: "bookings"
 */

import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create a new booking.
 *
 * // TODO (Teammate Hole — Booking Logic):
 * // Move to Cloud Function for atomic spot validation.
 */
export async function createBooking(bookingData) {
    try {
        const ref = await addDoc(collection(db, 'bookings'), {
            ...bookingData,
            status: 'active',
            paymentStatus: 'pending',
            qrCode: `PE-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            createdAt: serverTimestamp(),
        });
        return { id: ref.id, ...bookingData };
    } catch (err) {
        console.error('Failed to create booking:', err);
        throw err;
    }
}

/**
 * Cancel an existing booking.
 */
export async function cancelBooking(bookingId) {
    try {
        await updateDoc(doc(db, 'bookings', bookingId), {
            status: 'cancelled',
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('Failed to cancel booking:', err);
        throw err;
    }
}

/**
 * Get all bookings for a user from Firestore.
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
