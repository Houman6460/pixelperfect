import React from "react";
import { Link } from "react-router-dom";
import { 
  Music, ArrowRight, Sparkles, ChevronLeft, Mic, Radio,
  Volume2, Headphones, AudioWaveform, Guitar, Piano, Drum,
} from "lucide-react";

const models = [
  {
    id: "suno-v4",
    name: "Suno V4",
    provider: "Suno",
    description: "The most advanced AI music generator. Create full songs with vocals, instruments, and professional production quality.",
    features: ["Full Songs", "Custom Lyrics", "Multiple Genres", "Vocal Generation"],
    useCases: ["Original Music", "Jingles", "Background Music", "Song Demos"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "10 tokens",
    type: "Music",
  },
  {
    id: "udio",
    name: "Udio",
    provider: "Udio",
    description: "High-fidelity music generation with exceptional audio quality and diverse genre support.",
    features: ["High Fidelity", "Genre Variety", "Instrumental", "Vocals"],
    useCases: ["Production Music", "Podcast Intros", "Game Audio", "Content Creation"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "10 tokens",
    type: "Music",
  },
  {
    id: "musicgen",
    name: "MusicGen",
    provider: "Meta",
    description: "Meta's open-source music generation model. Great for instrumental tracks and melodic content.",
    features: ["Instrumental Focus", "Melody Control", "Open Source", "Fine-tunable"],
    useCases: ["Background Music", "Ambient Tracks", "Loops", "Sound Design"],
    speed: "Fast",
    quality: "Very Good",
    pricing: "5 tokens",
    type: "Music",
  },
  {
    id: "stable-audio",
    name: "Stable Audio 2.0",
    provider: "Stability AI",
    description: "Professional audio generation with high sample rate output and excellent control over style and structure.",
    features: ["44.1kHz Output", "Long Form", "Style Control", "Stereo"],
    useCases: ["Professional Production", "Film Scoring", "Advertising", "Games"],
    speed: "Medium",
    quality: "Excellent",
    pricing: "8 tokens",
    type: "Music",
  },
  {
    id: "audiocraft",
    name: "AudioCraft",
    provider: "Meta",
    description: "Comprehensive audio generation suite including music, sound effects, and environmental audio.",
    features: ["Music Generation", "Sound Effects", "Environmental Audio", "Compression"],
    useCases: ["Game Development", "Film Post", "Podcasts", "Apps"],
    speed: "Fast",
    quality: "Very Good",
    pricing: "5 tokens",
    type: "Audio",
  },
  {
    id: "bark",
    name: "Bark",
    provider: "Suno",
    description: "Realistic text-to-speech and voice generation with emotional expression and multiple languages.",
    features: ["Text-to-Speech", "Voice Cloning", "Emotions", "Multi-language"],
    useCases: ["Voiceovers", "Audiobooks", "Assistants", "Character Voices"],
    speed: "Fast",
    quality: "Very Good",
    pricing: "3 tokens",
    type: "Voice",
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    provider: "ElevenLabs",
    description: "Industry-leading voice synthesis with natural prosody and extensive voice customization.",
    features: ["Natural Voices", "Voice Cloning", "Emotion Control", "25+ Languages"],
    useCases: ["Professional Voiceover", "Dubbing", "Podcasts", "Games"],
    speed: "Very Fast",
    quality: "Excellent",
    pricing: "4 tokens",
    type: "Voice",
  },
  {
    id: "rvc",
    name: "RVC Voice Conversion",
    provider: "Open Source",
    description: "Real-time voice conversion that transforms your voice into any target voice with minimal latency.",
    features: ["Real-time", "Voice Conversion", "Low Latency", "Custom Models"],
    useCases: ["Live Streaming", "Voice Acting", "Privacy", "Entertainment"],
    speed: "Real-time",
    quality: "Good",
    pricing: "2 tokens",
    type: "Voice",
  },
];

const features = [
  { icon: Music, title: "AI Music Generation", description: "Create original songs and instrumentals" },
  { icon: Mic, title: "Voice Synthesis", description: "Generate realistic speech and voiceovers" },
  { icon: AudioWaveform, title: "Sound Effects", description: "Create custom sound effects and foley" },
  { icon: Headphones, title: "Audio Enhancement", description: "Improve and master existing audio" },
  { icon: Radio, title: "Stem Separation", description: "Split songs into individual tracks" },
  { icon: Volume2, title: "High Quality Export", description: "Export in WAV, MP3, FLAC formats" },
];

export default function SoundStudioPage() {
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition text-sm">
          <ChevronLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>

      {/* Hero */}
      <section className="pt-12 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Music className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white">Sound Studio</h1>
              <p className="text-purple-400 font-medium">AI Music, Voice & Audio Generation</p>
            </div>
          </div>
          <p className="text-xl text-slate-400 max-w-3xl mb-8">
            Generate original music, realistic voices, and professional sound effects with 8+ 
            AI audio models including Suno V4, Udio, and ElevenLabs.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/app" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:opacity-90 transition">
              Open Sound Studio <ArrowRight className="w-5 h-5" />
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
                <feature.icon className="w-8 h-8 text-purple-400 mb-3" />
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
          <p className="text-slate-400 mb-8">Professional-grade audio AI models for every sound need</p>
          
          <div className="space-y-6">
            {models.map((model) => (
              <article key={model.id} className="p-6 rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-purple-500/30 transition">
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-white">{model.name}</h3>
                      <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        {model.provider}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        model.type === "Music" ? "bg-pink-500/20 text-pink-400 border-pink-500/30" :
                        model.type === "Voice" ? "bg-blue-500/20 text-blue-400 border-blue-500/30" :
                        "bg-orange-500/20 text-orange-400 border-orange-500/30"
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
                            <span key={i} className="px-2 py-1 text-xs rounded-md bg-purple-500/10 text-purple-400">{u}</span>
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
                      <div className="text-sm font-medium text-purple-400">{model.pricing}</div>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-b from-purple-500/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Create Amazing Audio?</h2>
          <p className="text-slate-400 mb-8">Start with 50 free tokens. No credit card required.</p>
          <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg hover:opacity-90 transition">
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
            <Link to="/studios/text" className="hover:text-white transition">Text Studio</Link>
            <Link to="/studios/3d" className="hover:text-white transition">3D Studio</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
