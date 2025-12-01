import React from "react";
import { Link } from "react-router-dom";
import { 
  Image, ArrowRight, Check, Star, Sparkles, Zap, ChevronLeft,
  Upload, Wand2, Download, Layers, Palette, Shield, Clock, Award,
} from "lucide-react";

const models = [
  {
    id: "real-esrgan",
    name: "Real-ESRGAN",
    provider: "Xinntao",
    description: "State-of-the-art image upscaling with enhanced texture and detail preservation. Perfect for restoring old photos and upscaling artwork.",
    features: ["4x Upscaling", "Face Enhancement", "Anime Support", "Noise Reduction"],
    useCases: ["Photo Restoration", "Art Upscaling", "E-commerce Images", "Print Preparation"],
    speed: "Fast",
    quality: "Excellent",
    pricing: "2 tokens",
  },
  {
    id: "dall-e-3",
    name: "DALL-E 3",
    provider: "OpenAI",
    description: "OpenAI's most advanced image generation model with exceptional prompt understanding and photorealistic output capabilities.",
    features: ["Text-to-Image", "High Resolution", "Style Control", "Prompt Accuracy"],
    useCases: ["Marketing Assets", "Concept Art", "Product Mockups", "Social Media"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "5 tokens",
  },
  {
    id: "stable-diffusion-xl",
    name: "Stable Diffusion XL",
    provider: "Stability AI",
    description: "Open-source powerhouse for image generation with extensive customization options and community-driven improvements.",
    features: ["1024x1024 Native", "ControlNet Support", "LoRA Compatible", "Inpainting"],
    useCases: ["Digital Art", "Game Assets", "Illustrations", "Batch Generation"],
    speed: "Fast",
    quality: "Excellent",
    pricing: "3 tokens",
  },
  {
    id: "flux-pro",
    name: "FLUX Pro",
    provider: "Black Forest Labs",
    description: "Next-generation image model with exceptional coherence, typography rendering, and prompt adherence.",
    features: ["Text Rendering", "High Coherence", "Fine Details", "Style Diversity"],
    useCases: ["Posters", "Logos", "Typography Art", "Professional Design"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "4 tokens",
  },
  {
    id: "midjourney",
    name: "Midjourney",
    provider: "Midjourney",
    description: "Renowned for artistic and aesthetic image generation with a distinctive creative style loved by artists worldwide.",
    features: ["Artistic Style", "Aesthetic Quality", "Creative Prompts", "Version Control"],
    useCases: ["Art Direction", "Mood Boards", "Creative Projects", "Inspiration"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "5 tokens",
  },
  {
    id: "imagen-3",
    name: "Imagen 3",
    provider: "Google",
    description: "Google's latest image generation model with photorealistic output and excellent understanding of complex prompts.",
    features: ["Photorealistic", "Complex Scenes", "Text Integration", "High Resolution"],
    useCases: ["Advertising", "Editorial", "Product Shots", "Realistic Scenes"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "4 tokens",
  },
  {
    id: "codeformer",
    name: "CodeFormer",
    provider: "Research",
    description: "Specialized face restoration model that recovers high-quality facial details from degraded or low-resolution images.",
    features: ["Face Restoration", "Detail Recovery", "Natural Results", "Batch Processing"],
    useCases: ["Portrait Enhancement", "Old Photo Restoration", "Video Frames", "ID Photos"],
    speed: "Fast",
    quality: "Excellent",
    pricing: "2 tokens",
  },
  {
    id: "remove-bg",
    name: "Remove Background",
    provider: "Various",
    description: "Intelligent background removal with edge detection and transparency support for professional cutouts.",
    features: ["Auto Detection", "Edge Refinement", "Transparent Output", "Batch Support"],
    useCases: ["E-commerce", "Product Photos", "Profile Pictures", "Design Assets"],
    speed: "Very Fast",
    quality: "Good",
    pricing: "1 token",
  },
];

const features = [
  { icon: Wand2, title: "AI Enhancement", description: "Automatically enhance photos with intelligent adjustments" },
  { icon: Layers, title: "Batch Processing", description: "Process hundreds of images simultaneously" },
  { icon: Palette, title: "Style Transfer", description: "Apply artistic styles to any image" },
  { icon: Shield, title: "Face Restoration", description: "Restore and enhance facial details" },
  { icon: Upload, title: "Multiple Formats", description: "Support for PNG, JPG, WebP, and more" },
  { icon: Download, title: "High Resolution", description: "Export up to 4K resolution" },
];

export default function ImageStudioPage() {
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
              <Link to="/register" className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-medium text-sm hover:opacity-90 transition">
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <Image className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white">Image Studio</h1>
              <p className="text-emerald-400 font-medium">AI-Powered Image Generation & Enhancement</p>
            </div>
          </div>
          <p className="text-xl text-slate-400 max-w-3xl mb-8">
            Transform, enhance, and generate stunning images with 8+ state-of-the-art AI models. 
            From upscaling old photos to creating photorealistic artwork.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold hover:opacity-90 transition">
              Open Image Studio <ArrowRight className="w-5 h-5" />
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
                <feature.icon className="w-8 h-8 text-emerald-400 mb-3" />
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
          <p className="text-slate-400 mb-8">Choose from industry-leading AI models for every image task</p>
          
          <div className="space-y-6">
            {models.map((model) => (
              <article key={model.id} className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-emerald-500/30 transition">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-white">{model.name}</h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        {model.provider}
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
                            <span key={i} className="px-2 py-1 text-xs rounded-md bg-cyan-500/10 text-cyan-400">{u}</span>
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
                      <div className="text-sm font-medium text-emerald-400">{model.pricing}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-b from-emerald-500/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Images?</h2>
          <p className="text-slate-400 mb-8">Start with 50 free tokens. No credit card required.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold text-lg hover:opacity-90 transition">
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
            <Link to="/studios/video" className="hover:text-white transition">Video Studio</Link>
            <Link to="/studios/sound" className="hover:text-white transition">Sound Studio</Link>
            <Link to="/studios/text" className="hover:text-white transition">Text Studio</Link>
            <Link to="/studios/3d" className="hover:text-white transition">3D Studio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
