import { MapPin, Navigation } from 'lucide-react';

/**
 * ParkingMap — Placeholder map component.
 * // TODO (Teammate Hole): Integrate Google Maps or Mapbox.
 */
export default function ParkingMap({ lots = [], onSelectLot }) {
    return (
        <div className="relative w-full h-48 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Navigation className="w-6 h-6 text-teal-600" />
                    </div>
                    <p className="text-gray-500 text-xs font-medium">Interactive Map</p>
                    <p className="text-gray-400 text-[10px] mt-0.5">Google Maps integration pending</p>
                </div>
            </div>
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-teal-600" />
                    <span className="font-semibold">{lots.length}</span> lots nearby
                </p>
            </div>
        </div>
    );
}
