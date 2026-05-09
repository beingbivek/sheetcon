// app/dashboard/sheets/[id]/business/page.tsx (REPLACE)

import { redirect } from 'next/navigation';

export default async function BusinessRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/sheets/${id}`);
}