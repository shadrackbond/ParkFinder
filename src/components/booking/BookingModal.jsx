import { useState, useEffect } from 'react';
import { X, Loader2, CreditCard, ShieldCheck, Clock } from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, runTransaction, collection, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

export default function BookingModal({ isOpen, onClose, lot, onSuccess }) {
    const { currentUser } = useAuth();
    const [phone, setPhone] = useState('254');
    const [plate, setPlate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [currentTimeData, setCurrentTimeData] = useState(new Date());

    useEffect(() => {
        if (!isOpen) return;
        const timer = setInterval(() => setCurrentTimeData(new Date()), 60000);
        return () => clearInterval(timer);
    }, [isOpen]);

    const format12Hour = (date) => {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const getRoundedTime = (date, addHours = 0) => {
        const d = new Date(date);
        d.setHours(d.getHours() + addHours);
        const mins = d.getMinutes();
        const roundedMins = Math.ceil(mins / 15) * 15;
        d.setMinutes(roundedMins);
        d.setSeconds(0);
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    };

    const [startTime, setStartTime] = useState(getRoundedTime(new Date(), 0));
    const [endTime, setEndTime] = useState(getRoundedTime(new Date(), 1));

    if (!isOpen || !lot) return null;

    const getDurationInMinutes = (startStr, endStr) => {
        if (!startStr || !endStr) return 0;
        const [sh, sm] = startStr.split(':').map(Number);
        const [eh, em] = endStr.split(':').map(Number);
        let startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        if (endMins < startMins) {
            endMins += 24 * 60; // Next day
        }
        return endMins - startMins;
    };

    const durationMins = getDurationInMinutes(startTime, endTime);
    const durationHours = durationMins / 60;
    const amount = lot.hourlyRate ? Math.ceil(durationHours * lot.hourlyRate) : 0;

    const handleBooking = async (e) => {
        e.preventDefault();
        setError('');
        
        if (!phone.startsWith('254') || phone.length < 12) {
            setError('Please enter a valid phone number starting with 254');
            return;
        }
        if (!plate.trim()) {
            setError('Please enter your plate number');
            return;
        }

        if (durationMins < 15) {
            setError('Minimum booking duration is 15 minutes.');
            return;
        }

        // Time Guard
        if (lot.openingTime && lot.closingTime) {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMin = now.getMinutes();
            const currentTime = currentHour + currentMin / 60;

            const [openH, openM] = lot.openingTime.split(':').map(Number);
            const [closeH, closeM] = lot.closingTime.split(':').map(Number);
            const openTime = openH + (openM || 0) / 60;
            const closeTime = closeH + (closeM || 0) / 60;

            if (currentTime < openTime || currentTime > closeTime) {
                setError(`Parking lot is closed. Operating hours are ${lot.openingTime} to ${lot.closingTime}.`);
                return;
            }
        }

        setLoading(true);

        try {
            const lotRef = doc(db, 'parking-lots', lot.id);
            let temporaryBookingId = null;

            const activeDate = new Date();
            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);
            
            const startBookingDate = new Date(activeDate);
            startBookingDate.setHours(sh, sm, 0, 0);
            
            const endBookingDate = new Date(activeDate);
            endBookingDate.setHours(eh, em, 0, 0);
            if (endBookingDate < startBookingDate) {
                endBookingDate.setDate(endBookingDate.getDate() + 1); // next day
            }

            // Booking Availability Override Guard
            const bookingsRef = collection(db, 'bookings');
            const overlapQuery = query(bookingsRef, where('lotId', '==', lot.id), where('status', '==', 'confirmed'));
            const overlapSnapshot = await getDocs(overlapQuery);
            
            let isOverlapping = false;
            overlapSnapshot.forEach(docSnap => {
                const b = docSnap.data();
                const bStart = b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime);
                const bEnd = b.endTime?.toDate ? b.endTime.toDate() : new Date(b.endTime);
                
                if (startBookingDate < bEnd && endBookingDate > bStart) {
                    isOverlapping = true;
                }
            });

            if (isOverlapping) {
                setError('This slot is already taken during that time.');
                setLoading(false);
                return;
            }

            // Double Booking Guard using Transaction
            await runTransaction(db, async (transaction) => {
                const lotDoc = await transaction.get(lotRef);
                if (!lotDoc.exists()) {
                    throw new Error("Parking lot does not exist!");
                }

                const lotData = lotDoc.data();
                const currentSpots = lotData.availableSpots !== undefined ? lotData.availableSpots : lotData.capacity;

                if (currentSpots <= 0) {
                    throw new Error("Sorry, this parking lot is currently full.");
                }

                // Decrement capacity
                transaction.update(lotRef, { availableSpots: currentSpots - 1 });

                // Soft-Lock: Create a 'reserved-pending' booking
                const newBookingRef = doc(collection(db, 'bookings'));
                temporaryBookingId = newBookingRef.id;
                
                // Use the dates we evaluated prior to transaction

                transaction.set(newBookingRef, {
                    userId: currentUser?.uid,
                    lotId: lot.id,
                    lotName: lot.name,
                    plateNumber: plate.toUpperCase(),
                    duration: durationHours,
                    startTime: startBookingDate,
                    endTime: endBookingDate,
                    amount,
                    status: 'reserved-pending',
                    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes soft-lock
                    createdAt: serverTimestamp(),
                    location: lot.location || lot.name
                });
            });

            // Trigger M-Pesa STK Push
            const response = await axios.post('https://parkfinder-hwy4.onrender.com/api/mpesa/stkpush', {
                phone,
                amount,
                accountReference: plate.toUpperCase(),
                transactionDesc: `Parking at ${lot.name}`,
                bookingId: temporaryBookingId
            });

            if (response.data.success) {
                // Success - the callback will handle confirming the booking
                setLoading(false);
                if (onSuccess) onSuccess();
                onClose();
            } else {
                throw new Error("M-Pesa request failed.");
            }

        } catch (err) {
            console.error(err);
            setError(err.message || 'An error occurred during booking.');
            setLoading(false);
        }
    };

    const TimePicker = ({ label, value24, onChange24 }) => {
        const [h, m] = value24.split(':').map(Number);
        const hm = h % 12 || 12;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const minStr = m.toString().padStart(2, '0');

        const handleHour = (newH) => {
            let hr = parseInt(newH);
            if (ampm === 'PM' && hr !== 12) hr += 12;
            if (ampm === 'AM' && hr === 12) hr = 0;
            onChange24(`${hr.toString().padStart(2, '0')}:${minStr}`);
        };

        const handleMin = (newM) => {
            const hrStr = value24.split(':')[0];
            onChange24(`${hrStr}:${newM}`);
        };

        const handlePeriod = (newP) => {
            let hr = h;
            if (newP === 'PM' && hr < 12) hr += 12;
            if (newP === 'AM' && hr >= 12) hr -= 12;
            onChange24(`${hr.toString().padStart(2, '0')}:${minStr}`);
        };

        return (
            <div className="relative w-full">
                <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                    {label}
                </label>
                <div className="flex items-center justify-between gap-1">
                    <div className="flex-1 relative">
                        <select 
                            value={hm} onChange={(e) => handleHour(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg pl-2 pr-1 py-2 text-sm font-extrabold shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 appearance-none text-center"
                        >
                            {[...Array(12)].map((_, i) => (
                                <option key={i+1} value={i+1}>{i+1}</option>
                            ))}
                        </select>
                    </div>
                    <span className="text-gray-300 font-bold">:</span>
                    <div className="flex-1 relative">
                        <select 
                            value={minStr} onChange={(e) => handleMin(e.target.value)}
                            className="w-full bg-white border border-gray-200 text-gray-900 rounded-lg pl-2 pr-1 py-2 text-sm font-extrabold shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 appearance-none text-center"
                        >
                            {['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'].map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1 relative">
                        <select 
                            value={ampm} onChange={(e) => handlePeriod(e.target.value)}
                            className="w-full bg-gray-100 border border-gray-200 text-teal-700 rounded-lg pl-2 pr-1 py-2 text-[10px] font-extrabold shadow-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-100 appearance-none text-center"
                        >
                            <option value="AM">AM</option>
                            <option value="PM">PM</option>
                        </select>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Book Parking</h2>
                        <p className="text-sm text-gray-500">{lot.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition text-gray-500">
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

                        <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100 rounded-xl p-3">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">Current Time</span>
                            </div>
                            <span className="text-sm font-bold text-indigo-700">{format12Hour(currentTimeData)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <TimePicker label="Start Time" value24={startTime} onChange24={setStartTime} />
                            <TimePicker label="End Time" value24={endTime} onChange24={setEndTime} />
                        </div>
                        
                        {durationMins > 0 ? (
                            <div className="flex items-center justify-between px-1 -mt-1">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase">Duration</span>
                                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-1 rounded-md">
                                    {Math.floor(durationMins / 60)}h {durationMins % 60}m
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between px-1 -mt-1">
                                <span className="text-[11px] font-semibold text-gray-400 uppercase">Duration</span>
                                <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md">
                                    Invalid time
                                </span>
                            </div>
                        )}

                        <div className="bg-teal-50 rounded-xl p-4 border border-teal-100 flex items-center justify-between">
                            <span className="text-teal-900 font-semibold text-sm">Total Amount</span>
                            <span className="text-lg font-bold text-teal-700">KSh {amount}</span>
                        </div>
                        
                        <div className="flex items-start gap-2 text-xs text-gray-500">
                            <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <p>Spot will be reserved for 5 minutes during payment processing to prevent double-booking.</p>
                        </div>
                    </form>
                </div>

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
                    <p className="text-center text-[10px] text-gray-400 mt-2 font-medium">Secured by Safaricom Daraja API</p>
                </div>
            </div>
        </div>
    );
}
