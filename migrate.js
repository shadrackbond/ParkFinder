import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc } from "firebase/firestore";

const env = fs.readFileSync('.env', 'utf-8');
const envVars = {};
env.split('\n').forEach(line => {
    const match = line.match(/^VITE_([^=]+)=(.*)$/);
    if (match) envVars[`VITE_${match[1]}`] = match[2].trim().replace(/['"]/g, '');
});

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY,
  authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envVars.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envVars.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    console.log("Searching for Prism Tower Parking...");
    const q = query(collection(db, 'parking-lots'), where('businessName', '==', 'Prism Tower Parking'));
    const snap = await getDocs(q);
    if (snap.empty) {
        console.log("No lot found!");
        process.exit(1);
    }
    for (const doc of snap.docs) {
        await updateDoc(doc.ref, { openTime: '07:00', closeTime: '21:00' });
        console.log("Successfully updated lot:", doc.id);
    }
    process.exit(0);
}

run();
