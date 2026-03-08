/**
 * adminService.js — Admin Operations
 *
 * Handles provider approval workflow, user management,
 * and platform analytics.
 *
 * // TODO (Teammate Hole — Admin):
 * // All admin operations should ideally be Cloud Functions
 * // with Firebase Admin SDK for security. Client-side calls
 * // should use httpsCallable.
 */

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateProviderStatus } from './userService';

/**
 * Get all providers with 'pending' status.
 *
 * @returns {Promise<Array>} Array of pending provider profiles
 *
 * // TODO (Teammate Hole — Admin Service):
 * // 1. Add pagination (limit + startAfter).
 * // 2. Add real-time listener option for live queue updates.
 * // 3. Consider adding sorting by submission date.
 */
export async function getPendingProviders() {
    try {
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'provider'),
            where('status', '==', 'pending')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.error('Failed to fetch pending providers:', err);
        // Return mock data for UI development
        return [
            {
                id: 'prov_001',
                email: 'abc-parking@example.com',
                businessName: 'ABC Parking Solutions',
                businessLocation: 'Westlands, Nairobi',
                phone: '+254 712 345 678',
                status: 'pending',
                createdAt: new Date(),
            },
            {
                id: 'prov_002',
                email: 'kenyapark@example.com',
                businessName: 'Kenya Park & Ride',
                businessLocation: 'CBD, Nairobi',
                phone: '+254 722 987 654',
                status: 'pending',
                createdAt: new Date(Date.now() - 86400000),
            },
        ];
    }
}

/**
 * Approve a pending provider.
 *
 * @param {string} providerId - UID of the provider
 * @returns {Promise<void>}
 *
 * // TODO (Teammate Hole — Admin Service):
 * // 1. Move to Cloud Function for security.
 * // 2. Send approval notification email/SMS to provider.
 * // 3. Set Firebase custom claim { role: 'provider' }.
 * // 4. Log admin action to audit trail collection.
 */
export async function approveProvider(providerId) {
    return updateProviderStatus(providerId, 'active');
}

/**
 * Reject a pending provider.
 *
 * @param {string} providerId - UID of the provider
 * @param {string} reason - Rejection reason
 * @returns {Promise<void>}
 *
 * // TODO (Teammate Hole — Admin Service):
 * // 1. Move to Cloud Function.
 * // 2. Send rejection notification with reason to provider.
 * // 3. Log admin action to audit trail.
 */
export async function rejectProvider(providerId) {
    return updateProviderStatus(providerId, 'rejected');
}

/**
 * Get all users with optional role filter.
 *
 * @param {string|null} roleFilter - Optional role to filter by
 * @returns {Promise<Array>}
 *
 * // TODO (Teammate Hole — Admin Service):
 * // 1. Add pagination.
 * // 2. Add search by email/name.
 * // 3. Move to Cloud Function with admin-only access.
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
 * Get platform-wide stats for admin dashboard.
 *
 * @returns {Promise<Object>}
 *
 * // TODO (Teammate Hole — Analytics):
 * // 1. Aggregate from Firestore collections.
 * // 2. Consider Cloud Function for expensive aggregations.
 * // 3. Cache results in a 'stats' document updated periodically.
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
        } catch { /* bookings collection may not exist yet */ }

        return {
            totalUsers: users.length,
            totalProviders: providers.length,
            pendingProviders: pending.length,
            totalBookings,
            revenue,
        };
    } catch (err) {
        console.error('Failed to get platform stats:', err);
        return { totalUsers: 0, totalProviders: 0, pendingProviders: 0, totalBookings: 0, revenue: 0 };
    }
}
