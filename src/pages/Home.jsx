import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, MapPin, Heart, Clock, Navigation, Star, ParkingCircle, X, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';
import useParkingLots from '../hooks/useParkingLots';
import BookingModal from '../components/booking/BookingModal';
import useBookings from '../hooks/useBookings';
import { addRecentLot, subscribeRecentLotIds } from '../services/recentParkingService';
import { subscribeFavoriteLotIds, toggleFavoriteLot } from '../services/favoriteParkingService';

const MAPS_KEY = import.meta.env.VITE_MAPS_JAVASCRIPT_API_KEY;
const NEARBY_RADIUS_KM = 10;

/** Load the Google Maps JS script once, return a promise that resolves when ready */
function loadGoogleMapsScript() {
    if (window.google && window.google.maps) return Promise.resolve();
    if (window._googleMapsPromise) return window._googleMapsPromise;

    window._googleMapsPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&loading=async`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
    return window._googleMapsPromise;
}

function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('Geolocation is not supported on this device.'));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (error) => reject(error),
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
            }
        );
    });
}

function calculateDistanceKm(a, b) {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);

    const haversine =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function hasLotCoordinates(lot) {
    return typeof lot.latitude === 'number' && typeof lot.longitude === 'number';
}

function getLocationErrorMessage(error, hasSavedLocation) {
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return 'Nearby needs HTTPS or localhost to access your location.';
    }

    if (error?.code === 1) {
        return hasSavedLocation
            ? 'Live location access was denied. Showing results from your last saved location instead.'
            : 'Location access was denied. Allow location access to use Nearby.';
    }

    if (error?.code === 2) {
        return hasSavedLocation
            ? 'Your current location could not be determined. Showing results from your last saved location instead.'
            : 'Your current location could not be determined right now.';
    }

    if (error?.code === 3) {
        return hasSavedLocation
            ? 'Location request timed out. Showing results from your last saved location instead.'
            : 'Location request timed out. Please try Nearby again.';
    }

    return hasSavedLocation
        ? 'Unable to get your live location right now. Showing results from your last saved location instead.'
        : 'Unable to get your current location right now.';
}

export default function Home() {
    const { currentUser, userProfile } = useAuth();
    const { lots, loading } = useParkingLots();
    const { bookings } = useBookings(currentUser?.uid);

    function getBookingDates(b) {
        if (!b) return null;
        let startObj = new Date();
        let endObj = new Date();

        if (b.startTime?.seconds) {
            startObj = new Date(b.startTime.seconds * 1000);
            endObj = b.endTime?.seconds ? new Date(b.endTime.seconds * 1000) : startObj;
        } else if (typeof b.startTime === 'string' && b.date) {
            const [y, m, d] = b.date.split('-').map(Number);
            startObj = new Date(y, m - 1, d);
            endObj = new Date(y, m - 1, d);
            
            const [sh, sm] = b.startTime.split(':').map(Number);
            const [eh, em] = (b.endTime || '00:00').split(':').map(Number);
            
            startObj.setHours(sh, sm, 0, 0);
            if ((eh * 60 + em) <= (sh * 60 + sm)) {
                 endObj.setDate(endObj.getDate() + 1);
            }
            endObj.setHours(eh, em, 0, 0);
        } else if (b.startTime?.toDate) {
            startObj = b.startTime.toDate();
            endObj = b.endTime?.toDate ? b.endTime.toDate() : startObj;
        } else {
            return null; // fallback
        }
        return { start: startObj, end: endObj };
    }

    const now = new Date();
    const activeSession = bookings?.find(b => {
        if (b.status !== 'confirmed' && b.status !== 'checked-in') return false;
        const dates = getBookingDates(b);
        if (!dates) return false;
        
        // Checked-in: show active unless more than 2 hours past end time
        if (b.status === 'checked-in') {
            const graceEnd = new Date(dates.end.getTime() + 2 * 60 * 60 * 1000);
            return now <= graceEnd;
        }
        
        // Confirmed: show if within 30 min before start and before end
        const thirtyMinsBefore = new Date(dates.start.getTime() - 30 * 60000);
        return now >= thirtyMinsBefore && now <= dates.end;
    });

    let bannerTitle = '';
    let bannerMessage = '';
    
    if (activeSession) {
        const dates = getBookingDates(activeSession);
        if (activeSession.status === 'checked-in') {
            bannerTitle = 'Active Session';
            bannerMessage = `Checked IN at Spot #${activeSession.spotNumber || '--'}`;
        } else if (dates && now < dates.start) {
            bannerTitle = 'Session Approaching';
            bannerMessage = `Starts at ${dates.start.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            bannerTitle = 'Session Started';
            bannerMessage = `Reserved at ${activeSession.lotName || 'Parking Lot'}`;
        }
    }

    const [search, setSearch] = useState('');
    const [searchActive, setSearchActive] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [selectedPlace, setSelectedPlace] = useState(null);  // { name, lat, lng }
    const [filteredLots, setFilteredLots] = useState(null);      // null = show all
    const [selectedLotForBooking, setSelectedLotForBooking] = useState(null);
    const [quickAction, setQuickAction] = useState('all');
    const [quickActionLoading, setQuickActionLoading] = useState(false);
    const [quickActionMessage, setQuickActionMessage] = useState('');
    const [quickActionError, setQuickActionError] = useState('');
    const [nearbyLots, setNearbyLots] = useState([]);
    const [recentLotIds, setRecentLotIds] = useState([]);
    const [favoriteLotIds, setFavoriteLotIds] = useState([]);
    const [favoriteBusyLotId, setFavoriteBusyLotId] = useState(null);

    const [notifications, setNotifications] = useState([]); // { key, title, message, type, timestamp, meta, read }
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [toastNotification, setToastNotification] = useState(null);
    const [toastVisible, setToastVisible] = useState(false);
    const toastTouchStartY = useRef(null);

    const autocompleteService = useRef(null);
    const inputRef = useRef(null);

    const displayName = userProfile?.displayName || currentUser?.displayName || 'there';

    // Subscribe to app-wide notifications (from notifications/notifications.js)
    useEffect(() => {
        function handleAppNotification(event) {
            const detail = event.detail;
            if (!detail) return;
            const item = { ...detail, read: false };
            setNotifications((prev) => [item, ...prev].slice(0, 10));
            setHasUnread(true);

            // Show swipeable toast popup for the newest notification
            setToastNotification(item);
            setToastVisible(true);
            // Auto-hide after a few seconds
            setTimeout(() => {
                setToastVisible(false);
            }, 5000);
        }

        window.addEventListener('app:notification', handleAppNotification);
        return () => window.removeEventListener('app:notification', handleAppNotification);
    }, []);

    // Initialize Google Places AutocompleteService
    useEffect(() => {
        loadGoogleMapsScript()
            .then(() => {
                autocompleteService.current = new window.google.maps.places.AutocompleteService();
            })
            .catch(() => console.error('Failed to load Google Maps'));
    }, []);

    // Fetch place suggestions as user types
    useEffect(() => {
        if (!search.trim() || !autocompleteService.current) {
            setSuggestions([]);
            return;
        }
        const timer = setTimeout(() => {
            autocompleteService.current.getPlacePredictions(
                { input: search, componentRestrictions: { country: 'ke' } },
                (predictions, status) => {
                    if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                        setSuggestions(predictions || []);
                    } else {
                        setSuggestions([]);
                    }
                }
            );
        }, 300);
        return () => clearTimeout(timer);
    }, [search]);

    const baseLots = filteredLots !== null ? filteredLots : lots;
    const recentLots = useMemo(() => {
        const lotMap = new Map(lots.map((l) => [l.id, l]));
        return recentLotIds.map((id) => lotMap.get(id)).filter(Boolean);
    }, [lots, recentLotIds]);
    const favoriteLots = useMemo(() => {
        const lotMap = new Map(lots.map((l) => [l.id, l]));
        return favoriteLotIds.map((id) => lotMap.get(id)).filter(Boolean);
    }, [lots, favoriteLotIds]);
    const displayLots = quickAction === 'nearby'
        ? nearbyLots
        : quickAction === 'recent'
            ? recentLots
        : quickAction === 'favorites'
            ? favoriteLots
            : baseLots;

    useEffect(() => {
        const unsubscribe = subscribeRecentLotIds(
            currentUser?.uid,
            setRecentLotIds,
            (error) => setQuickActionError(error.message || 'Failed to load recent parking.')
        );

        return () => unsubscribe();
    }, [currentUser?.uid]);

    useEffect(() => {
        const unsubscribe = subscribeFavoriteLotIds(
            currentUser?.uid,
            setFavoriteLotIds,
            (error) => setQuickActionError(error.message || 'Failed to load favorites.')
        );

        return () => unsubscribe();
    }, [currentUser?.uid]);

    const matchLotsToPlace = (placeName) => {
        if (!placeName) { setFilteredLots(null); return; }
        const terms = placeName.toLowerCase().split(/[\s,]+/).filter(Boolean);
        const matched = lots.filter((lot) => {
            const haystack = `${lot.name} ${lot.address}`.toLowerCase();
            return terms.some((t) => haystack.includes(t));
        });
        setFilteredLots(matched);
    };

    function handleSelectSuggestion(prediction) {
        const name = prediction.structured_formatting?.main_text || prediction.description;
        setSearch(prediction.description);
        setSuggestions([]);
        setSelectedPlace({ name });
        setSearchActive(false);
        matchLotsToPlace(prediction.description);
    }

    function handleClearSearch() {
        setSearch('');
        setSuggestions([]);
        setSelectedPlace(null);
        setFilteredLots(null);
        if (quickAction === 'nearby') {
            setNearbyLots([]);
            setQuickAction('all');
        }
        setQuickActionMessage('');
        setQuickActionError('');
        setSearchActive(false);
    }

    async function handleNearbyAction() {
        if (quickAction === 'nearby') {
            setQuickAction('all');
            setNearbyLots([]);
            setQuickActionMessage('');
            setQuickActionError('');
            return;
        }

        setQuickAction('nearby');
        setQuickActionLoading(true);
        setQuickActionError('');
        setQuickActionMessage('');

        try {
            const coords = await getCurrentPosition();

            const lotsWithCoords = baseLots
                .filter(hasLotCoordinates)
                .map((lot) => ({
                    ...lot,
                    distanceKm: calculateDistanceKm(coords, {
                        lat: lot.latitude,
                        lng: lot.longitude,
                    }),
                }))
                .sort((a, b) => a.distanceKm - b.distanceKm);

            const lotsWithinRadius = lotsWithCoords.filter((lot) => lot.distanceKm <= NEARBY_RADIUS_KM);
            const nextNearbyLots = lotsWithinRadius.length ? lotsWithinRadius : lotsWithCoords.slice(0, 10);

            setNearbyLots(nextNearbyLots);

            if (!nextNearbyLots.length) {
                setQuickActionMessage(
                    'No available parking lots have saved map coordinates yet. Providers need to add coordinates to their lot first.'
                );
            } else if (!lotsWithinRadius.length) {
                setQuickActionMessage('Showing the closest parking options with saved map coordinates.');
            } else {
                setQuickActionMessage(`Showing parking within ${NEARBY_RADIUS_KM} km of your current location.`);
            }
        } catch (error) {
            console.error('Nearby action failed:', error);
            setNearbyLots([]);
            setQuickActionError(getLocationErrorMessage(error, false));
        } finally {
            setQuickActionLoading(false);
        }
    }

    function handleRecentAction() {
        if (quickAction === 'recent') {
            setQuickAction('all');
            setQuickActionMessage('');
            setQuickActionError('');
            return;
        }

        setQuickAction('recent');
        setQuickActionError('');
        setQuickActionMessage(
            recentLotIds.length
                ? 'Showing your recently viewed parking spots.'
                : 'Parking lots you open for booking will appear here.'
        );
    }

    async function handleBookLot(lot) {
        try {
            if (currentUser?.uid) {
                await addRecentLot(currentUser.uid, lot.id);
            }
        } catch (error) {
            console.error('Failed to save recent lot:', error);
        }

        setSelectedLotForBooking(lot);
    }

    function handleFavoritesAction() {
        if (quickAction === 'favorites') {
            setQuickAction('all');
            setQuickActionMessage('');
            setQuickActionError('');
            return;
        }

        setQuickAction('favorites');
        setQuickActionError('');
        setQuickActionMessage(
            favoriteLotIds.length
                ? 'Showing your saved favorite parking spots.'
                : 'You have not saved any favorite parking spots yet.'
        );
    }

    async function handleFavoriteToggle(lotId) {
        if (!currentUser?.uid || favoriteBusyLotId) return;

        const isFavorite = favoriteLotIds.includes(lotId);
        setFavoriteBusyLotId(lotId);
        setQuickActionError('');

        try {
            await toggleFavoriteLot(currentUser.uid, lotId, !isFavorite);
        } catch (error) {
            console.error('Favorite toggle failed:', error);
            setQuickActionError('Unable to update favorites right now.');
        } finally {
            setFavoriteBusyLotId(null);
        }
    }

    const availableTitle = quickAction === 'nearby'
        ? 'Parking Near You'
        : quickAction === 'favorites'
            ? 'Favorite Parking'
        : quickAction === 'recent'
            ? 'Recent Parking'
        : (selectedPlace ? `Parking near "${selectedPlace.name}"` : 'Available Parking');

    const emptyState = quickAction === 'nearby'
        ? {
            title: 'No nearby parking found',
            detail: quickActionError || 'Nearby works when your location and the parking lots\' saved map coordinates are available.',
            action: 'Show all parking',
        }
        : quickAction === 'favorites'
            ? {
                title: 'No favorite parking spots yet',
                detail: 'Tap the heart icon on any parking lot to save it here.',
                action: 'Browse all parking',
            }
        : quickAction === 'recent'
            ? {
                title: 'No recent parking activity yet',
                detail: 'Parking lots you open for booking will appear here.',
                action: 'Browse all parking',
            }
        : selectedPlace
            ? {
                title: `No parking found near "${selectedPlace.name}"`,
                detail: 'Try a different location or browse all available lots.',
                action: 'Browse all parking',
            }
            : {
                title: 'No parking spots available yet',
                detail: 'New providers will appear here once approved.',
                action: null,
            };

    return (
        <div className="min-h-screen bg-gray-50 pb-safe page-enter">
            {/* Header */}
            <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100 relative">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="text-gray-400 text-xs font-medium">Welcome back,</p>
                        <h1 className="text-gray-900 text-xl font-bold">{displayName}</h1>
                    </div>
                    <button
                        className={`relative bg-gray-50 p-2.5 rounded-full border border-gray-100 hover:bg-gray-100 transition ${hasUnread ? 'ring-2 ring-teal-400 animate-pulse' : ''}`}
                        onClick={() => {
                            setNotificationsOpen((open) => !open);
                            setHasUnread(false);
                        }}
                    >
                        <Bell className="w-5 h-5 text-gray-600" />
                        {hasUnread && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                        )}
                    </button>
                </div>

                {notificationsOpen && (
                    <div className="absolute right-5 top-20 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-40 overflow-hidden">
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-800">Notifications</p>
                            {notifications.length > 0 && (
                                <button
                                    className="text-[10px] text-teal-600 font-semibold"
                                    onClick={() => {
                                        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                                        setHasUnread(false);
                                    }}
                                >
                                    Mark all as read
                                </button>
                            )}
                        </div>
                        {notifications.length === 0 ? (
                            <div className="px-4 py-5 text-center text-xs text-gray-400">
                                No notifications yet
                            </div>
                        ) : (
                            <ul className="max-h-64 overflow-y-auto divide-y divide-gray-100">
                                {notifications.map((n) => (
                                    <li
                                        key={n.timestamp}
                                        className={`px-4 py-3 text-xs flex flex-col gap-0.5 ${n.read ? 'bg-white' : 'bg-teal-50/40'}`}
                                        onClick={() => {
                                            setNotifications((prev) => prev.map((item) => (
                                                item.timestamp === n.timestamp ? { ...item, read: true } : item
                                            )));
                                        }}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`truncate ${n.read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>{n.title}</p>
                                            <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                                {new Date(n.timestamp).toLocaleTimeString('en-KE', {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-gray-500 leading-snug">{n.message}</p>
                                        {n.type && (
                                            <span className="mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-gray-100 text-gray-500 uppercase tracking-wide">
                                                {n.type}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Swipeable toast popup for latest notification */}
                {toastNotification && toastVisible && (
                    <div
                        className="fixed left-1/2 top-3 -translate-x-1/2 z-50 max-w-sm w-[90%]"
                        onTouchStart={(e) => {
                            toastTouchStartY.current = e.touches[0].clientY;
                        }}
                        onTouchMove={(e) => {
                            const startY = toastTouchStartY.current;
                            if (startY == null) return;
                            const deltaY = e.touches[0].clientY - startY;
                            // Swipe up to dismiss
                            if (deltaY < -40) {
                                setToastVisible(false);
                                toastTouchStartY.current = null;
                            }
                        }}
                        onTouchEnd={() => {
                            toastTouchStartY.current = null;
                        }}
                    >
                        <div className="bg-gray-900/95 text-white rounded-xl shadow-2xl px-4 py-3 flex items-start gap-3 animate-slide-down">
                            <div className="mt-0.5 w-2 h-2 rounded-full bg-teal-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold truncate">{toastNotification.title}</p>
                                <p className="text-[11px] text-gray-200 mt-0.5 line-clamp-2">{toastNotification.message}</p>
                            </div>
                            <button
                                className="ml-2 text-gray-400 hover:text-gray-200"
                                onClick={() => setToastVisible(false)}
                                aria-label="Dismiss notification"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                )}

                {/* Live Booking Banner */}
                {activeSession && (
                    <div className="mb-4 bg-indigo-600 rounded-xl p-4 shadow-lg flex items-center justify-between text-white animate-pulse-slow">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-0.5">{bannerTitle}</p>
                            <p className="text-sm font-bold truncate pr-2">
                                🚗 {bannerMessage}
                            </p>
                        </div>
                    </div>
                )}

                {/* Google Places Search Bar */}
                <div className="relative">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${searchActive ? 'border-teal-400 bg-white ring-2 ring-teal-100' : 'border-gray-100 bg-gray-50'}`}>
                        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                            ref={inputRef}
                            type="text"
                            value={search}
                            placeholder="Search location or parking..."
                            className="flex-1 outline-none text-gray-700 bg-transparent text-sm placeholder-gray-400"
                            onFocus={() => setSearchActive(true)}
                            onBlur={() => setTimeout(() => setSearchActive(false), 150)}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                if (!e.target.value) {
                                    setSelectedPlace(null);
                                    setFilteredLots(null);
                                }
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && search.trim()) {
                                    setSuggestions([]);
                                    setSearchActive(false);
                                    matchLotsToPlace(search);
                                }
                            }}
                        />
                        {search ? (
                            <button onClick={handleClearSearch} className="flex-shrink-0">
                                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                        ) : (
                            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-4 h-4 text-white" />
                            </div>
                        )}
                    </div>

                    {/* Suggestions dropdown */}
                    {suggestions.length > 0 && searchActive && (
                        <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden">
                            {suggestions.map((s) => (
                                <li key={s.place_id}>
                                    <button
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition border-b border-gray-50 last:border-0"
                                        onMouseDown={() => handleSelectSuggestion(s)}
                                    >
                                        <p className="text-sm font-medium text-gray-800">{s.structured_formatting?.main_text}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{s.structured_formatting?.secondary_text}</p>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="px-5 mt-5">
                <h2 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h2>
                <div className="grid grid-cols-3 gap-2.5">
                    {[
                        { icon: Navigation, label: 'Nearby', color: 'bg-teal-50 text-teal-600' },
                        { icon: Heart, label: 'Favorites', color: 'bg-rose-50 text-rose-500' },
                        { icon: Clock, label: 'Recent', color: 'bg-indigo-50 text-indigo-500' },
                    ].map(({ icon: Icon, label, color }) => (
                        <button
                            key={label}
                            onClick={
                                label === 'Nearby'
                                    ? handleNearbyAction
                                    : label === 'Favorites'
                                        ? handleFavoritesAction
                                        : label === 'Recent'
                                            ? handleRecentAction
                                            : undefined
                            }
                            className={`bg-white rounded-xl p-3.5 border transition group ${
                                quickAction === label.toLowerCase()
                                    ? 'border-transparent shadow-card'
                                    : 'border-gray-100 hover:shadow-card'
                            }`}
                        >
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${color}`}>
                                {quickActionLoading && label === 'Nearby'
                                    ? <Loader2 className="w-5 h-5 animate-spin" />
                                    : <Icon className="w-5 h-5" />}
                            </div>
                            <p className="text-xs font-semibold text-gray-700">{label}</p>
                        </button>
                    ))}
                </div>
                {((quickAction === 'nearby' || quickAction === 'favorites' || quickAction === 'recent') && (quickActionMessage || quickActionError)) && (
                    <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium ${quickActionError ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-teal-50 text-teal-700 border border-teal-100'}`}>
                        {quickActionError || quickActionMessage}
                    </div>
                )}
            </div>

            {/* Available Parking Spots */}
            <div className="px-5 mt-6 max-w-lg">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold text-gray-900">{availableTitle}</h2>
                    {(selectedPlace || quickAction !== 'all') && (
                        <button
                            onClick={() => {
                                setQuickAction('all');
                                setQuickActionMessage('');
                                setQuickActionError('');
                                setNearbyLots([]);
                                if (selectedPlace) handleClearSearch();
                            }}
                            className="text-xs text-teal-600 font-semibold"
                        >
                            Show all
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                        <div className="h-48 bg-gray-100" />
                        <div className="p-4 space-y-2">
                            <div className="h-4 bg-gray-100 rounded w-3/4" />
                            <div className="h-3 bg-gray-100 rounded w-1/2" />
                        </div>
                    </div>
                ) : displayLots.length === 0 ? (
                    <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <ParkingCircle className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-gray-600 font-medium text-sm">{emptyState.title}</p>
                        <p className="text-gray-400 text-xs mt-2">{emptyState.detail}</p>
                        {emptyState.action && (
                            <button
                                onClick={() => {
                                    setQuickAction('all');
                                    setQuickActionMessage('');
                                    setQuickActionError('');
                                    setNearbyLots([]);
                                    setSelectedPlace(null);
                                    setFilteredLots(null);
                                }}
                                className="mt-4 text-teal-600 text-xs font-semibold"
                            >
                                {emptyState.action} →
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {displayLots.map((spot) => {
                            const images = spot.lotImages || (spot.imageUrl ? [spot.imageUrl] : []);
                            const isFull = Number(spot.availableSpots ?? 0) <= 0;
                            const isFavorite = favoriteLotIds.includes(spot.id);
                            const isFavoriteBusy = favoriteBusyLotId === spot.id;
                            return (
                                <div key={spot.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                    {images.length === 0 && (
                                        <div className="h-28 bg-gray-50 flex items-center justify-center">
                                            <ParkingCircle className="w-10 h-10 text-gray-300" />
                                        </div>
                                    )}
                                    {images.length === 1 && (
                                        <div className="h-48 overflow-hidden">
                                            <img src={images[0]} alt={spot.name} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    {images.length === 2 && (
                                        <div className="grid grid-cols-2 gap-0.5 h-48 overflow-hidden">
                                            {images.map((img, i) => <img key={i} src={img} alt="" className="w-full h-full object-cover" />)}
                                        </div>
                                    )}
                                    {images.length === 3 && (
                                        <div className="grid grid-cols-2 gap-0.5 h-48 overflow-hidden">
                                            <img src={images[0]} alt="" className="w-full h-full object-cover row-span-2" />
                                            <div className="grid grid-rows-2 gap-0.5">
                                                <img src={images[1]} alt="" className="w-full h-full object-cover" />
                                                <img src={images[2]} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        </div>
                                    )}
                                    {images.length >= 4 && (
                                        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-56 overflow-hidden">
                                            {images.slice(0, 4).map((img, i) => <img key={i} src={img} alt="" className="w-full h-full object-cover" />)}
                                        </div>
                                    )}

                                    <div className="p-4">
                                        <div className="flex items-start justify-between gap-3 mb-1">
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-gray-900 text-sm truncate">{spot.name}</h3>
                                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                    <MapPin className="w-3 h-3" /> {spot.address}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                                                    KSh {spot.hourlyRate}/hr
                                                </span>
                                                <button
                                                    onClick={() => handleFavoriteToggle(spot.id)}
                                                    disabled={isFavoriteBusy}
                                                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition ${isFavorite ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-white border-gray-200 text-gray-400 hover:text-rose-500 hover:border-rose-100'} ${isFavoriteBusy ? 'opacity-60' : ''}`}
                                                    aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                                >
                                                    {isFavoriteBusy ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500 stroke-rose-500' : ''}`} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-3">
                                            <div className="flex items-center gap-3 text-xs flex-wrap">
                                                <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                                                    <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" /> {spot.rating}
                                                </span>
                                                <span className="text-emerald-600 font-semibold">{spot.availableSpots} slots</span>
                                                {typeof spot.distanceKm === 'number' && (
                                                    <span className="text-teal-600 font-semibold">
                                                        {spot.distanceKm < 1
                                                            ? `${Math.round(spot.distanceKm * 1000)} m away`
                                                            : `${spot.distanceKm.toFixed(1)} km away`}
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                disabled={isFull}
                                                onClick={() => handleBookLot(spot)}
                                                className={`px-4 py-2 rounded-lg font-semibold transition text-xs ${isFull
                                                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                                    : 'bg-teal-600 hover:bg-teal-700 text-white'
                                                    }`}>
                                                {isFull ? 'Full' : 'Book'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <BottomNav />

            <BookingModal
                isOpen={!!selectedLotForBooking}
                onClose={() => setSelectedLotForBooking(null)}
                lot={selectedLotForBooking}
                onSuccess={() => setSelectedLotForBooking(null)}
            />
        </div>
    );
}
