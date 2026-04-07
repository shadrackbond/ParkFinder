import { ArrowLeft, Mail, Phone, MessageCircle, ChevronDown, Info, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';


const faqs = [
  {
    q: 'How do I book a parking spot?',
    a: 'Search for a lot on the main map, select an available spot, and tap "Book Now" to complete the reservation.',
  },
  {
    q: 'Can I cancel my reservation?',
    a: 'Yes, you can cancel your reservation up to 30 minutes before your scheduled arrival time for a full refund.',
  },
  {
    q: 'What payment methods are supported?',
    a: 'We support major credit cards, Mobile Money (M-Pesa), and in-app wallet balance.',
  },
  {
    q: 'How do I become a parking provider?',
    a: 'Register using the Provider sign-up option, fill in your business details, and wait for admin approval — usually within 24 hours.',
  },
];

export default function HelpSupport() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-safe">
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

        {/* FAQs */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Frequently Asked Questions</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            {faqs.map((faq, idx) => (
              <div key={idx} className="overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition"
                >
                  <span className="font-medium text-sm text-gray-800 pr-4">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 text-sm text-gray-500 leading-relaxed bg-gray-50/50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Legal Links */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Legal</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left">
              <span className="font-medium text-sm text-gray-800">Terms of Service</span>
              <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition text-left">
              <span className="font-medium text-sm text-gray-800">Privacy Policy</span>
              <ChevronDown className="w-4 h-4 text-gray-300 -rotate-90" />
            </button>
          </div>
        </section>

        {/* App Info */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">About</h2>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900">ParkFinder</p>
              <p className="text-xs text-gray-500 mt-0.5">Version 1.0.0 &middot; &copy; 2025 ParkFinder Kenya</p>
            </div>
          </div>
        </section>

        {/* Quick Tips */}
        <section>
          <h2 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Quick Tips</h2>
          <div className="space-y-2">
            {[
              { tip: 'Enable location to find nearby parking faster.' },
              { tip: 'Book in advance to secure your preferred spot.' },
              { tip: 'Check your booking history for past receipts.' },
              { tip: 'Use the QR code in your booking to check in at the lot.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-3">
                <div className="w-6 h-6 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <p className="text-sm text-gray-600">{item.tip}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

    </div>
  );
}
