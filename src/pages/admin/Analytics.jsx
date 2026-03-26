import { useState, useEffect } from 'react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import { getAnalyticsData } from '../../services/adminService';
import {
    BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
    DollarSign, TrendingUp, TrendingDown, Calendar, Loader2,
    ArrowUpRight, ArrowDownRight, Minus, Building2, Users, CreditCard,
} from 'lucide-react';

const COLORS = {
    indigo: '#6366f1',
    teal: '#14b8a6',
    emerald: '#10b981',
    amber: '#f59e0b',
    red: '#ef4444',
    blue: '#3b82f6',
    purple: '#a855f7',
    gray: '#9ca3af',
};

const PIE_COLORS = [COLORS.emerald, COLORS.amber, COLORS.red];

function TrendBadge({ current, previous, format = 'number' }) {
    if (previous === 0 && current === 0) return <span className="text-gray-400 text-[10px]">—</span>;
    if (previous === 0) return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600">
            <ArrowUpRight className="w-3 h-3" /> New
        </span>
    );
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct === 0) return (
        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-gray-400">
            <Minus className="w-3 h-3" /> 0%
        </span>
    );
    const up = pct > 0;
    return (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold ${up ? 'text-emerald-600' : 'text-red-500'}`}>
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {up ? '+' : ''}{pct}%
        </span>
    );
}

function StatCard({ label, value, icon: Icon, color, trend }) {
    return (
        <div className="bg-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-2">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-4 h-4" />
                </div>
                {trend}
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
        </div>
    );
}

function ChartCard({ title, subtitle, children, className = '' }) {
    return (
        <div className={`bg-white rounded-xl border border-gray-100 p-5 ${className}`}>
            <div className="mb-4">
                <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
            </div>
            {children}
        </div>
    );
}

function CustomTooltip({ active, payload, label, formatter }) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-100 px-3 py-2 text-xs">
            <p className="text-gray-500 font-medium mb-1">{label}</p>
            {payload.map((entry, i) => (
                <p key={i} className="font-bold" style={{ color: entry.color }}>
                    {entry.name}: {formatter ? formatter(entry.value) : entry.value}
                </p>
            ))}
        </div>
    );
}

export default function Analytics() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState(30);

    useEffect(() => {
        setLoading(true);
        getAnalyticsData().then(d => { setData(d); setLoading(false); });
    }, []);

    const filteredTimeSeries = data?.bookingsTimeSeries?.slice(-range) || [];

    const ksh = (v) => `KSh ${Number(v).toLocaleString()}`;

    const statusData = data ? Object.entries(data.statusCounts).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
        value,
    })) : [];

    const STATUS_COLORS = {
        'Active': COLORS.blue,
        'Confirmed': COLORS.teal,
        'Completed': COLORS.emerald,
        'Cancelled': COLORS.red,
        'Reserved pending': COLORS.amber,
        'Payment failed': COLORS.gray,
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <AdminSidebar />
            <main className="flex-1 pb-safe lg:pb-6 overflow-x-hidden">
                <div className="px-5 pt-12 lg:pt-8 max-w-6xl">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
                            <p className="text-gray-400 text-xs mt-0.5">Revenue, bookings &amp; platform insights</p>
                        </div>
                        {!loading && (
                            <button onClick={() => { setLoading(true); getAnalyticsData().then(d => { setData(d); setLoading(false); }); }}
                                className="text-indigo-600 text-xs font-semibold">
                                Refresh
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                        </div>
                    ) : !data ? (
                        <div className="bg-white rounded-2xl p-10 text-center border border-gray-100">
                            <p className="text-gray-600 font-medium text-sm">Failed to load analytics</p>
                            <p className="text-gray-400 text-xs mt-1">Check console for details</p>
                        </div>
                    ) : (
                        <>
                            {/* ── Revenue Summary Cards ── */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-6">
                                <StatCard
                                    label="Today's Revenue"
                                    value={ksh(data.revenueSummary.today)}
                                    icon={DollarSign}
                                    color="bg-emerald-50 text-emerald-600"
                                    trend={<TrendBadge current={data.revenueSummary.today} previous={data.revenueTrend.yesterday} />}
                                />
                                <StatCard
                                    label="This Week"
                                    value={ksh(data.revenueSummary.week)}
                                    icon={TrendingUp}
                                    color="bg-blue-50 text-blue-600"
                                />
                                <StatCard
                                    label="This Month"
                                    value={ksh(data.revenueSummary.month)}
                                    icon={Calendar}
                                    color="bg-indigo-50 text-indigo-600"
                                />
                                <StatCard
                                    label="All-Time Revenue"
                                    value={ksh(data.revenueSummary.allTime)}
                                    icon={DollarSign}
                                    color="bg-purple-50 text-purple-600"
                                />
                            </div>

                            {/* ── Quick stats row ── */}
                            <div className="grid grid-cols-3 gap-2.5 mb-6">
                                <StatCard
                                    label="Today's Bookings"
                                    value={data.bookingsTrend.today}
                                    icon={Calendar}
                                    color="bg-teal-50 text-teal-600"
                                    trend={<TrendBadge current={data.bookingsTrend.today} previous={data.bookingsTrend.yesterday} />}
                                />
                                <StatCard
                                    label="Total Users"
                                    value={data.totalUsers}
                                    icon={Users}
                                    color="bg-blue-50 text-blue-600"
                                />
                                <StatCard
                                    label="Total Bookings"
                                    value={data.totalBookings}
                                    icon={CreditCard}
                                    color="bg-amber-50 text-amber-600"
                                />
                            </div>

                            {/* ── Range toggle ── */}
                            <div className="flex gap-1.5 mb-4">
                                {[{ label: '7 Days', value: 7 }, { label: '14 Days', value: 14 }, { label: '30 Days', value: 30 }].map(opt => (
                                    <button key={opt.value} onClick={() => setRange(opt.value)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${range === opt.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {/* ── Revenue Over Time ── */}
                            <ChartCard title="Revenue Over Time" subtitle={`Last ${range} days`} className="mb-4">
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={filteredTimeSeries} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={range <= 7 ? 0 : 'preserveStartEnd'} />
                                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                                        <Tooltip content={<CustomTooltip formatter={ksh} />} />
                                        <Bar dataKey="revenue" name="Revenue" fill={COLORS.indigo} radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            {/* ── Bookings Over Time ── */}
                            <ChartCard title="Bookings Over Time" subtitle={`Last ${range} days`} className="mb-4">
                                <ResponsiveContainer width="100%" height={240}>
                                    <AreaChart data={filteredTimeSeries} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                                        <defs>
                                            <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={COLORS.teal} stopOpacity={0.2} />
                                                <stop offset="95%" stopColor={COLORS.teal} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={range <= 7 ? 0 : 'preserveStartEnd'} />
                                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Area type="monotone" dataKey="bookings" name="Bookings" stroke={COLORS.teal} fill="url(#bookingGrad)" strokeWidth={2} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            {/* ── Two-column: Payment Breakdown + Booking Status ── */}
                            <div className="grid md:grid-cols-2 gap-4 mb-4">
                                <ChartCard title="Payment Status" subtitle="All-time breakdown">
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Success', value: data.paymentBreakdown.success },
                                                    { name: 'Pending', value: data.paymentBreakdown.pending },
                                                    { name: 'Failed', value: data.paymentBreakdown.failed },
                                                ].filter(d => d.value > 0)}
                                                cx="50%" cy="50%"
                                                innerRadius={55} outerRadius={80}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {PIE_COLORS.map((color, i) => (
                                                    <Cell key={i} fill={color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v) => v} />
                                            <Legend iconType="circle" iconSize={8}
                                                formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex justify-center gap-6 mt-2 text-xs">
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-emerald-600">{data.paymentBreakdown.success}</p>
                                            <p className="text-gray-400">Paid</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-amber-500">{data.paymentBreakdown.pending}</p>
                                            <p className="text-gray-400">Pending</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-lg font-bold text-red-500">{data.paymentBreakdown.failed}</p>
                                            <p className="text-gray-400">Failed</p>
                                        </div>
                                    </div>
                                </ChartCard>

                                <ChartCard title="Booking Status" subtitle="All-time distribution">
                                    {statusData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height={220}>
                                            <PieChart>
                                                <Pie
                                                    data={statusData}
                                                    cx="50%" cy="50%"
                                                    outerRadius={80}
                                                    paddingAngle={2}
                                                    dataKey="value"
                                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                >
                                                    {statusData.map((entry, i) => (
                                                        <Cell key={i} fill={STATUS_COLORS[entry.name] || Object.values(COLORS)[i % Object.values(COLORS).length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-[220px] text-gray-400 text-xs">No bookings yet</div>
                                    )}
                                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                                        {statusData.map(s => (
                                            <span key={s.name} className="text-xs text-gray-500">
                                                <span className="font-bold text-gray-900">{s.value}</span> {s.name}
                                            </span>
                                        ))}
                                    </div>
                                </ChartCard>
                            </div>

                            {/* ── User Growth ── */}
                            <ChartCard title="User Registrations" subtitle={`Last ${range} days`} className="mb-4">
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={data.userGrowthSeries.slice(-range)} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} interval={range <= 7 ? 0 : 'preserveStartEnd'} />
                                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend iconType="circle" iconSize={8}
                                            formatter={(value) => <span className="text-xs text-gray-600">{value}</span>} />
                                        <Line type="monotone" dataKey="customers" name="Customers" stroke={COLORS.blue} strokeWidth={2} dot={false} />
                                        <Line type="monotone" dataKey="providers" name="Providers" stroke={COLORS.purple} strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            {/* ── Lot Occupancy ── */}
                            {data.occupancyData.length > 0 && (
                                <ChartCard title="Live Lot Occupancy" subtitle="Active lots — current bookings vs capacity" className="mb-4">
                                    <div className="space-y-3 mt-2">
                                        {data.occupancyData.map(lot => (
                                            <div key={lot.name}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-gray-700 truncate max-w-[60%]">{lot.name}</span>
                                                    <span className="text-[10px] text-gray-400">
                                                        {lot.occupied}/{lot.capacity} <span className={`font-bold ${lot.rate >= 80 ? 'text-red-500' : lot.rate >= 50 ? 'text-amber-500' : 'text-emerald-500'}`}>({lot.rate}%)</span>
                                                    </span>
                                                </div>
                                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all ${lot.rate >= 80 ? 'bg-red-500' : lot.rate >= 50 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                                        style={{ width: `${lot.rate}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ChartCard>
                            )}

                            {/* ── Top Lots by Revenue ── */}
                            {data.topLots.length > 0 && (
                                <ChartCard title="Top Lots by Revenue" subtitle="Ranked by total earnings" className="mb-6">
                                    <div className="overflow-x-auto -mx-5 px-5">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b border-gray-100">
                                                    <th className="text-left py-2 text-gray-400 font-medium">#</th>
                                                    <th className="text-left py-2 text-gray-400 font-medium">Lot</th>
                                                    <th className="text-right py-2 text-gray-400 font-medium">Bookings</th>
                                                    <th className="text-right py-2 text-gray-400 font-medium">Revenue</th>
                                                    <th className="text-right py-2 text-gray-400 font-medium">Avg</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.topLots.map((lot, i) => (
                                                    <tr key={lot.lotId} className="border-b border-gray-50 last:border-0">
                                                        <td className="py-2.5 text-gray-300 font-bold">{i + 1}</td>
                                                        <td className="py-2.5">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                                                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <p className="font-medium text-gray-900 truncate">{lot.name}</p>
                                                                    <p className="text-[10px] text-gray-400 truncate">{lot.location}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 text-right text-gray-600 font-medium">{lot.bookings}</td>
                                                        <td className="py-2.5 text-right font-bold text-gray-900">{ksh(lot.revenue)}</td>
                                                        <td className="py-2.5 text-right text-gray-500">{ksh(lot.avgValue)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </ChartCard>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
