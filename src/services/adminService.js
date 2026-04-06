/**
 * adminService.js — Admin Operations
 *
 * Handles provider approval workflow, user management, lot management,
 * and platform analytics.
 */

import { collection, query, where, getDocs, orderBy, limit as fbLimit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { updateProviderStatus } from './userService';
import { setLotActive, fetchAllLots, deleteLot as deleteLotFromService } from './parkingService';

/**
 * Get all providers with 'pending' status.
 */
export async function getPendingProviders() {
    try {
        // Query only by role to avoid requiring a composite index in Firestore
        const q = query(
            collection(db, 'users'),
            where('role', '==', 'provider')
        );
        const snapshot = await getDocs(q);
        const providers = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        // Filter by status locally
        return providers.filter(p => p.status === 'pending');
    } catch (err) {
        console.error('Failed to fetch pending providers:', err);
        return [];
    }
}

/**
 * Approve a pending provider — sets user status to 'active'.
 * Also activates the provider's parking lot so it appears in the customer feed.
 */
export async function approveProvider(providerId) {
    await updateProviderStatus(providerId, 'active');
    await setLotActive(providerId, true);
}

/**
 * Reject a pending provider — sets user status to 'rejected' and
 * ensures the parking-lots doc isActive is false.
 */
export async function rejectProvider(providerId, reason = '') {
    await updateProviderStatus(providerId, 'rejected');
    await setLotActive(providerId, false);
}

/**
 * Get all users with optional role filter.
 */
export async function getAllUsers(roleFilter = null) {
    try {
        let q;
        if (roleFilter) {
            q = query(collection(db, 'users'), where('role', '==', roleFilter));
        } else {
            q = query(collection(db, 'users'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    } catch (err) {
        console.error('Failed to fetch users:', err);
        return [];
    }
}

/**
 * Get all parking lots (active + inactive) — for admin management.
 */
export async function getAllLots() {
    return fetchAllLots();
}

/**
 * Delete a provider's parking lot from the parking-lots collection.
 */
export async function deleteLot(providerId) {
    return deleteLotFromService(providerId);
}

/**
 * Toggle a parking lot's active status (e.g. approving it after setup).
 */
export async function toggleLotStatus(providerId, isActive) {
    return setLotActive(providerId, isActive);
}

/**
 * Get platform-wide stats for admin dashboard.
 */
export async function getPlatformStats() {
    try {
        const [usersSnap, bookingsSnap, activeLotsSnap] = await Promise.all([
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'bookings')).catch(() => ({ docs: [], size: 0 })),
            getDocs(query(collection(db, 'parking-lots'), where('isActive', '==', true))).catch(() => ({ size: 0 })),
        ]);

        const users = usersSnap.docs.map((d) => d.data());
        const providers = users.filter((u) => u.role === 'provider');
        const pending = providers.filter((u) => u.status === 'pending');
        const bookings = bookingsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const activeLots = activeLotsSnap.size || 0;

        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

        let revenue = 0;
        let todayRevenue = 0;
        let weekRevenue = 0;
        let monthRevenue = 0;
        let paidBookings = 0;

        const recentRevenue = bookings
            .filter(isRevenueBooking)
            .map((booking) => {
                const createdAt = toDateObj(booking.createdAt) || toDateObj(booking.updatedAt) || new Date();
                const amount = getBookingAmount(booking);

                revenue += amount;
                paidBookings += 1;

                if (createdAt >= startOfToday) todayRevenue += amount;
                if (createdAt >= sevenDaysAgo) weekRevenue += amount;
                if (createdAt >= thirtyDaysAgo) monthRevenue += amount;

                return {
                    id: booking.id,
                    lotName: booking.lotName || 'Parking',
                    plateNumber: booking.plateNumber || 'N/A',
                    amount,
                    status: booking.status || 'unknown',
                    paymentReceipt: booking.paymentReceipt || null,
                    createdAt,
                    timeLabel: formatTimeLabel(createdAt),
                };
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 5);

        return {
            totalUsers: users.length,
            totalProviders: providers.length,
            pendingProviders: pending.length,
            activeLots,
            totalBookings: bookingsSnap.size || 0,
            revenue,
            revenueSummary: {
                today: todayRevenue,
                week: weekRevenue,
                month: monthRevenue,
                allTime: revenue,
            },
            revenueMeta: {
                paidBookings,
                averageBookingValue: paidBookings ? Math.round(revenue / paidBookings) : 0,
            },
            recentRevenue,
        };
    } catch (err) {
        console.error('Failed to get platform stats:', err);
        return {
            totalUsers: 0,
            totalProviders: 0,
            pendingProviders: 0,
            activeLots: 0,
            totalBookings: 0,
            revenue: 0,
            revenueSummary: { today: 0, week: 0, month: 0, allTime: 0 },
            revenueMeta: { paidBookings: 0, averageBookingValue: 0 },
            recentRevenue: [],
        };
    }
}

/* ──────────────────────────────────────────────
 * Analytics helpers for the admin analytics page
 * ────────────────────────────────────────────── */

function toDateObj(ts) {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    if (ts.seconds) return new Date(ts.seconds * 1000);
    if (typeof ts === 'string' || typeof ts === 'number') return new Date(ts);
    return null;
}

function dayKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDayLabel(key) {
    const [, m, d] = key.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

function getBookingAmount(booking) {
    return Number(booking?.amount ?? booking?.totalPrice ?? 0) || 0;
}

function isRevenueBooking(booking) {
    return new Set(['confirmed', 'checked-in', 'completed', 'active']).has(booking?.status);
}

function formatTimeLabel(date) {
    return date.toLocaleTimeString('en-KE', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

/**
 * Fetch comprehensive analytics data for the admin analytics page.
 * Returns bookings-over-time, revenue-over-time, lot rankings, user growth,
 * payment status breakdown, and period summaries.
 */
export async function getAnalyticsData() {
    try {
        const [bookingsSnap, usersSnap, lotsSnap] = await Promise.all([
            getDocs(collection(db, 'bookings')),
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'parking-lots')),
        ]);

        const bookings = bookingsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        const lots = lotsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const now = new Date();
        const todayStr = dayKey(now);
        const yesterdayStr = dayKey(new Date(now.getTime() - 86400000));
        const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

        // ── Revenue period summaries ──
        let todayRevenue = 0, weekRevenue = 0, monthRevenue = 0, allTimeRevenue = 0;
        const revenueStatuses = new Set(['confirmed', 'completed', 'active']);

        bookings.forEach(b => {
            const amt = b.amount || b.totalPrice || 0;
            if (!revenueStatuses.has(b.status)) return;
            allTimeRevenue += amt;
            const created = toDateObj(b.createdAt);
            if (!created) return;
            if (dayKey(created) === todayStr) todayRevenue += amt;
            if (created >= sevenDaysAgo) weekRevenue += amt;
            if (created >= thirtyDaysAgo) monthRevenue += amt;
        });

        // ── Bookings over last 30 days ──
        const dailyBookings = {};
        const dailyRevenue = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 86400000);
            const key = dayKey(d);
            dailyBookings[key] = 0;
            dailyRevenue[key] = 0;
        }
        bookings.forEach(b => {
            const created = toDateObj(b.createdAt);
            if (!created) return;
            const key = dayKey(created);
            if (key in dailyBookings) {
                dailyBookings[key]++;
                if (revenueStatuses.has(b.status)) {
                    dailyRevenue[key] += b.amount || b.totalPrice || 0;
                }
            }
        });

        const bookingsTimeSeries = Object.entries(dailyBookings).map(([key, count]) => ({
            date: key,
            label: formatDayLabel(key),
            bookings: count,
            revenue: dailyRevenue[key] || 0,
        }));

        // ── Top lots by revenue ──
        const lotRevenueMap = {};
        const lotBookingCountMap = {};
        bookings.forEach(b => {
            if (!b.lotId) return;
            if (!lotRevenueMap[b.lotId]) { lotRevenueMap[b.lotId] = 0; lotBookingCountMap[b.lotId] = 0; }
            lotBookingCountMap[b.lotId]++;
            if (revenueStatuses.has(b.status)) {
                lotRevenueMap[b.lotId] += b.amount || b.totalPrice || 0;
            }
        });

        const lotMap = {};
        lots.forEach(l => { lotMap[l.id] = l; });

        const topLots = Object.entries(lotRevenueMap)
            .map(([lotId, revenue]) => ({
                lotId,
                name: lotMap[lotId]?.businessName || 'Unknown Lot',
                location: lotMap[lotId]?.businessLocation || '',
                revenue,
                bookings: lotBookingCountMap[lotId] || 0,
                avgValue: lotBookingCountMap[lotId] ? Math.round(revenue / lotBookingCountMap[lotId]) : 0,
                capacity: lotMap[lotId]?.capacity || 0,
                isActive: lotMap[lotId]?.isActive || false,
            }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);

        // ── Occupancy per active lot ──
        const activeStatuses = new Set(['reserved-pending', 'confirmed', 'active']);
        const activeBookingsByLot = {};
        bookings.forEach(b => {
            if (!b.lotId || !activeStatuses.has(b.status)) return;
            activeBookingsByLot[b.lotId] = (activeBookingsByLot[b.lotId] || 0) + 1;
        });

        const occupancyData = lots
            .filter(l => l.isActive && l.capacity > 0)
            .map(l => ({
                name: l.businessName || 'Unknown',
                occupied: activeBookingsByLot[l.id] || 0,
                capacity: l.capacity,
                rate: Math.min(100, Math.round(((activeBookingsByLot[l.id] || 0) / l.capacity) * 100)),
            }))
            .sort((a, b) => b.rate - a.rate);

        // ── User growth last 30 days ──
        const dailyCustomers = {};
        const dailyProviders = {};
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 86400000);
            const key = dayKey(d);
            dailyCustomers[key] = 0;
            dailyProviders[key] = 0;
        }
        users.forEach(u => {
            const created = toDateObj(u.createdAt);
            if (!created) return;
            const key = dayKey(created);
            if (key in dailyCustomers) {
                if (u.role === 'provider') dailyProviders[key]++;
                else dailyCustomers[key]++;
            }
        });

        const userGrowthSeries = Object.keys(dailyCustomers).map(key => ({
            date: key,
            label: formatDayLabel(key),
            customers: dailyCustomers[key],
            providers: dailyProviders[key],
        }));

        // ── Payment status breakdown ──
        let paySuccess = 0, payPending = 0, payFailed = 0;
        bookings.forEach(b => {
            if (b.paymentStatus === 'success') paySuccess++;
            else if (b.paymentStatus === 'failed') payFailed++;
            else payPending++;
        });

        // ── Booking status breakdown ──
        const statusCounts = {};
        bookings.forEach(b => {
            statusCounts[b.status || 'unknown'] = (statusCounts[b.status || 'unknown'] || 0) + 1;
        });

        // ── Today vs Yesterday comparison ──
        let todayBookings = 0, yesterdayBookings = 0;
        let yesterdayRevenue = 0;
        bookings.forEach(b => {
            const created = toDateObj(b.createdAt);
            if (!created) return;
            const key = dayKey(created);
            if (key === todayStr) todayBookings++;
            if (key === yesterdayStr) {
                yesterdayBookings++;
                if (revenueStatuses.has(b.status)) yesterdayRevenue += b.amount || b.totalPrice || 0;
            }
        });

        return {
            revenueSummary: { today: todayRevenue, week: weekRevenue, month: monthRevenue, allTime: allTimeRevenue },
            revenueTrend: { yesterday: yesterdayRevenue },
            bookingsTrend: { today: todayBookings, yesterday: yesterdayBookings },
            bookingsTimeSeries,
            topLots,
            occupancyData,
            userGrowthSeries,
            paymentBreakdown: { success: paySuccess, pending: payPending, failed: payFailed },
            statusCounts,
            totalBookings: bookings.length,
            totalUsers: users.length,
            totalLots: lots.length,
        };
    } catch (err) {
        console.error('Failed to get analytics data:', err);
        return null;
    }
}
