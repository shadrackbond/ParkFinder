import { MapPin, Clock, QrCode, X } from 'lucide-react';

/**
 * BookingCard — Displays a single booking.
 *
 * Handles both the new schema (date: "YYYY-MM-DD", startTime/endTime: "HH:MM" strings)
 * and the old schema (startTime/endTime as Firestore Timestamps).
 *
 * Props:
 *   booking       — booking document data + id
 *   onViewQR      — callback to show QR ticket
 *   onCancel      — callback(bookingId) to cancel the booking
 */
export default function BookingCard({ booking, onViewQR, onCancel }) {

    // ── Time / Date formatters (handle both plain strings and Timestamps) ──

    const formatTime = (val) => {
        if (!val) return '--:--';
        try {
            if (typeof val === 'string' && /^\d{2}:\d{2}$/.test(val)) return val;
            if (val.seconds) return new Date(val.seconds * 1000).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
            const d = val?.toDate ? val.toDate() : new Date(val);
            return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
        } catch { return '--:--'; }
    };

    const formatDate = (val) => {
        if (!val) return '';
        try {
            if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
                const d = new Date(val + 'T00:00:00');
                return d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
            }
            if (val.seconds) return new Date(val.seconds * 1000).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
            const d = val?.toDate ? val.toDate() : new Date(val);
            return d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
        } catch { return ''; }
    };

    // ── Date display ──────────────────────────────────────────────────────

    // New schema uses booking.date; old schema derives from startTime
    const dateDisplay = booking.date
        ? formatDate(booking.date)
        : formatDate(booking.startTime);

    const timeDisplay = `${formatTime(booking.startTime)} – ${formatTime(booking.endTime)}`;

    // ── Status styles ─────────────────────────────────────────────────────

    const statusStyle = {
        confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        'checked-in': 'bg-blue-50 text-blue-700 border-blue-100',
        completed: 'bg-gray-50 text-gray-500 border-gray-100',
        cancelled: 'bg-red-50 text-red-600 border-red-100',
        reserving: 'bg-amber-50 text-amber-700 border-amber-100',
    };

    // ── Cancel guard: only show cancel if confirmed + session not yet started ──

    const canCancel = (() => {
        if (booking.status !== 'confirmed') return false;
        const today = new Date().toISOString().slice(0, 10);
        // New schema
        if (booking.date && booking.startTime && typeof booking.startTime === 'string') {
            if (booking.date !== today) return true; // future date — always cancellable
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            const [sh, sm] = booking.startTime.split(':').map(Number);
            return currentMins < sh * 60 + sm;
        }
        // Old schema (Timestamp)
        if (booking.startTime?.seconds) {
            return new Date(booking.startTime.seconds * 1000) > new Date();
        }
        return false;
    })();

    const sessionStarted = booking.status === 'confirmed' && !canCancel;

    const isActive = ['confirmed', 'checked-in', 'reserving'].includes(booking.status);

    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-sm transition-shadow">
            {/* Provider Image */}
            {booking.lotImage && (
                <div className="relative h-28 overflow-hidden">
                    <img
                        src={booking.lotImage}
                        alt={booking.lotName}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusStyle[booking.status] || statusStyle.confirmed}`}>
                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                    </span>
                </div>
            )}

            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm">{booking.lotName}</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {booking.location || booking.lotName}
                            {booking.spotNumber != null && (
                                <span className="ml-1 bg-indigo-50 text-indigo-600 font-semibold px-1.5 py-0.5 rounded text-[10px]">
                                    Spot #{booking.spotNumber}
                                </span>
                            )}
                        </p>
                    </div>
                    {!booking.lotImage && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex-shrink-0 ${statusStyle[booking.status] || statusStyle.confirmed}`}>
                            {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-3">
                    <Clock className="w-3 h-3" />
                    <span>{dateDisplay} • {timeDisplay}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p>
                        <p className="text-gray-900 font-bold text-sm">KSh {booking.amount || 0}</p>
                    </div>

                    <div className="flex gap-2">
                        {/* View QR — active bookings only */}
                        {isActive && (
                            <button
                                onClick={() => onViewQR?.(booking)}
                                className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-2 rounded-lg text-xs font-semibold transition"
                            >
                                <QrCode className="w-3.5 h-3.5" />
                                View QR
                            </button>
                        )}

                        {/* Cancel — only before session starts */}
                        {canCancel && (
                            <button
                                onClick={() => onCancel?.(booking.id)}
                                className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg text-xs font-semibold transition"
                            >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                            </button>
                        )}

                        {/* Session in progress — greyed-out cancel with tooltip */}
                        {sessionStarted && (
                            <button
                                disabled
                                title="Session in progress — contact the provider to cancel"
                                className="flex items-center gap-1.5 bg-gray-100 text-gray-400 px-3 py-2 rounded-lg text-xs font-semibold cursor-not-allowed"
                            >
                                <X className="w-3.5 h-3.5" />
                                Cancel
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
