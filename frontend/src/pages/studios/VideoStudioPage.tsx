import React from "react";
import { Link } from "react-router-dom";
import { 
  Video, ArrowRight, Sparkles, ChevronLeft, Film, Clapperboard,
  Clock, Zap, Volume2, Wand2, Play, Layers,
} from "lucide-react";

const models = [
  {
    id: "veo-3",
    name: "Google Veo 3",
    provider: "Google",
    description: "Google's flagship video generation model with exceptional quality, physics understanding, and audio generation capabilities.",
    features: ["Text-to-Video", "Audio Generation", "8s Duration", "1080p Output"],
    useCases: ["Commercials", "Social Content", "Product Demos", "Music Videos"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "15 tokens",
    hasAudio: true,
  },
  {
    id: "sora-2",
    name: "OpenAI Sora 2",
    provider: "OpenAI",
    description: "OpenAI's revolutionary video model with unparalleled understanding of physics, motion, and cinematic storytelling.",
    features: ["60s Videos", "Cinematic Quality", "Physics Accurate", "Multiple Styles"],
    useCases: ["Film Production", "Advertising", "Creative Projects", "Storyboarding"],
    speed: "Slow",
    quality: "Excellent",
    pricing: "20 tokens",
    hasAudio: true,
  },
  {
    id: "runway-gen3",
    name: "Runway Gen-3 Alpha",
    provider: "Runway",
    description: "Professional-grade video generation with fine-grained control over motion, style, and composition.",
    features: ["Motion Control", "Style Transfer", "Image-to-Video", "Camera Control"],
    useCases: ["VFX", "Motion Design", "Creative Direction", "Film Pre-vis"],
    speed: "Fast",
    quality: "Excellent",
    pricing: "12 tokens",
    hasAudio: false,
  },
  {
    id: "kling-2.5",
    name: "Kling 2.5 Turbo Pro",
    provider: "Kuaishou",
    description: "High-speed video generation with excellent motion quality and competitive pricing for production workflows.",
    features: ["Fast Generation", "High Motion Quality", "Cost Effective", "Batch Support"],
    useCases: ["Content Creation", "E-commerce", "Marketing", "Social Media"],
    speed: "Very Fast",
    quality: "Very Good",
    pricing: "8 tokens",
    hasAudio: false,
  },
  {
    id: "luma-ray2",
    name: "Luma Ray 2",
    provider: "Luma AI",
    description: "Dream Machine powered video generation with dreamy aesthetics and excellent prompt understanding.",
    features: ["Artistic Style", "Loop Generation", "Image Animation", "Smooth Motion"],
    useCases: ["Art Projects", "Music Videos", "Social Content", "NFT Art"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "10 tokens",
    hasAudio: false,
  },
  {
    id: "minimax-hailuo",
    name: "MiniMax Hailuo 2.3",
    provider: "MiniMax",
    description: "Chinese AI powerhouse offering high-quality video generation with excellent motion dynamics.",
    features: ["High Quality", "Good Motion", "Fast Processing", "Chinese Prompts"],
    useCases: ["Content Creation", "Marketing", "Entertainment", "Education"],
    speed: "Fast",
    quality: "Very Good",
    pricing: "10 tokens",
    hasAudio: false,
  },
  {
    id: "stable-video",
    name: "Stable Video Diffusion",
    provider: "Stability AI",
    description: "Open-source video generation model, excellent for image-to-video animation with consistent results.",
    features: ["Image-to-Video", "Consistent Motion", "Open Source", "Customizable"],
    useCases: ["Animation", "Product Videos", "Motion Graphics", "Research"],
    speed: "Medium",
    quality: "Good",
    pricing: "5 tokens",
    hasAudio: false,
  },
  {
    id: "wan-video",
    name: "Wan Video 2.5",
    provider: "Alibaba",
    description: "Alibaba's video generation model with excellent text-to-video capabilities and fast processing.",
    features: ["Fast Generation", "Text-to-Video", "Image-to-Video", "Multiple Resolutions"],
    useCases: ["Marketing", "Social Media", "E-commerce", "Content Creation"],
    speed: "Fast",
    quality: "Good",
    pricing: "6 tokens",
    hasAudio: false,
  },
];

const features = [
  { icon: Film, title: "Text-to-Video", description: "Generate videos from text descriptions" },
  { icon: Clapperboard, title: "Image-to-Video", description: "Animate any image with AI" },
  { icon: Volume2, title: "Audio Generation", description: "Generate matching audio tracks" },
  { icon: Wand2, title: "Video Enhancement", description: "Upscale and enhance existing videos" },
  { icon: Play, title: "Up to 60s Videos", description: "Generate longer video content" },
  { icon: Layers, title: "Multiple Formats", description: "Export in MP4, WebM, GIF" },
];

export default function VideoStudioPage() {
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
              <Link to="/register" className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-pink-500 text-white font-medium text-sm hover:opacity-90 transition">
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
              <Video className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white">Video Studio</h1>
              <p className="text-red-400 font-medium">AI Video Generation & Animation</p>
            </div>
          </div>
          <p className="text-xl text-slate-400 max-w-3xl mb-8">
            Create stunning videos from text or images with 8+ cutting-edge AI models including 
            Google Veo 3, OpenAI Sora 2, and Runway Gen-3.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold hover:opacity-90 transition">
              Open Video Studio <ArrowRight className="w-5 h-5" />
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
                <feature.icon className="w-8 h-8 text-red-400 mb-3" />
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
          <p className="text-slate-400 mb-8">Industry-leading video generation models at your fingertips</p>
          
          <div className="space-y-6">
            {models.map((model) => (
              <article key={model.id} className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-red-500/30 transition">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-white">{model.name}</h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                        {model.provider}
                      </span>
                      {model.hasAudio && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                          <Volume2 className="w-3 h-3" /> Audio
                        </span>
                      )}
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
                            <span key={i} className="px-2 py-1 text-xs rounded-md bg-pink-500/10 text-pink-400">{u}</span>
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
                      <div className="text-sm font-medium text-red-400">{model.pricing}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-b from-red-500/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Create Amazing Videos?</h2>
          <p className="text-slate-400 mb-8">Start with 50 free tokens. No credit card required.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-semibold text-lg hover:opacity-90 transition">
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
            <Link to="/studios/sound" className="hover:text-white transition">Sound Studio</Link>
            <Link to="/studios/text" className="hover:text-white transition">Text Studio</Link>
            <Link to="/studios/3d" className="hover:text-white transition">3D Studio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
