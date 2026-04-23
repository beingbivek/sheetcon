// components/admin/PaymentSettingsForm.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface QrImage {
  id: string;
  label: string;
  imageUrl: string;
  isActive: boolean;
  uploadedAt: string;
}

export default function PaymentSettingsForm() {
  // ── Settings state ──────────────────────────────────
  const [formData, setFormData] = useState({
    esewaId: '',
    esewaName: '',
    esewaPhone: '',
    instructions: '',
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState('');

  // ── QR image state ──────────────────────────────────
  const [qrImages, setQrImages] = useState<QrImage[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrUploading, setQrUploading] = useState(false);
  const [qrMessage, setQrMessage] = useState('');
  const [newQrLabel, setNewQrLabel] = useState('');
  const [newQrPreview, setNewQrPreview] = useState<string | null>(null);
  const [newQrBase64, setNewQrBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    loadQrImages();
  }, []);

  // ── Load existing settings ──────────────────────────

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/admin/payment-settings');
      const data = await res.json();
      if (data.settings) {
        setFormData({
          esewaId: data.settings.esewaId || '',
          esewaName: data.settings.esewaName || '',
          esewaPhone: data.settings.esewaPhone || '',
          instructions: data.settings.instructions || '',
        });
      }
    } catch {
      // Silently ignore — fields stay blank
    }
  };

  const loadQrImages = async () => {
    setQrLoading(true);
    try {
      const res = await fetch('/api/admin/qr-images');
      const data = await res.json();
      if (data.images) setQrImages(data.images);
    } catch {
      // Silently ignore
    } finally {
      setQrLoading(false);
    }
  };

  // ── Settings form submit ────────────────────────────

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setSettingsMessage('');
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Send empty qrCodeData so it doesn't overwrite QR via this form
          qrCodeData: undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save');
      setSettingsMessage('✅ Settings saved successfully.');
    } catch (err: any) {
      setSettingsMessage(`❌ ${err.message}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  // ── QR image handlers ───────────────────────────────

  const handleQrFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/jpg', 'image/webp'].includes(file.type)) {
      setQrMessage('❌ Only JPG, PNG, or WebP images allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setQrMessage('❌ Image must be under 5MB.');
      return;
    }

    setQrMessage('');
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setNewQrBase64(base64);
      setNewQrPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleQrUpload = async () => {
    if (!newQrBase64) return setQrMessage('❌ Please select an image first.');
    if (!newQrLabel.trim()) return setQrMessage('❌ Please enter a label for this QR.');

    setQrUploading(true);
    setQrMessage('');
    try {
      const res = await fetch('/api/admin/qr-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: newQrLabel.trim(), imageBase64: newQrBase64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      // Reset upload form
      setNewQrLabel('');
      setNewQrBase64(null);
      setNewQrPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      setQrMessage('✅ QR image uploaded successfully.');
      await loadQrImages();
    } catch (err: any) {
      setQrMessage(`❌ ${err.message}`);
    } finally {
      setQrUploading(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/qr-images/${id}/activate`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to activate');
      setQrImages(prev => prev.map(q => ({ ...q, isActive: q.id === id })));
      setQrMessage('✅ QR image set as active.');
    } catch (err: any) {
      setQrMessage(`❌ ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    const image = qrImages.find(q => q.id === id);
    if (image?.isActive) {
      setQrMessage('❌ Cannot delete the active QR image. Activate another one first.');
      return;
    }
    if (!confirm('Delete this QR image? This cannot be undone.')) return;

    try {
      const res = await fetch(`/api/admin/qr-images/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      setQrImages(prev => prev.filter(q => q.id !== id));
      setQrMessage('✅ QR image deleted.');
    } catch (err: any) {
      setQrMessage(`❌ ${err.message}`);
    }
  };

  return (
    <div className="space-y-8">

      {/* ── Payment Account Settings ─────────────────── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-1">Payment Account Details</h3>
        <p className="text-slate-400 text-sm mb-6">
          These details are shown to users on the payment page.
        </p>

        {settingsMessage && (
          <p className={`text-sm mb-4 ${settingsMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {settingsMessage}
          </p>
        )}

        <form onSubmit={handleSettingsSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">eSewa ID</label>
              <input
                type="text"
                value={formData.esewaId}
                onChange={e => setFormData({ ...formData, esewaId: e.target.value })}
                required
                placeholder="9800000000"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Account Name</label>
              <input
                type="text"
                value={formData.esewaName}
                onChange={e => setFormData({ ...formData, esewaName: e.target.value })}
                required
                placeholder="Bivek Shrestha"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.esewaPhone}
                onChange={e => setFormData({ ...formData, esewaPhone: e.target.value })}
                placeholder="9800000000"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Payment Instructions
            </label>
            <textarea
              value={formData.instructions}
              onChange={e => setFormData({ ...formData, instructions: e.target.value })}
              rows={4}
              placeholder="Step-by-step instructions shown to users..."
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={settingsLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors"
          >
            {settingsLoading ? 'Saving...' : 'Save Account Details'}
          </button>
        </form>
      </div>

      {/* ── QR Image Manager ─────────────────────────── */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-1">QR Code Images</h3>
        <p className="text-slate-400 text-sm mb-6">
          Upload payment QR codes. Only one can be active at a time — the active QR is shown to paying users.
        </p>

        {qrMessage && (
          <p className={`text-sm mb-4 ${qrMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
            {qrMessage}
          </p>
        )}

        {/* Upload new QR */}
        <div className="bg-slate-900 rounded-lg border border-slate-600 p-4 mb-6">
          <h4 className="text-sm font-semibold text-slate-300 mb-3">Upload New QR Image</h4>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Label (e.g. "eSewa QR", "Bank QR")</label>
              <input
                type="text"
                value={newQrLabel}
                onChange={e => setNewQrLabel(e.target.value)}
                placeholder="eSewa Main QR"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Image (JPG/PNG, max 5MB)</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleQrFileChange}
                className="block w-full text-sm text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-700 file:text-slate-200 hover:file:bg-slate-600"
              />
            </div>

            {newQrPreview && (
              <div className="flex items-start gap-4">
                <Image
                  src={newQrPreview}
                  alt="QR preview"
                  width={120}
                  height={120}
                  className="rounded-lg border border-slate-600 object-contain"
                />
                <button
                  type="button"
                  onClick={() => { setNewQrPreview(null); setNewQrBase64(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleQrUpload}
              disabled={qrUploading || !newQrBase64}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors"
            >
              {qrUploading ? 'Uploading...' : 'Upload QR Image'}
            </button>
          </div>
        </div>

        {/* Existing QR images */}
        {qrLoading ? (
          <p className="text-slate-500 text-sm">Loading QR images...</p>
        ) : qrImages.length === 0 ? (
          <p className="text-slate-500 text-sm">No QR images uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {qrImages.map(qr => (
              <div
                key={qr.id}
                className={`rounded-lg border p-4 flex flex-col items-center gap-3 ${
                  qr.isActive
                    ? 'border-green-500 bg-green-900/20'
                    : 'border-slate-600 bg-slate-900'
                }`}
              >
                {qr.isActive && (
                  <span className="self-start text-xs font-bold text-green-400 bg-green-900/40 px-2 py-0.5 rounded-full border border-green-700">
                    ACTIVE
                  </span>
                )}
                <Image
                  src={qr.imageUrl}
                  alt={qr.label}
                  width={140}
                  height={140}
                  className="rounded-lg object-contain"
                />
                <p className="text-slate-300 text-sm font-medium text-center">{qr.label}</p>
                <p className="text-slate-500 text-xs">
                  {new Date(qr.uploadedAt).toLocaleDateString()}
                </p>
                <div className="flex gap-2 w-full">
                  {!qr.isActive && (
                    <button
                      onClick={() => handleActivate(qr.id)}
                      className="flex-1 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(qr.id)}
                    disabled={qr.isActive}
                    className="flex-1 py-1.5 bg-red-900/50 hover:bg-red-800 disabled:opacity-30 disabled:cursor-not-allowed text-red-300 text-xs font-medium rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}