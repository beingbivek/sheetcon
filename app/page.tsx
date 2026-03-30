// app/page.tsx

import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-white">SheetCon</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-slate-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Transform Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              Google Sheets
            </span>
            <br />
            Into Beautiful Apps
          </h1>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            Connect your spreadsheets, choose a template, and get a powerful web application 
            in minutes. No coding required. Your data stays in your sheets.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors"
            >
              Start Free →
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white text-lg font-semibold rounded-lg transition-colors"
            >
              Learn More
            </Link>
          </div>
          <p className="text-slate-500 mt-6">
            ✓ Free tier available &nbsp; ✓ No credit card required &nbsp; ✓ Setup in 2 minutes
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Everything You Need
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            SheetCon gives you powerful tools to manage your data with a beautiful interface
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon="📊"
              title="Connect Any Sheet"
              description="Link your Google Sheets in seconds. We read and write directly to your spreadsheet."
            />
            <FeatureCard
              icon="🎨"
              title="Pre-built Templates"
              description="Choose from Inventory Management, Personal Finance, and more. Beautiful UI out of the box."
            />
            <FeatureCard
              icon="⚡"
              title="Real-time Sync"
              description="Changes sync instantly between the app and your sheet. Always up to date."
            />
            <FeatureCard
              icon="📄"
              title="PDF Export"
              description="Generate professional invoices, reports, and statements with one click."
            />
            <FeatureCard
              icon="🔒"
              title="Your Data, Your Control"
              description="Data lives in YOUR Google Sheet. We never store your business data on our servers."
            />
            <FeatureCard
              icon="📱"
              title="Mobile Responsive"
              description="Works beautifully on desktop, tablet, and mobile. Manage on the go."
            />
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Ready-to-Use Templates
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Pick a template and start using it immediately
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <TemplateCard
              icon="💰"
              title="Personal Finance Tracker"
              description="Track income, expenses, and budgets. Get insights into your spending habits with beautiful charts."
              features={['Transaction tracking', 'Category breakdown', 'Monthly reports', 'PDF statements']}
              color="green"
            />
            <TemplateCard
              icon="📦"
              title="Small Business Inventory"
              description="Manage products, create invoices, and track sales. Perfect for small shops and businesses."
              features={['Product catalog', 'Invoice generator', 'Stock alerts', 'Sales reports']}
              color="blue"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Simple Pricing
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            Start free, upgrade when you need more
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="₹0"
              description="Perfect for getting started"
              features={[
                '1 Sheet connection',
                '1 Template',
                '500 operations/day',
                'PDF export',
                'Community support',
              ]}
              buttonText="Get Started"
              highlighted={false}
            />
            <PricingCard
              name="Pro"
              price="₹299"
              description="For growing businesses"
              features={[
                '3 Sheet connections',
                'All Templates',
                '5,000 operations/day',
                'PDF + Excel export',
                'Custom branding',
                'Priority support',
              ]}
              buttonText="Start Pro Trial"
              highlighted={true}
            />
            <PricingCard
              name="Business"
              price="₹999"
              description="For teams and enterprises"
              features={[
                '10 Sheet connections',
                'All Templates',
                'Unlimited operations',
                'All export formats',
                'API access',
                'Dedicated support',
              ]}
              buttonText="Contact Sales"
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Transform Your Sheets?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Join thousands of users who are already using SheetCon to manage their data better.
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold rounded-lg transition-colors"
          >
            Start Free Today →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <span className="text-2xl font-bold text-white">SheetCon</span>
              <p className="text-slate-400 mt-4">
                Transform your spreadsheets into powerful applications.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-slate-400 hover:text-white">Features</Link></li>
                <li><Link href="#pricing" className="text-slate-400 hover:text-white">Pricing</Link></li>
                <li><Link href="/templates" className="text-slate-400 hover:text-white">Templates</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link href="/about" className="text-slate-400 hover:text-white">About</Link></li>
                <li><Link href="/contact" className="text-slate-400 hover:text-white">Contact</Link></li>
                <li><Link href="/blog" className="text-slate-400 hover:text-white">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><Link href="/privacy" className="text-slate-400 hover:text-white">Privacy Policy</Link></li>
                <li><Link href="/terms" className="text-slate-400 hover:text-white">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 mt-12 pt-8 text-center text-slate-400">
            <p>© 2024 SheetCon. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Components
function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-blue-500 transition-colors">
      <span className="text-4xl mb-4 block">{icon}</span>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

function TemplateCard({
  icon,
  title,
  description,
  features,
  color,
}: {
  icon: string;
  title: string;
  description: string;
  features: string[];
  color: 'green' | 'blue';
}) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-indigo-600',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 hover:border-blue-500 transition-colors">
      <div className={`inline-block p-3 rounded-lg bg-gradient-to-r ${colorClasses[color]} mb-4`}>
        <span className="text-3xl">{icon}</span>
      </div>
      <h3 className="text-2xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-slate-400 mb-6">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center text-slate-300">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PricingCard({
  name,
  price,
  description,
  features,
  buttonText,
  highlighted,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  buttonText: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-8 border ${
        highlighted
          ? 'bg-gradient-to-b from-blue-900/50 to-slate-800 border-blue-500'
          : 'bg-slate-800 border-slate-700'
      }`}
    >
      {highlighted && (
        <span className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full mb-4">
          Most Popular
        </span>
      )}
      <h3 className="text-2xl font-bold text-white">{name}</h3>
      <p className="text-slate-400 mb-4">{description}</p>
      <div className="mb-6">
        <span className="text-4xl font-bold text-white">{price}</span>
        <span className="text-slate-400">/month</span>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center text-slate-300">
            <svg className="w-5 h-5 text-green-400 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
          highlighted
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-slate-700 hover:bg-slate-600 text-white'
        }`}
      >
        {buttonText}
      </Link>
    </div>
  );
}