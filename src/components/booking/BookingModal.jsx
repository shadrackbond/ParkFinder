import { useState, useEffect } from 'react';
import { X, Loader2, CreditCard, ShieldCheck, Clock, MapPin } from 'lucide-react';
import { db } from '../../config/firebase';
import {
    doc,
    addDoc,
    collection,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    onSnapshot
} from 'firebase/firestore';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { reserveSpot } from '../../services/spotService';
import { cancelBooking } from '../../services/bookingService';
import SpotPicker from './SpotPicker';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" for today. */
function toDateStr(d) {
    return d.toISOString().slice(0, 10);
}

/** Today and today+4 as YYYY-MM-DD strings — the allowed booking window. */
function getDateBounds() {
    const today = new Date();
    const min = toDateStr(today);
    const max = new Date(today);
    max.setDate(max.getDate() + 4);
    return { min, max: toDateStr(max) };
}

/** Convert "HH:MM" to minutes since midnight. */
function toMins(timeStr) {
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return h * 60 + m;
}

/** Generate 30-minute interval options from 00:00 to 23:30. */
const TIME_OPTIONS = (() => {
    const opts = [];
    for (let h = 0; h < 24; h++) {
        for (let m of [0, 30]) {
            const label = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            opts.push(label);
        }
    }
    return opts;
})();

// ─── Component ───────────────────────────────────────────────────────────────

export default function BookingModal({ isOpen, onClose, lot, onSuccess }) {
    const { currentUser } = useAuth();

    // Form state
    const { min: dateMin, max: dateMax } = getDateBounds();
    const [date, setDate] = useState(toDateStr(new Date()));
    const [selectedSpot, setSelectedSpot] = useState(null); // { spotNumber, bookedSlots, status, date }
    const [showSpotPicker, setShowSpotPicker] = useState(false);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('09:00');
    const [phone, setPhone] = useState('254');
    const [plate, setPlate] = useState('');

    // UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [currentTimeData, setCurrentTimeData] = useState(new Date());
    useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => setCurrentTimeData(new Date()), 60000);
        return () => clearInterval(timer);
    }, [isOpen]);

    if (!isOpen || !lot) return null;
    if (!currentUser) return null;

    // ── Derived values ─────────────────────────────────────────────────────

    const startMins = toMins(startTime);
    let endMins = toMins(endTime);
    // If end time is <= start time, assume it crosses midnight into the next day
    if (endMins <= startMins && endTime !== startTime) {
        endMins += 24 * 60;
    }

    const durationMins = endMins - startMins;
    const durationHours = durationMins / 60;
    const amount = lot.hourlyRate ? Math.ceil(durationHours * lot.hourlyRate) : 0;

    /** Returns true if the given time option is blocked by a booked slot on a partial spot. */
    function isOptionDisabled(timeOpt) {
        if (!selectedSpot || selectedSpot.status !== 'partial') return false;
        let optMins = toMins(timeOpt);
        
        // If the option is early in the morning, but we're rendering it as "next day" due to a late startTime
        // we need to shift optMins. For simplicity, just check both raw and shifted.
        
        return (selectedSpot.bookedSlots || []).some((slot) => {
            const bStart = toMins(slot.startTime);
            let bEnd = toMins(slot.endTime);
            if (bEnd <= bStart) bEnd += 24 * 60;
            
            // Check if optMins falls inside the booked slot [bStart, bEnd)
            return (optMins >= bStart && optMins < bEnd) ||
                   (optMins + 24 * 60 >= bStart && optMins + 24 * 60 < bEnd);
        });
    }

    // ── Date change clears spot ────────────────────────────────────────────

    function handleDateChange(newDate) {
        setDate(newDate);
        setSelectedSpot(null); // user must re-pick for the new date
    }

    // ── SpotPicker callback ────────────────────────────────────────────────

    function handleSpotSelected(spotData) {
        setSelectedSpot(spotData);
        setError('');
    }

    // ── Validation ─────────────────────────────────────────────────────────

    function validate() {
        if (!phone.startsWith('254') || phone.length < 12) {
            setError('Please enter a valid phone number starting with 254.');
            return false;
        }
        if (!plate.trim()) {
            setError('Please enter your plate number.');
            return false;
        }
        if (!date) {
            setError('Please select a date.');
            return false;
        }
        if (!selectedSpot) {
            setError('Please pick a parking spot first.');
            return false;
        }
        if (startTime === endTime) {
            setError('Start and end time cannot be exactly the same.');
            return false;
        }
        if (durationMins < 30) {
            setError('Minimum booking duration is 30 minutes.');
            return false;
        }

        const todayDateStr = toDateStr(new Date());
        if (date === todayDateStr) {
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();
            if (startMins < currentMins) {
                setError('Cannot book a time in the past.');
                return false;
            }
        }

        return true;
    }

    // ── Submit ─────────────────────────────────────────────────────────────

    const handleBooking = async (e) => {
        e.preventDefault();
        setError('');

        if (!validate()) return;

        setLoading(true);
        let placeholderDocId = null;

        try {
            // 1. Create placeholder booking doc (status: "reserving")
            const bookingData = {
                userId: currentUser.uid,
                lotId: lot.id,
                lotName: lot.name || lot.businessName || '',
                location: lot.address || lot.businessLocation || '',
                spotNumber: selectedSpot.spotNumber,
                date,
                startTime,
                endTime,
                plateNumber: plate.toUpperCase(),
                amount,
                duration: durationHours,
                status: 'reserving',
                checkedOut: false,
                overchargePaid: false,
                paymentStatus: 'pending',
            };

            const newRef = await addDoc(collection(db, 'bookings'), {
                ...bookingData,
                createdAt: serverTimestamp(),
            });
            placeholderDocId = newRef.id;

            // 2. Reserve the spot atomically (transaction)
            try {
                await reserveSpot(
                    lot.id,
                    selectedSpot.spotNumber,
                    placeholderDocId,
                    currentUser.uid,
                    date,
                    startTime,
                    endTime
                );
            } catch (spotErr) {
                // Clean up placeholder
                await deleteDoc(newRef).catch(() => {});
                placeholderDocId = null;
                if (spotErr.message === 'SPOT_CONFLICT') {
                    setError('This spot was just taken for that time. Please pick another spot or time.');
                } else {
                    setError('Failed to reserve the spot. Please try again.');
                }
                setLoading(false);
                return;
            }

            // 3. Trigger M-Pesa STK push
            const response = await axios.post(
                'https://parkfinder-hwy4.onrender.com/api/mpesa/stkpush',
                {
                    phone,
                    amount,
                    accountReference: placeholderDocId, // bookingId as reference
                    transactionDesc: `Parking at ${lot.name || lot.businessName}`,
                    bookingId: placeholderDocId,
                }
            );

            if (response.data.success) {
                // Wait for the backend webhook to mark it as confirmed or cancelled
                const unsubscribe = onSnapshot(newRef, (docSnap) => {
                    if (docSnap.exists()) {
                        const status = docSnap.data().status;
                        if (status === 'confirmed') {
                            unsubscribe();
                            setLoading(false);
                            if (onSuccess) onSuccess();
                            onClose();
                        } else if (status === 'cancelled') {
                            unsubscribe();
                            setError('Payment failed or was cancelled by user.');
                            setLoading(false);
                        }
                    }
                });

                // Set a 45-second timeout in case they never enter pin or network drops
                setTimeout(() => {
                    unsubscribe();
                    setError('Payment is taking longer than expected. Check your M-Pesa messages. If successful, it will appear in your Bookings.');
                    setLoading(false);
                }, 45000);

            } else {
                setError(response.data.message || 'M-Pesa push failed. Please try again.');
                if (placeholderDocId) await cancelBooking(placeholderDocId).catch(() => {});
                setLoading(false);
            }
        } catch (err) {

            setError(err.message || 'An error occurred during booking. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
                <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Book Parking</h2>
                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" />
                                {lot.name || lot.businessName}
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition text-gray-500"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-5 overflow-y-auto max-h-[70vh]">
                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">
                                {error}
                            </div>
                        )}

                        <form id="booking-form" onSubmit={handleBooking} className="space-y-4">
                            {/* Phone */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">
                                    Phone Number (M-Pesa)
                                </label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                                    placeholder="2547..."
                                    required
                                />
                            </div>

                            {/* Plate */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">
                                    Plate Number
                                </label>
                                <input
                                    type="text"
                                    value={plate}
                                    onChange={(e) => setPlate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition uppercase"
                                    placeholder="KCA 123A"
                                    required
                                />
                            </div>

                            {/* Date picker */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase">
                                    Parking Date
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    min={dateMin}
                                    max={dateMax}
                                    onChange={(e) => handleDateChange(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                                    required
                                />
                            </div>

                            {/* Pick a spot */}
                            <div>
                                <button
                                    type="button"
                                    disabled={!date}
                                    onClick={() => setShowSpotPicker(true)}
                                    className="w-full flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {selectedSpot
                                        ? `✓ Spot #${selectedSpot.spotNumber} selected — change?`
                                        : '🅿️ Pick a Spot'}
                                </button>
                            </div>

                            {/* Time selectors */}
                            <div className="flex items-center gap-2 text-xs text-gray-400 bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                                <Clock className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                <span className="font-semibold text-indigo-700 text-xs uppercase tracking-wide">Current Time</span>
                                <span className="ml-auto font-bold text-indigo-700">
                                    {currentTimeData.toLocaleTimeString('en-US', {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                        hour12: true,
                                    })}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                                        Start Time
                                    </label>
                                    <select
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100"
                                    >
                                        {TIME_OPTIONS.map((t) => (
                                            <option key={t} value={t} disabled={isOptionDisabled(t)}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                                        End Time
                                    </label>
                                    <select
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100"
                                    >
                                        {TIME_OPTIONS.map((t) => (
                                            <option key={t} value={t} disabled={isOptionDisabled(t)}>
                                                {t}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Duration feedback */}
                            <div className="flex items-center justify-between px-1 -mt-1">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase">Duration</span>
                                {durationMins > 0 ? (
                                    <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                                        {Math.floor(durationMins / 60)}h {durationMins % 60}m
                                    </span>
                                ) : (
                                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                                        Invalid time
                                    </span>
                                )}
                            </div>

                            {/* Amount */}
                            <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 flex items-center justify-between">
                                <span className="text-teal-900 font-semibold text-sm">Total Amount</span>
                                <span className="text-lg font-bold text-teal-700">KSh {amount}</span>
                            </div>

                            <div className="flex items-start gap-2 text-xs text-gray-500">
                                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                <p>Spot is held atomically — no double-booking possible.</p>
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-gray-100 bg-gray-50">
                        <button
                            type="submit"
                            form="booking-form"
                            disabled={loading}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <CreditCard className="w-5 h-5" />
                                    Pay via M-Pesa
                                </>
                            )}
                        </button>
                        <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">
                            Secured by Safaricom Daraja API
                        </p>
                    </div>
                </div>
            </div>

            {/* SpotPicker overlay (renders on top of modal) */}
            {showSpotPicker && (
                <SpotPicker
                    lotId={lot.id}
                    lotName={lot.name || lot.businessName}
                    capacity={lot.capacity || 20}
                    onSelectSpot={handleSpotSelected}
                    onClose={() => setShowSpotPicker(false)}
                />
            )}
        </>
    );
}
