// components/templates/inventory/InvoiceView.tsx

'use client';

import { Sale } from './InventoryApp';

interface InvoiceViewProps {
  sale: Sale;
  businessName: string;
  onClose: () => void;
  canExportPdf: boolean;
}

export default function InvoiceView({ sale, businessName, onClose, canExportPdf }: InvoiceViewProps) {
  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-6 print:hidden">
        <h3 className="text-xl font-semibold text-slate-900">Invoice</h3>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="bg-white border border-slate-200 rounded-lg p-8 print:border-0 print:p-0">
        {/* Header */}
        <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{businessName}</h1>
            <p className="text-slate-500 mt-1">Powered by SheetCon</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-semibold text-slate-900">INVOICE</h2>
            <p className="text-lg font-mono text-blue-600 mt-1">{sale.invoiceNumber}</p>
            <p className="text-sm text-slate-500 mt-2">Date: {formatDate(sale.date)}</p>
          </div>
        </div>

        {/* Customer Info */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-slate-500 uppercase mb-2">Bill To</h3>
          <p className="text-lg font-semibold text-slate-900">{sale.customerName}</p>
          {sale.customerPhone && (
            <p className="text-slate-600">Phone: {sale.customerPhone}</p>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="text-left py-3 text-sm font-semibold text-slate-700">#</th>
                <th className="text-left py-3 text-sm font-semibold text-slate-700">Item</th>
                <th className="text-center py-3 text-sm font-semibold text-slate-700">Qty</th>
                <th className="text-right py-3 text-sm font-semibold text-slate-700">Price</th>
                <th className="text-right py-3 text-sm font-semibold text-slate-700">Discount</th>
                <th className="text-right py-3 text-sm font-semibold text-slate-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item, index) => (
                <tr key={index} className="border-b border-slate-100">
                  <td className="py-3 text-slate-600">{index + 1}</td>
                  <td className="py-3 font-medium text-slate-900">{item.productName}</td>
                  <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                  <td className="py-3 text-right text-slate-600">
                    ₹{item.unitPrice.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 text-right text-slate-600">
                    ₹{item.discount.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 text-right font-medium text-slate-900">
                    ₹{item.total.toLocaleString('en-IN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>₹{sale.subtotal.toLocaleString('en-IN')}</span>
            </div>
            {sale.discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount ({sale.discountPercent}%)</span>
                <span>-₹{sale.discountAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            {sale.taxAmount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax ({sale.taxPercent}%)</span>
                <span>+₹{sale.taxAmount.toLocaleString('en-IN')}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold border-t-2 border-slate-200 pt-2">
              <span>Total</span>
              <span>₹{sale.total.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid</span>
              <span>₹{sale.amountPaid.toLocaleString('en-IN')}</span>
            </div>
            {sale.amountDue > 0 && (
              <div className="flex justify-between text-orange-600 font-semibold">
                <span>Balance Due</span>
                <span>₹{sale.amountDue.toLocaleString('en-IN')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Info */}
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex gap-8 text-sm">
            <div>
              <span className="text-slate-500">Payment Method:</span>
              <span className="ml-2 font-medium text-slate-900">{sale.paymentMethod}</span>
            </div>
            <div>
              <span className="text-slate-500">Payment Status:</span>
              <span className={`ml-2 font-medium ${
                sale.paymentStatus === 'PAID' ? 'text-green-600' :
                sale.paymentStatus === 'PARTIAL' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {sale.paymentStatus}
              </span>
            </div>
          </div>
          {sale.notes && (
            <div className="mt-4">
              <span className="text-slate-500 text-sm">Notes:</span>
              <p className="text-slate-700 mt-1">{sale.notes}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-center text-sm text-slate-500">
          <p>Thank you for your business!</p>
          <p className="mt-1">Generated by SheetCon • {formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    </div>
  );
}