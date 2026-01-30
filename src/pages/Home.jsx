import { Bell, Search, MapPin, Heart, Clock, Navigation, Map, Wallet as WalletIcon, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';

export default function Home() {
  const { currentUser } = useAuth();

  // Hardcoded data for demonstration
  const popularSpots = [
    {
      id: 1,
      name: 'Westlands Mall',
      location: 'Westlands, Nairobi',
      price: 100,
      rating: 4.8,
      available: 24,
      image: 'https://images.unsplash.com/photo-1590674899484-d5640e854abe?w=400&q=80'
    },
    {
      id: 2,
      name: 'Sarit Centre',
      location: 'Parklands, Nairobi',
      price: 150,
      rating: 4.6,
      available: 12,
      image: 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=400&q=80'
    },
    {
      id: 3,
      name: 'Garden City Mall',
      location: 'Thika Road, Nairobi',
      price: 120,
      rating: 4.7,
      available: 8,
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary px-6 pt-12 pb-8 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-100 text-sm">Welcome back,</p>
            <h1 className="text-white text-2xl font-bold">
              {currentUser?.email?.split('@')[0] || 'User'}
            </h1>
          </div>
          <button className="relative bg-white/20 backdrop-blur-sm p-3 rounded-full">
            <Bell className="w-6 h-6 text-white" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full"></span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center gap-3">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search location or parking..."
            className="flex-1 outline-none text-gray-700"
          />
          <MapPin className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-6 mt-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-3 gap-4">
          <button className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition text-center">
            <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <Navigation className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Nearby</p>
          </button>
          
          <button className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition text-center">
            <div className="bg-pink-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <Heart className="w-6 h-6 text-pink-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Favorites</p>
          </button>
          
          <button className="bg-white rounded-2xl p-4 shadow-md hover:shadow-lg transition text-center">
            <div className="bg-amber-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
            <p className="text-sm font-semibold text-gray-700">Recent</p>
          </button>
        </div>
      </div>

      {/* Popular Parking Spots */}
      <div className="px-6 mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Popular Spots</h2>
          <button className="text-primary text-sm font-semibold">See All</button>
        </div>

        <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-2">
          {popularSpots.map((spot) => (
            <div 
              key={spot.id} 
              className="flex-shrink-0 w-72 bg-white rounded-2xl shadow-lg overflow-hidden"
            >
              <div className="relative h-40">
                <img 
                  src={spot.image} 
                  alt={spot.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                  <p className="text-sm font-bold text-gray-800">
                    KSh {spot.price}<span className="text-xs text-gray-600">/hr</span>
                  </p>
                </div>
              </div>
              
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-1">{spot.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
                  <MapPin className="w-4 h-4" />
                  {spot.location}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-amber-500 font-semibold">★ {spot.rating}</span>
                    <span className="text-green-600 font-semibold">
                      {spot.available} slots
                    </span>
                  </div>
                  
                  <button className="bg-primary hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold transition shadow-md">
                    Book
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Promotional Banner */}
      <div className="px-6 mt-8">
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl p-6 shadow-lg">
          <h3 className="text-white font-bold text-lg mb-2">First Time Bonus!</h3>
          <p className="text-white/90 text-sm mb-4">
            Get 20% off your first booking. Use code: PARK20
          </p>
          <button className="bg-white text-orange-600 px-6 py-2 rounded-xl font-semibold hover:shadow-lg transition">
            Claim Offer
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}