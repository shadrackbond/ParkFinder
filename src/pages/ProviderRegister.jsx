import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, Phone, MapPin, AlertCircle, ArrowLeft, CheckCircle2, Image, UserCircle } from 'lucide-react';

const MAPS_KEY = import.meta.env.VITE_MAPS_JAVASCRIPT_API_KEY;

function loadGoogleMapsScript() {
    if (window.google && window.google.maps) return Promise.resolve();
    if (window._googleMapsPromise) return window._googleMapsPromise;

    window._googleMapsPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places`;
        script.async = true;
        script.defer = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
    return window._googleMapsPromise;
}

export default function ProviderRegister() {
    const location = useLocation();
    const navigate = useNavigate();
    const { signupProvider } = useAuth();

    const { email: passedEmail, password: passedPassword, displayName: passedName } = location.state || {};

    const [email, setEmail] = useState(passedEmail || '');
    const [password, setPassword] = useState(passedPassword || '');
    const [contactName, setContactName] = useState(passedName || '');
    const [businessName, setBusinessName] = useState('');
    const [businessLocation, setBusinessLocation] = useState('');
    const [phone, setPhone] = useState('');
    const [businessImage, setBusinessImage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const [suggestions, setSuggestions] = useState([]);
    const [searchActive, setSearchActive] = useState(false);
    const autocompleteService = useRef(null);

    useEffect(() => {
        loadGoogleMapsScript().then(() => {
            autocompleteService.current = new window.google.maps.places.AutocompleteService();
        }).catch(() => console.error('Failed to load Google Maps'));
    }, []);

    useEffect(() => {
        if (!businessLocation.trim() || !autocompleteService.current || !searchActive) {
            setSuggestions([]);
            return;
        }
        const timer = setTimeout(() => {
            autocompleteService.current.getPlacePredictions(
                { input: businessLocation, componentRestrictions: { country: 'ke' } },
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
    }, [businessLocation, searchActive]);

    function handleSelectSuggestion(prediction) {
        setBusinessLocation(prediction.description);
        setSuggestions([]);
        setSearchActive(false);
    }

    async function handleSubmit(e) {
        e.preventDefault();

        if (!businessName.trim() || !phone.trim()) {
            return setError('Business name and phone are required');
        }

        try {
            setError('');
            setLoading(true);

            await signupProvider(email, password, {
                contactName,
                businessName,
                businessLocation,
                phone,
                businessImage,
            });

            setSuccess(true);
        } catch (err) {
            setError(err.message.replace('Firebase: ', '').replace(/\(auth.*\)/, ''));
        } finally {
            setLoading(false);
        }
    }

    // Success / Pending Approval
    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-5">
                        <CheckCircle2 className="w-8 h-8 text-teal-600" />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mb-2">Registration Submitted!</h1>
                    <p className="text-gray-500 text-sm mb-6">
                        Your provider account is pending admin approval. We'll notify you once verified — usually within 1–2 business days.
                    </p>
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-card mb-6 text-left">
                        <h3 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Submitted Details</h3>
                        <div className="space-y-2 text-sm">
                            <p className="text-gray-700"><span className="text-gray-400">Business:</span> {businessName}</p>
                            <p className="text-gray-700"><span className="text-gray-400">Contact:</span> {contactName}</p>
                            <p className="text-gray-700"><span className="text-gray-400">Location:</span> {businessLocation || 'Not specified'}</p>
                            <p className="text-gray-700"><span className="text-gray-400">Phone:</span> {phone}</p>
                        </div>
                    </div>
                    <button onClick={() => navigate('/login')} className="text-teal-600 hover:text-teal-700 font-medium text-sm">
                        ← Back to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back */}
                <button onClick={() => navigate('/login')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-5 transition text-sm">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Login
                </button>

                <div className="bg-white rounded-2xl shadow-card p-6 border border-gray-100">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-teal-600" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900">Provider Registration</h2>
                            <p className="text-gray-500 text-xs">Tell us about your parking business</p>
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-4 flex items-start gap-2 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3.5">
                        {!passedEmail && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder-gray-400" placeholder="you@example.com" required />
                            </div>
                        )}
                        {!passedPassword && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder-gray-400" placeholder="••••••••" required />
                            </div>
                        )}

                        {/* Contact Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Name *</label>
                            <div className="relative">
                                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder-gray-400" placeholder="Your full name" required />
                            </div>
                        </div>

                        {/* Business Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name *</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder-gray-400" placeholder="e.g. ABC Parking Solutions" required />
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Location</label>
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" value={businessLocation} 
                                    onChange={(e) => setBusinessLocation(e.target.value)}
                                    onFocus={() => setSearchActive(true)}
                                    onBlur={() => setTimeout(() => setSearchActive(false), 200)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder-gray-400" placeholder="e.g. Westlands, Nairobi" />
                                
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
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder-gray-400" placeholder="+254 7XX XXX XXX" required />
                            </div>
                        </div>

                        {/* Business Image URL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                Business Photo URL
                                <span className="text-gray-400 font-normal"> (landscape 4:3, min 800×600px)</span>
                            </label>
                            <div className="relative">
                                <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input type="text" value={businessImage} onChange={(e) => setBusinessImage(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition placeholder-gray-400"
                                    placeholder="Paste image link from Google..." />
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Upload a landscape photo (4:3 ratio) showing your parking facility. JPG or PNG, min 800×600px.</p>
                        </div>

                        {/* Notice */}
                        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3">
                            <p className="text-sm text-teal-700">
                                ⓘ Your account will be reviewed by our team before activation. You'll be notified once approved.
                            </p>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 shadow-sm">
                            {loading ? 'Submitting...' : 'Submit Registration'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
