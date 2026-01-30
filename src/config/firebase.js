// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // <--- ADDED THIS LINE

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAXu9miA9_bzOgrwMrONrVieDlj-vMj9SM",
  authDomain: "parkease-kenya.firebaseapp.com",
  projectId: "parkease-kenya",
  storageBucket: "parkease-kenya.firebasestorage.app",
  messagingSenderId: "43856234470",
  appId: "1:43856234470:web:a4ad7352d763eb93663827"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Authentication and Export it
export const auth = getAuth(app); // <--- ADDED THIS LINE (This fixes the error)
export default app;