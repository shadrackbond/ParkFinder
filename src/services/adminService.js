/**
 * adminService.js — Admin Operations
 *
 * Handles provider approval workflow, user management, lot management,
 * and platform analytics.
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateProviderStatus } from './userService';
import { setLotActive, fetchAllLots, deleteLot as deleteLotFromService } from './parkingService';

/**
 * Get all providers with 'pending' status.
 */
export async function getPendingProviders() {
    try {
        // Query only by role to avoid requiring a composite index in Firestore
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'provider')
        );
        const snapshot = await getDocs(q);
        const providers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Filter by status locally
        return providers.filter(p => p.status === 'pending');
    } catch (err) {
        console.error('Failed to fetch pending providers:', err);
        return [];
    }
}

/**
 * Approve a pending provider — sets user status to 'active'.
 * Does NOT activate the lot; lot must be approved separately.
 */
export async function approveProvider(providerId) {
    await updateProviderStatus(providerId, 'active');
}

/**
 * Reject a pending provider — sets user status to 'rejected' and
 * ensures the parking-lots doc isActive is false.
 */
export async function rejectProvider(providerId, reason = '') {
    await updateProviderStatus(providerId, 'rejected');
    await setLotActive(providerId, false);
}

/**
 * Get all users with optional role filter.
 */
export async function getAllUsers(roleFilter = null) {
    try {
        let q;
        if (roleFilter) {
            q = query(collection(db, 'users'), where('role', '==', roleFilter));
        } else {
            q = query(collection(db, 'users'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.error('Failed to fetch users:', err);
        return [];
    }
}

/**
 * Get all parking lots (active + inactive) — for admin management.
 */
export async function getAllLots() {
    return fetchAllLots();
}

/**
 * Delete a provider's parking lot from the parking-lots collection.
 */
export async function deleteLot(providerId) {
    return deleteLotFromService(providerId);
}

/**
 * Toggle a parking lot's active status (e.g. approving it after setup).
 */
export async function toggleLotStatus(providerId, isActive) {
    return setLotActive(providerId, isActive);
}

/**
 * Get platform-wide stats for admin dashboard.
 */
export async function getPlatformStats() {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map((d) => d.data());
        const providers = users.filter((u) => u.role === 'provider');
        const pending = providers.filter((u) => u.status === 'pending');

        let totalBookings = 0;
        let revenue = 0;
        try {
            const bookingsSnap = await getDocs(collection(db, 'bookings'));
            totalBookings = bookingsSnap.size;
            bookingsSnap.docs.forEach((d) => {
                revenue += d.data().totalPrice || 0;
            });
        } catch (e) { /* bookings collection may not exist yet */ }

        let activeLots = 0;
        try {
            const q = query(collection(db, 'parking-lots'), where('isActive', '==', true));
            const lotsSnap = await getDocs(q);
            activeLots = lotsSnap.size;
        } catch (e) { /* lots collection may not exist yet */ }

        return {
            totalUsers: users.length,
            totalProviders: providers.length,
            pendingProviders: pending.length,
            activeLots,
            totalBookings,
            revenue,
        };
    } catch (err) {
        console.error('Failed to get platform stats:', err);
        return { totalUsers: 0, totalProviders: 0, pendingProviders: 0, activeLots: 0, totalBookings: 0, revenue: 0 };
    }
}
