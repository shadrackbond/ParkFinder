import {
    arrayRemove,
    arrayUnion,
    doc,
    onSnapshot,
    serverTimestamp,
    setDoc,
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

    await setDoc(
        getUserRef(userId),
        {
            favoriteLotIds: shouldFavorite ? arrayUnion(lotId) : arrayRemove(lotId),
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}
