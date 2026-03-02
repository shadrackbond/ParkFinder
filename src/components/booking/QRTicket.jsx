import { QRCodeSVG } from 'react-qr-code';
import { Clock, MapPin, X } from 'lucide-react';

export default function QRTicket({ booking, onClose }) {
    if (!booking) return null;

    const formatTime = (date) => {
        if (!date) return '--:--';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' });
    };
    const formatDate = (date) => {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date);
        return d.toLocaleDateString('en-KE', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-float">
                {/* Header */}
                <div className="bg-teal-600 p-5 flex items-center justify-between">
                    <div>
                        <h3 className="text-white font-bold">Parking Ticket</h3>
                        <p className="text-teal-100 text-sm">{booking.lotName}</p>
                    </div>
                    {onClose && (
                        <button onClick={onClose} className="text-white/80 hover:text-white transition p-1">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* QR Code */}
                <div className="flex justify-center py-6 px-6">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                        <QRCodeSVG
                            value={booking.qrCode || booking.id || 'PARKEASE-TICKET'}
                            size={160}
                            level="H"
                            includeMargin={false}
                        />
                    </div>
                </div>

                {/* Dashed divider */}
                <div className="relative px-6">
                    <div className="border-t-2 border-dashed border-gray-200" />
                    <div className="absolute -left-3 -top-3 w-6 h-6 bg-black/40 rounded-full" />
                    <div className="absolute -right-3 -top-3 w-6 h-6 bg-black/40 rounded-full" />
                </div>

                {/* Details */}
                <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Spot</p>
                            <p className="text-gray-900 font-bold text-lg">{booking.spotNumber || 'N/A'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">Status</p>
                            <span className="inline-flex px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700">
                                {booking.status?.charAt(0).toUpperCase() + booking.status?.slice(1)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(booking.startTime)} • {formatTime(booking.startTime)} – {formatTime(booking.endTime)}
                    </div>

                    <p className="text-center text-gray-400 text-xs pt-2">
                        Show this QR code to the parking attendant
                    </p>
                </div>
            </div>
        </div>
    );
}
