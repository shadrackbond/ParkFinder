import { memo, useCallback } from 'react';
import { Home, Calendar, Receipt, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const navItems = [
  { name: 'Home', icon: Home, path: '/app' },
  { name: 'Bookings', icon: Calendar, path: '/bookings' },
  { name: 'History', icon: Receipt, path: '/history' },
  { name: 'Profile', icon: User, path: '/profile' },
];

export default memo(function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = useCallback((path) => {
    navigate(path);
  }, [navigate]);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#1E1E1E]/95 backdrop-blur-xl border-t border-gray-100 dark:border-gray-700 z-40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around max-w-md mx-auto px-2 py-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <button
              key={item.name}
              onClick={() => handleNav(item.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all will-change-transform min-w-[64px] ${isActive
                  ? 'text-teal-600 dark:text-teal-400'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-[10px] font-semibold ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-gray-400'}`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
});