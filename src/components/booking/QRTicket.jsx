import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Clock, MapPin, X } from 'lucide-react';

export default function QRTicket({ booking, onClose }) {
    const canvasRef = useRef(null);

    if (!booking) return null;

    // QR value MUST be the raw Firestore doc ID — nothing else.
    const qrValue = booking.id;

    // ── Formatters (handle both plain "HH:MM" strings and Firestore Timestamps) ──

    const formatTime = (val) => {
        if (!val) return '--:--';
        try {
            // Plain "HH:MM" string (new format)
            if (typeof val === 'string' && /^\d{2}:\d{2}$/.test(val)) return val;
            // Firestore Timestamp
            if (val.seconds) return new Date(val.seconds * 1000).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
            const d = val?.toDate ? val.toDate() : new Date(val);
            return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
        } catch { return '--:--'; }
    };

    const formatDate = (val) => {
        if (!val) return '';
        try {
            // Plain "YYYY-MM-DD" string (new format)
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                const d = new Date(val + 'T00:00:00');
                return d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
            }
            // Firestore Timestamp
            if (val.seconds) return new Date(val.seconds * 1000).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
            const d = val?.toDate ? val.toDate() : new Date(val);
            return d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
        } catch { return ''; }
    };

    // Generate QR code on mount
    useEffect(() => {
        if (canvasRef.current && qrValue) {
            QRCode.toCanvas(canvasRef.current, qrValue, {
                width: 180,
                margin: 2,
                color: { dark: '#0f172a', light: '#f8fafc' },
                errorCorrectionLevel: 'H',
            }).catch(console.error);
        }
    }, [qrValue]);

    // Determine date/time display — new schema uses plain strings
    const dateDisplay = booking.date ? formatDate(booking.date) : formatDate(booking.startTime);
    const timeDisplay = booking.startTime && booking.endTime
        ? `${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`
        : '--:-- – --:--';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
                {/* Header */}
                <div className="bg-teal-600 px-5 py-4 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold text-base">Parking Ticket</h3>
                        <p className="text-teal-100 text-sm">{booking.lotName || 'Parking'}</p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="text-white/80 hover:text-white p-1 rounded-full transition">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* QR Code Canvas */}
                <div className="flex justify-center py-6 px-6 bg-gray-50">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                        <canvas ref={canvasRef} />
                    </div>
                </div>

                {/* QR string (raw doc ID) */}
                <p className="text-center text-[11px] text-gray-400 font-mono pb-1 px-4 truncate">{qrValue}</p>

                {/* Divider */}
                <div className="relative mx-6 border-t-2 border-dashed border-gray-200 my-2" />

                {/* Details */}
                <div className="px-5 pb-5 pt-2 space-y-3">
                    {/* Spot + Status + Amount */}
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Spot</p>
                            <p className="text-gray-900 font-bold text-2xl">
                                #{booking.spotNumber ?? 'N/A'}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Status</p>
                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 capitalize">
                                {booking.status || 'Confirmed'}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Amount</p>
                            <p className="text-gray-900 font-bold text-sm">KSh {booking.amount || 0}</p>
                        </div>
                    </div>

                    {/* Date + Time */}
                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{dateDisplay} • {timeDisplay}</span>
                    </div>

                    {/* Location */}
                    {booking.location && (
                        <div className="flex items-center gap-1.5 text-gray-400 text-xs">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>{booking.location}</span>
                        </div>
                    )}

                    <p className="text-center text-gray-400 text-xs pt-1 border-t border-gray-50">
                        📱 Show this QR code to the parking attendant
                    </p>
                </div>
            </div>
        </div>
    );
}
