import { useState, useEffect, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { subscribeToSpots } from '../../services/spotService';

// ─── Date helpers ────────────────────────────────────────────────────────────

/** Returns "YYYY-MM-DD" for a Date offset by `daysOffset` from today. */
function offsetDate(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().slice(0, 10);
}

/** Returns a short label like "Mon 30" for a "YYYY-MM-DD" string. */
function shortLabel(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric' });
}

const DATE_OFFSETS = [0, 1, 2, 3, 4];

// ─── Spot colour map ─────────────────────────────────────────────────────────

const spotStyle = {
    free: 'bg-green-500 text-white cursor-pointer hover:bg-green-600 active:scale-95',
    partial: 'bg-yellow-400 text-gray-900 cursor-pointer hover:bg-yellow-500 active:scale-95',
    full: 'bg-red-500 text-white cursor-not-allowed opacity-60',
};

// ─── Loading skeleton ────────────────────────────────────────────────────────

function SpotSkeleton() {
    return (
        <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
                <div
                    key={i}
                    className="aspect-square rounded-xl bg-gray-200 animate-pulse"
                />
            ))}
        </div>
    );
}

// ─── Main Component ──────────────────────────────────────────────────────────

/**
 * SpotPicker — full-screen overlay for selecting a parking spot.
 *
 * Props:
 *   lotId        — Firestore lot doc ID
 *   lotName      — display name
 *   onSelectSpot — callback({ spotNumber, bookedSlots, status, date })
 *   onClose      — close without selection
 */
export default function SpotPicker({ lotId, lotName, capacity, onSelectSpot, onClose }) {
    const dates = DATE_OFFSETS.map(offsetDate);

    const [selectedDate, setSelectedDate] = useState(dates[0]);
    const [spots, setSpots] = useState([]);
    const [loadingSpots, setLoadingSpots] = useState(true);

    // Subscribe / re-subscribe whenever date changes
    const subscribe = useCallback(() => {
        setLoadingSpots(true);
        const unsub = subscribeToSpots(
            lotId,
            selectedDate,
            (data) => {
                const spotsDict = {};
                for (const d of data) {
                    spotsDict[d.spotNumber] = d;
                }
                const fullSpots = [];
                for (let i = 1; i <= capacity; i++) {
                    if (spotsDict[i]) {
                        fullSpots.push(spotsDict[i]);
                    } else {
                        fullSpots.push({ spotNumber: i, status: 'free', bookedSlots: [] });
                    }
                }
                setSpots(fullSpots);
                setLoadingSpots(false);
            },
            (err) => {
                console.error('[SpotPicker] subscribeToSpots error:', err);
                setLoadingSpots(false);
            }
        );
        return unsub;
    }, [lotId, selectedDate, capacity]);

    useEffect(() => {
        const unsub = subscribe();
        return () => unsub();
    }, [subscribe]);

    const handleDateChange = (date) => {
        setSelectedDate(date);
        // Listener swap handled by useEffect dependency on selectedDate
    };

    const handleSpotClick = (spot) => {
        if (spot.status === 'full') return; // hard block
        onSelectSpot({
            spotNumber: spot.spotNumber,
            bookedSlots: spot.bookedSlots,
            status: spot.status,
            date: selectedDate,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Choose a Spot</h2>
                        <p className="text-xs text-gray-400 mt-0.5">{lotName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition"
                        aria-label="Close spot picker"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Date selector */}
                <div className="px-5 py-3 flex gap-2 overflow-x-auto hide-scrollbar flex-shrink-0">
                {dates.map((d) => (
                    <button
                        key={d}
                        onClick={() => handleDateChange(d)}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                            selectedDate === d
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                    >
                        {d === dates[0] ? 'Today' : shortLabel(d)}
                    </button>
                ))}
            </div>

                {/* Legend */}
                <div className="px-5 pb-3 flex items-center gap-4 text-[11px] font-medium text-gray-500 border-b border-gray-50 flex-shrink-0">
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Free
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-yellow-400 inline-block" />Partial
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-red-500 inline-block" />Full
                </span>
            </div>

            {/* Spot grid */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
                {loadingSpots ? (
                    <SpotSkeleton />
                ) : spots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <Loader2 className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-medium text-sm">No spots available for this lot</p>
                        <p className="text-gray-400 text-xs mt-1">The provider has not set up spots yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-5 gap-3">
                        {spots.map((spot) => (
                            <button
                                key={spot.spotNumber}
                                onClick={() => handleSpotClick(spot)}
                                disabled={spot.status === 'full'}
                                className={`aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-transform ${spotStyle[spot.status]}`}
                                aria-label={`Spot ${spot.spotNumber} — ${spot.status}`}
                            >
                                {spot.spotNumber}
                            </button>
                        ))}
                    </div>
                )}
            </div>

                {/* Footer hint */}
                <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0 mt-auto">
                    <p className="text-center text-xs text-gray-400">
                        Tap a green or yellow spot to select it
                    </p>
                </div>
            </div>
        </div>
    );
}
