import { LayoutDashboard, UserCheck, Users, LogOut, ParkingCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminSidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
        { name: 'Approvals', icon: UserCheck, path: '/admin/approvals' },
        { name: 'Users', icon: Users, path: '/admin/users' },
        { name: 'Lots', icon: ParkingCircle, path: '/admin/lots' },
    ];

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <>
            <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-100 min-h-screen p-5">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900">ParkEase</h2>
                    <p className="text-indigo-500 text-xs font-semibold">Admin Panel</p>
                </div>
                <nav className="flex-1 space-y-0.5">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <button key={item.name} onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}>
                                <Icon className="w-4 h-4" />{item.name}
                            </button>
                        );
                    })}
                </nav>
                <button onClick={handleLogout} className="flex items-center gap-2.5 px-3 py-2.5 text-red-500 text-sm font-medium">
                    <LogOut className="w-4 h-4" /> Sign Out
                </button>
            </aside>

            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-40"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
                <div className="flex items-center justify-around px-2 py-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <button key={item.name} onClick={() => navigate(item.path)}
                                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition min-w-[56px] ${isActive ? 'text-indigo-600' : 'text-gray-400'
                                    }`}>
                                <Icon className="w-5 h-5" />
                                <span className="text-[10px] font-semibold">{item.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
