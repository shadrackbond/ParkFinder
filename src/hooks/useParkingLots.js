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
import { fetchNearbyLots } from '../services/parkingService';
import useParkingStore from '../store/useParkingStore';

export default function useParkingLots(filters = {}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { lots, setLots } = useParkingStore();

    useEffect(() => {
        async function loadLots() {
            try {
                setLoading(true);
                setError(null);
                // Default to Nairobi CBD coordinates
                const data = await fetchNearbyLots(
                    filters.lat || -1.2921,
                    filters.lng || 36.8219,
                    filters.radius || 5
                );
                setLots(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        loadLots();
    }, [filters.lat, filters.lng, filters.radius, setLots]);

    return { lots, loading, error };
}
