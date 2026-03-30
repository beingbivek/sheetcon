// components/templates/inventory/InventoryApp.tsx

export default function InventoryApp({ connection, user }: any) {
  return (
    <div className="text-center py-12">
      <span className="text-6xl mb-4 block">📦</span>
      <h2 className="text-2xl font-bold text-slate-900 mb-2">Inventory Template</h2>
      <p className="text-slate-600 mb-6">
        Coming soon! This will include product management, invoice builder, and sales tracking.
      </p>
      <div className="inline-block px-6 py-3 bg-slate-200 text-slate-700 rounded-lg">
        Currently in development
      </div>
    </div>
  );
}