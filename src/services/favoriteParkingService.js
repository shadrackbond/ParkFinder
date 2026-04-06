/**
 * favoriteParkingService.js — Firestore Favorite Parking Lots
 *
 * Manages a customer's saved favorite parking lots.
 * Favorites are stored as an array field on the user's profile document.
 *
 * Firestore Collection: "users"
 * Document field:
 *   {
 *     favoriteLotIds: string[],  // Array of parking lot IDs the user has favorited
 *     updatedAt: Timestamp,
 *   }
 */

import {
    arrayRemove,
    arrayUnion,
    doc,
    onSnapshot,
    serverTimestamp,
    updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

function getUserRef(userId) {
    return doc(db, 'users', userId);
}

export function subscribeFavoriteLotIds(userId, onData, onError) {
    if (!userId) {
        onData([]);
        return () => {};
    }

    return onSnapshot(
        getUserRef(userId),
        (snapshot) => {
            const data = snapshot.data();
            onData(Array.isArray(data?.favoriteLotIds) ? data.favoriteLotIds : []);
        },
        (error) => {
            console.error('Failed to subscribe to favorite lots:', error);
            if (onError) onError(error);
        }
    );
}

export async function toggleFavoriteLot(userId, lotId, shouldFavorite) {
    if (!userId || !lotId) return;

    await updateDoc(
        getUserRef(userId),
        {
            favoriteLotIds: shouldFavorite ? arrayUnion(lotId) : arrayRemove(lotId),
            updatedAt: serverTimestamp(),
        }
    );
}
