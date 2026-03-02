import { MapPin, Edit3, ToggleLeft, ToggleRight } from 'lucide-react';

export default function LotCard({ lot, onEdit, onToggle }) {
    const occupancyPercent = lot.capacity > 0
        ? Math.round(((lot.capacity - (lot.availableSpots ?? lot.capacity)) / lot.capacity) * 100)
        : 0;

    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-card-hover transition">
            {/* Lot Image */}
            {lot.imageUrl && (
                <div className="relative h-32 overflow-hidden">
                    <img src={lot.imageUrl} alt={lot.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2">
                        <button
                            onClick={() => onToggle?.(lot)}
                            className="bg-white/90 backdrop-blur-sm p-1.5 rounded-lg"
                            title={lot.isActive ? 'Deactivate' : 'Activate'}
                        >
                            {lot.isActive ? (
                                <ToggleRight className="w-5 h-5 text-emerald-500" />
                            ) : (
                                <ToggleLeft className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>
            )}

            <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                    <div>
                        <h3 className="text-gray-900 font-bold text-sm">{lot.name}</h3>
                        <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {lot.address}
                        </p>
                    </div>
                    {!lot.imageUrl && (
                        <button onClick={() => onToggle?.(lot)} title={lot.isActive ? 'Deactivate' : 'Activate'}>
                            {lot.isActive ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-gray-400" />}
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-400">Capacity</p>
                        <p className="text-gray-900 font-bold text-sm">{lot.capacity}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-400">Available</p>
                        <p className="text-emerald-600 font-bold text-sm">{lot.availableSpots ?? lot.capacity}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-400">Rate/hr</p>
                        <p className="text-teal-600 font-bold text-sm">KSh {lot.hourlyRate}</p>
                    </div>
                </div>

                {/* Occupancy */}
                <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] text-gray-400">Occupancy</p>
                        <p className="text-[10px] text-gray-500 font-medium">{occupancyPercent}%</p>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${occupancyPercent > 80 ? 'bg-red-400' : occupancyPercent > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                                }`}
                            style={{ width: `${occupancyPercent}%` }}
                        />
                    </div>
                </div>

                <button
                    onClick={() => onEdit?.(lot)}
                    className="w-full flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 py-2 rounded-lg text-xs font-medium transition"
                >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Details
                </button>
            </div>
        </div>
    );
}
