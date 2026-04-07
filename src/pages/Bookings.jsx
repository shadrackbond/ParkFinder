import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BookingCard from '../components/booking/BookingCard';
import QRTicket from '../components/booking/QRTicket';
import useBookings from '../hooks/useBookings';
import { cancelBooking } from '../services/bookingService';
import { Calendar, Loader2, Trash2 } from 'lucide-react';
import { clearUserHistory } from '../services/bookingService';

export default function Bookings() {
    const { currentUser } = useAuth();
    const { bookings, loading } = useBookings(currentUser?.uid);
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [cancellingId, setCancellingId] = useState(null);
    const [cancelError, setCancelError] = useState('');
    const [clearing, setClearing] = useState(false);

    const handleClearHistory = async () => {
        if (!window.confirm('Clear all your past bookings? This cannot be undone.')) return;
        setClearing(true);
        try {
            await clearUserHistory(currentUser?.uid);
        } catch (err) {
            alert('Failed to clear history: ' + err.message);
        } finally {
            setClearing(false);
        }
    };

    if (!currentUser) return null;

    const filteredBookings = statusFilter === 'all'
        ? bookings
        : bookings.filter((b) => b.status === statusFilter);

    const handleCancel = async (bookingId) => {
        setCancelError('');
        setCancellingId(bookingId);
        try {
            await cancelBooking(bookingId);
            // onSnapshot in useBookings updates the list reactively — no reload needed
        } catch (err) {
            console.error('[Bookings] cancelBooking error:', err);
            const msg = err.message || 'Failed to cancel booking.';
            setCancelError(msg);
            // Auto-dismiss error message after 6 seconds
            setTimeout(() => setCancelError(''), 6000);
        } finally {
            setCancellingId(null);
        }
    };

    return (
        <>
            <div className="min-h-screen bg-gray-50 pb-safe page-enter">
                {/* Header */}
            <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
                        <p className="text-gray-400 text-xs mt-0.5">{bookings.length} total bookings</p>
                    </div>

                    {/* Clear History Button */}
                    <button
                        onClick={handleClearHistory}
                        disabled={clearing || bookings.filter(b => b.status === 'completed' || b.status === 'cancelled').length === 0}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-50 transition p-2"
                        aria-label="Clear history"
                        title="Clear completed and cancelled bookings"
                    >
                        {clearing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                    </button>
                </div>

                {/* Status Filters */}
                <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                    {['all', 'confirmed', 'checked-in', 'completed', 'cancelled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${statusFilter === status
                                    ? 'bg-teal-600 text-white'
                                    : 'bg-gray-100 text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Cancel error banner */}
            {cancelError && (
                <div className="mx-5 mt-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3">
                    {cancelError}
                </div>
            )}

            {/* Booking List */}
            <div className="px-5 mt-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Calendar className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium text-sm">No bookings found</p>
                        <p className="text-gray-400 text-xs mt-1">Your parking bookings will appear here</p>
                    </div>
                ) : (
                    filteredBookings.map((booking) => (
                        <div key={booking.id} className="relative">
                            {cancellingId === booking.id && (
                                <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center z-10">
                                    <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                                </div>
                            )}
                            <BookingCard
                                booking={booking}
                                onViewQR={(b) => setSelectedBooking(b)}
                                onCancel={handleCancel}
                            />
                        </div>
                    ))
                )}
            </div>
            
            </div>

            {selectedBooking && (
                <QRTicket booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
            )}
        </>
    );
}