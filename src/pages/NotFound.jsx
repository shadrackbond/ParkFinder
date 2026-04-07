import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, SearchX } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotFound() {
    const navigate = useNavigate();
    const { currentUser, userRole } = useAuth();
    
    const handleHome = () => {
        if (!currentUser) return navigate('/customer/login');
        if (userRole === 'admin') return navigate('/admin');
        if (userRole === 'provider') return navigate('/provider');
        return navigate('/app');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center page-enter">
            <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <SearchX className="w-12 h-12 text-teal-600" />
            </div>
            
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">404</h1>
            <p className="text-lg font-semibold text-gray-700 mb-1">Page not found</p>
            <p className="text-sm text-gray-500 mb-8 max-w-xs mx-auto leading-relaxed">
                Sorry, we couldn&apos;t find the page you&apos;re looking for. It might have been moved or doesn&apos;t exist.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
                <button 
                    onClick={() => navigate(-1)}
                    className="flex-1 bg-white border border-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition active:scale-[0.98]"
                >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
                
                <button 
                    onClick={handleHome}
                    className="flex-1 bg-teal-600 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-teal-700 transition shadow-sm hover:shadow-md active:scale-[0.98]"
                >
                    <Home className="w-4 h-4" /> Home
                </button>
            </div>
        </div>
    );
}
