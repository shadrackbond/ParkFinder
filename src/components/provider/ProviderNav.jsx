import { LayoutDashboard, MapPin, QrCode, LogOut, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProviderNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout } = useAuth();

    const navItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/provider' },
        { name: 'My Lot', icon: MapPin, path: '/provider/lots' },
        { name: 'Scanner', icon: QrCode, path: '/provider/scanner' },
        { name: 'Profile', icon: User, path: '/profile' },
    ];

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    return (
        <>
            {/* Desktop sidebar */}
            <aside className="hidden lg:flex flex-col w-56 bg-white border-r border-gray-100 min-h-screen p-5">
                <div className="mb-6">
                    <h2 className="text-lg font-bold text-gray-900">ParkEase</h2>
                    <p className="text-gray-400 text-xs font-medium">Provider Portal</p>
                </div>

                <nav className="flex-1 space-y-0.5">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition ${isActive
                                    ? 'bg-teal-50 text-teal-700'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {item.name}
                            </button>
                        );
                    })}
                </nav>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2.5 text-red-500 hover:text-red-600 text-sm font-medium transition"
                >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                </button>
            </aside>

            {/* Mobile bottom nav */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1E1E1E] border-t border-gray-100 z-50"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)', boxShadow: '0 -1px 8px rgba(0,0,0,0.06)' }}>
                <div className="flex items-center justify-around px-2 py-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition min-w-[56px] ${isActive ? 'text-teal-600' : 'text-gray-400'
                                    }`}
                            >
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
