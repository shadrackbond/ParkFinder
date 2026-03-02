import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProviderNav from '../../components/provider/ProviderNav';
import { TrendingUp, Car, DollarSign, Shield, MapPin, ParkingCircle } from 'lucide-react';

export default function ProviderDashboard() {
    const { userProfile } = useAuth();
    const navigate = useNavigate();
    const isPending = userProfile?.status === 'pending';
    const hasLotSetup = userProfile?.capacity && userProfile?.hourlyRate;

    const stats = [
        { label: 'Today\'s Bookings', value: '0', icon: Car, color: 'bg-blue-50 text-blue-600' },
        { label: 'Revenue (KSh)', value: '0', icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Occupancy', value: hasLotSetup ? '0%' : '—', icon: TrendingUp, color: 'bg-teal-50 text-teal-600' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <ProviderNav />
            <main className="flex-1 pb-safe lg:pb-6">
                <div className="px-5 pt-12 lg:pt-8 max-w-2xl">
                    <div className="mb-6">
                        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
                        <p className="text-gray-400 text-xs mt-0.5">
                            Welcome, {userProfile?.displayName || 'Provider'}
                        </p>
                    </div>

                    {/* Pending Banner */}
                    {isPending && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-5 flex items-start gap-3">
                            <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-amber-800 font-semibold text-sm">Account Pending Approval</h3>
                                <p className="text-amber-600 text-xs mt-0.5">
                                    Your account is under review. Most features are available after approval.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2.5 mb-6">
                        {stats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* My Lot Preview */}
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-gray-900">My Lot</h2>
                            <button onClick={() => navigate('/provider/lots')} className="text-teal-600 text-xs font-semibold">
                                {hasLotSetup ? 'Edit' : 'Set Up'}
                            </button>
                        </div>

                        {hasLotSetup ? (
                            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
                                {userProfile?.businessImage ? (
                                    <div className="h-32 overflow-hidden">
                                        <img src={userProfile.businessImage} alt={userProfile.businessName}
                                            className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="h-20 bg-gray-50 flex items-center justify-center">
                                        <ParkingCircle className="w-8 h-8 text-gray-300" />
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="text-gray-900 font-bold text-sm">{userProfile?.businessName}</h3>
                                    <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" /> {userProfile?.businessLocation}
                                    </p>
                                    <div className="flex items-center gap-3 mt-3 text-xs">
                                        <span className="bg-gray-50 px-2.5 py-1 rounded-lg text-gray-600 font-medium">
                                            {userProfile?.capacity} spaces
                                        </span>
                                        <span className="bg-teal-50 px-2.5 py-1 rounded-lg text-teal-700 font-medium">
                                            KSh {userProfile?.hourlyRate}/hr
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => navigate('/provider/lots')}
                                className="w-full bg-white rounded-2xl p-6 border-2 border-dashed border-gray-200 text-center hover:border-teal-300 transition">
                                <ParkingCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-gray-600 font-medium text-sm">Set up your parking lot</p>
                                <p className="text-gray-400 text-xs mt-1">Add capacity and rate to go live</p>
                            </button>
                        )}
                    </div>

                    {/* Activity */}
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 mb-3">Recent Activity</h2>
                        <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
                            <p className="text-gray-400 text-xs">No activity yet. Bookings will appear here.</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
