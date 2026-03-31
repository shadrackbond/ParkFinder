/**
 * spotService.js — Spot-Level Lifecycle Management
 *
 * Firestore path: parking-lots/{lotId}/spots/{spotNumber}
 * Each spot doc: { spotNumber: number, bookings: BookingEntry[] }
 * BookingEntry: { bookingId, userId, date, startTime, endTime, checkedOut, paid }
 *
 * RULE ZERO: A spot is freed ONLY by provider QR scan → releaseSpot().
 * Nothing else (timeout, cron, customer action) releases a spot.
 */

import {
    collection,
    doc,
    getDocs,
    getDoc,
    runTransaction,
    onSnapshot,
    arrayUnion,
    arrayRemove,
    updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert "HH:MM" string to minutes since midnight. */
function toMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
}

/**
 * Two time ranges [startA, endA] and [startB, endB] overlap when:
 *   startA < endB && endA > startB
 * All values are minutes since midnight.
 */
function overlaps(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

/**
 * Given a spot doc's bookings array, return only the entries where
 * booking.date === date AND booking.checkedOut === false.
 */
function filterActiveBookings(bookings, date) {
    if (!Array.isArray(bookings)) return [];
    return bookings.filter(
        (b) => b.date === date && b.checkedOut === false
    );
}

/**
 * Derive spot status for a given date.
 * "free"    = no active bookings on this date
 * "partial" = has 1+ active bookings but day is not fully covered
 * "full"    = no bookable gap of >= 30 minutes remains
 */
function deriveStatus(activeBookings) {
    if (activeBookings.length === 0) return 'free';

    // Build sorted list of booked intervals in minutes
    const intervals = activeBookings
        .map((b) => {
            const start = toMinutes(b.startTime);
            let end = toMinutes(b.endTime);
            if (end <= start) end += 24 * 60; // cross-midnight
            return { start, end };
        })
        .sort((a, b) => a.start - b.start);

    // Check if there's any 30-minute gap in 00:00–24:00
    const dayStart = 0;
    const dayEnd = 24 * 60;

    let cursor = dayStart;
    for (const { start, end } of intervals) {
        if (start - cursor >= 30) return 'partial'; // gap before this slot
        cursor = Math.max(cursor, end);
    }
    if (dayEnd - cursor >= 30) return 'partial'; // gap after last slot

    return 'full';
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * One-time fetch of all spots for a lot, filtered to a given date.
 * Returns: Array<{ spotNumber, status, bookedSlots }>
 */
export async function getSpotsByLotAndDate(lotId, date) {
    try {
        const snap = await getDocs(
            collection(db, 'parking-lots', lotId, 'spots')
        );
        return snap.docs.map((d) => {
            const data = d.data();
            const active = filterActiveBookings(data.bookings, date);
            return {
                spotNumber: data.spotNumber,
                status: deriveStatus(active),
                bookedSlots: active.map(({ startTime, endTime, bookingId }) => ({
                    startTime,
                    endTime,
                    bookingId,
                })),
            };
        });
    } catch (err) {
        console.error('[spotService] getSpotsByLotAndDate failed:', err);
        return [];
    }
}

/**
 * Reserve a spot atomically using a Firestore transaction.
 *
 * Throws Error("SPOT_CONFLICT") if the slot overlaps with an existing booking.
 * This is the ONLY place a booking entry is added to a spot doc.
 */
export async function reserveSpot(
    lotId,
    spotNumber,
    bookingId,
    userId,
    date,
    startTime,
    endTime
) {
    const spotRef = doc(db, 'parking-lots', lotId, 'spots', String(spotNumber));

    await runTransaction(db, async (transaction) => {
        const spotSnap = await transaction.get(spotRef);

        const existing = spotSnap.exists()
            ? filterActiveBookings(spotSnap.data().bookings || [], date)
            : [];

        const newStart = toMinutes(startTime);
        let newEnd = toMinutes(endTime);
        if (newEnd <= newStart) newEnd += 24 * 60;

        for (const entry of existing) {
            const eStart = toMinutes(entry.startTime);
            let eEnd = toMinutes(entry.endTime);
            if (eEnd <= eStart) eEnd += 24 * 60;
            if (overlaps(newStart, newEnd, eStart, eEnd)) {
                throw new Error('SPOT_CONFLICT');
            }
        }

        const entry = {
            bookingId,
            userId,
            date,
            startTime,
            endTime,
            checkedOut: false,
            paid: false,
        };

        if (spotSnap.exists()) {
            transaction.update(spotRef, { bookings: arrayUnion(entry) });
        } else {
            transaction.set(spotRef, {
                spotNumber,
                bookings: [entry],
            });
        }
    });
}

/**
 * Remove a booking entry from a spot doc.
 * Idempotent — logs but does not throw if the entry is not found.
 *
 * This is the ONLY path that frees a spot (called after QR scan checkout).
 */
export async function releaseSpot(lotId, spotNumber, bookingId) {
    try {
        const spotRef = doc(db, 'parking-lots', lotId, 'spots', String(spotNumber));
        const spotSnap = await getDoc(spotRef);

        if (!spotSnap.exists()) {
            console.error('[spotService] releaseSpot: spot doc not found', { lotId, spotNumber });
            return;
        }

        const entry = (spotSnap.data().bookings || []).find(
            (b) => b.bookingId === bookingId
        );

        if (!entry) {
            console.error('[spotService] releaseSpot: booking entry not found', { bookingId });
            return;
        }

        await updateDoc(spotRef, { bookings: arrayRemove(entry) });
    } catch (err) {
        console.error('[spotService] releaseSpot failed:', err);
    }
}

/**
 * Subscribe to all spots for a lot, re-deriving statuses for `date` on each emission.
 * Returns the unsubscribe function.
 */
export function subscribeToSpots(lotId, date, callback, onError) {
    const spotsCol = collection(db, 'parking-lots', lotId, 'spots');

    return onSnapshot(
        spotsCol,
        (snapshot) => {
            const spots = snapshot.docs.map((d) => {
                const data = d.data();
                const active = filterActiveBookings(data.bookings, date);
                return {
                    spotNumber: data.spotNumber,
                    status: deriveStatus(active),
                    bookedSlots: active.map(({ startTime, endTime, bookingId }) => ({
                        startTime,
                        endTime,
                        bookingId,
                    })),
                };
            });
            callback(spots);
        },
        (err) => {
            console.error('[spotService] subscribeToSpots error:', err);
            if (onError) onError(err);
        }
    );
}
