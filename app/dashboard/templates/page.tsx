// app/dashboard/templates/page.tsx

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';
import Link from 'next/link';

const TEMPLATES = [
  {
    id: 'finance',
    name: 'Personal Finance Tracker',
    description: 'Track your income, expenses, and budgets with beautiful visualizations and monthly reports.',
    icon: '💰',
    color: 'green',
    features: [
      'Income & expense tracking',
      'Category-wise breakdown',
      'Monthly/yearly reports',
      'PDF statement export',
      'Budget planning',
      'Visual charts & graphs',
    ],
    bestFor: 'Personal finances, Freelancers, Small business owners',
  },
  {
    id: 'inventory',
    name: 'Small Business Inventory',
    description: 'Complete inventory management with products, customers, invoicing, and sales tracking.',
    icon: '📦',
    color: 'blue',
    features: [
      'Product catalog management',
      'Customer database',
      'Invoice generation',
      'Payment tracking (Cash/Bank/UPI)',
      'Stock alerts',
      'Sales reports & analytics',
    ],
    bestFor: 'Retail stores, Small businesses, E-commerce sellers',
  },
];

export default async function TemplatesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      tier: true,
      sheetConnections: {
        select: { templateId: true },
      },
    },
  });

  if (!user) {
    redirect('/login');
  }

  const usedTemplates = user.sheetConnections.map(c => c.templateId);
  const sheetsUsed = user.sheetConnections.length;
  const sheetsLimit = user.tier.maxSheets;
  const canAddMore = sheetsLimit === -1 || sheetsUsed < sheetsLimit;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Templates</h1>
        <p className="text-slate-600 mt-1">
          Choose a template to transform your Google Sheet into a powerful web application.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {TEMPLATES.map((template) => {
          const isUsed = usedTemplates.includes(template.id);
          
          return (
            <div
              key={template.id}
              className={`bg-white rounded-xl border-2 overflow-hidden ${
                template.color === 'green' 
                  ? 'border-green-200 hover:border-green-400' 
                  : 'border-blue-200 hover:border-blue-400'
              } transition-all`}
            >
              {/* Header */}
              <div className={`p-6 ${
                template.color === 'green' ? 'bg-green-50' : 'bg-blue-50'
              }`}>
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{template.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{template.name}</h2>
                    <p className="text-sm text-slate-600 mt-1">{template.description}</p>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-500 uppercase mb-3">Features</h3>
                <ul className="grid grid-cols-2 gap-2">
                  {template.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <svg className={`w-4 h-4 ${
                        template.color === 'green' ? 'text-green-500' : 'text-blue-500'
                      }`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    <span className="font-medium">Best for:</span> {template.bestFor}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex gap-3">
                  {canAddMore ? (
                    <Link
                      href={`/dashboard/connect?template=${template.id}`}
                      className={`flex-1 px-4 py-3 text-center rounded-lg font-medium transition-colors ${
                        template.color === 'green'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      Use This Template
                    </Link>
                  ) : (
                    <div className="flex-1 px-4 py-3 text-center rounded-lg bg-slate-100 text-slate-500">
                      Sheet limit reached
                    </div>
                  )}
                  
                  {isUsed && (
                    <span className="px-4 py-3 text-sm text-slate-500 border border-slate-200 rounded-lg">
                      ✓ In use
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Coming Soon */}
      <div className="mt-12">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Coming Soon</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Project Management', icon: '📋', desc: 'Tasks, timelines, and team collaboration' },
            { name: 'CRM', icon: '🤝', desc: 'Customer relationships and sales pipeline' },
            { name: 'HR & Payroll', icon: '👥', desc: 'Employee management and payroll tracking' },
          ].map((item, i) => (
            <div key={i} className="bg-slate-50 rounded-xl border border-slate-200 p-6 opacity-75">
              <span className="text-4xl mb-3 block">{item.icon}</span>
              <h3 className="font-semibold text-slate-900">{item.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
              <span className="inline-block mt-3 text-xs bg-slate-200 text-slate-600 px-2 py-1 rounded">
                Coming Soon
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}