const AUTH_ERROR_MESSAGES = {
    'auth/email-already-in-use': 'This email is already registered. Please sign in instead.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/missing-email': 'Email is required.',
    'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
    'auth/missing-password': 'Password is required.',
    'auth/operation-not-allowed': 'Email/password sign-in is disabled in Firebase Auth settings.',
    'auth/invalid-api-key': 'Firebase API key is invalid. Check VITE_FIREBASE_API_KEY.',
    'auth/api-key-not-valid.-please-pass-a-valid-api-key.': 'Firebase API key is invalid. Check VITE_FIREBASE_API_KEY.',
    'auth/network-request-failed': 'Network error. Check your internet connection and try again.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
};

/**
 * Normalize Firebase auth errors into user-friendly messages.
 * Works with FirebaseError.code and with plain message fallback.
 */
export function getFirebaseAuthErrorMessage(err, fallback = 'Something went wrong. Please try again.') {
    if (!err) return fallback;

    const code = typeof err.code === 'string' ? err.code.toLowerCase() : '';
    if (code && AUTH_ERROR_MESSAGES[code]) {
        return AUTH_ERROR_MESSAGES[code];
    }

    const rawMessage = typeof err.message === 'string' ? err.message : '';
    const messageCodeMatch = rawMessage.match(/\((auth\/[a-z0-9-.]+)\)/i);
    if (messageCodeMatch?.[1]) {
        const normalized = messageCodeMatch[1].toLowerCase();
        if (AUTH_ERROR_MESSAGES[normalized]) {
            return AUTH_ERROR_MESSAGES[normalized];
        }
    }

    const cleaned = rawMessage
        .replace(/^firebase:\s*/i, '')
        .replace(/\s*\(auth\/[a-z0-9-.]+\)\.?/gi, '')
        .trim();

    return cleaned || fallback;
}
