import { ArrowLeft, Mail, Phone, MessageCircle } from 'lucide-react';
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
        {/* Contact Methods */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Contact Us</h2>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <a href="mailto:support@parkfinder.com" className="flex items-center gap-4 p-4 hover:bg-gray-50 transition border-b border-gray-50">
              <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Email Support</p>
                <p className="text-xs text-gray-500 mt-0.5">support@parkfinder.com</p>
              </div>
            </a>
            
            <a href="tel:+254700000000" className="flex items-center gap-4 p-4 hover:bg-gray-50 transition border-b border-gray-50">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Call Us</p>
                <p className="text-xs text-gray-500 mt-0.5">+254 700 000 000</p>
              </div>
            </a>

            <button className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition text-left">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Live Chat</p>
                <p className="text-xs text-gray-500 mt-0.5">Typically replies in minutes</p>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
