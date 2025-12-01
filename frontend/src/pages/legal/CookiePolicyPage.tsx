import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ChevronLeft, Cookie } from "lucide-react";

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Navigation */}
      <nav className="border-b border-slate-800/50 backdrop-blur-xl sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                PixelPerfect AI
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-slate-300 hover:text-white transition text-sm">Sign In</Link>
              <Link to="/register" className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm hover:opacity-90 transition">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Back Link */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Cookie className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Cookie Policy</h1>
            <p className="text-slate-400">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="prose prose-invert prose-slate max-w-none">
          <div className="space-y-8 text-slate-300">
            
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. What Are Cookies?</h2>
              <p>
                Cookies are small text files that are stored on your device (computer, tablet, or mobile) when you 
                visit a website. They help websites remember your preferences, understand how you use the site, 
                and improve your overall experience.
              </p>
              <p className="mt-3">
                PixelPerfect AI uses cookies and similar technologies (such as local storage and pixel tags) to 
                provide, protect, and improve our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Types of Cookies We Use</h2>
              
              <div className="mt-4 space-y-6">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-2">🔒 Essential Cookies</h3>
                  <p className="text-sm mb-2">Required for the website to function. Cannot be disabled.</p>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 text-slate-400">Cookie</th>
                        <th className="text-left py-2 text-slate-400">Purpose</th>
                        <th className="text-left py-2 text-slate-400">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">session_id</td>
                        <td className="py-2">User authentication</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">csrf_token</td>
                        <td className="py-2">Security protection</td>
                        <td className="py-2">Session</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">cookie_consent</td>
                        <td className="py-2">Store cookie preferences</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-2">⚙️ Functional Cookies</h3>
                  <p className="text-sm mb-2">Remember your preferences and settings.</p>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 text-slate-400">Cookie</th>
                        <th className="text-left py-2 text-slate-400">Purpose</th>
                        <th className="text-left py-2 text-slate-400">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">theme</td>
                        <td className="py-2">Dark/light mode preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">language</td>
                        <td className="py-2">Language preference</td>
                        <td className="py-2">1 year</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">recent_models</td>
                        <td className="py-2">Recently used AI models</td>
                        <td className="py-2">30 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-2">📊 Analytics Cookies</h3>
                  <p className="text-sm mb-2">Help us understand how visitors use our website.</p>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 text-slate-400">Cookie</th>
                        <th className="text-left py-2 text-slate-400">Purpose</th>
                        <th className="text-left py-2 text-slate-400">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">_ga</td>
                        <td className="py-2">Google Analytics - User identification</td>
                        <td className="py-2">2 years</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">_gid</td>
                        <td className="py-2">Google Analytics - Session tracking</td>
                        <td className="py-2">24 hours</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">_plausible</td>
                        <td className="py-2">Plausible Analytics (privacy-focused)</td>
                        <td className="py-2">1 year</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="text-lg font-medium text-white mb-2">🎯 Marketing Cookies</h3>
                  <p className="text-sm mb-2">Used to deliver relevant advertisements. Optional.</p>
                  <table className="w-full text-sm mt-3">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 text-slate-400">Cookie</th>
                        <th className="text-left py-2 text-slate-400">Purpose</th>
                        <th className="text-left py-2 text-slate-400">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">_fbp</td>
                        <td className="py-2">Facebook Pixel</td>
                        <td className="py-2">90 days</td>
                      </tr>
                      <tr className="border-b border-slate-700/50">
                        <td className="py-2 font-mono text-purple-400">_gcl_au</td>
                        <td className="py-2">Google Ads conversion tracking</td>
                        <td className="py-2">90 days</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. How to Manage Cookies</h2>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">Browser Settings</h3>
              <p>Most browsers allow you to control cookies through their settings:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
                <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
                <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
                <li><strong>Edge:</strong> Settings → Privacy → Cookies</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">Our Cookie Preferences</h3>
              <p>
                You can manage your cookie preferences on our platform by clicking the "Cookie Settings" link 
                in the footer of any page. This allows you to enable or disable optional cookies.
              </p>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">Opt-Out Links</h3>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">Google Analytics Opt-out</a></li>
                <li><a href="https://www.facebook.com/settings?tab=ads" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">Facebook Ad Preferences</a></li>
                <li><a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">Google Ad Settings</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Local Storage</h2>
              <p>
                In addition to cookies, we use browser local storage to store certain data on your device:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Draft content:</strong> Unsaved work to prevent data loss</li>
                <li><strong>UI preferences:</strong> Panel sizes, collapsed sections</li>
                <li><strong>Offline cache:</strong> For Progressive Web App functionality</li>
              </ul>
              <p className="mt-3">
                You can clear local storage through your browser's developer tools or by clearing site data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Third-Party Cookies</h2>
              <p>
                Some cookies on our site are placed by third-party services. We work with trusted partners who 
                adhere to strict privacy standards:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Stripe:</strong> Payment processing (PCI compliant)</li>
                <li><strong>Google:</strong> Analytics and reCAPTCHA</li>
                <li><strong>Cloudflare:</strong> Security and performance</li>
                <li><strong>Intercom:</strong> Customer support chat</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Do Not Track</h2>
              <p>
                Some browsers have a "Do Not Track" feature that signals to websites that you do not want to be 
                tracked. Our website responds to DNT signals by disabling non-essential analytics and marketing cookies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Updates to This Policy</h2>
              <p>
                We may update this Cookie Policy from time to time to reflect changes in technology, legislation, 
                or our business practices. Any changes will be posted on this page with an updated revision date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Contact Us</h2>
              <p>If you have questions about our use of cookies, please contact us:</p>
              <div className="mt-3 p-4 bg-slate-800/50 rounded-lg">
                <p><strong>PixelPerfect AI</strong></p>
                <p>Email: <a href="mailto:privacy@pixelperfect.ai" className="text-purple-400 hover:text-purple-300">privacy@pixelperfect.ai</a></p>
                <p>Address: 123 AI Innovation Street, San Francisco, CA 94105</p>
              </div>
            </section>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-slate-400 text-sm">© {new Date().getFullYear()} PixelPerfect AI</div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <Link to="/legal/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link to="/legal/terms" className="hover:text-white transition">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
