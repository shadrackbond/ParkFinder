import { MapPin, Clock, QrCode } from 'lucide-react';

/**
 * BookingCard — A card representing a single booking.
 * Now includes provider image.
 */
export default function BookingCard({ booking, onViewQR, onCheckoutEarly }) {
    const formatTime = (date) => {
        if (!date) return '--:--';
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        if (!date) return '';
        if (date.seconds) return new Date(date.seconds * 1000).toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
        const d = date?.toDate ? date.toDate() : new Date(date);
        return d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const statusStyle = {
        active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        completed: 'bg-blue-50 text-blue-700 border-blue-100',
        cancelled: 'bg-red-50 text-red-600 border-red-100',
    };

    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-card-hover transition">
            {/* Provider Image */}
            {booking.lotImage && (
                <div className="relative h-28 overflow-hidden">
                    <img
                        src={booking.lotImage}
                        alt={booking.lotName}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusStyle[booking.status] || statusStyle.active}`}>
                        {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                    </span>
                </div>
            )}

            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm">{booking.lotName}</h3>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {booking.location || booking.lotName} • Spot {booking.spotNumber}
                        </p>
                    </div>
                    {!booking.lotImage && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex-shrink-0 ${statusStyle[booking.status] || statusStyle.active}`}>
                            {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-3">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(booking.startTime)} • {formatTime(booking.startTime)} – {formatTime(booking.endTime)}</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                    <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">Total</p>
                        <p className="text-gray-900 font-bold text-sm">KSh {booking.amount || 0}</p>
                    </div>
                    {['active', 'confirmed', 'checked-in'].includes(booking.status) && (
                        <div className="flex gap-2">
                            <button
                                onClick={() => onViewQR?.(booking)}
                                className="flex items-center gap-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-2 rounded-lg text-xs font-semibold transition"
                            >
                                <QrCode className="w-3.5 h-3.5" />
                                View QR
                            </button>
                            {onCheckoutEarly && (
                                <button
                                    onClick={() => onCheckoutEarly(booking)}
                                    className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2 rounded-lg text-xs font-semibold transition"
                                >
                                    Checkout Early
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
