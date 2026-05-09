// app/dashboard/sheets/[id]/layout.tsx (NEW FILE)

import { ReactNode } from 'react';

export default function SheetLayout({ children }: { children: ReactNode }) {
  return <div className="fixed inset-0 z-40 bg-white">{children}</div>;
}