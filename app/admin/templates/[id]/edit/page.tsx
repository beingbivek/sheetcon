// app/admin/templates/[id]/edit/page.tsx

import { prisma } from '@/lib/db';
import { notFound } from 'next/navigation';
import TemplateForm from '@/components/admin/TemplateForm';

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const template = await prisma.template.findUnique({
    where: { id },
  });

  if (!template) {
    notFound();
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Edit Template</h1>
        <p className="text-slate-400">Update template configuration</p>
      </div>

      <TemplateForm template={template} />
    </div>
  );
}