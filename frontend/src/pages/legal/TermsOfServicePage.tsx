import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, ChevronLeft, FileText } from "lucide-react";

export default function TermsOfServicePage() {
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
            <FileText className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">Terms of Service</h1>
            <p className="text-slate-400">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
        </div>

        <div className="prose prose-invert prose-slate max-w-none">
          <div className="space-y-8 text-slate-300">
            
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p>
                By accessing or using PixelPerfect AI ("Service"), you agree to be bound by these Terms of Service ("Terms"). 
                If you do not agree to these Terms, do not use the Service. We reserve the right to modify these Terms at any time, 
                and such modifications will be effective immediately upon posting.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p>
                PixelPerfect AI provides an AI-powered creative platform that enables users to generate, enhance, and manipulate 
                digital content including images, videos, audio, text, and 3D models using artificial intelligence technology.
              </p>
              <p className="mt-3">
                The Service includes access to various AI models from third-party providers including but not limited to OpenAI, 
                Google, Anthropic, Stability AI, and others. Availability and functionality may vary based on your subscription plan.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Account Registration</h2>
              <p>To use certain features of the Service, you must register for an account. You agree to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Provide accurate, current, and complete information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Maintain the security of your password and account</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of any unauthorized use</li>
              </ul>
              <p className="mt-3">
                You must be at least 13 years old (or 16 in the EEA) to use the Service. If you are under 18, 
                you represent that you have your parent or guardian's permission to use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. Subscription Plans and Payment</h2>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">4.1 Free Plan</h3>
              <p>The free plan includes limited tokens per month and access to basic features.</p>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">4.2 Paid Plans</h3>
              <p>Paid subscriptions are billed monthly or annually. By subscribing, you authorize us to charge your payment method on a recurring basis.</p>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">4.3 Tokens</h3>
              <p>
                Our platform uses a token-based system. Tokens are consumed when using AI features. 
                Unused tokens expire at the end of each billing cycle and do not roll over.
              </p>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">4.4 Refunds</h3>
              <p>
                Refunds are available within 14 days of purchase if you have not consumed more than 10% of your allocated tokens. 
                Enterprise plans may have different refund terms as specified in their agreements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Acceptable Use Policy</h2>
              <p>You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Generate illegal, harmful, or offensive content</li>
                <li>Create deepfakes or non-consensual intimate imagery</li>
                <li>Impersonate others or spread misinformation</li>
                <li>Infringe on intellectual property rights</li>
                <li>Harass, abuse, or harm others</li>
                <li>Generate content depicting minors in inappropriate contexts</li>
                <li>Circumvent security measures or access restrictions</li>
                <li>Use automated systems to abuse the Service</li>
                <li>Resell or redistribute AI-generated content as your own AI service</li>
                <li>Violate any applicable laws or regulations</li>
              </ul>
              <p className="mt-3">
                We reserve the right to suspend or terminate accounts that violate this policy without refund.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Intellectual Property Rights</h2>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">6.1 Your Content</h3>
              <p>
                You retain ownership of content you upload to the Service. By uploading content, you grant us a 
                limited license to process and store that content to provide the Service.
              </p>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">6.2 Generated Content</h3>
              <p>
                Subject to our Terms and applicable law, you own the outputs generated through your use of the Service. 
                However, similar outputs may be generated for other users given the nature of AI systems.
              </p>
              
              <h3 className="text-lg font-medium text-white mt-4 mb-2">6.3 Our Property</h3>
              <p>
                The Service, including its design, features, and content (excluding user content), is owned by 
                PixelPerfect AI and protected by intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. AI-Generated Content Disclaimer</h2>
              <p>
                AI-generated content may contain errors, inaccuracies, or unintended outputs. You acknowledge that:
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>AI outputs are not guaranteed to be accurate, appropriate, or error-free</li>
                <li>You are responsible for reviewing and validating all generated content</li>
                <li>Generated content may inadvertently resemble existing works</li>
                <li>We do not guarantee that generated content is free from intellectual property claims</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Limitation of Liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, PIXELPERFECT AI SHALL NOT BE LIABLE FOR ANY INDIRECT, 
                INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, 
                WHETHER INCURRED DIRECTLY OR INDIRECTLY.
              </p>
              <p className="mt-3">
                Our total liability for any claims arising from your use of the Service shall not exceed the 
                amount you paid us in the twelve (12) months preceding the claim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Disclaimer of Warranties</h2>
              <p>
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS 
                OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
                PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Indemnification</h2>
              <p>
                You agree to indemnify and hold harmless PixelPerfect AI and its officers, directors, employees, 
                and agents from any claims, damages, losses, or expenses arising from your use of the Service, 
                your violation of these Terms, or your violation of any rights of another.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Termination</h2>
              <p>
                We may terminate or suspend your account at any time for any reason, including violation of these Terms. 
                Upon termination, your right to use the Service will immediately cease.
              </p>
              <p className="mt-3">
                You may cancel your account at any time through your account settings. Cancellation will be effective 
                at the end of your current billing period.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the State of California, 
                United States, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">13. Dispute Resolution</h2>
              <p>
                Any disputes arising from these Terms or the Service shall be resolved through binding arbitration 
                in San Francisco, California, except that either party may seek injunctive relief in court for 
                intellectual property matters.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">14. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify you of material changes 
                via email or through the Service. Your continued use of the Service after changes constitutes 
                acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">15. Contact Information</h2>
              <p>For questions about these Terms, please contact us:</p>
              <div className="mt-3 p-4 bg-slate-800/50 rounded-lg">
                <p><strong>PixelPerfect AI</strong></p>
                <p>Email: <a href="mailto:legal@pixelperfect.ai" className="text-purple-400 hover:text-purple-300">legal@pixelperfect.ai</a></p>
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
            <Link to="/legal/cookies" className="hover:text-white transition">Cookie Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
