import {
    doc,
    getDoc,
    onSnapshot,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

function getUserRef(userId) {
    return doc(db, 'users', userId);
}

export function subscribeRecentLotIds(userId, onData, onError) {
    if (!userId) {
        onData([]);
        return () => {};
    }

    return onSnapshot(
        getUserRef(userId),
        (snapshot) => {
            const data = snapshot.data();
            onData(Array.isArray(data?.recentLotIds) ? data.recentLotIds : []);
        },
        (error) => {
            console.error('Failed to subscribe to recent lots:', error);
            if (onError) onError(error);
        }
    );
}

export async function addRecentLot(userId, lotId) {
    if (!userId || !lotId) return;

    const userRef = getUserRef(userId);
    const snapshot = await getDoc(userRef);
    const existingIds = Array.isArray(snapshot.data()?.recentLotIds)
        ? snapshot.data().recentLotIds
        : [];

    const nextRecentLotIds = [lotId, ...existingIds.filter((id) => id !== lotId)].slice(0, 8);

    await setDoc(
        userRef,
        {
            recentLotIds: nextRecentLotIds,
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
}
