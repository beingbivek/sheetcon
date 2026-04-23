// app/admin/payments/PaymentsClient.tsx

'use client';

import { useState } from 'react';
import Image from 'next/image';

// All date fields are ISO strings — serialized by the server page before passing here.
interface Payment {
  id: string;
  invoiceId: string;
  status: string;
  amountSnapshot: number;
  currency: string;
  requestedBillingCycle: string;
  requestedTierName: string;
  paymentMethod: string;
  transactionReference: string | null;
  payerAccount: string | null;
  screenshotUrl: string | null;
  userNote: string | null;
  adminNote: string | null;
  rejectionReason: string | null;
  submittedAt: string | null;   // Date → ISO string
  approvedAt: string | null;    // Date → ISO string
  rejectedAt: string | null;    // Date → ISO string
  createdAt: string;            // Date → ISO string
  updatedAt: string;            // Date → ISO string
  expiresAt: string;            // Date → ISO string
  user: { email: string; name: string | null };
  requestedTier: { name: string };
  approvedBy: { name: string } | null;
  rejectedBy: { name: string } | null;
}

interface PaymentsClientProps {
  payments: Payment[];
}

type StatusFilter =
  | 'ALL'
  | 'AWAITING_PAYMENT'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED';

const STATUS_COLORS: Record<string, string> = {
  AWAITING_PAYMENT: 'bg-yellow-900/30 text-yellow-300 border border-yellow-700',
  UNDER_REVIEW:     'bg-blue-900/30 text-blue-300 border border-blue-700',
  APPROVED:         'bg-green-900/30 text-green-300 border border-green-700',
  REJECTED:         'bg-red-900/30 text-red-300 border border-red-700',
  EXPIRED:          'bg-slate-700 text-slate-400 border border-slate-600',
  CANCELLED:        'bg-slate-700 text-slate-400 border border-slate-600',
};

export default function PaymentsClient({ payments: initialPayments }: PaymentsClientProps) {
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [screenshotOpen, setScreenshotOpen] = useState(false);

  const filtered =
    statusFilter === 'ALL'
      ? payments
      : payments.filter((p) => p.status === statusFilter);

  const openDetail = (payment: Payment) => {
    setSelectedPayment(payment);
    setAdminNote('');
    setRejectionReason('');
    setActionError(null);
    setScreenshotOpen(false);
  };

  const closeDetail = () => {
    setSelectedPayment(null);
    setScreenshotOpen(false);
  };

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selectedPayment) return;

    if (action === 'reject' && !rejectionReason.trim()) {
      setActionError('Rejection reason is required.');
      return;
    }

    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          adminNote: adminNote.trim() || undefined,
          rejectionReason: rejectionReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Action failed');

      const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';
      setPayments((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id
            ? { ...p, status: newStatus, adminNote, rejectionReason }
            : p
        )
      );

      closeDetail();
    } catch (err: any) {
      setActionError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const counts: Record<StatusFilter, number> = {
    ALL:              payments.length,
    AWAITING_PAYMENT: payments.filter((p) => p.status === 'AWAITING_PAYMENT').length,
    UNDER_REVIEW:     payments.filter((p) => p.status === 'UNDER_REVIEW').length,
    APPROVED:         payments.filter((p) => p.status === 'APPROVED').length,
    REJECTED:         payments.filter((p) => p.status === 'REJECTED').length,
    EXPIRED:          payments.filter((p) => p.status === 'EXPIRED').length,
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Payment Requests</h1>
        <p className="text-slate-400 mt-1">Review and process user payment submissions</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        {(Object.keys(counts) as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {status.replace(/_/g, ' ')}
            <span className="ml-1.5 bg-slate-700 text-slate-300 text-xs px-1.5 py-0.5 rounded-full">
              {counts[status]}
            </span>
          </button>
        ))}
      </div>

      {/* Payments Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No payments found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">Invoice</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">User</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">Plan</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">Amount</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">Date</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filtered.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-slate-300 text-xs">{payment.invoiceId}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-200 font-medium">{payment.user.name || 'N/A'}</p>
                    <p className="text-slate-500 text-xs">{payment.user.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {payment.requestedTierName}
                    <span className="text-slate-500 text-xs ml-1">
                      ({payment.requestedBillingCycle})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200 font-medium">
                    {payment.currency} {payment.amountSnapshot}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[payment.status] || STATUS_COLORS.EXPIRED
                      }`}
                    >
                      {payment.status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {new Date(payment.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openDetail(payment)}
                      className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs transition-colors"
                    >
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-white">Payment Review</h2>
                  <p className="text-slate-400 text-sm font-mono mt-1">{selectedPayment.invoiceId}</p>
                </div>
                <button
                  onClick={closeDetail}
                  className="text-slate-400 hover:text-white text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              {/* Payment Info Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-900 rounded-lg p-4 mb-6 text-sm">
                <div>
                  <p className="text-slate-500">User</p>
                  <p className="text-white font-medium">{selectedPayment.user.name}</p>
                  <p className="text-slate-400 text-xs">{selectedPayment.user.email}</p>
                </div>
                <div>
                  <p className="text-slate-500">Plan</p>
                  <p className="text-white font-medium">{selectedPayment.requestedTierName}</p>
                  <p className="text-slate-400 text-xs">{selectedPayment.requestedBillingCycle}</p>
                </div>
                <div>
                  <p className="text-slate-500">Amount</p>
                  <p className="text-white font-bold text-lg">
                    {selectedPayment.currency} {selectedPayment.amountSnapshot}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Status</p>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      STATUS_COLORS[selectedPayment.status]
                    }`}
                  >
                    {selectedPayment.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {selectedPayment.transactionReference && (
                  <div>
                    <p className="text-slate-500">Transaction Ref</p>
                    <p className="text-white font-mono text-sm">
                      {selectedPayment.transactionReference}
                    </p>
                  </div>
                )}
                {selectedPayment.payerAccount && (
                  <div>
                    <p className="text-slate-500">Payer Account</p>
                    <p className="text-white">{selectedPayment.payerAccount}</p>
                  </div>
                )}
                {selectedPayment.submittedAt && (
                  <div>
                    <p className="text-slate-500">Submitted</p>
                    <p className="text-white">
                      {new Date(selectedPayment.submittedAt).toLocaleString()}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-slate-500">Expires</p>
                  <p
                    className={
                      new Date(selectedPayment.expiresAt) < new Date()
                        ? 'text-red-400'
                        : 'text-white'
                    }
                  >
                    {new Date(selectedPayment.expiresAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* User Note */}
              {selectedPayment.userNote && (
                <div className="mb-4 p-3 bg-slate-900 rounded-lg">
                  <p className="text-slate-500 text-xs mb-1">User Note</p>
                  <p className="text-slate-300 text-sm">{selectedPayment.userNote}</p>
                </div>
              )}

              {/* Screenshot */}
              {selectedPayment.screenshotUrl ? (
                <div className="mb-6">
                  <p className="text-slate-400 text-sm mb-2">Payment Screenshot</p>
                  <div
                    className="cursor-pointer"
                    onClick={() => setScreenshotOpen(!screenshotOpen)}
                  >
                    {screenshotOpen ? (
                      <Image
                        src={selectedPayment.screenshotUrl}
                        alt="Payment proof"
                        width={600}
                        height={600}
                        className="w-full rounded-lg border border-slate-600 object-contain max-h-96"
                      />
                    ) : (
                      <div className="bg-slate-900 rounded-lg border border-slate-600 p-4 flex items-center gap-3 hover:border-blue-500 transition-colors">
                        <span className="text-2xl">🖼️</span>
                        <div>
                          <p className="text-slate-200 text-sm">Click to view payment screenshot</p>
                          <p className="text-slate-500 text-xs">Cloudinary hosted image</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-slate-900 rounded-lg border border-slate-700">
                  <p className="text-slate-500 text-sm">No screenshot uploaded yet.</p>
                </div>
              )}

              {/* Already resolved */}
              {['APPROVED', 'REJECTED', 'EXPIRED', 'CANCELLED'].includes(
                selectedPayment.status
              ) ? (
                <div
                  className={`p-4 rounded-lg border text-sm ${
                    selectedPayment.status === 'APPROVED'
                      ? 'bg-green-900/30 border-green-700 text-green-300'
                      : 'bg-red-900/30 border-red-700 text-red-300'
                  }`}
                >
                  {selectedPayment.status === 'APPROVED' && (
                    <p>
                      ✅ Approved
                      {selectedPayment.approvedBy
                        ? ` by ${selectedPayment.approvedBy.name}`
                        : ''}
                    </p>
                  )}
                  {selectedPayment.status === 'REJECTED' && (
                    <>
                      <p>
                        ❌ Rejected
                        {selectedPayment.rejectedBy
                          ? ` by ${selectedPayment.rejectedBy.name}`
                          : ''}
                      </p>
                      {selectedPayment.rejectionReason && (
                        <p className="mt-1 text-red-400">
                          Reason: {selectedPayment.rejectionReason}
                        </p>
                      )}
                    </>
                  )}
                  {selectedPayment.adminNote && (
                    <p className="mt-2 text-slate-400">
                      Admin note: {selectedPayment.adminNote}
                    </p>
                  )}
                </div>
              ) : (
                /* Action Panel */
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Admin Note (optional)
                    </label>
                    <textarea
                      value={adminNote}
                      onChange={(e) => setAdminNote(e.target.value)}
                      rows={2}
                      placeholder="Internal note visible to admins..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Rejection Reason{' '}
                      <span className="text-red-400">(required to reject)</span>
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={2}
                      placeholder="Explain why the payment is being rejected..."
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  {actionError && (
                    <p className="text-red-400 text-sm">{actionError}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleAction('approve')}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                    >
                      {actionLoading ? 'Processing...' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => handleAction('reject')}
                      disabled={actionLoading}
                      className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
                    >
                      {actionLoading ? 'Processing...' : '❌ Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}