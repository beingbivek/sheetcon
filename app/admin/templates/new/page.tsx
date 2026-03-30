// app/admin/templates/new/page.tsx

import TemplateForm from '@/components/admin/TemplateForm';

export default function NewTemplatePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create New Template</h1>
        <p className="text-slate-400">Design a new app template</p>
      </div>

      <TemplateForm />
    </div>
  );
}