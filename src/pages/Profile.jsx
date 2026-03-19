import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/common/BottomNav';
import ProviderNav from '../components/provider/ProviderNav';
import { updateUserProfile } from '../services/userService';
import { LogOut, User, Mail, Shield, ChevronRight, Bell, HelpCircle, Settings, Edit3, Image, AlertTriangle, CheckCircle2 } from 'lucide-react';

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

export default function Profile() {
  const { currentUser, userRole, userProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    displayName: '',
    businessName: '',
    businessLocation: '',
    phone: '',
    businessImage: '',
  });
  const [imageWarning, setImageWarning] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [searchActive, setSearchActive] = useState(false);
  const autocompleteService = useRef(null);

  const isProvider = userRole === 'provider';
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    if (editing && isProvider) {
      loadGoogleMapsScript().then(() => {
        autocompleteService.current = new window.google.maps.places.AutocompleteService();
      }).catch(() => console.error('Failed to load Google Maps'));
    }
  }, [editing, isProvider]);

  useEffect(() => {
    if (!editData.businessLocation.trim() || !autocompleteService.current || !searchActive) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      autocompleteService.current.getPlacePredictions(
        { input: editData.businessLocation, componentRestrictions: { country: 'ke' } },
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
  }, [editData.businessLocation, searchActive]);

  function handleSelectSuggestion(prediction) {
    const name = prediction.description;
    setEditData({ ...editData, businessLocation: name });
    setSuggestions([]);
    setSearchActive(false);
  }

  function startEditing() {
    setEditData({
      displayName: userProfile?.displayName || '',
      businessName: userProfile?.businessName || '',
      businessLocation: userProfile?.businessLocation || '',
      phone: userProfile?.phone || '',
      businessImage: userProfile?.businessImage || '',
    });
    setImageWarning('');
    setSaveSuccess(false);
    setEditing(true);
  }

  /**
   * Check if URL looks like a direct image link.
   */
  function isImageUrl(url) {
    const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)(\?.*)?$/i;
    const imageHosts = /unsplash\.com|imgur\.com|cloudinary\.com|firebasestorage\.googleapis\.com|googleusercontent\.com/i;
    return imageExtensions.test(url) || imageHosts.test(url);
  }

  function validateImage(url) {
    if (!url.trim()) {
      setImageWarning('');
      return;
    }

    // Check if URL is a webpage, not a direct image
    if (!isImageUrl(url)) {
      setImageWarning('This looks like a webpage URL, not a direct image link. Use a URL that ends in .jpg, .png, or .webp — right-click an image and select "Copy image address".');
      return;
    }

    // Check dimensions
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (img.naturalWidth < 1280 || img.naturalHeight < 720) {
        setImageWarning(`Image is ${img.naturalWidth}×${img.naturalHeight}px — minimum recommended is 1280×720 (720p).`);
      } else {
        setImageWarning('');
      }
    };
    img.onerror = () => {
      setImageWarning('');
    };
    img.src = url;
  }

  async function handleSave(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await updateUserProfile(currentUser.uid, editData);
      setSaveSuccess(true);
      setTimeout(() => {
        setEditing(false);
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  }

  const displayName = userProfile?.displayName || currentUser?.displayName || 'User';

  const roleBadge = {
    customer: { label: 'Customer', color: 'bg-teal-50 text-teal-700' },
    provider: { label: 'Provider', color: 'bg-indigo-50 text-indigo-700' },
    admin: { label: 'Admin', color: 'bg-purple-50 text-purple-700' },
  };
  const badge = roleBadge[userRole] || roleBadge.customer;

  const menuItems = [
    { label: 'Notifications', icon: Bell },
    { label: 'Settings', icon: Settings },
    { label: 'Help & Support', icon: HelpCircle },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 ${isProvider ? 'flex' : ''}`}>
      {/* Provider gets sidebar nav */}
      {isProvider && <ProviderNav />}

      <main className={`flex-1 ${isProvider || isAdmin ? 'pb-safe lg:pb-6' : 'pb-safe'} page-enter`}>
        <div className={`${isProvider ? 'px-5 pt-12 lg:pt-8 max-w-lg' : 'w-full'}`}>
          <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-xl font-bold text-gray-900">Profile</h1>
              <button onClick={startEditing} className="flex items-center gap-1 text-teal-600 text-xs font-semibold">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
            </div>

            <div className="flex items-center gap-4">
              {isProvider && userProfile?.businessImage ? (
                <img src={userProfile.businessImage} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-gray-100" />
              ) : (
                <div className="w-14 h-14 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-bold text-gray-900 truncate">{displayName}</h2>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${badge.color}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  {currentUser?.email}
                </p>
                {isProvider && userProfile?.businessName && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{userProfile.businessName}</p>
                )}
              </div>
            </div>

            {userRole === 'provider' && userProfile?.status === 'pending' && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mt-4">
                <p className="text-xs text-amber-700 flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                  Account pending admin approval
                </p>
              </div>
            )}
          </div>

          {/* Edit Profile Modal */}
          {editing && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-md shadow-float overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
                  <button onClick={() => setEditing(false)} className="text-gray-400 text-sm">Cancel</button>
                </div>

                <form onSubmit={handleSave} className="p-5 space-y-3.5 max-h-[70vh] overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                    <input type="text" value={editData.displayName} onChange={(e) => setEditData({ ...editData, displayName: e.target.value })}
                      className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm" required />
                  </div>

                  {isProvider && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
                        <input type="text" value={editData.businessName} onChange={(e) => setEditData({ ...editData, businessName: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm" />
                      </div>
                      <div className="relative">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Location</label>
                        <input type="text" value={editData.businessLocation} 
                          onChange={(e) => setEditData({ ...editData, businessLocation: e.target.value })}
                          onFocus={() => setSearchActive(true)}
                          onBlur={() => setTimeout(() => setSearchActive(false), 200)}
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                          placeholder="Search for location..." />
                        
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                        <input type="tel" value={editData.phone} onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          Business Photo URL <span className="text-gray-400 font-normal">(min 720p)</span>
                        </label>
                        <div className="relative">
                          <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input type="url" value={editData.businessImage}
                            onChange={(e) => setEditData({ ...editData, businessImage: e.target.value })}
                            onBlur={(e) => validateImage(e.target.value)}
                            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 text-sm"
                            placeholder="https://example.com/photo.jpg" />
                        </div>
                        {imageWarning && (
                          <div className="flex items-start gap-1.5 mt-1.5 text-amber-600">
                            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                            <p className="text-[11px]">{imageWarning}</p>
                          </div>
                        )}
                        {editData.businessImage && isImageUrl(editData.businessImage) && (
                          <div className="mt-2 rounded-lg overflow-hidden h-24 bg-gray-50">
                            <img src={editData.businessImage} alt="Preview" className="w-full h-full object-cover"
                              onError={(e) => { e.target.style.display = 'none'; }} />
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1">
                          Paste a <strong>direct image link</strong> (right-click image → "Copy image address"). Min 1280×720px. JPG/PNG/WebP.
                        </p>
                      </div>
                    </>
                  )}

                  {saveSuccess ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <p className="text-sm text-emerald-700 font-medium">Profile updated!</p>
                    </div>
                  ) : (
                    <button type="submit" disabled={saving}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 text-sm">
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* Menu */}
          <div className="px-5 mt-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-4">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button key={item.label}
                    className={`w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition ${index !== menuItems.length - 1 ? 'border-b border-gray-50' : ''
                      }`}>
                    <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="flex-1 text-gray-700 font-medium text-sm">{item.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300" />
                  </button>
                );
              })}
            </div>

            <button onClick={handleLogout}
              className="w-full bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2 text-sm">
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </main>

      {/* Customer gets bottom nav */}
      {!isProvider && !isAdmin && <BottomNav />}
    </div>
  );
}