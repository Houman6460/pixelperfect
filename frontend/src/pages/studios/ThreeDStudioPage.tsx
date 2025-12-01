import React from "react";
import { Link } from "react-router-dom";
import { 
  Box, ArrowRight, Sparkles, ChevronLeft, Shapes, Layers,
  RotateCcw, Download, Eye, Palette, Move3d, Maximize,
} from "lucide-react";

const models = [
  {
    id: "triposr",
    name: "TripoSR",
    provider: "Stability AI",
    description: "Lightning-fast image-to-3D conversion with excellent quality. Creates detailed 3D meshes in seconds.",
    features: ["Image-to-3D", "Fast Generation", "High Quality Mesh", "GLB Export"],
    useCases: ["Product Visualization", "Game Assets", "E-commerce", "Prototyping"],
    speed: "Very Fast",
    quality: "Excellent",
    pricing: "5 tokens",
    type: "Image-to-3D",
  },
  {
    id: "shap-e",
    name: "Shap-E",
    provider: "OpenAI",
    description: "OpenAI's text-to-3D model that generates implicit 3D representations from text descriptions.",
    features: ["Text-to-3D", "Neural Implicit", "Multiple Views", "Customizable"],
    useCases: ["Concept Art", "Quick Prototypes", "Creative Projects", "Research"],
    speed: "Fast",
    quality: "Good",
    pricing: "3 tokens",
    type: "Text-to-3D",
  },
  {
    id: "point-e",
    name: "Point-E",
    provider: "OpenAI",
    description: "OpenAI's point cloud generation model, ideal for creating 3D point cloud representations.",
    features: ["Text-to-3D", "Point Clouds", "Image Conditioned", "Fast"],
    useCases: ["3D Scanning", "CAD Prototypes", "Research", "Visualization"],
    speed: "Fast",
    quality: "Good",
    pricing: "3 tokens",
    type: "Text-to-3D",
  },
  {
    id: "instantmesh",
    name: "InstantMesh",
    provider: "TencentARC",
    description: "High-quality image-to-3D reconstruction with excellent geometry and texture fidelity.",
    features: ["Image-to-3D", "High Fidelity", "Texture Mapping", "Multiple Formats"],
    useCases: ["Product Photos", "Character Creation", "AR/VR Assets", "3D Printing"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "6 tokens",
    type: "Image-to-3D",
  },
  {
    id: "meshy-text",
    name: "Meshy Text-to-3D",
    provider: "Meshy",
    description: "Professional text-to-3D generation with exceptional detail and production-ready output.",
    features: ["Text-to-3D", "PBR Textures", "High Detail", "Animation Ready"],
    useCases: ["Game Development", "Film Production", "Product Design", "Architecture"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "8 tokens",
    type: "Text-to-3D",
  },
  {
    id: "meshy-image",
    name: "Meshy Image-to-3D",
    provider: "Meshy",
    description: "Convert any image to a detailed 3D model with physically-based materials and textures.",
    features: ["Image-to-3D", "PBR Materials", "UV Mapping", "Multiple Views"],
    useCases: ["Asset Creation", "Reverse Engineering", "Marketing", "Prototyping"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "8 tokens",
    type: "Image-to-3D",
  },
  {
    id: "luma-genie",
    name: "Luma Genie",
    provider: "Luma AI",
    description: "Advanced 3D generation with exceptional quality from Luma AI's research team.",
    features: ["Text-to-3D", "High Quality", "Stylized Output", "Fast Iteration"],
    useCases: ["Creative Projects", "Concept Art", "Game Design", "Marketing"],
    speed: "Fast",
    quality: "Very Good",
    pricing: "6 tokens",
    type: "Text-to-3D",
  },
  {
    id: "wonder3d",
    name: "Wonder3D",
    provider: "Research",
    description: "Single-image to 3D reconstruction with multi-view diffusion for consistent geometry.",
    features: ["Single Image", "Multi-view", "Consistent Geometry", "Textured Output"],
    useCases: ["Photo-to-3D", "Asset Generation", "Research", "Education"],
    speed: "Medium",
    quality: "Very Good",
    pricing: "5 tokens",
    type: "Image-to-3D",
  },
];

const features = [
  { icon: Shapes, title: "Text-to-3D", description: "Generate 3D models from text descriptions" },
  { icon: Layers, title: "Image-to-3D", description: "Convert any image to a 3D model" },
  { icon: Palette, title: "PBR Textures", description: "Physically-based rendering materials" },
  { icon: RotateCcw, title: "360° Preview", description: "Interactive 3D model viewer" },
  { icon: Download, title: "Multiple Formats", description: "Export GLB, OBJ, FBX, USDZ" },
  { icon: Move3d, title: "Animation Ready", description: "Rigged models for animation" },
];

export default function ThreeDStudioPage() {
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
              <Link to="/register" className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium text-sm hover:opacity-90 transition">
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
              <Box className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white">3D Studio</h1>
              <p className="text-cyan-400 font-medium">AI 3D Model Generation</p>
            </div>
          </div>
          <p className="text-xl text-slate-400 max-w-3xl mb-8">
            Generate stunning 3D models from text or images with 8+ AI models including 
            TripoSR, Meshy, InstantMesh, and Luma Genie.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:opacity-90 transition">
              Open 3D Studio <ArrowRight className="w-5 h-5" />
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
                <feature.icon className="w-8 h-8 text-cyan-400 mb-3" />
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
          <p className="text-slate-400 mb-8">State-of-the-art 3D generation models</p>
          
          <div className="space-y-6">
            {models.map((model) => (
              <article key={model.id} className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-cyan-500/30 transition">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-white">{model.name}</h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {model.provider}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        model.type === "Text-to-3D" ? "bg-purple-500/20 text-purple-400 border-purple-500/30" :
                        "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      } border`}>
                        {model.type}
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
                      <div className="text-sm font-medium text-cyan-400">{model.pricing}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-b from-cyan-500/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Create 3D Models?</h2>
          <p className="text-slate-400 mb-8">Start with 50 free tokens. No credit card required.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold text-lg hover:opacity-90 transition">
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
            <Link to="/studios/text" className="hover:text-white transition">Text Studio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
