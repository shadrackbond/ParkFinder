/**
 * userService.js — Firestore User Profile Management
 *
 * This service manages user profiles in Firestore, including role assignment
 * and provider approval status.
 *
 * Firestore Collection: "users"
 * Document structure:
 *   {
 *     uid: string,
 *     email: string,
 *     role: 'customer' | 'provider' | 'admin',
 *     status: 'active' | 'pending' | 'rejected',
 *     displayName: string,
 *     phone: string,
 *     businessName: string (providers only),
 *     businessLocation: string (providers only),
 *     createdAt: Timestamp,
 *     updatedAt: Timestamp,
 *   }
 */

import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Create a new user profile document in Firestore.
 *
 * @param {string} uid - Firebase Auth UID
 * @param {'customer'|'provider'} role - User role
 * @param {Object} data - Additional profile data (displayName, email, phone, businessName, etc.)
 * @returns {Promise<void>}
 *
 * // TODO (Teammate Hole — User Management):
 * // 1. Validate that the uid doesn't already have a profile.
 * // 2. Add server-side validation via Cloud Function to prevent
 * //    clients from self-assigning 'admin' role.
 * // 3. Consider adding email verification check before activation.
 */
export async function createUserProfile(uid, role, data) {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
        uid,
        role,
        status: role === 'provider' ? 'pending' : 'active',
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });
}

/**
 * Fetch a user profile from Firestore.
 *
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<Object|null>} User profile data or null
 *
 * // TODO (Teammate Hole — User Management):
 * // 1. Add caching layer to reduce Firestore reads.
 * // 2. Consider onSnapshot listener for real-time updates.
 */
export async function getUserProfile(uid) {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? snap.data() : null;
}

/**
 * Update a user's role in Firestore.
 *
 * @param {string} uid - Firebase Auth UID
 * @param {'customer'|'provider'|'admin'} role - New role
 * @returns {Promise<void>}
 *
 * // TODO (Teammate Hole — Admin Service):
 * // 1. This should ONLY be callable from Cloud Functions / Admin SDK.
 * // 2. Add audit logging for role changes.
 * // 3. Set Firebase custom claims for role-based security rules.
 */
export async function updateUserRole(uid, role) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        role,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Update a provider's approval status.
 *
 * @param {string} uid - Firebase Auth UID
 * @param {'active'|'rejected'} status - New status
 * @returns {Promise<void>}
 *
 * // TODO (Teammate Hole — Admin Service):
 * // 1. Send notification (email/push) to provider on status change.
 * // 2. Move this to a Cloud Function for security.
 */
export async function updateProviderStatus(uid, status) {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
        status,
        updatedAt: serverTimestamp(),
    });
}

/**
 * Update user profile fields (username, business info, image, etc.)
 */
export async function updateUserProfile(uid, data) {
    const userRef = doc(db, 'users', uid);
    const cleanData = {};
    Object.entries(data).forEach(([key, val]) => {
        if (val !== undefined && val !== null) cleanData[key] = val;
    });
    await updateDoc(userRef, {
        ...cleanData,
        updatedAt: serverTimestamp(),
    });
}
