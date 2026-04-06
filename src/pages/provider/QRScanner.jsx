/**
 * QRScanner.jsx — Provider QR Code Scanner Page
 *
 * Camera / hardware infrastructure: @yudiel/react-qr-scanner for ultra-smooth performance.
 * Validation logic: fully rewritten per RULE ZERO spec.
 *
 * Scan flow:
 *   Step 1 — Decode: fetch booking by scanned ID, validate state.
 *   Step 2 — Overcharge: if user is late, collect extra charge via M-Pesa.
 *   Step 3 — Checkout: releaseSpot + mark booking completed.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
    Camera,
    CheckCircle2,
    XCircle,
    QrCode,
    RefreshCw,
    Loader2,
    AlertTriangle,
    Clock,
    DollarSign,
    LogOut,
    LogIn
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProviderNav from '../../components/provider/ProviderNav';
import { db } from '../../config/firebase';
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    updateDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { releaseSpot } from '../../services/spotService';
import axios from 'axios';
import {
    notifyCheckInSuccess,
    notifyCheckOutSuccess,
    notifyQrError,
    notifyProviderOverstay,
} from '../../../notifications/notifications';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCAN_COOLDOWN_MS   = 3000;
const MAX_HISTORY_ITEMS  = 10;
const OVERCHARGE_GRACE_MINUTES = 5;
const OVERCHARGE_POLL_INTERVAL_MS = 5000;

// ─── Audio / Haptics ──────────────────────────────────────────────────────────

function playTone(tone) {
    try {
        const ctx  = new (window.AudioContext || window.webkitAudioContext)();
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        if (tone === 'success') {
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        } else {
            osc.frequency.setValueAtTime(330, ctx.currentTime);
            osc.frequency.setValueAtTime(220, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        }
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        osc.onended = () => ctx.close();
    } catch { /* AudioContext not supported */ }
}

function vibrate(type) {
    if (!navigator.vibrate) return;
    navigator.vibrate(type === 'success' ? [80, 40, 80] : [200]);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEndTimeDate(booking) {
    if (!booking.endTime) return new Date();
    
    // Old schema: Firestore Timestamp or raw Date
    if (booking.endTime.seconds) return new Date(booking.endTime.seconds * 1000);
    if (booking.endTime.toDate) return booking.endTime.toDate();
    
    // New schema: string format "HH:MM"
    if (typeof booking.endTime === 'string' && booking.date) {
        const [year, month, day] = booking.date.split('-').map(Number);
        const endDate = new Date(year, month - 1, day);
        
        const [startH, startM] = (booking.startTime || '00:00').split(':').map(Number);
        const [endH, endM] = booking.endTime.split(':').map(Number);
        
        const startMins = startH * 60 + startM;
        const endMins = endH * 60 + endM;
        
        if (endMins <= startMins && booking.endTime !== booking.startTime) {
            endDate.setDate(endDate.getDate() + 1);
        }
        
        endDate.setHours(endH, endM, 0, 0);
        return endDate;
    }

    // Fallback
    const [h, m] = (booking.endTime || '00:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d;
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ item }) {
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors rounded-lg px-2 -mx-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.success ? (item.action === 'check-in' ? 'bg-teal-100' : 'bg-emerald-100') : 'bg-red-100'}`}>
                {item.success
                    ? (item.action === 'check-in' ? <LogIn className="w-4 h-4 text-teal-600" /> : <LogOut className="w-4 h-4 text-emerald-600" />)
                    : <XCircle className="w-4 h-4 text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                    {item.bookingId || item.qrSnippet || 'Unknown'}
                </p>
                <p className="text-[11px] text-gray-400 font-medium">{item.time}</p>
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${item.success ? (item.action === 'check-in' ? 'bg-teal-50 text-teal-700 border border-teal-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200') : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {item.success ? (item.action === 'check-in' ? 'Check-in' : 'Check-out') : 'Error'}
            </span>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QRScanner() {
    const { currentUser } = useAuth();

    // Camera state
    const [scannerActive, setScannerActive]       = useState(false);
    const [cameraError, setCameraError]           = useState(null);

    // Validation / result state
    const [validating, setValidating]             = useState(false);
    const [scanResult, setScanResult]             = useState(null); // { success, message, bookingId, action }

    // Overcharge state
    const [overchargeInfo, setOverchargeInfo]     = useState(null);
    const [sendingMpesa, setSendingMpesa]         = useState(false);
    const [mpesaSent, setMpesaSent]               = useState(false);

    // Manual entry
    const [manualCode, setManualCode]             = useState('');

    // Session history
    const [scanHistory, setScanHistory]           = useState([]);

    // Refs
    const isProcessingRef = useRef(false);
    const cooldownTimer   = useRef(null);
    const pollIntervalRef = useRef(null);

    useEffect(() => {
        return () => {
            clearTimeout(cooldownTimer.current);
            clearInterval(pollIntervalRef.current);
        };
    }, []);

    const startScanner = useCallback(() => {
        setCameraError(null);
        setScanResult(null);
        setScannerActive(true);
    }, []);

    const stopScanner = useCallback(() => {
        setScannerActive(false);
    }, []);

    // ── Core Validation Logic ───────────────────────────────────────────────

    const processValidation = useCallback(async (rawCode) => {
        if (!scannerActive && !manualCode) return; // Prevent scans when dormant
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setValidating(true);
        setScanResult(null);

        // Smoothly close scanner to show result card
        setScannerActive(false);

        const bookingId = rawCode.trim();

        try {
            let booking = null;

            try {
                if (bookingId.length > 0 && !bookingId.includes('/')) {
                    const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
                    if (bookingSnap.exists()) {
                        booking = { id: bookingSnap.id, ...bookingSnap.data() };
                    }
                }
            } catch (err) { /* ignore */ }

            if (!booking) {
                try {
                    const q = query(collection(db, 'bookings'), where('qrCode', '==', bookingId));
                    const querySnap = await getDocs(q);
                    if (!querySnap.empty) {
                        const snap = querySnap.docs[0];
                        booking = { id: snap.id, ...snap.data() };
                    }
                } catch (err) { /* ignore */ }
            }

            if (!booking) {
                playTone('error'); vibrate('error');
                const msg = 'Invalid QR code. No booking found.';
                setScanResult({ success: false, message: msg });
                notifyQrError(msg);
                addHistory({ success: false, bookingId, qrSnippet: rawCode.slice(0, 15) });
                return;
            }

            if (booking.status === 'cancelled') {
                playTone('error'); vibrate('error');
                const msg = 'This booking was cancelled.';
                setScanResult({ success: false, message: msg });
                notifyQrError(msg);
                addHistory({ success: false, bookingId, qrSnippet: rawCode.slice(0, 15) });
                return;
            }

            if (booking.checkedOut === true || booking.status === 'completed') {
                playTone('error'); vibrate('error');
                const msg = 'Already checked out.';
                setScanResult({ success: false, message: msg });
                notifyQrError(msg);
                addHistory({ success: false, bookingId, qrSnippet: rawCode.slice(0, 15) });
                return;
            }

            // ── Step 2: Check-In Flow ──────────────────────────────────────────
            if (booking.status === 'confirmed') {
                await updateDoc(doc(db, 'bookings', booking.id), {
                    status: 'checked-in',
                    checkInTime: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                });
                
                playTone('success'); vibrate('success');
                const updated = { ...booking, status: 'checked-in' };
                setScanResult({
                    success: true,
                    action: 'check-in',
                    message: `Checked IN. Spot #${booking.spotNumber}.`,
                    booking: updated,
                });
                notifyCheckInSuccess(updated);
                addHistory({ success: true, action: 'check-in', bookingId: booking.id, qrSnippet: booking.id.slice(0, 15) });

                setTimeout(() => {
                    setScanResult(null);
                    isProcessingRef.current = false;
                }, 4000);
                return;
            }

            // ── Step 3: Check-Out Flow (Overcharge & Release) ──────────────────
            if (booking.status !== 'checked-in') {
                playTone('error'); vibrate('error');
                const msg = 'Invalid booking state for checkout.';
                setScanResult({ success: false, message: msg });
                notifyQrError(msg);
                return;
            }

            const endTimeDate = getEndTimeDate(booking);
            const graceCutoff = new Date(endTimeDate.getTime() + OVERCHARGE_GRACE_MINUTES * 60000);
            const now = new Date();

            if (now > graceCutoff && !booking.overchargePaid) {
                if (overchargeInfo && overchargeInfo.bookingId === bookingId && !overchargeInfo.paid) {
                    playTone('error'); vibrate('error');
                    setScanResult({
                        success: false,
                        message: `Payment pending. KES ${overchargeInfo.extraCharge} not yet received.`,
                    });
                    return;
                }

                const extraMinutes = Math.ceil((now - endTimeDate) / 60000);

                let hourlyRate = 100;
                try {
                    const lotSnap = await getDoc(doc(db, 'parking-lots', booking.lotId));
                    if (lotSnap.exists()) hourlyRate = lotSnap.data().hourlyRate || 100;
                } catch { /* ignore */ }

                const extraCharge = Math.ceil(extraMinutes / 60) * hourlyRate;

                let userPhone = '';
                try {
                    const userSnap = await getDoc(doc(db, 'users', booking.userId));
                    if (userSnap.exists()) userPhone = userSnap.data().phone || '';
                } catch { /* ignore */ }

                setOverchargeInfo({
                    bookingId,
                    booking,
                    extraMinutes,
                    extraCharge,
                    phone: userPhone,
                    paid: false,
                });

                playTone('error'); vibrate('error');
                const msg = `User is ${extraMinutes} min late. Extra charge required.`;
                setScanResult({ success: false, message: msg });
                notifyProviderOverstay(booking);
                return;
            }

            // Standard Checkout
            await performCheckout(booking);

        } catch (err) {
            console.error('[QRScanner] processValidation error:', err);
            setScanResult({ success: false, message: 'An error occurred. Please try again.' });
        } finally {
            setValidating(false);
            cooldownTimer.current = setTimeout(() => {
                isProcessingRef.current = false;
            }, SCAN_COOLDOWN_MS);
        }
    }, [overchargeInfo, scannerActive, manualCode]);

    async function performCheckout(booking) {
        try {
            await releaseSpot(booking.lotId, booking.spotNumber, booking.id);
            await updateDoc(doc(db, 'bookings', booking.id), {
                status: 'completed',
                checkedOut: true,
                overchargePaid: true,
                checkoutTime: serverTimestamp(),
            });
            playTone('success'); vibrate('success');
            setScanResult({
                success: true,
                action: 'check-out',
                message: `Checked out. Spot #${booking.spotNumber} is now free.`,
                booking,
            });
            setOverchargeInfo(null);
            addHistory({ success: true, action: 'check-out', bookingId: booking.id, qrSnippet: booking.id.slice(0, 15) });

            setTimeout(() => {
                setScanResult(null);
                isProcessingRef.current = false;
            }, 4000);
        } catch (err) {
            console.error('[QRScanner] performCheckout error:', err);
            setScanResult({ success: false, message: 'Checkout failed. Please try again.' });
        }
    }

    // ── Overcharge M-Pesa ───────────────────────────────────────────────────

    const handleSendMpesa = useCallback(async () => {
        if (!overchargeInfo) return;
        setSendingMpesa(true);
        try {
            await axios.post('https://parkfinder-hwy4.onrender.com/api/mpesa/stkpush', {
                phone: overchargeInfo.phone || '254',
                amount: overchargeInfo.extraCharge,
                accountReference: overchargeInfo.bookingId,
                transactionDesc: 'Parking Overcharge',
                bookingId: overchargeInfo.bookingId,
            });
            setMpesaSent(true);

            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = setInterval(async () => {
                try {
                    const snap = await getDoc(doc(db, 'bookings', overchargeInfo.bookingId));
                    if (snap.exists() && snap.data().overchargePaid === true) {
                        clearInterval(pollIntervalRef.current);
                        const booking = { id: snap.id, ...snap.data() };
                        setOverchargeInfo(null);
                        setMpesaSent(false);
                        setValidating(true);
                        await performCheckout(booking);
                        setValidating(false);
                    }
                } catch (err) { /* ignore */ }
            }, OVERCHARGE_POLL_INTERVAL_MS);
        } catch (err) {
            console.error('[QRScanner] sendMpesa error:', err);
            setScanResult({ success: false, message: 'Failed to send M-Pesa prompt. Try again.' });
        } finally {
            setSendingMpesa(false);
        }
    }, [overchargeInfo]);

    function addHistory({ success, action, bookingId, qrSnippet }) {
        const entry = {
            id: Date.now(),
            time: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            success,
            action,
            bookingId: bookingId || null,
            qrSnippet: qrSnippet || '',
        };
        setScanHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY_ITEMS));
    }

    const handleManualValidation = useCallback(async (e) => {
        e.preventDefault();
        const code = manualCode.trim();
        if (!code || isProcessingRef.current) return;
        setManualCode('');
        await processValidation(code);
    }, [manualCode, processValidation]);

    const handleScanAnother = useCallback(() => {
        setScanResult(null);
        setOverchargeInfo(null);
        setMpesaSent(false);
        clearInterval(pollIntervalRef.current);
        isProcessingRef.current = false;
        setScannerActive(true);
    }, []);

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <ProviderNav />

            <main className="flex-1 pb-safe lg:pb-6 overflow-y-auto">
                <div className="px-4 pt-12 lg:pt-8 max-w-lg mx-auto">

                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">QR Scanner</h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Scan customer parking tickets to seamlessly check them in or out.
                        </p>
                    </div>

                    {/* Smooth Scanner Viewport Container */}
                    <div 
                        className={`transition-all duration-500 ease-in-out overflow-hidden will-change-transform rounded-3xl bg-gray-900 shadow-xl border border-gray-100 ${scannerActive ? 'max-h-[500px] opacity-100 scale-100 mb-6' : 'max-h-0 opacity-0 scale-95 mb-0 border-transparent shadow-none'}`}
                    >
                        {scannerActive && (
                            <div className="relative aspect-square w-full">
                                <Scanner 
                                    onScan={(result) => {
                                        if (result && result.length > 0) processValidation(result[0].rawValue);
                                    }}
                                    onError={(err) => setCameraError(err?.message)}
                                    components={{
                                        audio: false,
                                        torch: true,
                                        zoom: true,
                                        finder: true,
                                    }}
                                    styles={{
                                        container: { width: '100%', height: '100%', borderRadius: '24px' },
                                    }}
                                />
                                <div className="absolute top-4 right-4 z-10">
                                    <button 
                                        onClick={stopScanner}
                                        className="bg-black/50 backdrop-blur-md text-white p-2.5 rounded-full hover:bg-black/70 transition"
                                    >
                                        <XCircle className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10">
                                    <div className="bg-black/50 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-medium flex items-center gap-2">
                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                        Scanning actively...
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Start Scanner Button (Visible when dormant) */}
                    {!scannerActive && !scanResult && !validating && !overchargeInfo && (
                        <div className="bg-white rounded-3xl p-8 mb-6 border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 text-center">
                            <div className="w-20 h-20 bg-teal-50 rounded-full flex items-center justify-center">
                                <QrCode className="w-10 h-10 text-teal-600" />
                            </div>
                            <div>
                                <h3 className="text-gray-900 font-bold mb-1">Ready to Scan</h3>
                                <p className="text-gray-500 text-sm px-4">
                                    Launch the camera to scan a user's QR ticket.
                                </p>
                            </div>
                            <button
                                onClick={startScanner}
                                className="mt-2 w-full max-w-[200px] bg-gray-900 hover:bg-black text-white px-6 py-4 rounded-2xl font-bold text-sm transition-all transform hover:scale-105 active:scale-95 shadow-md flex items-center justify-center gap-2"
                            >
                                <Camera className="w-5 h-5" />
                                Open Camera
                            </button>
                        </div>
                    )}

                    {/* Validating Spinner Overlay */}
                    {validating && (
                        <div className="bg-white rounded-3xl p-10 mb-6 border border-gray-100 shadow-xl flex flex-col items-center justify-center gap-4 animate-in fade-in zoom-in duration-300">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-teal-100 border-t-teal-600 rounded-full animate-spin" />
                                <LockIcon />
                            </div>
                            <h3 className="text-gray-900 font-bold text-lg">Verifying Ticket</h3>
                            <p className="text-gray-500 text-sm">Please hold on a moment...</p>
                        </div>
                    )}

                    {/* Camera Error */}
                    {cameraError && !scannerActive && (
                        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 text-sm text-red-800 animate-in slide-in-from-top-4">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed font-medium">{cameraError}</p>
                        </div>
                    )}

                    {/* Scan Result Card - Highly visual and smooth */}
                    {scanResult && !validating && (
                        <div className={`rounded-3xl p-6 mb-6 border-2 shadow-lg animate-in slide-in-from-bottom-8 zoom-in-95 duration-500 ${scanResult.success ? (scanResult.action === 'check-in' ? 'bg-teal-50 border-teal-200 shadow-teal-500/10' : 'bg-emerald-50 border-emerald-200 shadow-emerald-500/10') : 'bg-red-50 border-red-200 shadow-red-500/10'}`}>
                            <div className="flex flex-col items-center text-center gap-4">
                                <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-inner ${scanResult.success ? (scanResult.action === 'check-in' ? 'bg-teal-100 text-teal-600' : 'bg-emerald-100 text-emerald-600') : 'bg-red-100 text-red-600'}`}>
                                    {scanResult.success 
                                        ? (scanResult.action === 'check-in' ? <LogIn className="w-10 h-10 animate-pulse" /> : <LogOut className="w-10 h-10 animate-bounce" />)
                                        : <XCircle className="w-10 h-10" />}
                                </div>
                                
                                <div>
                                    <h2 className={`text-xl font-black mb-1 ${scanResult.success ? 'text-gray-900' : 'text-red-900'}`}>
                                        {scanResult.success ? (scanResult.action === 'check-in' ? 'Checked In Successfully' : 'Checked Out Successfully') : 'Invalid Scan'}
                                    </h2>
                                    <p className={`font-medium ${scanResult.success ? 'text-gray-600' : 'text-red-700'}`}>
                                        {scanResult.message}
                                    </p>
                                    
                                    {scanResult.success && scanResult.booking && (
                                        <div className="mt-4 bg-white/60 p-3 rounded-xl border border-gray-200/50">
                                            <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Booking Reference</p>
                                            <p className="text-sm font-mono text-gray-900 font-bold">
                                                {scanResult.booking.id}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleScanAnother}
                                    className="mt-2 w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-800 py-3.5 rounded-xl font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                    <Camera className="w-4 h-4" />
                                    Scan Next Ticket
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Overcharge Panel */}
                    {overchargeInfo && !overchargeInfo.paid && !validating && (
                        <div className="bg-orange-50 border-2 border-orange-200 shadow-lg shadow-orange-500/10 rounded-3xl p-6 mb-6 animate-in zoom-in-95 duration-300">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                                    <Clock className="w-6 h-6 animate-pulse" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-black text-orange-900 leading-none mb-1">Overstay Detected</h3>
                                    <p className="text-xs font-bold text-orange-700 uppercase tracking-wider">Additional Charge Required</p>
                                </div>
                            </div>
                            
                            <div className="bg-white/60 rounded-xl p-4 space-y-2 mb-5">
                                <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                                    <span>Time Overstayed</span>
                                    <span className="font-bold text-gray-900 border border-gray-200 px-2 py-0.5 rounded-md bg-white">{overchargeInfo.extraMinutes} min</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                                    <span>Extra Charge</span>
                                    <span className="font-bold text-orange-600">KES {overchargeInfo.extraCharge}</span>
                                </div>
                                {overchargeInfo.phone && (
                                    <div className="flex justify-between items-center text-sm font-medium text-gray-600">
                                        <span>User Phone</span>
                                        <span className="font-bold text-gray-900">{overchargeInfo.phone}</span>
                                    </div>
                                )}
                            </div>

                            {mpesaSent ? (
                                <div className="flex flex-col items-center gap-3 bg-white border border-orange-200 shadow-inner rounded-xl p-5">
                                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                    <div className="text-center">
                                        <p className="text-sm font-bold text-gray-900">Waiting for M-Pesa Pin...</p>
                                        <p className="text-xs text-gray-500 mt-1">Prompt sent to user's phone. Checking status automatically.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleSendMpesa}
                                        disabled={sendingMpesa}
                                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-60 text-white font-bold py-4 rounded-xl text-sm transition-transform active:scale-95 shadow-md shadow-emerald-500/20"
                                    >
                                        {sendingMpesa
                                            ? <><Loader2 className="w-5 h-5 animate-spin" /> Requesting...</>
                                            : <><DollarSign className="w-5 h-5" /> Send STK Push prompt</>}
                                    </button>
                                    <button
                                        onClick={() => { setOverchargeInfo(null); setScannerActive(true); }}
                                        className="w-full py-3 text-xs font-bold text-orange-700 hover:text-orange-900 transition"
                                    >
                                        Cancel & Scan Another
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Manual Entry */}
                    {!scannerActive && (
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-6 animate-in fade-in duration-700">
                            <h3 className="text-gray-900 font-bold text-sm mb-3 flex items-center gap-2">
                                <QrCode className="w-4 h-4 text-teal-600" />
                                Manual Override
                            </h3>
                            <form onSubmit={handleManualValidation} className="flex gap-2">
                                <input
                                    type="text"
                                    value={manualCode}
                                    onChange={(e) => setManualCode(e.target.value)}
                                    placeholder="Enter booking ID manually"
                                    disabled={validating}
                                    className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-50 transition"
                                />
                                <button
                                    type="submit"
                                    disabled={validating || !manualCode.trim()}
                                    className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 px-5 py-3 rounded-xl font-bold text-sm transition"
                                >
                                    Validate
                                </button>
                            </form>
                        </div>
                    )}

                    {/* Scan History */}
                    {scanHistory.length > 0 && (
                        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm mb-8">
                            <h3 className="text-gray-900 font-bold text-sm mb-4 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                Recent Session Scans
                            </h3>
                            <div className="space-y-1">
                                {scanHistory.map((item) => (
                                    <HistoryItem key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function LockIcon() {
    return (
        <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 bg-teal-600 rounded-sm rounded-t-md relative -top-[2px]" />
        </div>
    );
}
