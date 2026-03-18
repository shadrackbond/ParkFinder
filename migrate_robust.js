import fs from 'fs';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, updateDoc } from "firebase/firestore";

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
    console.log("Fetching all lots...");
    try {
        const q = collection(db, 'parking-lots');
        const snap = await getDocs(q);
        console.log(`Found ${snap.size} lots.`);
        let updated = false;
        snap.docs.forEach(async (doc) => {
            const name = doc.data().businessName || "";
            console.log(`Checking: "${name}"`);
            if (name.toLowerCase().includes("prism tower")) {
                console.log(`Match found! Updating ${doc.id}`);
                await updateDoc(doc.ref, { 
                    openTime: '07:00', 
                    closeTime: '21:00' 
                });
                console.log("Update successful.");
                updated = true;
            }
        });
        
        // Let it finish
        setTimeout(() => {
            if (!updated) console.log("No matching lot found to update.");
            process.exit(0);
        }, 5000);
        
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

run();
