import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { getAllUsers } from '../../services/adminService';
import { Loader2, Search, Users, User, Building2, Shield } from 'lucide-react';

export default function UserManager() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState(null);

    useEffect(() => {
        setLoading(true);
        getAllUsers(roleFilter).then((d) => { setUsers(d); setLoading(false); });
    }, [roleFilter]);

    const filtered = searchQuery
        ? users.filter((u) =>
            (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (u.businessName || '').toLowerCase().includes(searchQuery.toLowerCase())
        )
        : users;

    const roleIcon = { customer: User, provider: Building2, admin: Shield };
    const roleBadge = { customer: 'bg-teal-50 text-teal-700', provider: 'bg-indigo-50 text-indigo-700', admin: 'bg-purple-50 text-purple-700' };
    const statusBadge = { active: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700', rejected: 'bg-red-50 text-red-600' };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <AdminSidebar />
            <main className="flex-1 pb-safe lg:pb-6">
                <div className="px-5 pt-12 lg:pt-8 max-w-5xl">
                    <div className="mb-5">
                        <h1 className="text-xl font-bold text-gray-900">User Manager</h1>
                        <p className="text-gray-400 text-xs mt-0.5">{filtered.length} users</p>
                    </div>

                    {/* Search + Filters */}
                    <div className="flex flex-col sm:flex-row gap-2 mb-5">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm placeholder-gray-400" placeholder="Search..." />
                        </div>
                        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
                            {[null, 'customer', 'provider', 'admin'].map((role) => (
                                <button key={role || 'all'} onClick={() => setRoleFilter(role)}
                                    className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition ${roleFilter === role ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'
                                        }`}>
                                    {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'All'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                            <Users className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                            <p className="text-gray-600 text-sm font-medium">No users found</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map((user) => {
                                const RoleIcon = roleIcon[user.role] || User;
                                return (
                                    <div key={user.id} className="bg-white rounded-xl px-4 py-3 border border-gray-100 flex items-center gap-3">
                                        <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <RoleIcon className="w-4 h-4 text-gray-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-gray-900 font-medium text-sm truncate">{user.displayName || user.businessName || 'User'}</p>
                                            <p className="text-gray-400 text-[10px] truncate">{user.email}</p>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 ${roleBadge[user.role] || roleBadge.customer}`}>
                                            {user.role}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 ${statusBadge[user.status] || statusBadge.active}`}>
                                            {user.status || 'active'}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
