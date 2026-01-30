// Import the function used to initialize a Firebase app
import { initializeApp } from "firebase/app";

// Import Firebase Authentication service
import { getAuth } from "firebase/auth";

// Firebase configuration object
// These values are loaded from environment variables (Vite project setup)
// This keeps sensitive keys out of your source code
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY, // Your Firebase API key
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, // Auth domain for Firebase authentication
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, // Unique ID of your Firebase project
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, // Cloud Storage bucket
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, // Sender ID for Firebase Cloud Messaging
  appId: import.meta.env.VITE_FIREBASE_APP_ID // Unique app identifier
};

// Initialize Firebase using the configuration above
// This creates a Firebase app instance
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and link it to the app instance
// This will be used for login, signup, logout, etc.
export const auth = getAuth(app);

// Export the Firebase app instance so it can be used in other files
export default app;
