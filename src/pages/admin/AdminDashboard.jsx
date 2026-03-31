import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { getPlatformStats } from '../../services/adminService';
import { Users, Building2, Calendar, DollarSign, UserCheck, ParkingCircle, Receipt, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        getPlatformStats().then(setStats);
    }, []);

    const currency = (value) => `KSh ${Number(value || 0).toLocaleString()}`;

    const statCards = stats ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: 'Total Providers', value: stats.totalProviders, icon: Building2, color: 'bg-teal-50 text-teal-600' },
        { label: 'Pending', value: stats.pendingProviders, icon: UserCheck, color: 'bg-amber-50 text-amber-600' },
        { label: 'Active Lots', value: stats.activeLots, icon: ParkingCircle, color: 'bg-purple-50 text-purple-600' },
        { label: 'Bookings', value: stats.totalBookings, icon: Calendar, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Revenue (KSh)', value: stats.revenue?.toLocaleString(), icon: DollarSign, color: 'bg-indigo-50 text-indigo-600' },
    ] : [];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <AdminSidebar />
            <main className="flex-1 pb-safe lg:pb-6">
                <div className="px-5 pt-12 lg:pt-8 max-w-5xl">
                    <div className="mb-6">
                        <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p className="text-gray-400 text-xs mt-0.5">Platform overview</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 mb-6">
                        {statCards.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${stat.color}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <p className="text-xl font-bold text-gray-900">{stat.value ?? '—'}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
                        <div className="flex items-start justify-between gap-4 mb-5">
                            <div>
                                <h2 className="text-sm font-bold text-gray-900">Revenue Overview</h2>
                                <p className="text-gray-400 text-xs mt-0.5">Live earnings summary from successful booking flow states</p>
                            </div>
                            <button
                                onClick={() => navigate('/admin/analytics')}
                                className="text-indigo-600 text-xs font-semibold"
                            >
                                View Analytics
                            </button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
                            <div className="rounded-xl bg-emerald-50 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Today</p>
                                <p className="text-lg font-bold text-emerald-950 mt-1">{currency(stats?.revenueSummary?.today)}</p>
                            </div>
                            <div className="rounded-xl bg-blue-50 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">Last 7 Days</p>
                                <p className="text-lg font-bold text-blue-950 mt-1">{currency(stats?.revenueSummary?.week)}</p>
                            </div>
                            <div className="rounded-xl bg-amber-50 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">Last 30 Days</p>
                                <p className="text-lg font-bold text-amber-950 mt-1">{currency(stats?.revenueSummary?.month)}</p>
                            </div>
                            <div className="rounded-xl bg-indigo-50 p-4">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">All Time</p>
                                <p className="text-lg font-bold text-indigo-950 mt-1">{currency(stats?.revenueSummary?.allTime)}</p>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4">
                            <div className="rounded-xl border border-gray-100 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <Wallet className="w-4 h-4 text-gray-700" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">Revenue Details</h3>
                                        <p className="text-[10px] text-gray-400">Computed from confirmed, checked-in, completed, and legacy active bookings</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-gray-50 px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Paid Bookings</p>
                                        <p className="text-base font-bold text-gray-900 mt-1">{stats?.revenueMeta?.paidBookings ?? 0}</p>
                                    </div>
                                    <div className="rounded-lg bg-gray-50 px-3 py-3">
                                        <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold">Avg. Booking Value</p>
                                        <p className="text-base font-bold text-gray-900 mt-1">{currency(stats?.revenueMeta?.averageBookingValue)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-gray-100 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                        <Receipt className="w-4 h-4 text-gray-700" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-900">Recent Revenue</h3>
                                        <p className="text-[10px] text-gray-400">Latest revenue-contributing bookings</p>
                                    </div>
                                </div>

                                {stats?.recentRevenue?.length ? (
                                    <div className="space-y-3">
                                        {stats.recentRevenue.map((item) => (
                                            <div key={item.id} className="flex items-center justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold text-gray-900 truncate">{item.lotName}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">
                                                        {item.plateNumber} • {item.timeLabel}{item.paymentReceipt ? ` • ${item.paymentReceipt}` : ''}
                                                    </p>
                                                </div>
                                                <p className="text-sm font-bold text-emerald-600 flex-shrink-0">{currency(item.amount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-lg bg-gray-50 px-3 py-6 text-center">
                                        <p className="text-xs text-gray-500">No revenue activity yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-3">
                        <button onClick={() => navigate('/admin/approvals')}
                            className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-card-hover transition text-left group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                                    <UserCheck className="w-5 h-5 text-amber-600" />
                                </div>
                                <div>
                                    <h3 className="text-gray-900 font-semibold text-sm group-hover:text-indigo-600 transition">Approval Queue</h3>
                                    <p className="text-gray-400 text-xs">{stats?.pendingProviders || 0} pending</p>
                                </div>
                            </div>
                        </button>
                        <button onClick={() => navigate('/admin/users')}
                            className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-card-hover transition text-left group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-gray-900 font-semibold text-sm group-hover:text-indigo-600 transition">User Manager</h3>
                                    <p className="text-gray-400 text-xs">{stats?.totalUsers || 0} users</p>
                                </div>
                            </div>
                        </button>
                        <button onClick={() => navigate('/admin/lots')}
                            className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-card-hover transition text-left group">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                                    <ParkingCircle className="w-5 h-5 text-purple-600" />
                                </div>
                                <div>
                                    <h3 className="text-gray-900 font-semibold text-sm group-hover:text-indigo-600 transition">Manage Lots</h3>
                                    <p className="text-gray-400 text-xs">{stats?.activeLots || 0} active</p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
