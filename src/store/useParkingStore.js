/**
 * useParkingStore.js — Zustand Store for Parking Lot Availability
 *
 * Central state for the parking lot availability feed.
 * Components subscribe to this store for reactive updates.
 *
 * // TODO (Teammate Hole — Real-time Feed):
 * // Wire setLots to a Firestore onSnapshot listener for live availability.
 */

import { create } from 'zustand';

const useParkingStore = create((set) => ({
    // State
    lots: [],
    selectedLot: null,
    filters: {
        search: '',
        maxPrice: null,
        minRating: null,
        radius: 5, // km
    },
    loading: false,
    error: null,

    // Actions
    setLots: (lots) => set({ lots }),

    setSelectedLot: (lot) => set({ selectedLot: lot }),

    setFilters: (newFilters) =>
        set((state) => ({
            filters: { ...state.filters, ...newFilters },
        })),

    setLoading: (loading) => set({ loading }),

    setError: (error) => set({ error }),

    clearFilters: () =>
        set({
            filters: { search: '', maxPrice: null, minRating: null, radius: 5 },
        }),
}));

export default useParkingStore;
