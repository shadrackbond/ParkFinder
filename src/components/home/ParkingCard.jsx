import { useState, useEffect } from 'react';
import { MapPin, Star, Clock } from 'lucide-react';
import { subscribeToSpots } from '../../services/spotService';

/** Returns "YYYY-MM-DD" for today. */
function todayStr() {
    return new Date().toISOString().slice(0, 10);
}

/**
 * ParkingCard — Displays a parking lot card with live spot availability.
 *
 * Availability is derived from the spots sub-collection (RULE ZERO compliant).
 * The `availableSpots` field on the lot doc is NOT used for the display count.
 *
 * Props: { lot, onClick }
 * lot must have: id, name, address, imageUrl, hourlyRate, rating, openTime, closeTime
 */
export default function ParkingCard({ lot, onClick }) {
    const [freeCount, setFreeCount] = useState(null); // null = loading
    const today = todayStr();

    useEffect(() => {
        if (!lot?.id) return;

        const unsub = subscribeToSpots(
            lot.id,
            today,
            (spots) => {
                const free = spots.filter(
                    (s) => s.status === 'free' || s.status === 'partial'
                ).length;
                setFreeCount(free);
            },
            (err) => {
                console.error('[ParkingCard] subscribeToSpots error:', err);
                setFreeCount(0);
            }
        );

        return () => unsub();
    }, [lot?.id, today]);

    if (!lot) return null;

    const availabilityLabel = freeCount === null
        ? 'Loading…'
        : freeCount === 0
            ? 'Full today'
            : `${freeCount} spot${freeCount !== 1 ? 's' : ''} free today`;

    const availabilityColor = freeCount === null
        ? 'bg-gray-100 text-gray-400'
        : freeCount === 0
            ? 'bg-red-50 text-red-600'
            : 'bg-emerald-50 text-emerald-700';

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99] transition-transform"
        >
            {/* Image */}
            <div className="relative h-36 overflow-hidden bg-gray-100">
                {lot.imageUrl ? (
                    <img
                        src={lot.imageUrl}
                        alt={lot.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-teal-50 to-indigo-50">
                        <span className="text-4xl">🅿️</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

                {/* Availability badge */}
                <div className={`absolute top-2 right-2 px-2.5 py-1 rounded-lg text-[11px] font-bold ${availabilityColor}`}>
                    {availabilityLabel}
                </div>
            </div>

            {/* Details */}
            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight pr-2">
                        {lot.name}
                    </h3>
                    {lot.rating && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-semibold text-gray-700">{lot.rating}</span>
                        </div>
                    )}
                </div>

                <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {lot.address}
                </p>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-gray-400 text-[11px]">
                        <Clock className="w-3 h-3" />
                        {lot.openTime && lot.closeTime
                            ? `${lot.openTime} – ${lot.closeTime}`
                            : 'Open 24/7'}
                    </div>
                    <span className="text-teal-700 font-bold text-sm">
                        KSh {lot.hourlyRate}<span className="font-normal text-gray-400 text-xs">/hr</span>
                    </span>
                </div>
            </div>
        </div>
    );
}
