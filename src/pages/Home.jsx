import { Bell, Search, MapPin, Heart, Clock, Navigation, Star, ChevronRight, ParkingCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';
import useParkingLots from '../hooks/useParkingLots';

export default function Home() {
  const { currentUser, userProfile } = useAuth();
  const { lots, loading } = useParkingLots();

  const displayName = userProfile?.displayName
    || currentUser?.displayName
    || 'there';

  return (
    <div className="min-h-screen bg-gray-50 pb-safe page-enter">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-gray-400 text-xs font-medium">Welcome back,</p>
            <h1 className="text-gray-900 text-xl font-bold">{displayName}</h1>
          </div>
          <button className="relative bg-gray-50 p-2.5 rounded-full border border-gray-100 hover:bg-gray-100 transition">
            <Bell className="w-5 h-5 text-gray-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3 border border-gray-100">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search location or parking..."
            className="flex-1 outline-none text-gray-700 bg-transparent text-sm placeholder-gray-400"
          />
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-white" />
          </div>
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
            <button key={label} className="bg-white rounded-xl p-3.5 border border-gray-100 hover:shadow-card transition group">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-gray-700">{label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Available Parking Spots */}
      <div className="px-5 mt-6 max-w-lg">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-900">Available Parking</h2>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
            <div className="h-48 bg-gray-100" />
            <div className="p-4 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-3/4" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ) : lots.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ParkingCircle className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium text-sm">No parking spots available yet</p>
            <p className="text-gray-400 text-xs mt-1">New providers will appear here once approved</p>
          </div>
        ) : (
          <div className="space-y-4">
            {lots.map((spot) => {
              const images = spot.lotImages || (spot.imageUrl ? [spot.imageUrl] : []);

              return (
                <div key={spot.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                  {/* Image grid — same layout as provider My Lot page */}
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
                      {images.map((img, i) => (
                        <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                      ))}
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
                      {images.slice(0, 4).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-full h-full object-cover" />
                      ))}
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-gray-900 text-sm">{spot.name}</h3>
                      <span className="bg-teal-50 text-teal-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        KSh {spot.hourlyRate}/hr
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mb-3">
                      <MapPin className="w-3 h-3" /> {spot.address}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-amber-500 font-semibold flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400 stroke-amber-400" /> {spot.rating}
                        </span>
                        <span className="text-emerald-600 font-semibold">{spot.availableSpots} slots</span>
                      </div>
                      <button className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg font-semibold transition text-xs">
                        Book
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
    </div>
  );
}