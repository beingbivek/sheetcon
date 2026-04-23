// app/dashboard/billing/[invoiceId]/InvoiceClient.tsx

'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface InvoiceClientProps {
  payment: {
    id: string;
    invoiceId: string;
    status: string;
    amountSnapshot: number;
    currency: string;
    requestedBillingCycle: string;
    rejectionReason: string | null;
    expiresAt: Date | string;
    requestedTier: { name: string };
  };
  settings: {
    esewaId?: string | null;
    esewaName?: string | null;
    esewaPhone?: string | null;
    instructions?: string | null;
  } | null;
  activeQr: {
    imageUrl: string;
    label: string;
  } | null;
}

export default function InvoiceClient({ payment, settings, activeQr }: InvoiceClientProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [transactionRef, setTransactionRef] = useState('');
  const [payerAccount, setPayerAccount] = useState('');
  const [userNote, setUserNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isExpired = new Date(payment.expiresAt) < new Date();
  const isSubmitted = ['UNDER_REVIEW', 'APPROVED', 'REJECTED'].includes(payment.status);
  const canSubmit = payment.status === 'AWAITING_PAYMENT' && !isExpired;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Type check
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError('Only JPG and PNG files are accepted.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Size check — 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Screenshot must be less than 5MB.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError(null);
    setScreenshot(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!preview) { setError('Please upload your payment screenshot.'); return; }
    if (!transactionRef.trim()) { setError('Transaction reference ID is required.'); return; }
    if (!payerAccount.trim()) { setError('Your eSewa number/name is required.'); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/user/payments/${payment.id}/submit-proof`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshotBase64: preview,
          transactionReference: transactionRef.trim(),
          payerAccount: payerAccount.trim(),
          userNote: userNote.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit proof.');

      setSuccess(true);
      setTimeout(() => router.push('/dashboard/billing'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── Success state ────────────────────────────────────────
  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-16 text-center">
        <div className="bg-green-50 rounded-2xl border border-green-200 p-10">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Proof Submitted!</h2>
          <p className="text-green-700">
            Your payment is now under review. We'll upgrade your account within 24 hours.
          </p>
          <p className="text-green-600 text-sm mt-3">Redirecting to billing page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">

      {/* ── Invoice Header ──────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Invoice</p>
            <h1 className="text-2xl font-bold text-slate-900 font-mono mt-0.5">{payment.invoiceId}</h1>
            <p className="text-slate-600 mt-1">
              Upgrade to <span className="font-semibold text-slate-800">{payment.requestedTier.name}</span>
              {' '}·{' '}
              <span className="capitalize">{payment.requestedBillingCycle.toLowerCase()}</span>
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
            payment.status === 'AWAITING_PAYMENT' ? 'bg-yellow-100 text-yellow-800' :
            payment.status === 'UNDER_REVIEW'     ? 'bg-blue-100 text-blue-800' :
            payment.status === 'APPROVED'         ? 'bg-green-100 text-green-800' :
            payment.status === 'REJECTED'         ? 'bg-red-100 text-red-800' :
                                                    'bg-slate-100 text-slate-700'
          }`}>
            {payment.status.replace(/_/g, ' ')}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-4 pt-5 border-t border-slate-100">
          <div>
            <p className="text-xs text-slate-500">Amount Due</p>
            <p className="text-2xl font-bold text-slate-900 mt-0.5">
              {payment.currency} {payment.amountSnapshot.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Plan</p>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{payment.requestedTier.name}</p>
            <p className="text-xs text-slate-500 capitalize">{payment.requestedBillingCycle.toLowerCase()}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Expires</p>
            <p className={`text-sm font-medium mt-0.5 ${isExpired ? 'text-red-600' : 'text-slate-800'}`}>
              {new Date(payment.expiresAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Status Banners ──────────────────────────── */}
      {isExpired && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 mb-4">
          ⚠️ This invoice has expired. Please go back and create a new payment request.
        </div>
      )}

      {payment.status === 'UNDER_REVIEW' && (
        <div className="p-4 bg-blue-50 text-blue-800 rounded-xl border border-blue-200 mb-4">
          🔍 Your payment screenshot is under review. We'll process it within 24 hours.
        </div>
      )}

      {payment.status === 'APPROVED' && (
        <div className="p-4 bg-green-50 text-green-800 rounded-xl border border-green-200 mb-4">
          ✅ Payment approved! Your account has been upgraded. Thank you.
        </div>
      )}

      {payment.status === 'REJECTED' && (
        <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 mb-4">
          <p className="font-semibold">❌ Payment Rejected</p>
          {payment.rejectionReason && (
            <p className="mt-1 text-sm">{payment.rejectionReason}</p>
          )}
          <p className="mt-2 text-sm">Please create a new payment request and try again.</p>
        </div>
      )}

      {/* ── Payment Section (only when awaiting) ────── */}
      {canSubmit && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

          {/* QR Code */}
          <div className="p-6 border-b border-slate-100 text-center bg-slate-50">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Scan to Pay</h2>
            {activeQr ? (
              <>
                <div className="inline-block p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
                  <Image
                    src={activeQr.imageUrl}
                    alt={activeQr.label}
                    width={220}
                    height={220}
                    className="rounded-lg"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">{activeQr.label}</p>
              </>
            ) : (
              <div className="inline-flex items-center justify-center w-52 h-52 bg-slate-200 rounded-xl border-2 border-dashed border-slate-300">
                <div className="text-center">
                  <p className="text-4xl mb-2">📷</p>
                  <p className="text-xs text-slate-500">QR not configured yet</p>
                </div>
              </div>
            )}
          </div>

          {/* Account Details */}
          {(settings?.esewaId || settings?.esewaName || settings?.esewaPhone) && (
            <div className="px-6 py-4 border-b border-slate-100 bg-blue-50">
              <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Account Details
              </h3>
              <div className="grid grid-cols-1 gap-1 text-sm">
                {settings.esewaId && (
                  <p className="text-slate-700">
                    <span className="font-medium">eSewa ID:</span> {settings.esewaId}
                  </p>
                )}
                {settings.esewaName && (
                  <p className="text-slate-700">
                    <span className="font-medium">Name:</span> {settings.esewaName}
                  </p>
                )}
                {settings.esewaPhone && (
                  <p className="text-slate-700">
                    <span className="font-medium">Phone:</span> {settings.esewaPhone}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Payment Steps */}
          <div className="px-6 py-5 border-b border-slate-100">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
              How to Pay
            </h3>
            {settings?.instructions ? (
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {settings.instructions}
              </p>
            ) : (
              <ol className="space-y-2 text-sm text-slate-700">
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  Open your eSewa app and scan the QR code above.
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  Enter the exact amount: <span className="font-semibold ml-1">{payment.currency} {payment.amountSnapshot.toLocaleString()}</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>
                    In the <span className="italic">Remarks</span> field, enter your invoice ID:{' '}
                    <strong className="text-slate-900 font-bold bg-yellow-100 px-1 rounded">{payment.invoiceId}</strong>
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  Complete the payment and take a screenshot of the confirmation screen.
                </li>
                <li className="flex gap-2">
                  <span className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">5</span>
                  Upload the screenshot in the form below and submit.
                </li>
              </ol>
            )}

            {/* Prominent invoice ID reminder */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
              <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
              <p className="text-sm text-amber-800">
                You <strong>must</strong> enter{' '}
                <strong className="font-extrabold text-amber-900 bg-amber-100 px-1 rounded">
                  {payment.invoiceId}
                </strong>{' '}
                in the <strong>Remarks</strong> field while paying. Without this, we cannot verify your payment.
              </p>
            </div>
          </div>

          {/* Upload Form */}
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
              Upload Payment Proof
            </h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Transaction Reference ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={e => setTransactionRef(e.target.value)}
                placeholder="e.g. ABC123456789"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-slate-500 mt-1">Found on your eSewa payment confirmation screen.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Your eSewa Number or Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={payerAccount}
                onChange={e => setPayerAccount(e.target.value)}
                placeholder="e.g. 9800000000"
                required
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Screenshot <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-2">JPG or PNG only · Max 5MB</p>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {preview && (
                <div className="mt-3 relative">
                  <img
                    src={preview}
                    alt="Screenshot preview"
                    className="max-h-52 rounded-lg border border-slate-200 object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPreview(null);
                      setScreenshot(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-700"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Additional Note <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={userNote}
                onChange={e => setUserNote(e.target.value)}
                rows={2}
                placeholder="Any extra information for our team..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !preview}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </span>
              ) : (
                'Submit Payment Proof'
              )}
            </button>
          </form>
        </div>
      )}

      {/* Back link */}
      <div className="mt-4 text-center">
        <button
          onClick={() => router.push('/dashboard/billing')}
          className="text-sm text-slate-500 hover:text-slate-700 underline"
        >
          ← Back to Billing
        </button>
      </div>
    </div>
  );
}