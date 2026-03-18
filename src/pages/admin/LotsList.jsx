import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { getAllLots, deleteLot, toggleLotStatus } from '../../services/adminService';
import { Loader2, ParkingCircle, MapPin, Trash2, Building2, CheckCircle, XCircle, Wand2 } from 'lucide-react';
import { doc, getDocs, collection, query, where, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function LotsList() {
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState(null);
    const [confirmId, setConfirmId] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    useEffect(() => { loadLots(); }, []);

    async function loadLots() {
        setLoading(true);
        const data = await getAllLots();
        setLots(data);
        setLoading(false);
    }

    async function handleDelete(providerId) {
        try {
            setDeletingId(providerId);
            await deleteLot(providerId);
            setLots((prev) => prev.filter((l) => l.id !== providerId));
            setConfirmId(null);
        } catch (err) {
            console.error('Failed to delete lot:', err);
        } finally {
            setDeletingId(null);
        }
    }

    async function handleToggleActive(providerId, currentStatus) {
        try {
            setTogglingId(providerId);
            await toggleLotStatus(providerId, !currentStatus);
            setLots((prev) => prev.map((l) => l.id === providerId ? { ...l, isActive: !currentStatus } : l));
        } catch (err) {
            console.error('Failed to toggle lot status:', err);
        } finally {
            setTogglingId(null);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <AdminSidebar />
            <main className="flex-1 pb-safe lg:pb-6">
                <div className="px-5 pt-12 lg:pt-8 max-w-4xl">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Parking Lots</h1>
                            <p className="text-gray-400 text-xs mt-0.5">{lots.length} total lots</p>
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={async () => {
                                    const q = query(collection(db, 'parking-lots'), where('businessName', '==', 'Prism Tower Parking'));
                                    const snap = await getDocs(q);
                                    for (const d of snap.docs) {
                                        await updateDoc(d.ref, { openTime: '07:00', closeTime: '21:00' });
                                    }
                                    alert('Prism Tower Updated to 7am-9pm!');
                                    loadLots();
                                }}
                                className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition"
                            >
                                <Wand2 className="w-3.5 h-3.5" /> Fix Prism Hours
                            </button>
                            <button onClick={loadLots} className="text-indigo-600 text-xs font-semibold">Refresh</button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : lots.length === 0 ? (
                        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <ParkingCircle className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-600 font-medium text-sm">No lots registered yet</p>
                            <p className="text-gray-400 text-xs mt-1">Lots will appear here once providers register</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {lots.map((lot) => (
                                <div key={lot.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                                    <div className="flex gap-4 p-4">
                                        {/* Thumbnail */}
                                        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                            {lot.businessImage || lot.lotImages?.[0] ? (
                                                <img
                                                    src={lot.businessImage || lot.lotImages[0]}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Building2 className="w-6 h-6 text-gray-300" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-sm truncate">
                                                        {lot.businessName || 'Unnamed Lot'}
                                                    </h3>
                                                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">{lot.businessLocation || '—'}</span>
                                                    </p>
                                                </div>
                                                {/* Status badge */}
                                                <span className={`flex-shrink-0 flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                    lot.isActive
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                    {lot.isActive
                                                        ? <><CheckCircle className="w-3 h-3" /> Active</>
                                                        : <><XCircle className="w-3 h-3" /> Inactive</>
                                                    }
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-3 mt-2 text-xs">
                                                <span className="text-gray-500">
                                                    <span className="font-semibold text-gray-900">{lot.capacity || 0}</span> spaces
                                                </span>
                                                <span className="text-gray-300">·</span>
                                                <span className="text-gray-500">
                                                    KSh <span className="font-semibold text-gray-900">{lot.hourlyRate || 0}</span>/hr
                                                </span>
                                                <span className="text-gray-300">·</span>
                                                <span className="text-gray-500">
                                                    {lot.lotImages?.length || 0} photo{lot.lotImages?.length !== 1 ? 's' : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Delete confirmation or button */}
                                    {confirmId === lot.id ? (
                                        <div className="bg-red-50 border-t border-red-100 px-4 py-3 flex items-center justify-between">
                                            <p className="text-red-700 text-xs font-medium">
                                                Delete "{lot.businessName || 'this lot'}"? This cannot be undone.
                                            </p>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setConfirmId(null)}
                                                    className="text-gray-500 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white border border-gray-200"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(lot.id)}
                                                    disabled={deletingId === lot.id}
                                                    className="text-white text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {deletingId === lot.id ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3 h-3" />
                                                    )}
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="border-t border-gray-50 px-4 py-2.5 flex justify-end gap-4">
                                            <button
                                                onClick={() => handleToggleActive(lot.id, lot.isActive)}
                                                disabled={togglingId === lot.id}
                                                className={`flex items-center gap-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                                                    lot.isActive ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                                                }`}
                                            >
                                                {togglingId === lot.id ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : lot.isActive ? (
                                                    <><XCircle className="w-3.5 h-3.5" /> Deactivate Lot</>
                                                ) : (
                                                    <><CheckCircle className="w-3.5 h-3.5" /> Approve / Activate Lot</>
                                                )}
                                            </button>

                                            <button
                                                onClick={() => setConfirmId(lot.id)}
                                                className="flex items-center gap-1.5 text-red-500 hover:text-red-700 text-xs font-semibold transition"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Delete Lot
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
