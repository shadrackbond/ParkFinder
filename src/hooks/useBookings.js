/**
 * useBookings.js — Hook for fetching user bookings
 *
 * Wraps bookingService calls and manages loading/error state.
 *
 * // TODO (Teammate Hole — Data Layer):
 * // 1. Add Firestore onSnapshot listener for real-time booking updates.
 * // 2. Add optimistic updates for cancel operations.
 * // 3. Implement booking status polling after payment initiation.
 */

import { useState, useEffect } from 'react';
import { getBookingsByUser } from '../services/bookingService';

export default function useBookings(userId) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        async function loadBookings() {
            try {
                setLoading(true);
                setError(null);
                const data = await getBookingsByUser(userId);
                setBookings(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadBookings();
    }, [userId]);

    return { bookings, loading, error, setBookings };
}
