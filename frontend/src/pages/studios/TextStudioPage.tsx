import React from "react";
import { Link } from "react-router-dom";
import { 
  Type, ArrowRight, Sparkles, ChevronLeft, MessageSquare, Code,
  FileText, Brain, Lightbulb, Globe, PenTool, BookOpen,
} from "lucide-react";

const models = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    provider: "OpenAI",
    description: "OpenAI's most advanced multimodal model with exceptional reasoning, coding, and creative writing capabilities.",
    features: ["128K Context", "Vision Support", "Function Calling", "JSON Mode"],
    useCases: ["Complex Reasoning", "Code Generation", "Creative Writing", "Analysis"],
    speed: "Fast",
    quality: "Excellent",
    pricing: "3 tokens/1K",
    category: "Premium",
  },
  {
    id: "claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    provider: "Anthropic",
    description: "Anthropic's flagship model with best-in-class coding abilities, nuanced understanding, and safety features.",
    features: ["200K Context", "Artifacts", "Computer Use", "Vision"],
    useCases: ["Long Documents", "Coding", "Research", "Technical Writing"],
    speed: "Fast",
    quality: "Excellent",
    pricing: "3 tokens/1K",
    category: "Premium",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    provider: "Google",
    description: "Google's latest multimodal model with exceptional speed and native tool use capabilities.",
    features: ["1M Context", "Multimodal", "Tool Use", "Grounding"],
    useCases: ["Large Docs", "Image Analysis", "Real-time Apps", "Research"],
    speed: "Very Fast",
    quality: "Excellent",
    pricing: "2 tokens/1K",
    category: "Premium",
  },
  {
    id: "llama-3.3-70b",
    name: "Llama 3.3 70B",
    provider: "Meta",
    description: "Meta's open-source powerhouse with excellent performance across benchmarks and multilingual support.",
    features: ["128K Context", "Open Weights", "Multilingual", "Fine-tunable"],
    useCases: ["General Tasks", "Translation", "Custom Apps", "Research"],
    speed: "Fast",
    quality: "Very Good",
    pricing: "1 token/1K",
    category: "Open Source",
  },
  {
    id: "mistral-large",
    name: "Mistral Large 2",
    provider: "Mistral",
    description: "European AI leader with strong reasoning, multilingual capabilities, and competitive pricing.",
    features: ["128K Context", "Function Calling", "Multilingual", "European"],
    useCases: ["Enterprise", "European Compliance", "Coding", "Analysis"],
    speed: "Fast",
    quality: "Excellent",
    pricing: "2 tokens/1K",
    category: "Premium",
  },
  {
    id: "deepseek-v3",
    name: "DeepSeek V3",
    provider: "DeepSeek",
    description: "Chinese AI model with exceptional math and coding capabilities at competitive pricing.",
    features: ["64K Context", "Math Expert", "Code Expert", "Cost Effective"],
    useCases: ["Mathematics", "Programming", "Data Analysis", "Research"],
    speed: "Fast",
    quality: "Excellent",
    pricing: "1 token/1K",
    category: "Value",
  },
  {
    id: "qwen-2.5-72b",
    name: "Qwen 2.5 72B",
    provider: "Alibaba",
    description: "Alibaba's multilingual model with strong Chinese language support and competitive performance.",
    features: ["128K Context", "Multilingual", "Chinese Expert", "Open Source"],
    useCases: ["Chinese Content", "Translation", "General Tasks", "Apps"],
    speed: "Fast",
    quality: "Very Good",
    pricing: "1 token/1K",
    category: "Open Source",
  },
  {
    id: "o1-preview",
    name: "o1 Preview",
    provider: "OpenAI",
    description: "OpenAI's reasoning-focused model that thinks step-by-step for complex problem solving.",
    features: ["Chain of Thought", "Complex Reasoning", "Math", "Science"],
    useCases: ["Hard Problems", "Research", "Math Proofs", "Scientific Analysis"],
    speed: "Slow",
    quality: "Excellent",
    pricing: "15 tokens/1K",
    category: "Reasoning",
  },
];

const features = [
  { icon: MessageSquare, title: "Multi-Model Chat", description: "Chat with any LLM in one interface" },
  { icon: Code, title: "Code Generation", description: "Generate code in 50+ languages" },
  { icon: FileText, title: "Document Analysis", description: "Analyze PDFs, docs, and more" },
  { icon: Brain, title: "AI Personas", description: "Customize AI behavior and style" },
  { icon: Lightbulb, title: "Creative Writing", description: "Stories, scripts, and content" },
  { icon: Globe, title: "Translation", description: "100+ languages supported" },
];

export default function TextStudioPage() {
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
              <Link to="/register" className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium text-sm hover:opacity-90 transition">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Back Link */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      {/* Hero */}
      <section className="pt-12 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <Type className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white">Text Studio</h1>
              <p className="text-indigo-400 font-medium">All Major LLMs in One Place</p>
            </div>
          </div>
          <p className="text-xl text-slate-400 max-w-3xl mb-8">
            Access GPT-4o, Claude 3.5, Gemini 2.0, Llama 3.3, and 8+ more LLMs through a unified interface. 
            Chat, generate content, analyze documents, and code with the best AI models.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold hover:opacity-90 transition">
              Open Text Studio <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition border border-slate-700">
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 px-4 bg-slate-900/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-8">Studio Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="p-5 rounded-xl bg-slate-800/30 border border-slate-700/50">
                <feature.icon className="w-8 h-8 text-indigo-400 mb-3" />
                <h3 className="font-semibold text-white mb-1">{feature.title}</h3>
                <p className="text-sm text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Available Models</h2>
          <p className="text-slate-400 mb-8">Every major LLM, one unified interface</p>
          
          <div className="space-y-6">
            {models.map((model) => (
              <article key={model.id} className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-indigo-500/30 transition">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-white">{model.name}</h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                        {model.provider}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        model.category === "Premium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        model.category === "Open Source" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        model.category === "Reasoning" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                        "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      } border`}>
                        {model.category}
                      </span>
                    </div>
                    <p className="text-slate-400 mb-4">{model.description}</p>
                    
                    <div className="grid sm:grid-cols-2 gap-4 mb-4">
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Features</div>
                        <div className="flex flex-wrap gap-2">
                          {model.features.map((f, i) => (
                            <span key={i} className="px-2 py-1 text-xs rounded-md bg-slate-700/50 text-slate-300">{f}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Use Cases</div>
                        <div className="flex flex-wrap gap-2">
                          {model.useCases.map((u, i) => (
                            <span key={i} className="px-2 py-1 text-xs rounded-md bg-indigo-500/10 text-indigo-400">{u}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="lg:w-48 flex lg:flex-col gap-4 lg:text-right">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Speed</div>
                      <div className="text-sm font-medium text-white">{model.speed}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Quality</div>
                      <div className="text-sm font-medium text-white">{model.quality}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Cost</div>
                      <div className="text-sm font-medium text-indigo-400">{model.pricing}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-b from-indigo-500/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Chat with AI?</h2>
          <p className="text-slate-400 mb-8">Start with 50 free tokens. No credit card required.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold text-lg hover:opacity-90 transition">
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-slate-400 text-sm">© {new Date().getFullYear()} PixelPerfect AI</div>
          <div className="flex gap-6 text-sm text-slate-400">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <Link to="/studios/image" className="hover:text-white transition">Image Studio</Link>
            <Link to="/studios/video" className="hover:text-white transition">Video Studio</Link>
            <Link to="/studios/sound" className="hover:text-white transition">Sound Studio</Link>
            <Link to="/studios/3d" className="hover:text-white transition">3D Studio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
