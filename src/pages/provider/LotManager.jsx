import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import ProviderNav from '../../components/provider/ProviderNav';
import { createOrUpdateLot, getLotByProvider } from '../../services/parkingService';
import { MapPin, DollarSign, Car, Save, CheckCircle2, ParkingCircle, Edit3, Plus, X, Link, Upload, Loader2, Clock, RefreshCcw, AlertTriangle } from 'lucide-react';
import { db } from '../../config/firebase';
import { writeBatch, collection, doc, getDocs, updateDoc } from 'firebase/firestore';

const MAPS_KEY = import.meta.env.VITE_MAPS_JAVASCRIPT_API_KEY;

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

const MAX_IMAGES = 4;

function formatCoordinatePair(latitude, longitude) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
    return `${latitude}, ${longitude}`;
}

function parseCoordinatePair(value) {
    if (!value || typeof value !== 'string') return null;

    const match = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!match) return null;

    const latitude = Number(match[1]);
    const longitude = Number(match[2]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90) return null;
    if (longitude < -180 || longitude > 180) return null;

    return { latitude, longitude };
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new window.Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 800;
                let w = img.width, h = img.height;
                if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
                else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function ImageGrid({ images }) {
    if (images.length === 0) return (
        <div className="h-28 bg-gray-50 flex items-center justify-center">
            <ParkingCircle className="w-10 h-10 text-gray-300" />
        </div>
    );
    if (images.length === 1) return (
        <div className="h-48 overflow-hidden">
            <img src={images[0]} alt="" className="w-full h-full object-cover" />
        </div>
    );
    if (images.length === 2) return (
        <div className="grid grid-cols-2 gap-0.5 h-48 overflow-hidden">
            {images.map((img, i) => <img key={i} src={img} alt="" className="w-full h-full object-cover" />)}
        </div>
    );
    if (images.length === 3) return (
        <div className="grid grid-cols-2 gap-0.5 h-48 overflow-hidden">
            <img src={images[0]} alt="" className="w-full h-full object-cover row-span-2" />
            <div className="grid grid-rows-2 gap-0.5">
                <img src={images[1]} alt="" className="w-full h-full object-cover" />
                <img src={images[2]} alt="" className="w-full h-full object-cover" />
            </div>
        </div>
    );
    return (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 h-56 overflow-hidden">
            {images.map((img, i) => <img key={i} src={img} alt="" className="w-full h-full object-cover" />)}
        </div>
    );
}

export default function LotManager() {
    const { currentUser } = useAuth();
    const [lot, setLot] = useState(null);
    const [editing, setEditing] = useState(false);
    const [loadingLot, setLoadingLot] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [clearing, setClearing] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlValue, setUrlValue] = useState('');
    const fileRef = useRef(null);

    const [formData, setFormData] = useState({
        businessName: '',
        businessLocation: '',
        coordinateInput: '',
        latitude: null,
        longitude: null,
        capacity: '',
        hourlyRate: '',
        description: '',
        openTime: '08:00',
        closeTime: '17:00'
    });
    const [lotImages, setLotImages] = useState([]);

    const [suggestions, setSuggestions] = useState([]);
    const [searchActive, setSearchActive] = useState(false);
    const autocompleteService = useRef(null);
    const geocoderRef = useRef(null);

    useEffect(() => {
        loadGoogleMapsScript().then(() => {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
            geocoderRef.current = new window.google.maps.Geocoder();
        }).catch(() => console.error('Failed to load Google Maps'));
    }, []);

    useEffect(() => {
        if (!formData.businessLocation.trim() || !autocompleteService.current || !searchActive) {
            setSuggestions([]);
            return;
        }
        const timer = setTimeout(() => {
            autocompleteService.current.getPlacePredictions(
                { input: formData.businessLocation, componentRestrictions: { country: 'ke' } },
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
    }, [formData.businessLocation, searchActive]);

    async function geocodeLocation(address) {
        const directCoords = parseCoordinatePair(address);
        if (directCoords) return directCoords;
        if (!geocoderRef.current || !address?.trim()) return null;

        return new Promise((resolve) => {
            const timeoutId = window.setTimeout(() => resolve(null), 4000);

            geocoderRef.current.geocode(
                { address, region: 'KE' },
                (results, status) => {
                    window.clearTimeout(timeoutId);
                    if (status !== 'OK' || !results?.[0]?.geometry?.location) {
                        resolve(null);
                        return;
                    }

                    const location = results[0].geometry.location;
                    resolve({
                        latitude: location.lat(),
                        longitude: location.lng(),
                    });
                }
            );
        });
    }

    async function handleSelectSuggestion(prediction) {
        const nextAddress = prediction.description;
        const coords = await geocodeLocation(nextAddress);

        setFormData((current) => ({
            ...current,
            businessLocation: nextAddress,
            coordinateInput: coords
                ? formatCoordinatePair(coords.latitude, coords.longitude)
                : current.coordinateInput,
            latitude: coords?.latitude ?? current.latitude ?? null,
            longitude: coords?.longitude ?? current.longitude ?? null,
        }));
        setSuggestions([]);
        setSearchActive(false);
    }

    // Load lot from parking-lots collection
    useEffect(() => {
        if (!currentUser) return;
        async function loadLot() {
            setLoadingLot(true);
            const data = await getLotByProvider(currentUser.uid);
            if (data) {
                setLot(data);
                setFormData({
                    businessName: data.businessName || '',
                    businessLocation: data.businessLocation || '',
                    coordinateInput: formatCoordinatePair(data.latitude, data.longitude),
                    latitude: typeof data.latitude === 'number' ? data.latitude : null,
                    longitude: typeof data.longitude === 'number' ? data.longitude : null,
                    capacity: data.capacity || '',
                    hourlyRate: data.hourlyRate || '',
                    description: data.description || '',
                    openTime: data.openTime || '08:00',
                    closeTime: data.closeTime || '17:00',
                });
                setLotImages(data.lotImages || (data.businessImage ? [data.businessImage] : []));
            }
            setLoadingLot(false);
        }
        loadLot();
    }, [currentUser]);

    function addImageUrl() {
        const url = urlValue.trim();
        if (!url || lotImages.length >= MAX_IMAGES) return;
        setLotImages([...lotImages, url]);
        setUrlValue('');
        setShowUrlInput(false);
    }

    async function handleFileUpload(e) {
        const files = Array.from(e.target.files);
        const remaining = MAX_IMAGES - lotImages.length;
        for (const file of files.slice(0, remaining)) {
            if (!file.type.startsWith('image/')) continue;
            try {
                const base64 = await compressImage(file);
                setLotImages((prev) => [...prev, base64]);
            } catch (err) { console.error('Failed to process image:', err); }
        }
        if (fileRef.current) fileRef.current.value = '';
    }

    function removeImage(index) {
        setLotImages((prev) => prev.filter((_, i) => i !== index));
    }

    /**
     * Create missing spot docs for a lot using a single writeBatch.
     * Spots 1..capacity are created if they don't already exist.
     * Existing spot docs (with booking history) are NEVER overwritten.
     */
    async function initializeSpots(lotId, capacity) {
        if (!lotId || capacity <= 0) return;
        try {
            const spotsCol = collection(db, 'parking-lots', lotId, 'spots');
            const existingSnap = await getDocs(spotsCol);
            const existingNumbers = new Set(
                existingSnap.docs.map((d) => d.data().spotNumber)
            );

            const batch = writeBatch(db);
            let batchCount = 0;

            for (let i = 1; i <= capacity; i++) {
                if (!existingNumbers.has(i)) {
                    const spotRef = doc(spotsCol, String(i));
                    batch.set(spotRef, { spotNumber: i, bookings: [] });
                    batchCount++;
                }
            }

            if (batchCount > 0) {
                await batch.commit();
            }
        } catch (err) {
            console.error('[LotManager] initializeSpots failed:', err);
        }
    }

    async function handleSave(e) {
        e.preventDefault();
        try {
            setSaving(true);
            setSaveError('');
            const capacity = Number(formData.capacity) || 0;
            const directCoords = parseCoordinatePair(formData.coordinateInput);
            let latitude = directCoords?.latitude ?? (typeof formData.latitude === 'number' ? formData.latitude : null);
            let longitude = directCoords?.longitude ?? (typeof formData.longitude === 'number' ? formData.longitude : null);

            if ((latitude === null || longitude === null) && formData.businessLocation.trim()) {
                try {
                    const coords = await geocodeLocation(formData.businessLocation);
                    if (coords) {
                        latitude = coords.latitude;
                        longitude = coords.longitude;
                    }
                } catch (error) {
                    console.error('Failed to geocode lot location:', error);
                }
            }

            const lotData = {
                businessName: formData.businessName,
                businessLocation: formData.businessLocation,
                latitude,
                longitude,
                capacity,
                hourlyRate: Number(formData.hourlyRate) || 0,
                description: formData.description,
                openTime: formData.openTime,
                closeTime: formData.closeTime,
                lotImages,
                businessImage: lotImages[0] || lot?.businessImage || '',
                // preserve existing isActive — don't flip it on edit
                ...(lot ? {} : { isActive: false }),
            };
            await createOrUpdateLot(currentUser.uid, lotData);

            // Initialise spot sub-collection (creates missing spot docs, preserves existing)
            await initializeSpots(currentUser.uid, capacity);

            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                setEditing(false);
                // Merge into local state without full page reload
                setLot((prev) => ({ ...prev, ...lotData }));
            }, 1200);
        } catch (err) {
            console.error('Failed to update lot:', err);
            setSaveError('Unable to save your lot right now. Please try again.');
        } finally {
            setSaving(false);
        }
    }

    async function handleClearSpots() {
        if (!lot || !lot.capacity) return;
        if (!window.confirm('WARNING: This will wipe ALL bookings (active and future) for your lot. Are you absolutely sure you want to reset all parking spots to completely empty?')) return;
        
        setClearing(true);
        try {
            const spotsCol = collection(db, 'parking-lots', currentUser.uid, 'spots');
            const existingSnap = await getDocs(spotsCol);
            
            const batch = writeBatch(db);
            let batchCount = 0;
            
            // Overwrite every spot up to capacity to an empty state
            for (let i = 1; i <= lot.capacity; i++) {
                const spotRef = doc(spotsCol, String(i));
                batch.set(spotRef, { spotNumber: i, bookings: [] });
                batchCount++;
            }
            
            // Delete any extra spots that might have existed if capacity was shrunk
            existingSnap.docs.forEach(d => {
                if (Number(d.id) > lot.capacity) {
                    batch.delete(d.ref);
                    batchCount++;
                }
            });
            
            // Reset the old availableSpots counter to match capacity
            const lotRef = doc(db, 'parking-lots', currentUser.uid);
            batch.update(lotRef, { availableSpots: lot.capacity });
            batchCount++;
            
            if (batchCount > 0) {
                await batch.commit();
            }
            
            setLot(prev => ({ ...prev, availableSpots: lot.capacity }));
            alert('Operation successful. All spaces have been wiped and set back to empty.');
            
        } catch (err) {
            console.error('[LotManager] clear spots failed:', err);
            alert('Failed to reset spots: ' + err.message);
        } finally {
            setClearing(false);
        }
    }

    const hasSetup = lot && lot.capacity > 0 && lot.hourlyRate > 0;
    const displayImages = lot?.lotImages || (lot?.businessImage ? [lot.businessImage] : []);

    if (loadingLot) {
        return (
            <div className="min-h-screen bg-gray-50 flex">
                <ProviderNav />
                <main className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                </main>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <ProviderNav />
            <main className="flex-1 pb-safe lg:pb-6">
                <div className="px-5 pt-12 lg:pt-8 max-w-lg">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">My Lot</h1>
                            <p className="text-gray-400 text-xs mt-0.5">Your parking facility details</p>
                        </div>
                        {hasSetup && !editing && (
                            <button onClick={() => setEditing(true)} className="flex items-center gap-1 text-teal-600 text-xs font-semibold">
                                <Edit3 className="w-3.5 h-3.5" /> Edit
                            </button>
                        )}
                    </div>

                    {/* Pending approval notice */}
                    {lot && !lot.isActive && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                            <span className="text-amber-500 text-sm">⏳</span>
                            <p className="text-amber-700 text-xs font-medium">
                                {hasSetup
                                    ? 'Your lot is pending admin approval. It will appear to customers once approved.'
                                    : 'Set up your lot details below. Once submitted and approved, customers can find you.'}
                            </p>
                        </div>
                    )}

                    {!hasSetup || editing ? (
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="p-5 border-b border-gray-100">
                                <h3 className="text-sm font-bold text-gray-900">
                                    {hasSetup ? 'Edit Lot Details' : 'Set Up Your Parking Lot'}
                                </h3>
                            </div>

                            <form onSubmit={handleSave} className="p-5 space-y-3.5">
                                {/* Image Gallery */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        Photos <span className="text-gray-400 font-normal">({lotImages.length}/{MAX_IMAGES})</span>
                                    </label>
                                    <div className="grid grid-cols-4 gap-2 mb-2">
                                        {lotImages.map((img, i) => (
                                            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group">
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                                <button type="button" onClick={() => removeImage(i)}
                                                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                                                    <X className="w-3 h-3 text-white" />
                                                </button>
                                                {i === 0 && (
                                                    <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">
                                                        COVER
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                        {lotImages.length < MAX_IMAGES && (
                                            <div className="aspect-square rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                                                <Plus className="w-4 h-4 text-gray-400" />
                                            </div>
                                        )}
                                    </div>
                                    {lotImages.length < MAX_IMAGES && (
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => fileRef.current?.click()}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-medium transition">
                                                <Upload className="w-3.5 h-3.5" /> Upload File
                                            </button>
                                            <button type="button" onClick={() => setShowUrlInput(!showUrlInput)}
                                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 py-2 rounded-lg text-xs font-medium transition">
                                                <Link className="w-3.5 h-3.5" /> Paste URL
                                            </button>
                                            <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
                                        </div>
                                    )}
                                    {showUrlInput && (
                                        <div className="flex gap-2 mt-2">
                                            <input type="text" value={urlValue} onChange={(e) => setUrlValue(e.target.value)}
                                                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500"
                                                placeholder="Paste image link here..." />
                                            <button type="button" onClick={addImageUrl}
                                                className="bg-teal-600 text-white px-3 py-2 rounded-lg text-sm font-semibold">
                                                Add
                                            </button>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        First image becomes the cover. Min 720p recommended.
                                    </p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Lot Name</label>
                                    <input type="text" value={formData.businessName}
                                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                                        placeholder="e.g. Prism Towers Parking" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                                    <div className="relative">
                                        <input type="text" value={formData.businessLocation}
                                            onChange={(e) => {
                                                const nextLocation = e.target.value;

                                                setFormData({
                                                    ...formData,
                                                    businessLocation: nextLocation,
                                                });
                                            }}
                                            onFocus={() => setSearchActive(true)}
                                            onBlur={() => setTimeout(() => setSearchActive(false), 200)}
                                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                                            placeholder="e.g. Upper Hill, Nairobi" required />
                                        
                                        {suggestions.length > 0 && searchActive && (
                                            <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-gray-100 shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                                                {suggestions.map((s) => (
                                                    <li key={s.place_id}>
                                                        <button type="button"
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
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Keep this as the readable address customers should see on the app.
                                    </p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Coordinates</label>
                                    <input
                                        type="text"
                                        value={formData.coordinateInput}
                                        onChange={(e) => {
                                            const nextCoordinateInput = e.target.value;
                                            const directCoords = parseCoordinatePair(nextCoordinateInput);

                                            setFormData({
                                                ...formData,
                                                coordinateInput: nextCoordinateInput,
                                                latitude: directCoords?.latitude ?? null,
                                                longitude: directCoords?.longitude ?? null,
                                            });
                                        }}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                                        placeholder="-1.2175, 36.8880"
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        Use this for Nearby accuracy. It is stored in the backend and not shown as the public location label.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Total Spaces *</label>
                                        <div className="relative">
                                            <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input type="number" value={formData.capacity}
                                                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                                                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                                                placeholder="50" min="1" required />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Rate/hr (KSh) *</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input type="number" value={formData.hourlyRate}
                                                onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                                                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                                                placeholder="100" min="10" required />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Open Time</label>
                                        <input type="time" value={formData.openTime}
                                            onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                                            required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Close Time</label>
                                        <input type="time" value={formData.closeTime}
                                            onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                                            className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                                            required />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                    <textarea value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                                        rows="2" placeholder="Covered parking, 24/7 security, EV charging..." />
                                </div>

                                {saved ? (
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                        <p className="text-sm text-emerald-700 font-medium">Lot details saved!</p>
                                    </div>
                                ) : saveError ? (
                                    <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                                        <p className="text-sm text-red-700 font-medium">{saveError}</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        {editing && (
                                            <button type="button" onClick={() => setEditing(false)}
                                                className="flex-1 bg-gray-100 text-gray-600 font-semibold py-3 rounded-xl text-sm">
                                                Cancel
                                            </button>
                                        )}
                                        <button type="submit" disabled={saving}
                                            className="flex-1 flex items-center justify-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 text-sm">
                                            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Details'}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </div>
                    ) : (
                        /* Lot Display Card */
                        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                            <ImageGrid images={displayImages} />
                            <div className="p-5">
                                <h2 className="text-lg font-bold text-gray-900 mb-1">{lot?.businessName}</h2>
                                <div className="space-y-1 mb-4">
                                    <p className="text-gray-400 text-xs flex items-center gap-1.5">
                                        <MapPin className="w-3 h-3" /> {lot?.businessLocation}
                                    </p>
                                    <p className="text-gray-400 text-xs flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" /> {lot?.openTime || '08:00'} - {lot?.closeTime || '17:00'}
                                    </p>
                                </div>
                                {lot?.description && (
                                    <p className="text-gray-500 text-sm mb-4">{lot.description}</p>
                                )}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-gray-400 uppercase">Capacity</p>
                                        <p className="text-lg font-bold text-gray-900">{lot?.capacity || '—'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-gray-400 uppercase">Available</p>
                                        <p className="text-lg font-bold text-emerald-600">{lot?.availableSpots ?? lot?.capacity ?? '—'}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                                        <p className="text-[10px] text-gray-400 uppercase">Rate/hr</p>
                                        <p className="text-lg font-bold text-teal-600">KSh {lot?.hourlyRate || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Developer Danger Zone for Providers */}
                    {hasSetup && !editing && (
                        <div className="mt-8 mb-6 border-t border-red-100 pt-6">
                            <h3 className="text-sm font-bold text-red-600 mb-2 flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" /> Danger Zone
                            </h3>
                            <div className="bg-red-50 rounded-xl p-4 border border-red-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-red-900">Reset All Spaces</p>
                                    <p className="text-xs text-red-700 mt-1">
                                        Wipe out all bookings and reset availability back to max capacity. Use carefully.
                                    </p>
                                </div>
                                <button
                                    onClick={handleClearSpots}
                                    disabled={clearing}
                                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold whitespace-nowrap transition disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
                                    {clearing ? 'Resetting...' : 'Hard Reset Spots'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
