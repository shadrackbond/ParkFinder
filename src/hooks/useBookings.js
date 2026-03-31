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
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function useBookings(userId) {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const q = query(collection(db, 'bookings'), where('userId', '==', userId));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(b => b.customerCleared !== true);
            // Order them locally if needed or just set
            data.sort((a, b) => {
                const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return tB - tA; // descending
            });
            setBookings(data);
            setLoading(false);
        }, (err) => {
            console.error('Snapshot Error:', err);
            setError(err.message);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { bookings, loading, error, setBookings };
}
