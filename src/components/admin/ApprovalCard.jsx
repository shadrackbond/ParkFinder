import { Building2, MapPin, Phone, Mail, Clock, CheckCircle, XCircle, ImageOff } from 'lucide-react';

export default function ApprovalCard({ provider, onApprove, onReject, loading }) {
    const formatDate = (date) => {
        if (!date) return '';
        const d = date instanceof Date ? date : new Date(date?.seconds ? date.seconds * 1000 : date);
        return d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <div className="bg-white rounded-2xl overflow-hidden border border-gray-100">
            {/* Business Image */}
            {provider.businessImage ? (
                <div className="h-32 overflow-hidden">
                    <img src={provider.businessImage} alt={provider.businessName} className="w-full h-full object-cover" />
                </div>
            ) : (
                <div className="h-20 bg-gray-50 flex items-center justify-center">
                    <ImageOff className="w-6 h-6 text-gray-300" />
                </div>
            )}

            <div className="p-4">
                <h3 className="text-gray-900 font-bold text-sm mb-2">{provider.businessName || 'Unnamed Business'}</h3>
                <div className="space-y-1.5 mb-4">
                    <p className="text-gray-500 text-xs flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 flex-shrink-0" />{provider.businessLocation || 'No location'}
                    </p>
                    <p className="text-gray-500 text-xs flex items-center gap-1.5">
                        <Mail className="w-3 h-3 flex-shrink-0" />{provider.email}
                    </p>
                    <p className="text-gray-500 text-xs flex items-center gap-1.5">
                        <Phone className="w-3 h-3 flex-shrink-0" />{provider.phone || 'No phone'}
                    </p>
                    <p className="text-gray-400 text-[10px] flex items-center gap-1.5">
                        <Clock className="w-3 h-3 flex-shrink-0" />Applied {formatDate(provider.createdAt)}
                    </p>
                </div>

                <div className="flex gap-2">
                    <button onClick={() => onApprove?.(provider.id)} disabled={loading}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => onReject?.(provider.id)} disabled={loading}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 py-2 rounded-lg text-xs font-semibold transition disabled:opacity-50">
                        <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                </div>
            </div>
        </div>
    );
}
