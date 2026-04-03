import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HelpSupport() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-600 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Help & Support</h1>
      </div>

      <div className="flex-1 px-5 py-6 max-w-lg mx-auto w-full space-y-6 page-enter">
        {/* We will add sections here in future steps */}
        <p className="text-center text-sm text-gray-500 mt-10">Help content goes here...</p>
      </div>
    </div>
  );
}
