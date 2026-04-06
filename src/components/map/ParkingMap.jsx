import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import locationIcon from '../../assets/search_functionality/location_icon.png';
import parkingIcon from '../../assets/search_functionality/parking_icon.png';

// Google Maps wrapper: shows lots, selected destination, user location and route between them
export default function ParkingMap({ lots = [], onSelectLot, userLocation, destination }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const lotMarkersRef = useRef([]);
    const userMarkerRef = useRef(null);
    const destinationMarkerRef = useRef(null);
    const directionsServiceRef = useRef(null);
    const directionsRendererRef = useRef(null);

        useEffect(() => {
        const apiKey =
            import.meta.env.VITE_GOOGLE_MAPS_API_KEY
            || import.meta.env.VITE_GOOGLE_MAPS_KEY
            || import.meta.env.VITE_MAPS_JAVASCRIPT_API_KEY;
        if (!apiKey) {
			// eslint-disable-next-line no-console
			console.warn('Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in your .env file.');
            return;
        }

                if (!window.google || !window.google.maps) {
            const scriptId = 'google-maps-places-script';
            const existing = document.getElementById(scriptId);
            if (!existing) {
                const script = document.createElement('script');
                script.id = scriptId;
				// Use the standard loader (no loading=async) to ensure
				// google.maps.Map is available as a constructor.
				script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
                script.async = true;
                script.defer = true;
                script.onload = () => initMap();
                document.body.appendChild(script);
            } else {
                if (window.google && window.google.maps) {
                    initMap();
                } else {
                    existing.addEventListener('load', () => initMap());
                }
            }
        } else {
            initMap();
        }

        function initMap() {
            if (!mapRef.current || !window.google || mapInstanceRef.current) return;

            // Defensive check: if the Maps library didn't load correctly,
            // avoid throwing `Map is not a constructor` and surface a clear error.
            if (!window.google.maps || typeof window.google.maps.Map !== 'function') {
                // eslint-disable-next-line no-console
                console.error('Google Maps JS library did not load correctly: google.maps.Map is not a constructor.');
                return;
            }

            const defaultCenter = destination
                ? { lat: destination.lat, lng: destination.lng }
                : lots.length
                    ? { lat: lots[0].location?.lat || -1.286389, lng: lots[0].location?.lng || 36.817223 }
                    : { lat: -1.286389, lng: 36.817223 }; // Nairobi CBD

            mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
                center: defaultCenter,
                zoom: 14,
                disableDefaultUI: true,
            });

            renderMarkers();
            renderRoute();
        }

        function renderMarkers() {
            if (!mapInstanceRef.current || !window.google) return;

            // Clear lot markers
            lotMarkersRef.current.forEach((m) => m.setMap(null));
            lotMarkersRef.current = [];

            lots.forEach((lot) => {
                if (!lot.location?.lat || !lot.location?.lng) return;
                const marker = new window.google.maps.Marker({
                    position: { lat: lot.location.lat, lng: lot.location.lng },
                    map: mapInstanceRef.current,
                    title: lot.name,
                });
                if (onSelectLot) {
                    marker.addListener('click', () => onSelectLot(lot));
                }
                lotMarkersRef.current.push(marker);
            });

            // User location marker
            if (userMarkerRef.current) {
                userMarkerRef.current.setMap(null);
                userMarkerRef.current = null;
            }
            if (userLocation) {
                userMarkerRef.current = new window.google.maps.Marker({
                    position: userLocation,
                    map: mapInstanceRef.current,
                    title: 'You are here',
                    icon: {
                        url: locationIcon,
                        scaledSize: new window.google.maps.Size(32, 32),
                    },
                });
            }

            // Destination marker
            if (destinationMarkerRef.current) {
                destinationMarkerRef.current.setMap(null);
                destinationMarkerRef.current = null;
            }
            if (destination) {
                destinationMarkerRef.current = new window.google.maps.Marker({
                    position: { lat: destination.lat, lng: destination.lng },
                    map: mapInstanceRef.current,
                    title: destination.name || 'Destination',
                    icon: {
                        url: parkingIcon,
                        scaledSize: new window.google.maps.Size(32, 32),
                    },
                });
            }

            // Fit bounds to show both user and destination if available
            if (userLocation && destination) {
                const bounds = new window.google.maps.LatLngBounds();
                bounds.extend(userLocation);
                bounds.extend({ lat: destination.lat, lng: destination.lng });
                mapInstanceRef.current.fitBounds(bounds);
            }
        }

        function renderRoute() {
            if (!mapInstanceRef.current || !window.google || !userLocation || !destination) return;

            if (!directionsServiceRef.current) {
                directionsServiceRef.current = new window.google.maps.DirectionsService();
            }
            if (!directionsRendererRef.current) {
                directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
                    suppressMarkers: true,
                    polylineOptions: {
                        strokeColor: '#2563eb', // tailwind blue-600
                        strokeWeight: 5,
                    },
                });
                directionsRendererRef.current.setMap(mapInstanceRef.current);
            }

            directionsServiceRef.current.route(
                {
                    origin: userLocation,
                    destination: { lat: destination.lat, lng: destination.lng },
                    travelMode: window.google.maps.TravelMode.DRIVING,
                },
                (result, status) => {
                    if (status === window.google.maps.DirectionsStatus.OK) {
                        directionsRendererRef.current.setDirections(result);
                    }
                }
            );
        }

        if (mapInstanceRef.current) {
            renderMarkers();
            renderRoute();
        }
    }, [lots, onSelectLot, userLocation, destination]);

    return (
        <div className="relative w-full h-64 bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
            <div ref={mapRef} className="absolute inset-0" />
            <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-teal-600" />
                    <span className="font-semibold">{lots.length}</span> lots nearby
                </p>
            </div>
        </div>
    );
}
