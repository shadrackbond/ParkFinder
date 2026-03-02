/**
 * parkingService.js — Parking Lot Data
 *
 * Fetches approved providers from Firestore as parking spots.
 */

import { collection, query, where, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Fetch all approved providers as parking spots for the Home page.
 * Each active provider with business info = a parking listing.
 */
export async function fetchNearbyLots(lat = -1.2921, lng = 36.8219, radiusKm = 5) {
    try {
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'provider'),
            where('status', '==', 'active')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => {
            const data = d.data();
            return {
                id: d.id,
                name: data.businessName || 'Unnamed Lot',
                address: data.businessLocation || 'Nairobi',
                imageUrl: data.lotImages?.[0] || data.businessImage || '',
                lotImages: data.lotImages || (data.businessImage ? [data.businessImage] : []),
                hourlyRate: data.hourlyRate || 100,
                rating: data.rating || 4.5,
                availableSpots: data.availableSpots ?? 20,
                capacity: data.capacity || 50,
            };
        });
    } catch (err) {
        console.error('Failed to fetch lots:', err);
        return [];
    }
}

/**
 * Get a single lot/provider by ID.
 */
export async function getLotById(lotId) {
    try {
        const snap = await getDoc(doc(db, 'users', lotId));
        if (!snap.exists()) return null;
        const data = snap.data();
        return { id: snap.id, ...data };
    } catch (err) {
        console.error('Failed to get lot:', err);
        return null;
    }
}

/**
 * Create a new parking lot document.
 * // TODO (Teammate Hole): Move to dedicated parkingLots collection
 */
export async function createLot(providerId, lotData) {
    try {
        const ref = await addDoc(collection(db, 'parkingLots'), {
            ...lotData,
            providerId,
            isActive: true,
            createdAt: serverTimestamp(),
        });
        return ref.id;
    } catch (err) {
        console.error('Failed to create lot:', err);
        throw err;
    }
}

/**
 * Update lot availability.
 * // TODO (Teammate Hole): Use Firestore transactions for atomicity
 */
export async function updateLotAvailability(lotId, availableSpots) {
    try {
        await updateDoc(doc(db, 'parkingLots', lotId), { availableSpots });
    } catch (err) {
        console.error('Failed to update availability:', err);
        throw err;
    }
}
