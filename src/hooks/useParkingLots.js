/**
 * useParkingLots.js — Hook for fetching parking lot data
 *
 * Wraps parkingService calls and manages loading/error state.
 * Syncs results into the Zustand store.
 *
 * // TODO (Teammate Hole — Data Layer):
 * // 1. Replace the useEffect fetch with a Firestore onSnapshot
 * //    listener for real-time availability updates.
 * // 2. Add geolocation via navigator.geolocation.getCurrentPosition().
 * // 3. Implement debounced search filtering.
 */

import { useState, useEffect } from 'react';
import { subscribeToActiveLots } from '../services/parkingService';
import useParkingStore from '../store/useParkingStore';

export default function useParkingLots(filters = {}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { lots, setLots } = useParkingStore();

    useEffect(() => {
        setLoading(true);
        setError(null);

        const unsubscribe = subscribeToActiveLots(
            (data) => {
                setLots(data);
                setLoading(false);
            },
            (err) => {
                setError(err.message || 'Failed to load parking lots');
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [filters.lat, filters.lng, filters.radius, setLots]);

    return { lots, loading, error };
}
