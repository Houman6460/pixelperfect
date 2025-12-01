import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ChevronLeft, Shield } from "lucide-react";

export default function PrivacyPolicyPage() {
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
            <Shield className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Privacy Policy</h1>
            <p className="text-slate-400">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="prose prose-invert prose-slate max-w-none">
          <div className="space-y-8 text-slate-300">
            
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
              <p>
                Welcome to PixelPerfect AI ("Company", "we", "our", "us"). We are committed to protecting your personal information 
                and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information 
                when you use our AI-powered creative platform and services.
              </p>
              <p className="mt-3">
                Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, 
                please do not access the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Information We Collect</h2>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">Personal Information</h3>
              <p>We collect personal information that you voluntarily provide when you:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Register for an account (name, email address, password)</li>
                <li>Subscribe to a paid plan (billing information, payment details)</li>
                <li>Contact our support team</li>
                <li>Participate in surveys or promotions</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">Usage Data</h3>
              <p>We automatically collect certain information when you use our platform:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Device information (browser type, operating system, device type)</li>
                <li>IP address and approximate location</li>
                <li>Usage patterns and feature interactions</li>
                <li>Generation history and preferences</li>
              </ul>

              <h3 className="text-lg font-medium text-white mt-4 mb-2">Content Data</h3>
              <p>When you use our AI services, we process:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Images, videos, and audio files you upload</li>
                <li>Text prompts and instructions you provide</li>
                <li>Generated content created through our platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide, maintain, and improve our services</li>
                <li>Process transactions and send related information</li>
                <li>Send administrative information and updates</li>
                <li>Respond to inquiries and provide customer support</li>
                <li>Monitor and analyze usage patterns to improve user experience</li>
                <li>Detect, prevent, and address technical issues and fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Data Retention</h2>
              <p>
                We retain your personal information for as long as your account is active or as needed to provide you services. 
                We will retain and use your information as necessary to comply with legal obligations, resolve disputes, 
                and enforce our agreements.
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Account data:</strong> Retained until account deletion</li>
                <li><strong>Generated content:</strong> Retained for 30 days unless saved to your gallery</li>
                <li><strong>Usage logs:</strong> Retained for 90 days</li>
                <li><strong>Payment records:</strong> Retained for 7 years for tax compliance</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Data Sharing and Disclosure</h2>
              <p>We may share your information in the following situations:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Service Providers:</strong> Third-party vendors who assist in providing our services (payment processors, cloud hosting, AI model providers)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to respond to legal process</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you have given us permission to share your information</li>
              </ul>
              <p className="mt-3">
                <strong>We do not sell your personal information.</strong> We do not use your uploaded content or generated 
                outputs to train our AI models without your explicit consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information, including:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Encryption of data in transit (TLS 1.3) and at rest (AES-256)</li>
                <li>Regular security assessments and penetration testing</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection</li>
                <li>SOC 2 Type II compliance (Enterprise plans)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Your Privacy Rights</h2>
              <p>Depending on your location, you may have the following rights:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                <li><strong>Objection:</strong> Object to certain processing of your data</li>
                <li><strong>Restriction:</strong> Request restriction of processing</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, please contact us at <a href="mailto:privacy@pixelperfect.ai" className="text-purple-400 hover:text-purple-300">privacy@pixelperfect.ai</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. 
                We ensure appropriate safeguards are in place, including Standard Contractual Clauses approved by the European Commission.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Children's Privacy</h2>
              <p>
                Our services are not directed to children under 13 (or 16 in the EEA). We do not knowingly collect 
                personal information from children. If you believe we have collected information from a child, 
                please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Changes to This Policy</h2>
              <p>
                We may update this privacy policy from time to time. We will notify you of any changes by posting 
                the new policy on this page and updating the "Last updated" date. For material changes, we will 
                provide additional notice via email.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Contact Us</h2>
              <p>If you have questions about this Privacy Policy, please contact us:</p>
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
            <Link to="/legal/terms" className="hover:text-white transition">Terms of Service</Link>
            <Link to="/legal/cookies" className="hover:text-white transition">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
