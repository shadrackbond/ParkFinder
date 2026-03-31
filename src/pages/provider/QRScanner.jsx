/**
 * QRScanner.jsx — Provider QR Code Scanner Page
 *
 * Camera / hardware infrastructure: html5-qrcode (kept from original).
 * Validation logic: fully rewritten per RULE ZERO spec.
 *
 * Scan flow:
 *   Step 1 — Decode: fetch booking by scanned ID, validate state.
 *   Step 2 — Overcharge: if user is late, collect extra charge via M-Pesa.
 *   Step 3 — Checkout: releaseSpot + mark booking completed.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import {
    Camera,
    CheckCircle2,
    XCircle,
    QrCode,
    RefreshCw,
    Loader2,
    Zap,
    ZapOff,
    SwitchCamera,
    AlertTriangle,
    Clock,
    StopCircle,
    DollarSign,
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

// ─── Constants ────────────────────────────────────────────────────────────────

const SCANNER_ELEMENT_ID = 'qr-reader-viewport';
const SCAN_COOLDOWN_MS   = 2500;
const MAX_HISTORY_ITEMS  = 10;
const QR_BOX_SIZE        = 250;
const OVERCHARGE_GRACE_MINUTES = 5;
const OVERCHARGE_POLL_INTERVAL_MS = 5000;

const SCANNER_CONFIG = {
    fps: 10,
    qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE },
    showTorchButtonIfSupported: false,
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    rememberLastUsedCamera: false,
};

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

/**
 * Determine the absolute Date object for when the booking ends.
 * Handles old schemas (Timestamps) and new schema (plain strings),
 * including cross-midnight logic where endTime < startTime pushes to +1 day.
 */
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
        
        // If it crosses midnight, end time is on the following day
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
        <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${item.success ? 'bg-emerald-100' : 'bg-red-100'}`}>
                {item.success
                    ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    : <XCircle className="w-3.5 h-3.5 text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                    {item.bookingId || item.qrSnippet || 'Unknown'}
                </p>
                <p className="text-[10px] text-gray-400">{item.time}</p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.success ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {item.success ? 'Check-out' : 'Error'}
            </span>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QRScanner() {
    const { currentUser } = useAuth();

    // Camera state
    const [cameras, setCameras]                   = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const [scannerActive, setScannerActive]       = useState(false);
    const [scannerStarting, setScannerStarting]   = useState(false);
    const [torchOn, setTorchOn]                   = useState(false);
    const [torchSupported, setTorchSupported]     = useState(false);
    const [cameraError, setCameraError]           = useState(null);

    // Validation / result state
    const [validating, setValidating]             = useState(false);
    const [scanResult, setScanResult]             = useState(null); // { success, message, bookingId }

    // Overcharge state
    const [overchargeInfo, setOverchargeInfo]     = useState(null);
    // { bookingId, booking, extraMinutes, extraCharge, phone, paid }
    const [sendingMpesa, setSendingMpesa]         = useState(false);
    const [mpesaSent, setMpesaSent]               = useState(false);

    // Manual entry
    const [manualCode, setManualCode]             = useState('');

    // Session history
    const [scanHistory, setScanHistory]           = useState([]);

    // Refs
    const scannerRef      = useRef(null);
    const isProcessingRef = useRef(false);
    const cooldownTimer   = useRef(null);
    const pollIntervalRef = useRef(null);

    // ── Cleanup on unmount ──────────────────────────────────────────────────

    useEffect(() => {
        Html5Qrcode.getCameras()
            .then((devices) => {
                if (devices && devices.length > 0) {
                    setCameras(devices);
                    const back = devices.find((d) => /back|rear|environment/i.test(d.label));
                    setSelectedCameraId(back ? back.id : devices[0].id);
                } else {
                    setCameraError('No cameras detected on this device.');
                }
            })
            .catch(() => setCameras([]));

        return () => {
            stopScanner();
            clearTimeout(cooldownTimer.current);
            clearInterval(pollIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Scanner lifecycle ───────────────────────────────────────────────────

    const stopScanner = useCallback(async () => {
        if (!scannerRef.current) return;
        try {
            if (scannerRef.current.isScanning) await scannerRef.current.stop();
            await scannerRef.current.clear();
        } catch (err) {
            console.error('[QRScanner] Error stopping scanner:', err);
        }
        scannerRef.current = null;
        setTorchOn(false);
        setTorchSupported(false);
        setScannerActive(false);
        setScannerStarting(false);
    }, []);

    const startScanner = useCallback(async () => {
        setCameraError(null);
        setScanResult(null);
        setScannerStarting(true);

        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
        }

        const constraint = selectedCameraId
            ? { deviceId: selectedCameraId }
            : { facingMode: 'environment' };

        try {
            await scannerRef.current.start(
                constraint,
                SCANNER_CONFIG,
                handleScanSuccess,
                () => {}
            );
            setScannerActive(true);
            setScannerStarting(false);

            try {
                const caps = scannerRef.current.getRunningTrackCapabilities?.();
                if (caps?.torch) setTorchSupported(true);
            } catch { setTorchSupported(false); }

            Html5Qrcode.getCameras()
                .then((devices) => { if (devices?.length) setCameras(devices); })
                .catch(() => {});
        } catch (err) {
            console.error('[QRScanner] Start error:', err);
            scannerRef.current = null;
            setScannerActive(false);
            setScannerStarting(false);
            if (err?.name === 'NotAllowedError' || err?.message?.toLowerCase().includes('permission')) {
                setCameraError('Camera access was denied. Please allow camera permissions and try again.');
            } else if (err?.name === 'NotFoundError') {
                setCameraError('No camera found. Please use Manual Entry below.');
            } else {
                setCameraError('Could not start the camera. Try a different browser or use Manual Entry.');
            }
        }
    }, [selectedCameraId]); // eslint-disable-line react-hooks/exhaustive-deps

    const toggleTorch = useCallback(async () => {
        if (!scannerRef.current || !torchSupported) return;
        try {
            const next = !torchOn;
            await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: next }] });
            setTorchOn(next);
        } catch { setTorchSupported(false); }
    }, [torchOn, torchSupported]);

    const handleCameraSwitch = useCallback(async (newId) => {
        setSelectedCameraId(newId);
        if (scannerActive) {
            await stopScanner();
            setTimeout(() => { setSelectedCameraId(newId); startScanner(); }, 300);
        }
    }, [scannerActive, stopScanner, startScanner]);

    // ── Core Validation Logic ───────────────────────────────────────────────

    const processValidation = useCallback(async (rawCode) => {
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;
        setValidating(true);
        setScanResult(null);

        const bookingId = rawCode.trim();

        try {
            // ── Step 1: Fetch & validate booking ────────────────────────────
            let booking = null;

            // Try direct doc fetch first (new format where QR is doc ID)
            try {
                // Ignore empty or invalid string lengths that would crash doc()
                if (bookingId.length > 0 && !bookingId.includes('/')) {
                    const bookingSnap = await getDoc(doc(db, 'bookings', bookingId));
                    if (bookingSnap.exists()) {
                        booking = { id: bookingSnap.id, ...bookingSnap.data() };
                    }
                }
            } catch (err) {
                // Ignore format errors
            }

            // Fallback: Query by qrCode field (supports old PE-... formats)
            if (!booking) {
                try {
                    const q = query(collection(db, 'bookings'), where('qrCode', '==', bookingId));
                    const querySnap = await getDocs(q);
                    if (!querySnap.empty) {
                        const snap = querySnap.docs[0];
                        booking = { id: snap.id, ...snap.data() };
                    }
                } catch (err) {
                    // Ignore query errors
                }
            }

            if (!booking) {
                playTone('error'); vibrate('error');
                setScanResult({ success: false, message: 'Invalid QR code.' });
                addHistory({ success: false, bookingId, qrSnippet: rawCode.slice(0, 20) });
                return;
            }

            if (booking.status === 'cancelled') {
                playTone('error'); vibrate('error');
                setScanResult({ success: false, message: 'This booking was cancelled.' });
                addHistory({ success: false, bookingId, qrSnippet: rawCode.slice(0, 20) });
                return;
            }

            if (booking.checkedOut === true || booking.status === 'completed') {
                playTone('error'); vibrate('error');
                setScanResult({ success: false, message: 'Already checked out.' });
                addHistory({ success: false, bookingId, qrSnippet: rawCode.slice(0, 20) });
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
                setScanResult({
                    success: true,
                    message: `✓ Checked IN. User is now parking in Spot #${booking.spotNumber}.`,
                    booking,
                });
                addHistory({ success: true, bookingId: booking.id, qrSnippet: booking.id.slice(0, 20) });

                setTimeout(() => {
                    setScanResult(null);
                    isProcessingRef.current = false;
                }, 3000);
                return;
            }

            // ── Step 3: Check-Out Flow (Overcharge & Release) ──────────────────
            if (booking.status !== 'checked-in') {
                // Safety net
                playTone('error'); vibrate('error');
                setScanResult({ success: false, message: 'Invalid booking state for checkout.' });
                return;
            }

            const endTimeDate = getEndTimeDate(booking);
            const graceCutoff = new Date(endTimeDate.getTime() + OVERCHARGE_GRACE_MINUTES * 60000);
            const now = new Date();

            if (now > graceCutoff && !booking.overchargePaid) {
                // Check if there's an unpaid overcharge already being tracked
                if (overchargeInfo && overchargeInfo.bookingId === bookingId && !overchargeInfo.paid) {
                    playTone('error'); vibrate('error');
                    setScanResult({
                        success: false,
                        message: `Payment pending. KES ${overchargeInfo.extraCharge} not yet received. Try again after user pays.`,
                    });
                    return;
                }

                const extraMinutes = Math.ceil((now - endTimeDate) / 60000);

                // Fetch lot for hourlyRate
                let hourlyRate = 100;
                try {
                    const lotSnap = await getDoc(doc(db, 'parking-lots', booking.lotId));
                    if (lotSnap.exists()) hourlyRate = lotSnap.data().hourlyRate || 100;
                } catch { /* keep default */ }

                const extraCharge = Math.ceil(extraMinutes / 60) * hourlyRate;

                // Fetch user phone
                let userPhone = '';
                try {
                    const userSnap = await getDoc(doc(db, 'users', booking.userId));
                    if (userSnap.exists()) userPhone = userSnap.data().phone || '';
                } catch { /* keep empty */ }

                setOverchargeInfo({
                    bookingId,
                    booking,
                    extraMinutes,
                    extraCharge,
                    phone: userPhone,
                    paid: false,
                });

                playTone('error'); vibrate('error');
                setScanResult({ success: false, message: `User is ${extraMinutes} min late. Extra charge required.` });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [overchargeInfo]);

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
                message: `✓ Checked out. Spot #${booking.spotNumber} is now free.`,
                booking,
            });
            setOverchargeInfo(null);
            addHistory({ success: true, bookingId: booking.id, qrSnippet: booking.id.slice(0, 20) });

            // Auto-reset after 3 seconds
            setTimeout(() => {
                setScanResult(null);
                isProcessingRef.current = false;
            }, 3000);
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

            // Poll for overchargePaid === true every 5 seconds
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
                } catch (err) {
                    console.error('[QRScanner] poll error:', err);
                }
            }, OVERCHARGE_POLL_INTERVAL_MS);
        } catch (err) {
            console.error('[QRScanner] sendMpesa error:', err);
            setScanResult({ success: false, message: 'Failed to send M-Pesa prompt. Try again.' });
        } finally {
            setSendingMpesa(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [overchargeInfo]);

    function addHistory({ success, bookingId, qrSnippet }) {
        const entry = {
            id: Date.now(),
            time: new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            success,
            bookingId: bookingId || null,
            qrSnippet: qrSnippet || '',
        };
        setScanHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY_ITEMS));
    }

    const handleScanSuccess = useCallback(
        (decodedText) => processValidation(decodedText),
        [processValidation]
    );

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
    }, []);

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <ProviderNav />

            <main className="flex-1 pb-safe lg:pb-6 overflow-y-auto">
                <div className="px-4 pt-12 lg:pt-8 max-w-lg mx-auto">

                    {/* Header */}
                    <div className="mb-5">
                        <h1 className="text-xl font-bold text-gray-900">QR Scanner</h1>
                        <p className="text-gray-400 text-xs mt-0.5">
                            Scan customer parking tickets to check out
                        </p>
                    </div>

                    {/* Camera selector */}
                    {cameras.length > 1 && (
                        <div className="mb-3 flex items-center gap-2">
                            <SwitchCamera className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <select
                                value={selectedCameraId || ''}
                                onChange={(e) => handleCameraSwitch(e.target.value)}
                                className="flex-1 text-xs px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            >
                                {cameras.map((cam) => (
                                    <option key={cam.id} value={cam.id}>
                                        {cam.label || `Camera ${cam.id.slice(0, 8)}`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Scanner Viewport */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                        <div className="relative bg-gray-900">
                            <div
                                id={SCANNER_ELEMENT_ID}
                                style={{
                                    width: '100%',
                                    minHeight: (scannerActive || scannerStarting) ? '300px' : '0px',
                                    display: (scannerActive || scannerStarting) ? 'block' : 'none',
                                }}
                            />

                            {scannerStarting && !scannerActive && (
                                <div className="flex flex-col items-center justify-center py-14 gap-3">
                                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                                    <p className="text-gray-400 text-xs">Starting camera…</p>
                                </div>
                            )}

                            {!scannerActive && !scannerStarting && (
                                <div className="flex flex-col items-center justify-center py-14 gap-4">
                                    <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center">
                                        <Camera className="w-8 h-8 text-gray-500" />
                                    </div>
                                    <p className="text-gray-500 text-xs text-center px-4">
                                        Point your camera at a customer's QR code
                                    </p>
                                    <button
                                        onClick={startScanner}
                                        disabled={validating}
                                        className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition flex items-center gap-2"
                                    >
                                        <Camera className="w-4 h-4" />
                                        Start Scanner
                                    </button>
                                </div>
                            )}

                            {validating && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 rounded-2xl">
                                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                                    <p className="text-white text-sm font-medium">Validating…</p>
                                </div>
                            )}
                        </div>

                        {scannerActive && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-xs text-gray-500 font-medium">Scanning…</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {torchSupported && (
                                        <button
                                            onClick={toggleTorch}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${torchOn ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            {torchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
                                            {torchOn ? 'Torch On' : 'Torch'}
                                        </button>
                                    )}
                                    <button
                                        onClick={stopScanner}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 transition"
                                    >
                                        <StopCircle className="w-3.5 h-3.5" />
                                        Stop
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Camera Error */}
                    {cameraError && (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed">{cameraError}</p>
                        </div>
                    )}

                    {/* Scan Result */}
                    {scanResult && (
                        <div className={`rounded-2xl p-4 mb-5 border ${scanResult.success ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                            <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${scanResult.success ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                    {scanResult.success
                                        ? <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        : <XCircle className="w-5 h-5 text-red-600" />}
                                </div>
                                <div className="flex-1">
                                    <p className={`font-bold text-sm ${scanResult.success ? 'text-emerald-800' : 'text-red-800'}`}>
                                        {scanResult.message}
                                    </p>
                                    {scanResult.success && scanResult.booking && (
                                        <p className="text-xs text-emerald-700 mt-1">
                                            Booking {scanResult.booking.id} • {scanResult.booking.plateNumber || ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={handleScanAnother}
                                className="mt-3 flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:text-gray-700 transition"
                            >
                                <RefreshCw className="w-3 h-3" />
                                Scan Another
                            </button>
                        </div>
                    )}

                    {/* Overcharge Panel */}
                    {overchargeInfo && !overchargeInfo.paid && (
                        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-5">
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                <h3 className="text-sm font-bold text-orange-800">Overcharge Required</h3>
                            </div>
                            <div className="space-y-1.5 text-sm text-orange-700 mb-4">
                                <p>User is <strong>{overchargeInfo.extraMinutes} minutes</strong> late.</p>
                                <p>Extra charge: <strong>KES {overchargeInfo.extraCharge}</strong></p>
                                {overchargeInfo.phone && (
                                    <p>Phone: <strong>{overchargeInfo.phone}</strong></p>
                                )}
                            </div>

                            {mpesaSent ? (
                                <div className="flex items-center gap-2 bg-orange-100 rounded-xl px-4 py-3">
                                    <Loader2 className="w-4 h-4 text-orange-600 animate-spin flex-shrink-0" />
                                    <p className="text-xs text-orange-700 font-medium">
                                        Waiting for M-Pesa payment… (auto-checking every 5s)
                                    </p>
                                </div>
                            ) : (
                                <button
                                    onClick={handleSendMpesa}
                                    disabled={sendingMpesa}
                                    className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition"
                                >
                                    {sendingMpesa
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                                        : <><DollarSign className="w-4 h-4" /> Send M-Pesa Prompt</>}
                                </button>
                            )}
                        </div>
                    )}

                    {/* Manual Entry */}
                    <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-5">
                        <h3 className="text-gray-900 font-semibold text-sm mb-3 flex items-center gap-2">
                            <QrCode className="w-4 h-4 text-teal-600" />
                            Manual Entry
                        </h3>
                        <form onSubmit={handleManualValidation} className="flex gap-2">
                            <input
                                type="text"
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                placeholder="Enter booking ID"
                                disabled={validating}
                                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={validating || !manualCode.trim()}
                                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition flex items-center gap-1.5"
                            >
                                {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Validate'}
                            </button>
                        </form>
                    </div>

                    {/* Scan History */}
                    {scanHistory.length > 0 && (
                        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-6">
                            <h3 className="text-gray-900 font-semibold text-sm mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                Recent Scans
                                <span className="ml-auto text-[10px] font-normal text-gray-400">Session only</span>
                            </h3>
                            <div>
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
