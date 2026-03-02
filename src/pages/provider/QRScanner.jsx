import { useState, useRef } from 'react';
import ProviderNav from '../../components/provider/ProviderNav';
import { validateQR } from '../../services/qrService';
import { Camera, CheckCircle2, XCircle, QrCode, RefreshCw } from 'lucide-react';

export default function QRScanner() {
    const [scanResult, setScanResult] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [manualCode, setManualCode] = useState('');

    async function handleManualValidation(e) {
        e.preventDefault();
        if (!manualCode.trim()) return;
        const result = await validateQR(manualCode);
        setScanResult(result);
        setManualCode('');
    }

    function startScanner() {
        setScanning(true);
        setScanResult(null);
        // TODO (Teammate Hole): Initialize html5-qrcode scanner
        setTimeout(async () => {
            const mockQR = JSON.stringify({ bookingId: 'bk_001', lotId: 'lot_001', userId: 'user_001', validUntil: new Date(Date.now() + 3600000).toISOString() });
            const result = await validateQR(mockQR);
            setScanResult(result);
            setScanning(false);
        }, 3000);
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <ProviderNav />
            <main className="flex-1 pb-safe lg:pb-6">
                <div className="px-5 pt-12 lg:pt-8 max-w-lg mx-auto">
                    <div className="mb-5">
                        <h1 className="text-xl font-bold text-gray-900">QR Scanner</h1>
                        <p className="text-gray-400 text-xs mt-0.5">Scan customer parking tickets</p>
                    </div>

                    {/* Scanner */}
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-5">
                        <div className="relative aspect-square max-h-72 bg-gray-50 flex items-center justify-center">
                            {scanning ? (
                                <div className="text-center">
                                    <div className="w-40 h-40 border-2 border-teal-500 rounded-2xl relative mx-auto mb-3">
                                        <div className="absolute inset-0 border-2 border-teal-500/30 rounded-2xl animate-pulse" />
                                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-teal-500 animate-bounce rounded-full" />
                                        <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-teal-500 rounded-tl-lg" />
                                        <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-teal-500 rounded-tr-lg" />
                                        <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-teal-500 rounded-bl-lg" />
                                        <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-teal-500 rounded-br-lg" />
                                    </div>
                                    <p className="text-gray-400 text-xs animate-pulse">Scanning...</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Camera className="w-7 h-7 text-gray-400" />
                                    </div>
                                    <button onClick={startScanner}
                                        className="bg-teal-600 hover:bg-teal-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition">
                                        Start Scanner
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Result */}
                    {scanResult && (
                        <div className={`rounded-xl p-4 mb-5 border ${scanResult.valid ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
                            }`}>
                            <div className="flex items-center gap-2 mb-2">
                                {scanResult.valid ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
                                <h3 className={`font-bold text-sm ${scanResult.valid ? 'text-emerald-700' : 'text-red-700'}`}>
                                    {scanResult.valid ? 'Valid Ticket' : 'Invalid Ticket'}
                                </h3>
                            </div>
                            <p className="text-xs text-gray-600 mb-2">{scanResult.message}</p>
                            {scanResult.valid && scanResult.booking && (
                                <div className="bg-white/60 rounded-lg p-3 space-y-1 text-xs text-gray-700">
                                    <p><span className="text-gray-400">Booking:</span> {scanResult.booking.id}</p>
                                    <p><span className="text-gray-400">Status:</span> <span className="text-emerald-600">{scanResult.booking.status}</span></p>
                                </div>
                            )}
                            <button onClick={() => { setScanResult(null); startScanner(); }}
                                className="mt-3 flex items-center gap-1 text-gray-500 text-xs font-medium">
                                <RefreshCw className="w-3 h-3" /> Scan Another
                            </button>
                        </div>
                    )}

                    {/* Manual */}
                    <div className="bg-white rounded-xl p-4 border border-gray-100">
                        <h3 className="text-gray-900 font-semibold text-sm mb-2 flex items-center gap-1.5">
                            <QrCode className="w-4 h-4 text-teal-600" /> Manual Entry
                        </h3>
                        <form onSubmit={handleManualValidation} className="flex gap-2">
                            <input type="text" value={manualCode} onChange={(e) => setManualCode(e.target.value)}
                                className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm placeholder-gray-400" placeholder="Enter code" />
                            <button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition">
                                Validate
                            </button>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}
