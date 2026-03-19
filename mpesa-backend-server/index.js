const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

// 1. FIXED: Load environment variables correctly
// Locally it looks for .env, on Render it uses the dashboard variables automatically
dotenv.config();

try {
    if (!admin.apps.length) {
        // 2. FIXED: Support for Render Service Account
        if (process.env.FIREBASE_SERVICE_ACCOUNT) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } else {
            // Falls back to your local setup
            admin.initializeApp({
                credential: admin.credential.applicationDefault()
            });
        }
    }
} catch (e) {
    console.error('Firebase Admin initialization error', e);
}

const app = express();

app.use(cors());
// Safaricom Daraja sometimes sends callbacks without strict application/json headers
// Parsing '*/*' universally prevents the body from being dropped and causing unhandled 400 rejections 
app.use(express.json({ type: '*/*' }));
app.use(express.urlencoded({ extended: true }));

// 3. ADDED: Health check for the "Wake-up" ping
app.get('/health-check', (req, res) => res.status(200).send('Server is active'));

const mpesaRoutes = require('./routes/mpesa');
app.use('/api/mpesa', mpesaRoutes);

const PORT = process.env.PORT || 5000;

// 4. FIXED: Added '0.0.0.0' so Render can bind to the port correctly
app.listen(PORT, '0.0.0.0', () => {
    console.log(`M-Pesa Backend Server running on port ${PORT}`);
});