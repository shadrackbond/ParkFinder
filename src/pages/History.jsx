import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import BottomNav from '../components/common/BottomNav';
import useBookings from '../hooks/useBookings';
import { ArrowUpRight, RefreshCw, Receipt, Loader2 } from 'lucide-react';

export default function History() {
  const { currentUser } = useAuth();
  const { bookings, loading } = useBookings(currentUser?.uid);

  // Derive transactions from bookings
  const transactions = bookings
    .filter((b) => b.status === 'completed' || b.status === 'active')
    .map((b) => ({
      id: b.id,
      type: b.status === 'completed' ? 'completed' : 'active',
      amount: b.amount || 0,
      description: `${b.lotName || 'Parking'} — ${b.plateNumber || 'N/A'}`,
      date: b.startTime?.toDate ? b.startTime.toDate() : new Date(b.startTime || Date.now()),
      lotImage: b.lotImage || '',
      paymentReceipt: b.paymentReceipt || null
    }));

  // Group by date
  const { today, yesterday } = useMemo(() => {
    return {
      today: new Date().toDateString(),
      yesterday: new Date(Date.now() - 86400000).toDateString()
    };
  }, []);

  function getDateLabel(date) {
    if (date.toDateString() === today) return 'Today';
    if (date.toDateString() === yesterday) return 'Yesterday';
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  }

  const grouped = {};
  transactions.forEach((tx) => {
    const label = getDateLabel(tx.date);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(tx);
  });

  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-safe page-enter">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-5 border-b border-gray-100">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Payment History</h1>

        <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-2xl p-5 text-white">
          <p className="text-teal-200 text-xs font-medium mb-1">Total Spent</p>
          <h2 className="text-3xl font-bold">KSh {totalSpent.toLocaleString()}</h2>
          <p className="text-teal-200 text-xs mt-2">
            {transactions.length} payment{transactions.length !== 1 ? 's' : ''} via M-Pesa
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div className="px-5 mt-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Receipt className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium text-sm">No transactions yet</p>
            <p className="text-gray-400 text-xs mt-1">Your M-Pesa payment history will appear here</p>
          </div>
        ) : (
          Object.entries(grouped).map(([dateLabel, txs]) => (
            <div key={dateLabel} className="mb-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{dateLabel}</p>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <div key={tx.id} className="bg-white rounded-xl p-3.5 flex items-center gap-3 border border-gray-100">
                    {tx.lotImage ? (
                      <img src={tx.lotImage} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-50">
                        <ArrowUpRight className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 font-medium text-sm truncate">{tx.description}</p>
                      <p className="text-gray-400 text-[10px]">
                        {tx.date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })} • M-Pesa {tx.paymentReceipt && `• ${tx.paymentReceipt}`}
                      </p>
                    </div>
                    <p className="font-bold text-sm flex-shrink-0 text-gray-900">
                      KSh {tx.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
}
