import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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
    console.log("Listing lots...");
    try {
        const q = collection(db, 'parking-lots');
        const snap = await getDocs(q);
        console.log(`Found ${snap.size} lots.`);
        snap.docs.forEach(doc => {
            console.log(`ID: ${doc.id} | Name: "${doc.data().businessName}"`);
        });
    } catch (err) {
        console.error("Error listing lots:", err);
    }
    process.exit(0);
}

// Give it some time to connect if needed (though getDocs should handle it)
setTimeout(run, 1000);
