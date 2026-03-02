import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import ApprovalCard from '../../components/admin/ApprovalCard';
import { getPendingProviders, approveProvider, rejectProvider } from '../../services/adminService';
import { Loader2, Inbox } from 'lucide-react';

export default function ApprovalQueue() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => { loadProviders(); }, []);

    async function loadProviders() {
        setLoading(true);
        const data = await getPendingProviders();
        setProviders(data);
        setLoading(false);
    }

    async function handleApprove(providerId) {
        try {
            setActionLoading(true);
            await approveProvider(providerId);
            setProviders((p) => p.filter((x) => x.id !== providerId));
        } catch (err) { console.error(err); }
        finally { setActionLoading(false); }
    }

    async function handleReject(providerId) {
        try {
            setActionLoading(true);
            await rejectProvider(providerId);
            setProviders((p) => p.filter((x) => x.id !== providerId));
        } catch (err) { console.error(err); }
        finally { setActionLoading(false); }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <AdminSidebar />
            <main className="flex-1 pb-safe lg:pb-6">
                <div className="px-5 pt-12 lg:pt-8 max-w-3xl">
                    <div className="flex items-center justify-between mb-5">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Approval Queue</h1>
                            <p className="text-gray-400 text-xs mt-0.5">{providers.length} pending</p>
                        </div>
                        <button onClick={loadProviders} className="text-indigo-600 text-xs font-semibold">Refresh</button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : providers.length === 0 ? (
                        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Inbox className="w-6 h-6 text-gray-400" />
                            </div>
                            <p className="text-gray-600 font-medium text-sm">No pending approvals</p>
                            <p className="text-gray-400 text-xs mt-1">New registrations will appear here</p>
                        </div>
                    ) : (
                        <div className="grid sm:grid-cols-2 gap-3">
                            {providers.map((p) => (
                                <ApprovalCard key={p.id} provider={p} onApprove={handleApprove} onReject={handleReject} loading={actionLoading} />
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
