import BottomNav from '../components/common/BottomNav';

export default function Bookings() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">My Bookings</h1>
        <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
          <p className="text-gray-500">Coming soon...</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}