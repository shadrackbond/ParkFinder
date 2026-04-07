/**
 * parkingService.js — Parking Lot Data
 *
 * All lot data lives in the `parking-lots` Firestore collection.
 * Each document is keyed by providerId for easy upserts.
 *
 * Collection: "parking-lots"
 * Doc ID: providerId (the provider's Firebase Auth UID)
 * {
 *   providerId: string,
 *   businessName: string,
 *   businessLocation: string,
 *   description: string,
 *   hourlyRate: number,
 *   capacity: number,
 *   availableSpots: number,
 *   lotImages: string[],
 *   businessImage: string,   // first image
 *   isActive: boolean,       // true only when provider is approved
 *   createdAt: Timestamp,
 *   updatedAt: Timestamp,
 * }
 */

import {
    collection,
    query,
    where,
    getDocs,
    onSnapshot,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

const LOTS_COLLECTION = 'parking-lots';

function parseCoordinate(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

function mapLotDoc(d) {
    const data = d.data();
    return {
        id: d.id,
        providerId: data.providerId,
        name: data.businessName || 'Unnamed Lot',
        address: data.businessLocation || 'Nairobi',
        latitude: parseCoordinate(data.latitude),
        longitude: parseCoordinate(data.longitude),
        imageUrl: data.lotImages?.[0] || data.businessImage || '',
        lotImages: data.lotImages || (data.businessImage ? [data.businessImage] : []),
        hourlyRate: data.hourlyRate || 100,
        rating: data.rating || 4.5,
        availableSpots: data.availableSpots ?? data.capacity ?? 20,
        capacity: data.capacity || 50,
        description: data.description || '',
        openTime: data.openTime || null,
        closeTime: data.closeTime || null,
    };
}

/**
 * Fetch all active (approved) parking lots for the Home page.
 */
export async function fetchNearbyLots() {
    try {
        const q = query(
            collection(db, LOTS_COLLECTION),
            where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(mapLotDoc);
    } catch (err) {
        console.error('Failed to fetch lots:', err);
        return [];
    }
}

/**
 * Subscribe to active lots so the customer feed updates immediately
 * when providers edit capacity/details or bookings change availability.
 */
export function subscribeToActiveLots(onData, onError) {
    const q = query(
        collection(db, LOTS_COLLECTION),
        where('isActive', '==', true)
    );

    return onSnapshot(
        q,
        (snapshot) => {
            onData(snapshot.docs.map(mapLotDoc));
        },
        (err) => {
            console.error('Failed to subscribe to lots:', err);
            if (onError) onError(err);
        }
    );
}

/**
 * Get all lots — for admin use (active + inactive).
 */
export async function fetchAllLots() {
    try {
        const snapshot = await getDocs(collection(db, LOTS_COLLECTION));
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (err) {
        console.error('Failed to fetch all lots:', err);
        return [];
    }
}

/**
 * Get the parking lot belonging to a specific provider.
 * Doc ID is the providerId.
 */
export async function getLotByProvider(providerId) {
    try {
        const snap = await getDoc(doc(db, LOTS_COLLECTION, providerId));
        return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (err) {
        console.error('Failed to get lot:', err);
        return null;
    }
}

/**
 * Get a single lot by its ID (providerId === lot doc ID).
 */
export async function getLotById(lotId) {
    return getLotByProvider(lotId);
}

/**
 * Create or update a provider's parking lot.
 * Uses providerId as the document ID so there's always 1 lot per provider.
 */
export async function createOrUpdateLot(providerId, lotData) {
    try {
        const ref = doc(db, LOTS_COLLECTION, providerId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
            const nextCapacity = Number(lotData.capacity) || 0;

            // Recompute occupied spots from live booking records to avoid stale availability.
            const bookingsSnap = await getDocs(
                query(collection(db, 'bookings'), where('lotId', '==', providerId))
            );
            const activeStatuses = new Set(['reserved-pending', 'confirmed', 'checked-in']);
            const occupiedByBookings = bookingsSnap.docs.reduce((count, bookingDoc) => {
                const status = bookingDoc.data()?.status;
                return activeStatuses.has(status) ? count + 1 : count;
            }, 0);
            const nextAvailable = Math.max(nextCapacity - occupiedByBookings, 0);

            await updateDoc(ref, {
                ...lotData,
                providerId,
                availableSpots: nextAvailable,
                updatedAt: serverTimestamp(),
            });
        } else {
            await setDoc(ref, {
                ...lotData,
                providerId,
                isActive: false,        // inactive until admin approves
                availableSpots: lotData.capacity || 0,
                rating: 4.5,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
        }
    } catch (err) {
        console.error('Failed to save lot:', err);
        throw err;
    }
}

/**
 * Activate or deactivate a lot (called when admin approves/rejects provider).
 */
export async function setLotActive(providerId, isActive) {
    try {
        const ref = doc(db, LOTS_COLLECTION, providerId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
            await updateDoc(ref, { isActive, updatedAt: serverTimestamp() });
        }
        // If no lot doc exists yet (provider registered but never set up lot), do nothing
    } catch (err) {
        console.error('Failed to update lot active state:', err);
    }
}

/**
 * Delete a provider's parking lot. Admin only.
 */
export async function deleteLot(providerId) {
    try {
        await deleteDoc(doc(db, LOTS_COLLECTION, providerId));
    } catch (err) {
        console.error('Failed to delete lot:', err);
        throw err;
    }
}

/**
 * Update lot spot availability (called after a booking is made/cancelled).
 */
export async function updateLotAvailability(providerId, availableSpots) {
    try {
        await updateDoc(doc(db, LOTS_COLLECTION, providerId), {
            availableSpots,
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('Failed to update availability:', err);
        throw err;
    }
}

/**
 * Recomputes the lot's availableSpots based on live bookings.
 * Should be called whenever a booking is confirmed, cancelled, or completed.
 */
export async function recomputeLotAvailability(lotId) {
    if (!lotId) return;
    try {
        const ref = doc(db, LOTS_COLLECTION, lotId);
        const snap = await getDoc(ref);
        if (!snap.exists()) return;
        
        const lotData = snap.data();
        const capacity = Number(lotData.capacity) || 0;
        
        const bookingsSnap = await getDocs(
            query(collection(db, 'bookings'), where('lotId', '==', lotId))
        );
        
        const activeStatuses = new Set(['reserved-pending', 'confirmed', 'checked-in']);
        const occupiedByBookings = bookingsSnap.docs.reduce((count, bookingDoc) => {
            const status = bookingDoc.data()?.status;
            return activeStatuses.has(status) ? count + 1 : count;
        }, 0);
        
        const nextAvailable = Math.max(capacity - occupiedByBookings, 0);
        
        await updateDoc(ref, {
            availableSpots: nextAvailable,
            updatedAt: serverTimestamp(),
        });
    } catch (err) {
        console.error('Failed to recompute lot availability:', err);
    }
}
