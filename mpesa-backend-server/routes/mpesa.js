const express = require('express');
const router = express.Router();
const tokenSingleton = require('../utils/tokenSingleton');
const axios = require('axios');
const admin = require('firebase-admin');

const getTimestamp = () => {
    const date = new Date();
    const pad = (n) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
};

router.post('/stkpush', async (req, res) => {
    try {
        const { phone, amount, accountReference, transactionDesc } = req.body;

        const token = await tokenSingleton.getToken();

        const shortcode = process.env.MPESA_SHORTCODE;
        const passkey = process.env.MPESA_PASSKEY;
        const timestamp = getTimestamp();
        const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

        const callbackUrl = process.env.MPESA_CALLBACK_URL || 'https://parkfinder-hwy4.onrender.com/api/mpesa/callback'; // Fallback for local testing

        const payload = {
            BusinessShortCode: shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phone,
            PartyB: shortcode,
            PhoneNumber: phone,
            CallBackURL: callbackUrl,
            AccountReference: accountReference || 'ParkEase', // This is now exactly the bookingId from QRScanner / BookingModal
            TransactionDesc: transactionDesc || 'Parking Payment'
        };

        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        // Optional: Save the CheckoutRequestID to the booking document for tracking
        if (req.body.bookingId) {
            const db = admin.firestore();
            await db.collection('bookings').doc(req.body.bookingId).update({
                checkoutRequestId: response.data.CheckoutRequestID
            });
        }

        res.json({ success: true, data: response.data });
    } catch (error) {
        console.error('STK Push Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: 'Failed to initiate STK Push', details: error.response?.data || error.message });
    }
});

router.post('/callback', async (req, res) => {
    try {
        const callbackData = req.body.Body?.stkCallback;
        if (!callbackData) {
            return res.status(400).json({ success: false, error: 'Invalid callback data' });
        }

        const resultCode = callbackData.ResultCode;
        const checkoutRequestId = callbackData.CheckoutRequestID;

        const db = admin.firestore();
        const bookingsRef = db.collection('bookings');
        
        // We set AccountReference = bookingId in the stk push request
        // Safaricom passes it back in the CallbackMetadata or we can grab it if needed.
        // Wait, STK push callback doesn't always include AccountReference easily in the body.
        // It's safer to query by checkoutRequestId since we save it when initiating.
        const checkoutRequestId = callbackData.CheckoutRequestID;
        const q = bookingsRef.where('checkoutRequestId', '==', checkoutRequestId);
        const snapshot = await q.get();

        if (resultCode === 0) {
            // Success
            const metadataItem = callbackData.CallbackMetadata?.Item;
            const receiptItem = metadataItem?.find(item => item.Name === 'MpesaReceiptNumber');
            const receipt = receiptItem ? receiptItem.Value : 'N/A';

            if (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach((docSnap) => {
                    const bookingData = docSnap.data();
                    
                    // If it's an overcharge, we just mark it paid
                    if (bookingData.status === 'confirmed' || bookingData.checkedOut) {
                        batch.update(docSnap.ref, {
                            overchargePaid: true,
                            overchargeReceipt: receipt,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        // Standard initial booking confirmation
                        batch.update(docSnap.ref, {
                            status: 'confirmed',
                            paymentReceipt: receipt,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                });
                await batch.commit();
            }
        } else {
            // Failed
            if (!snapshot.empty) {
                const batch = db.batch();
                snapshot.docs.forEach((docSnap) => {
                    const bookingData = docSnap.data();
                    
                    if (bookingData.status === 'confirmed' || bookingData.checkedOut) {
                        batch.update(docSnap.ref, {
                            overchargePaymentFailed: true,
                            overchargeFailureReason: callbackData.ResultDesc,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    } else {
                        batch.update(docSnap.ref, {
                            status: 'payment-failed',
                            failureReason: callbackData.ResultDesc,
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    }
                });
                await batch.commit();
            }
        }

        // Always acknowledge M-Pesa with 200
        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Callback parsing error:', error);
        res.status(200).json({ success: true });
    }
});

module.exports = router;
