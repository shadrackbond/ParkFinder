import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ProviderNav from '../../components/provider/ProviderNav';
import { TrendingUp, Car, DollarSign, Shield, MapPin, ParkingCircle, Loader2 } from 'lucide-react';
import { getLotByProvider } from '../../services/parkingService';
import { db } from '../../config/firebase';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';

export default function ProviderDashboard() {
    const { currentUser, userProfile } = useAuth();
    const navigate = useNavigate();
    const [lot, setLot] = useState(null);
    const [loadingLot, setLoadingLot] = useState(true);

    const isPending = userProfile?.status === 'pending';

    const [bookings, setBookings] = useState([]);

    useEffect(() => {
        if (!currentUser) return;
        const ref = doc(db, 'parking-lots', currentUser.uid);
        const unsubscribe = onSnapshot(ref, (snap) => {
            if (snap.exists()) {
                setLot({ id: snap.id, ...snap.data() });
            } else {
                setLot(null);
            }
            setLoadingLot(false);
        }, (err) => {
            console.error('Snapshot err:', err);
            setLoadingLot(false);
        });
        return () => unsubscribe();
    }, [currentUser]);

    useEffect(() => {
        if (!lot?.id) return;
        const q = query(collection(db, 'bookings'), where('lotId', '==', lot.id));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).sort((a,b) => {
                const tA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const tB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return tB - tA;
            });
            setBookings(data);
        });
        return () => unsubscribe();
    }, [lot?.id]);

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

    const hasLotSetup = lot && lot.capacity > 0 && lot.hourlyRate > 0;
    const now = new Date();

    const activeBookings = bookings.filter(b => b.status === 'confirmed' || b.status === 'checked-in');
    
    // Calculate how many bookings are physically active right this minute
    const currentlyOccupied = bookings.filter(b => {
        if (b.status === 'checked-in') return true;
        if (b.status !== 'confirmed') return false;
        const dates = getBookingDates(b);
        if (!dates) return false;
        // Count it as occupied if we're past its start time but haven't hit the end time
        return now >= dates.start && now <= dates.end;
    }).length;

    const liveAvailableSpots = hasLotSetup ? Math.max(0, lot.capacity - currentlyOccupied) : 0;

    const revenue = bookings
        .filter(b => b.status === 'confirmed' || b.status === 'checked-in' || b.status === 'completed')
        .reduce((sum, b) => sum + (b.amount || 0), 0);

    const occupancyRate = hasLotSetup && lot.capacity > 0 
        ? Math.min(100, Math.round((currentlyOccupied / lot.capacity) * 100)) 
        : 0;

    const stats = [
        { label: 'Live Occupancy', value: hasLotSetup ? `${occupancyRate}%` : '—', icon: TrendingUp, color: 'bg-teal-50 text-teal-600' },
        { label: 'Total Active', value: activeBookings.length.toString(), icon: Car, color: 'bg-blue-50 text-blue-600' },
        { label: 'Total Revenue', value: revenue.toLocaleString(), icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
    ];

    function formatTimeRange(b) {
        if (!b.startTime) return '--:--';
        if (typeof b.startTime === 'string') return `${b.startTime} - ${b.endTime}`;
        if (b.startTime?.toDate) {
            const s = b.startTime.toDate().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
            const e = b.endTime?.toDate ? b.endTime.toDate().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
            return `${s} - ${e}`;
        }
        return '--:--';
    }

    function formatStatus(status) {
        if (status === 'checked-in') return 'Checked IN (On Site)';
        if (status === 'completed') return 'Checked OUT';
        if (status === 'confirmed') return 'Reserved (Not arrived)';
        if (status === 'cancelled') return 'Cancelled';
        return status;
    }

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

                    {loadingLot ? (
                        <div className="flex items-center justify-center py-10">
                            <Loader2 className="w-6 h-6 text-teal-500 animate-spin" />
                        </div>
                    ) : (
                        <>
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
                                {lot?.businessImage ? (
                                    <div className="h-32 overflow-hidden">
                                        <img src={lot.businessImage} alt={lot.businessName || 'Lot'}
                                            className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="h-20 bg-gray-50 flex items-center justify-center">
                                        <ParkingCircle className="w-8 h-8 text-gray-300" />
                                    </div>
                                )}
                                <div className="p-4">
                                    <h3 className="text-gray-900 font-bold text-sm">{lot?.businessName || 'Unnamed Lot'}</h3>
                                    <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                                        <MapPin className="w-3 h-3" /> {lot?.businessLocation || 'Location not set'}
                                    </p>
                                    <div className="flex items-center gap-3 mt-3 text-xs">
                                        <span className="bg-gray-50 px-2.5 py-1 rounded-lg text-gray-600 font-medium whitespace-nowrap">
                                            {lot?.capacity} total
                                        </span>
                                        <span className="bg-emerald-50 px-2.5 py-1 rounded-lg text-emerald-700 font-bold flex items-center gap-1.5 whitespace-nowrap">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                            {liveAvailableSpots} slots free
                                        </span>
                                        <span className="bg-teal-50 px-2.5 py-1 rounded-lg text-teal-700 font-medium ml-auto">
                                            KSh {lot?.hourlyRate}/hr
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
                    </>
                    )}

                    {/* Activity */}
                    <div>
                        <h2 className="text-sm font-bold text-gray-900 mb-3">Recent Activity</h2>
                        {bookings.length === 0 ? (
                            <div className="bg-white rounded-xl border border-gray-100 p-6 text-center">
                                <p className="text-gray-400 text-xs">No activity yet. Bookings will appear here.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {bookings.slice(0, 5).map(b => (
                                    <div key={b.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{b.plateNumber || 'Unknown Vehicle'}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">{formatTimeRange(b)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-emerald-600">KSh {b.amount || 0}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase mt-1 inline-block ${
                                                b.status === 'checked-in' ? 'bg-blue-100 text-blue-700' :
                                                b.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {formatStatus(b.status)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
