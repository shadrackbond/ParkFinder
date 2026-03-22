/**
 * QRScanner.jsx — Provider QR Code Scanner Page
 *
 * Features:
 *  - Live camera scanning via html5-qrcode (rear camera preferred)
 *  - Camera selector dropdown (if multiple cameras available)
 *  - Torch / flashlight toggle (gracefully degraded)
 *  - Manual QR code entry fallback
 *  - Scan cooldown (2.5 s) to debounce rapid / duplicate scans
 *  - Audio feedback via Web AudioContext (no external assets)
 *  - Haptic feedback via navigator.vibrate() (feature-detected)
 *  - Session-only scan history (last 10 scans)
 *  - Proper scanner cleanup on unmount to prevent memory leaks
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ProviderNav from '../../components/provider/ProviderNav';
import { validateQRCode } from '../../services/qrService';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCANNER_ELEMENT_ID = 'qr-reader-viewport';
const SCAN_COOLDOWN_MS   = 2500;
const MAX_HISTORY_ITEMS  = 10;
const QR_BOX_SIZE        = 250;

const SCANNER_CONFIG = {
    fps: 10,
    qrbox: { width: QR_BOX_SIZE, height: QR_BOX_SIZE },
    aspectRatio: 1.0,
    showTorchButtonIfSupported: false, // we manage torch ourselves
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    rememberLastUsedCamera: false,
};

// ─── Audio Helpers ────────────────────────────────────────────────────────────

/**
 * Play a short tone using the Web AudioContext API.
 * @param {'success'|'error'} tone
 */
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
    } catch {
        // AudioContext not supported — fail silently.
    }
}

/**
 * Trigger device vibration if available.
 * @param {'success'|'error'} type
 */
function vibrate(type) {
    if (!navigator.vibrate) return;
    navigator.vibrate(type === 'success' ? [80, 40, 80] : [200]);
}

// ─── Result Card Component ────────────────────────────────────────────────────

function ResultCard({ result, onScanAnother }) {
    if (!result) return null;

    const isSuccess = result.success;
    const isCheckIn = result.type === 'check-in';

    return (
        <div
            className={`rounded-2xl p-4 mb-5 border ${
                isSuccess
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
            }`}
        >
            <div className="flex items-start gap-3">
                <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSuccess ? 'bg-emerald-100' : 'bg-red-100'
                    }`}
                >
                    {isSuccess ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                    )}
                </div>

                <div className="flex-1 min-w-0">
                    <h3
                        className={`font-bold text-sm mb-0.5 ${
                            isSuccess ? 'text-emerald-800' : 'text-red-800'
                        }`}
                    >
                        {isSuccess
                            ? isCheckIn
                                ? '✓ Check-In Successful'
                                : '✓ Check-Out Successful'
                            : '✗ Validation Failed'}
                    </h3>

                    <p
                        className={`text-xs ${
                            isSuccess ? 'text-emerald-700' : 'text-red-700'
                        }`}
                    >
                        {result.message}
                    </p>

                    {isSuccess && result.booking && (
                        <div className="mt-3 bg-white/70 rounded-xl p-3 space-y-1.5 text-xs text-gray-700">
                            <p>
                                <span className="text-gray-400 font-medium">Booking ID: </span>
                                <span className="font-mono">{result.booking.id}</span>
                            </p>
                            {result.booking.plateNumber && (
                                <p>
                                    <span className="text-gray-400 font-medium">Plate: </span>
                                    {result.booking.plateNumber}
                                </p>
                            )}
                            <p>
                                <span className="text-gray-400 font-medium">Status: </span>
                                <span
                                    className={
                                        result.booking.status === 'completed'
                                            ? 'text-gray-500 font-semibold'
                                            : 'text-teal-600 font-semibold'
                                    }
                                >
                                    {result.booking.status}
                                </span>
                            </p>
                            <p>
                                <span className="text-gray-400 font-medium">Action: </span>
                                <span className="font-semibold capitalize">
                                    {result.type}
                                </span>
                            </p>
                        </div>
                    )}

                    {!isSuccess && result.booking?.id && (
                        <p className="mt-2 text-xs text-gray-500 font-mono">
                            Booking: {result.booking.id}
                        </p>
                    )}
                </div>
            </div>

            <button
                onClick={onScanAnother}
                className="mt-3 flex items-center gap-1.5 text-gray-500 text-xs font-medium hover:text-gray-700 transition"
            >
                <RefreshCw className="w-3 h-3" />
                Scan Another
            </button>
        </div>
    );
}

// ─── Scan History Item ────────────────────────────────────────────────────────

function HistoryItem({ item }) {
    return (
        <div className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
            <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    item.success ? 'bg-emerald-100' : 'bg-red-100'
                }`}
            >
                {item.success ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                    <XCircle className="w-3.5 h-3.5 text-red-600" />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">
                    {item.bookingId || item.qrSnippet || 'Unknown'}
                </p>
                <p className="text-[10px] text-gray-400">
                    {item.action ? `${item.action} · ` : ''}{item.time}
                </p>
            </div>
            <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.success
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-red-100 text-red-700'
                }`}
            >
                {item.success ? item.type?.replace('-', ' ') || 'OK' : 'Error'}
            </span>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QRScanner() {
    const { currentUser } = useAuth();

    // Camera & scanner state
    const [cameras, setCameras]             = useState([]);
    const [selectedCameraId, setSelectedCameraId] = useState(null);
    const [scannerActive, setScannerActive] = useState(false);
    const [torchOn, setTorchOn]             = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [cameraError, setCameraError]     = useState(null);

    // Validation state
    const [validating, setValidating]       = useState(false);
    const [scanResult, setScanResult]       = useState(null);

    // Manual entry
    const [manualCode, setManualCode]       = useState('');

    // Session history
    const [scanHistory, setScanHistory]     = useState([]);

    // Refs
    const scannerRef      = useRef(null);  // Html5Qrcode instance
    const isProcessingRef = useRef(false); // debounce gate
    const cooldownTimer   = useRef(null);

    // ── Camera list on mount ────────────────────────────────────────────────

    useEffect(() => {
        Html5Qrcode.getCameras()
            .then((devices) => {
                if (devices && devices.length > 0) {
                    setCameras(devices);
                    // Prefer back/environment camera.
                    const back = devices.find(
                        (d) =>
                            /back|rear|environment/i.test(d.label)
                    );
                    setSelectedCameraId(back ? back.id : devices[0].id);
                } else {
                    setCameraError('No cameras detected on this device.');
                }
            })
            .catch((err) => {
                console.warn('[QRScanner] getCameras error:', err);
                // May happen before permission is granted — set a placeholder so
                // the user can still click Start and grant permission then.
                setCameras([]);
            });

        return () => {
            stopScanner();
            clearTimeout(cooldownTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Scanner lifecycle helpers ───────────────────────────────────────────

    const stopScanner = useCallback(async () => {
        if (!scannerRef.current) return;
        try {
            if (scannerRef.current.isScanning) {
                await scannerRef.current.stop();
            }
            await scannerRef.current.clear();
        } catch (err) {
            // Some browsers throw on stop() if the scanner never fully started.
            console.warn('[QRScanner] Error stopping scanner:', err);
        }
        scannerRef.current = null;
        setTorchOn(false);
        setTorchSupported(false);
        setScannerActive(false);
    }, []);

    const startScanner = useCallback(async () => {
        setCameraError(null);
        setScanResult(null);

        // Instantiate if needed.
        if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(SCANNER_ELEMENT_ID, { verbose: false });
        }

        const cameraConstraint = selectedCameraId
            ? { deviceId: selectedCameraId }
            : { facingMode: 'environment' };

        try {
            await scannerRef.current.start(
                cameraConstraint,
                SCANNER_CONFIG,
                handleScanSuccess,
                () => {} // Suppress per-frame "not found" logs
            );

            setScannerActive(true);

            // Detect torch support.
            try {
                const capabilities =
                    scannerRef.current.getRunningTrackCapabilities?.();
                if (capabilities?.torch) {
                    setTorchSupported(true);
                }
            } catch {
                setTorchSupported(false);
            }

            // Re-populate camera list now that permission is granted.
            Html5Qrcode.getCameras().then((devices) => {
                if (devices?.length) setCameras(devices);
            }).catch(() => {});

        } catch (err) {
            console.error('[QRScanner] Start error:', err);
            scannerRef.current = null;
            setScannerActive(false);

            if (
                err?.name === 'NotAllowedError' ||
                err?.message?.toLowerCase().includes('permission')
            ) {
                setCameraError(
                    'Camera access was denied. Please allow camera permissions in your browser settings and try again.'
                );
            } else if (
                err?.name === 'NotFoundError' ||
                err?.message?.toLowerCase().includes('not found')
            ) {
                setCameraError('No camera found. Please use the Manual Entry below.');
            } else {
                setCameraError(
                    'Could not start the camera scanner. Try a different browser or use Manual Entry.'
                );
            }
        }
    }, [selectedCameraId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Torch toggle ──────────────────────────────────────────────────────

    const toggleTorch = useCallback(async () => {
        if (!scannerRef.current || !torchSupported) return;
        try {
            const next = !torchOn;
            await scannerRef.current.applyVideoConstraints({ advanced: [{ torch: next }] });
            setTorchOn(next);
        } catch {
            setTorchSupported(false);
        }
    }, [torchOn, torchSupported]);

    // ── Camera switch ───────────────────────────────────────────────────────

    const handleCameraSwitch = useCallback(async (newCameraId) => {
        setSelectedCameraId(newCameraId);
        if (scannerActive) {
            await stopScanner();
            // Brief delay to let DOM settle before restart.
            setTimeout(() => {
                setSelectedCameraId(newCameraId);
                startScanner();
            }, 300);
        }
    }, [scannerActive, stopScanner, startScanner]);

    // ── QR scan success handler ─────────────────────────────────────────────

    const processValidation = useCallback(async (rawCode) => {
        // Debounce: ignore if already processing.
        if (isProcessingRef.current) return;
        isProcessingRef.current = true;

        setValidating(true);
        setScanResult(null);

        const result = await validateQRCode(rawCode.trim(), currentUser?.uid);

        setValidating(false);
        setScanResult(result);

        // Audio + haptic feedback.
        playTone(result.success ? 'success' : 'error');
        vibrate(result.success ? 'success' : 'error');

        // Append to session history.
        const historyEntry = {
            id: Date.now(),
            time: new Date().toLocaleTimeString('en-KE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
            }),
            success: result.success,
            type: result.type,
            action: result.success
                ? result.type === 'check-in'
                    ? 'Check-In'
                    : 'Check-Out'
                : null,
            bookingId: result.booking?.id || null,
            qrSnippet: rawCode.slice(0, 20),
            message: result.message,
        };
        setScanHistory((prev) => [historyEntry, ...prev].slice(0, MAX_HISTORY_ITEMS));

        // Release debounce after cooldown.
        cooldownTimer.current = setTimeout(() => {
            isProcessingRef.current = false;
        }, SCAN_COOLDOWN_MS);
    }, [currentUser]);

    const handleScanSuccess = useCallback(
        (decodedText) => {
            processValidation(decodedText);
        },
        [processValidation]
    );

    // ── Manual entry ─────────────────────────────────────────────────────────

    const handleManualValidation = useCallback(
        async (e) => {
            e.preventDefault();
            const code = manualCode.trim();
            if (!code) return;
            if (isProcessingRef.current) return;
            setManualCode('');
            await processValidation(code);
        },
        [manualCode, processValidation]
    );

    // ── "Scan another" resets result & resumes scanner ────────────────────

    const handleScanAnother = useCallback(() => {
        setScanResult(null);
        if (!scannerActive) return;
        // Scanner is still running — just clear result to allow next scan.
    }, [scannerActive]);

    // ─── Render ─────────────────────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <ProviderNav />

            <main className="flex-1 pb-safe lg:pb-6 overflow-y-auto">
                <div className="px-4 pt-12 lg:pt-8 max-w-lg mx-auto">

                    {/* ── Page Header ── */}
                    <div className="mb-5">
                        <h1 className="text-xl font-bold text-gray-900">QR Scanner</h1>
                        <p className="text-gray-400 text-xs mt-0.5">
                            Scan customer parking tickets to check in or out
                        </p>
                    </div>

                    {/* ── Camera Selector ── */}
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

                    {/* ── Scanner Viewport ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
                        <div className="relative bg-gray-900">
                            {/* html5-qrcode mounts into this div */}
                            <div
                                id={SCANNER_ELEMENT_ID}
                                className={scannerActive ? 'block' : 'hidden'}
                                style={{ width: '100%' }}
                            />

                            {/* Placeholder when scanner is off */}
                            {!scannerActive && (
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

                            {/* Validating overlay */}
                            {validating && (
                                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-3 rounded-2xl">
                                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                                    <p className="text-white text-sm font-medium">Validating…</p>
                                </div>
                            )}
                        </div>

                        {/* Scanner Controls */}
                        {scannerActive && (
                            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                    <span className="text-xs text-gray-500 font-medium">
                                        Scanning…
                                    </span>
                                </div>

                                <div className="flex items-center gap-2">
                                    {torchSupported && (
                                        <button
                                            onClick={toggleTorch}
                                            title={torchOn ? 'Turn off torch' : 'Turn on torch'}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                torchOn
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {torchOn ? (
                                                <Zap className="w-3.5 h-3.5" />
                                            ) : (
                                                <ZapOff className="w-3.5 h-3.5" />
                                            )}
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

                    {/* ── Camera / Permission Error ── */}
                    {cameraError && (
                        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
                            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs leading-relaxed">{cameraError}</p>
                        </div>
                    )}

                    {/* ── Scan Result Card ── */}
                    <ResultCard result={scanResult} onScanAnother={handleScanAnother} />

                    {/* ── Manual Entry ── */}
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
                                placeholder="Enter QR code (e.g. PE-1234567-ABCDE)"
                                disabled={validating}
                                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:outline-none disabled:opacity-50"
                            />
                            <button
                                type="submit"
                                disabled={validating || !manualCode.trim()}
                                className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition flex items-center gap-1.5"
                            >
                                {validating ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    'Validate'
                                )}
                            </button>
                        </form>
                    </div>

                    {/* ── Scan History ── */}
                    {scanHistory.length > 0 && (
                        <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-6">
                            <h3 className="text-gray-900 font-semibold text-sm mb-3 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                Recent Scans
                                <span className="ml-auto text-[10px] font-normal text-gray-400">
                                    Session only
                                </span>
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
