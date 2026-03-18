import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';
import BookingCard from '../components/booking/BookingCard';
import QRTicket from '../components/booking/QRTicket';
import useBookings from '../hooks/useBookings';
import { Calendar, Loader2 } from 'lucide-react';
import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function Bookings() {
  const { currentUser } = useAuth();
  const { bookings, loading } = useBookings(currentUser?.uid);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBookings = statusFilter === 'all'
    ? bookings
    : bookings.filter((b) => b.status === statusFilter);

  const handleCheckoutEarly = async (booking) => {
    if (!window.confirm('Are you sure you want to checkout early? This will free your parking spot.')) return;
    try {
      await runTransaction(db, async (transaction) => {
        const lotRef = doc(db, 'parking-lots', booking.lotId);
        const bookingRef = doc(db, 'bookings', booking.id);
        
        const lotDoc = await transaction.get(lotRef);
        if (lotDoc.exists()) {
          const data = lotDoc.data();
          const spots = data.availableSpots !== undefined ? data.availableSpots : data.capacity;
          transaction.update(lotRef, { availableSpots: spots < (data.capacity || 100) ? spots + 1 : spots });
        }
        transaction.update(bookingRef, { status: 'completed' });
      });
    } catch (err) {
      console.error(err);
      alert('Failed to checkout early');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-safe page-enter">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-gray-400 text-xs mt-0.5">{bookings.length} total bookings</p>
          </div>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {['all', 'active', 'completed', 'cancelled'].map((status) => (
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
            <BookingCard
              key={booking.id}
              booking={booking}
              onViewQR={(b) => setSelectedBooking(b)}
              onCheckoutEarly={handleCheckoutEarly}
            />
          ))
        )}
      </div>

      {selectedBooking && (
        <QRTicket booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}

      <BottomNav />
    </div>
  );
}