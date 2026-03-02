import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { getPlatformStats } from '../../services/adminService';
import { Users, Building2, Calendar, DollarSign, TrendingUp, UserCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        getPlatformStats().then(setStats);
    }, []);

    const statCards = stats ? [
        { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'bg-blue-50 text-blue-600' },
        { label: 'Total Providers', value: stats.totalProviders, icon: Building2, color: 'bg-teal-50 text-teal-600' },
        { label: 'Pending', value: stats.pendingProviders, icon: UserCheck, color: 'bg-amber-50 text-amber-600' },
        { label: 'Bookings', value: stats.totalBookings, icon: Calendar, color: 'bg-emerald-50 text-emerald-600' },
        { label: 'Revenue (KSh)', value: stats.revenue?.toLocaleString(), icon: DollarSign, color: 'bg-indigo-50 text-indigo-600' },
        { label: 'Growth', value: '+12%', icon: TrendingUp, color: 'bg-pink-50 text-pink-600' },
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
                                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">{stat.label}</p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
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
                    </div>
                </div>
            </main>
        </div>
    );
}
