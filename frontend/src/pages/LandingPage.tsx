import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { subscriptionApi } from "../lib/api";

// Lazy load Lottie to improve initial bundle size and LCP
const Lottie = lazy(() => import("lottie-react"));
import { 
  Sparkles, Zap, Shield, ArrowRight, Check, Star, Play, ChevronRight,
  Image, Video, Music, Type, Box, Wand2, Globe, Users, Award, Clock,
  Cpu, Layers, Palette, FileText, Mic, Film, CuboidIcon, Brain,
  Menu, X, ChevronDown,
} from "lucide-react";

// SEO Meta component would be here in a real app with react-helmet

// ==================== DATA ====================

const studios = [
  {
    id: "image",
    name: "Image Studio",
    icon: Image,
    color: "from-emerald-500 to-cyan-500",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    description: "AI-powered image enhancement, upscaling, and generation",
    features: ["4x AI Upscaling", "Face Restoration", "Background Removal", "Style Transfer", "DALL-E 3 & Imagen 3", "Batch Processing"],
    models: ["Real-ESRGAN", "CodeFormer", "DALL-E 3", "Stable Diffusion XL", "FLUX Pro", "Midjourney"],
  },
  {
    id: "video",
    name: "Video Studio",
    icon: Video,
    color: "from-red-500 to-pink-500",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    description: "Create stunning videos from text or images with AI",
    features: ["Text-to-Video", "Image-to-Video", "Video Upscaling", "Frame Interpolation", "Audio Generation", "4K Output"],
    models: ["Google Veo 3", "OpenAI Sora 2", "Runway Gen-3", "Kling 2.5", "Luma Ray 2", "Stable Video"],
  },
  {
    id: "sound",
    name: "Sound Studio",
    icon: Music,
    color: "from-purple-500 to-pink-500",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    description: "Generate music, sound effects, and audio with AI",
    features: ["AI Music Generation", "Custom Lyrics", "Sound Effects", "Voice Cloning", "Audio Enhancement", "Stem Separation"],
    models: ["Suno V4", "Udio", "MusicGen", "Stable Audio", "AudioCraft", "Bark"],
  },
  {
    id: "text",
    name: "Text Studio",
    icon: Type,
    color: "from-indigo-500 to-purple-500",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/30",
    description: "Access all major LLMs for text generation and chat",
    features: ["Multi-Model Chat", "Creative Writing", "Code Generation", "Document Analysis", "Translation", "AI Personas"],
    models: ["GPT-4o", "Claude 3.5", "Gemini 2.0", "Llama 3.3", "Mistral Large", "DeepSeek V3"],
  },
  {
    id: "3d",
    name: "3D Studio",
    icon: Box,
    color: "from-cyan-500 to-blue-500",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    description: "Generate 3D models from text or images instantly",
    features: ["Text-to-3D", "Image-to-3D", "3D Texturing", "Mesh Refinement", "Multiple Formats", "Animation Ready"],
    models: ["TripoSR", "Shap-E", "InstantMesh", "Meshy", "Luma Genie", "Wonder3D"],
  },
];

const stats = [
  { value: "50M+", label: "Creations Generated", icon: Sparkles },
  { value: "100K+", label: "Active Creators", icon: Users },
  { value: "99.9%", label: "Uptime", icon: Zap },
  { value: "4.9/5", label: "User Rating", icon: Star },
];

const features = [
  { icon: Cpu, title: "Cutting-Edge AI", description: "Access the latest AI models from OpenAI, Google, Anthropic, Meta, and more." },
  { icon: Zap, title: "Lightning Fast", description: "Generate content in seconds with our optimized GPU infrastructure." },
  { icon: Shield, title: "Enterprise Security", description: "Bank-level encryption and SOC 2 compliance for your data." },
  { icon: Globe, title: "Global CDN", description: "Fast delivery worldwide with edge caching and optimization." },
  { icon: Layers, title: "API Access", description: "Integrate AI capabilities into your apps with our REST API." },
  { icon: Award, title: "Premium Support", description: "24/7 dedicated support from AI experts." },
];

const testimonials = [
  { name: "Sarah Chen", role: "Digital Artist", avatar: "SC", content: "PixelPerfect transformed my workflow. The image upscaling is incredible!", rating: 5 },
  { name: "Marcus Johnson", role: "Video Producer", avatar: "MJ", content: "Veo 3 and Sora integration saved me thousands in production costs.", rating: 5 },
  { name: "Emily Rodriguez", role: "Content Creator", avatar: "ER", content: "The Text Studio with all LLMs in one place is a game changer.", rating: 5 },
];

// Individual Studio Plans
const individualPlans = [
  { name: "Image Studio", basePrice: 9.99, tokens: "500", features: ["AI Image Generation", "Image Enhancement", "Background Removal", "Style Transfer", "500 tokens/month"], cta: "Subscribe", href: "/pricing", highlighted: false, isCustom: false, icon: "image" },
  { name: "Video Studio", basePrice: 14.99, tokens: "750", features: ["AI Video Generation", "Video Enhancement", "Text-to-Video", "Image-to-Video", "750 tokens/month"], cta: "Subscribe", href: "/pricing", highlighted: true, isCustom: false, icon: "video" },
  { name: "Sound Studio", basePrice: 12.99, tokens: "600", features: ["AI Music Generation", "Voice Cloning", "Audio Enhancement", "Stem Separation", "600 tokens/month"], cta: "Subscribe", href: "/pricing", highlighted: false, isCustom: false, icon: "sound" },
  { name: "Text Studio", basePrice: 7.99, tokens: "400", features: ["GPT-4o & Claude Access", "AI Chat & Completion", "Content Writing", "Code Generation", "400 tokens/month"], cta: "Subscribe", href: "/pricing", highlighted: false, isCustom: false, icon: "text" },
  { name: "3D Studio", basePrice: 14.99, tokens: "500", features: ["Text-to-3D Generation", "Image-to-3D Conversion", "3D Model Export", "Multiple Formats", "500 tokens/month"], cta: "Subscribe", href: "/pricing", highlighted: false, isCustom: false, icon: "3d" },
];

// Collection Bundle Plans
const collectionPlans = [
  { name: "Creative Collection", basePrice: 29.99, tokens: "1,500", features: ["Image Studio - Full Access", "Video Studio - Full Access", "Sound Studio - Full Access", "Priority Processing", "1,500 tokens/month", "Save 20% vs Individual"], cta: "Subscribe", href: "/pricing", highlighted: true, isCustom: false },
  { name: "Advanced Collection", basePrice: 49.99, tokens: "3,000", features: ["All 5 Studios - Full Access", "Priority Processing", "API Access", "3,000 tokens/month", "Dedicated Support", "Save 35% vs Individual"], cta: "Subscribe", href: "/pricing", highlighted: false, isCustom: false },
];

// Full Tier Plans (Free, Creator, Professional, Enterprise)
const fullPlans = [
  { name: "Free", basePrice: 0, tokens: "50", features: ["50 tokens/month", "Image Studio only", "Basic models", "Web interface"], cta: "Get Started", href: "/register", highlighted: false, isCustom: false },
  { name: "Creator", basePrice: 19, tokens: "1,000", features: ["1,000 tokens/month", "Choose 2 Studios", "All premium models", "Priority processing", "Email support"], cta: "Start Free Trial", href: "/pricing", highlighted: false, isCustom: false },
  { name: "Professional", basePrice: 49, tokens: "5,000", features: ["5,000 tokens/month", "All 5 Studios", "Fastest processing", "Full API access", "Priority support", "Team features"], cta: "Start Free Trial", href: "/pricing", highlighted: true, isCustom: false },
  { name: "Enterprise", basePrice: 0, tokens: "Unlimited", features: ["Unlimited tokens", "All Studios + Custom", "Dedicated infrastructure", "SLA guarantee", "Account manager", "Custom integrations"], cta: "Contact Sales", href: "/contact", highlighted: false, isCustom: true },
];

// Plan category tabs
const planCategories = [
  { key: "individual", label: "Individual Studios", description: "Subscribe to specific studios" },
  { key: "collection", label: "Collections", description: "Bundled studio packages" },
  { key: "full", label: "Full Plans", description: "Complete tier-based plans" },
];

const faqs = [
  { q: "What AI models are available?", a: "We offer 50+ AI models including GPT-4o, Claude 3.5, Gemini 2.0, DALL-E 3, Stable Diffusion, Suno, and many more across all creative domains." },
  { q: "How do tokens work?", a: "Tokens are our universal credit system. Different operations cost different amounts - simple tasks use fewer tokens while complex generations use more." },
  { q: "Can I use the API?", a: "Yes! Creator plans and above include API access. Our REST API supports all studios and models with comprehensive documentation." },
  { q: "Is my data secure?", a: "Absolutely. We use bank-level encryption, don't train on your data, and are SOC 2 compliant. Enterprise plans include additional security features." },
];

// AI Provider logos - using text logos with brand colors
const providers = [
  { name: "OpenAI", color: "text-emerald-400", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/20" },
  { name: "Google", color: "text-blue-400", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/20" },
  { name: "Anthropic", color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20" },
  { name: "Meta", color: "text-blue-500", bgColor: "bg-blue-600/10", borderColor: "border-blue-600/20" },
  { name: "Stability AI", color: "text-purple-400", bgColor: "bg-purple-500/10", borderColor: "border-purple-500/20" },
  { name: "Mistral", color: "text-orange-500", bgColor: "bg-orange-600/10", borderColor: "border-orange-600/20" },
  { name: "Runway", color: "text-cyan-400", bgColor: "bg-cyan-500/10", borderColor: "border-cyan-500/20" },
  { name: "Luma AI", color: "text-violet-400", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/20" },
  { name: "Suno", color: "text-pink-400", bgColor: "bg-pink-500/10", borderColor: "border-pink-500/20" },
  { name: "ElevenLabs", color: "text-indigo-400", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/20" },
  { name: "Replicate", color: "text-yellow-400", bgColor: "bg-yellow-500/10", borderColor: "border-yellow-500/20" },
  { name: "Black Forest Labs", color: "text-slate-300", bgColor: "bg-slate-500/10", borderColor: "border-slate-500/20" },
  { name: "DeepSeek", color: "text-teal-400", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/20" },
  { name: "Alibaba", color: "text-orange-400", bgColor: "bg-orange-500/10", borderColor: "border-orange-500/20" },
  { name: "MiniMax", color: "text-red-400", bgColor: "bg-red-500/10", borderColor: "border-red-500/20" },
  { name: "Meshy", color: "text-green-400", bgColor: "bg-green-500/10", borderColor: "border-green-500/20" },
];

// ==================== STAR ANIMATION COMPONENT ====================

interface StarAnimationProps {
  animationData: object | null;
  isHovered: boolean;
}

function StarAnimation({ animationData, isHovered }: StarAnimationProps) {
  const lottieRef = useRef<any>(null);
  const [hasPlayed, setHasPlayed] = useState(false);

  useEffect(() => {
    if (!lottieRef.current) return;
    
    if (isHovered && !hasPlayed) {
      lottieRef.current.goToAndPlay(0, true);
      setHasPlayed(true);
    } else if (!isHovered) {
      setHasPlayed(false);
      lottieRef.current.goToAndStop(0, true);
    }
  }, [isHovered, hasPlayed]);

  if (!animationData) return null;

  return (
    <div className={`absolute top-4 right-4 w-12 h-12 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
      <Suspense fallback={null}>
        <Lottie
          lottieRef={lottieRef}
          animationData={animationData}
          loop={false}
          autoplay={false}
          className="w-full h-full"
        />
      </Suspense>
    </div>
  );
}

// ==================== STUDIO CARD COMPONENT ====================

interface StudioCardProps {
  studio: typeof studios[0];
  starAnimation: object | null;
}

function StudioCard({ studio, starAnimation }: StudioCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <article 
      className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-800/30 border ${studio.borderColor} hover:bg-slate-800/50 transition group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <StarAnimation animationData={starAnimation} isHovered={isHovered} />
      
      <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${studio.color} mb-3 sm:mb-4 group-hover:scale-110 transition`}>
        <studio.icon className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
      </div>
      <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{studio.name}</h3>
      <p className="text-slate-400 text-sm sm:text-base mb-3 sm:mb-4">{studio.description}</p>
      
      <div className="mb-4">
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Features</div>
        <div className="flex flex-wrap gap-2">
          {studio.features.slice(0, 4).map((f, i) => (
            <span key={i} className="px-2 py-1 text-xs rounded-md bg-slate-700/50 text-slate-300">{f}</span>
          ))}
        </div>
      </div>
      
      <div>
        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Top Models</div>
        <div className="text-sm text-slate-400">{studio.models.slice(0, 4).join(" • ")}</div>
      </div>
      
      <Link to={`/studios/${studio.id}`} className={`mt-4 inline-flex items-center gap-1 text-sm font-medium bg-gradient-to-r ${studio.color} bg-clip-text text-transparent hover:gap-2 transition-all`}>
        Learn More <ChevronRight className="w-4 h-4" />
      </Link>
    </article>
  );
}

// ==================== COMPONENT ====================

// Billing periods with discounts
const billingPeriods = [
  { key: "monthly", label: "Monthly", months: 1, discount: 0 },
  { key: "quarterly", label: "3 Months", months: 3, discount: 10 },
  { key: "biannual", label: "6 Months", months: 6, discount: 15 },
  { key: "annual", label: "Annual", months: 12, discount: 20 },
];

// Plan type from API
interface ApiPlan {
  id: string;
  name: string;
  description: string;
  type: string;
  base_price: number;
  tokens_per_month: number;
  studios: string[];
  features: string[];
  is_active: number;
  pricing?: Array<{
    period: string;
    label: string;
    months: number;
    discount: number;
    monthlyPrice: number;
    totalPrice: number;
  }>;
}

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [robotAnimation, setRobotAnimation] = useState<object | null>(null);
  const [rocketAnimation, setRocketAnimation] = useState<object | null>(null);
  const [starAnimation, setStarAnimation] = useState<object | null>(null);
  const [robotTilt, setRobotTilt] = useState({ x: 0, y: 0 });
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState("monthly");
  const [selectedPlanCategory, setSelectedPlanCategory] = useState("individual");
  const [apiPlans, setApiPlans] = useState<ApiPlan[]>([]);
  const [apiBillingPeriods, setApiBillingPeriods] = useState<typeof billingPeriods>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const robotContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch plans from API
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await subscriptionApi.getPlans();
        if (response.data?.success && response.data?.data) {
          setApiPlans(response.data.data.plans || []);
          if (response.data.data.billingPeriods?.length > 0) {
            setApiBillingPeriods(response.data.data.billingPeriods.map((bp: any) => ({
              key: bp.period,
              label: bp.label,
              months: bp.months,
              discount: bp.discount_percent,
            })));
          }
        }
      } catch (error) {
        console.error('Failed to fetch plans from API, using fallback:', error);
        // Fallback to static plans is automatic via getCurrentPlans
      } finally {
        setPlansLoading(false);
      }
    };
    fetchPlans();
  }, []);
  
  // Get current plans based on selected category (API-first with fallback)
  const getCurrentPlans = () => {
    // If we have API plans, filter by category
    if (apiPlans.length > 0) {
      const typeMap: Record<string, string[]> = {
        individual: ['individual'],
        collection: ['collection', 'advanced'],
        full: ['tier'],
      };
      const types = typeMap[selectedPlanCategory] || ['individual'];
      const filtered = apiPlans.filter(p => types.includes(p.type));
      
      // Convert API format to component format
      return filtered.map(p => ({
        name: p.name,
        basePrice: p.base_price,
        tokens: p.tokens_per_month > 0 ? p.tokens_per_month.toLocaleString() : 'Unlimited',
        features: p.features || [],
        cta: p.base_price === 0 ? (p.type === 'tier' ? 'Get Started' : 'Contact Sales') : 'Subscribe',
        href: p.base_price === 0 && p.type === 'tier' && p.name === 'Free' ? '/register' : '/pricing',
        highlighted: p.name === 'Professional' || p.name === 'Video Studio' || p.name === 'Creative Collection',
        isCustom: p.name === 'Enterprise',
        icon: p.studios[0] || 'image',
      }));
    }
    
    // Fallback to static plans
    switch (selectedPlanCategory) {
      case "individual": return individualPlans;
      case "collection": return collectionPlans;
      case "full": return fullPlans;
      default: return individualPlans;
    }
  };
  
  // Calculate price with discount (use API billing periods if available)
  const calculatePrice = (basePrice: number) => {
    const periods = apiBillingPeriods.length > 0 ? apiBillingPeriods : billingPeriods;
    const period = periods.find(p => p.key === selectedBillingPeriod);
    if (!period || basePrice === 0) return { monthly: basePrice, total: basePrice, discount: 0 };
    const discountedMonthly = basePrice * (1 - period.discount / 100);
    return {
      monthly: discountedMonthly,
      total: discountedMonthly * period.months,
      discount: period.discount,
    };
  };

  useEffect(() => {
    // Defer animation loading to improve LCP - load after initial paint
    const loadAnimations = () => {
      // Load rocket animation first (visible in hero)
      fetch("/animations/rocket.json")
        .then((res) => res.json())
        .then((data) => setRocketAnimation(data))
        .catch((err) => console.error("Failed to load rocket animation:", err));
      
      // Load other animations with slight delay
      setTimeout(() => {
        fetch("/animations/robot.json")
          .then((res) => res.json())
          .then((data) => setRobotAnimation(data))
          .catch((err) => console.error("Failed to load robot animation:", err));
        
        fetch("/animations/star.json")
          .then((res) => res.json())
          .then((data) => setStarAnimation(data))
          .catch((err) => console.error("Failed to load star animation:", err));
      }, 100);
    };

    // Use requestIdleCallback for non-critical animations, fallback to setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadAnimations, { timeout: 2000 });
    } else {
      setTimeout(loadAnimations, 100);
    }
  }, []);

  // Mouse tracking for robot interaction
  const handleRobotMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!robotContainerRef.current) return;
    const rect = robotContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -15;
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 15;
    setRobotTilt({ x: rotateX, y: rotateY });
  };

  const handleRobotMouseLeave = () => {
    setRobotTilt({ x: 0, y: 0 });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* SEO - In production, use react-helmet */}
      <title>PixelPerfect AI - All-in-One AI Creative Studio | Image, Video, Music, Text, 3D</title>
      
      {/* Navigation */}
      <nav className="border-b border-slate-800/50 backdrop-blur-xl sticky top-0 z-50 bg-slate-950/80" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center gap-2" aria-label="PixelPerfect AI Home">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                PixelPerfect AI
              </span>
            </Link>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <a href="#studios" className="text-slate-300 hover:text-white transition text-sm">Studios</a>
              <a href="#features" className="text-slate-300 hover:text-white transition text-sm">Features</a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition text-sm">Pricing</a>
              <a href="#faq" className="text-slate-300 hover:text-white transition text-sm">FAQ</a>
            </div>
            
            <div className="hidden md:flex items-center gap-3">
              <Link to="/login" className="px-4 py-2 text-slate-300 hover:text-white transition text-sm">Sign In</Link>
              <Link to="/register" className="px-5 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium text-sm hover:opacity-90 transition">
                Get Started Free
              </Link>
            </div>
            
            {/* Mobile menu button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-300" aria-label="Toggle menu">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
          
          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-slate-800">
              <div className="flex flex-col gap-3">
                <a href="#studios" className="px-4 py-2 text-slate-300 hover:text-white">Studios</a>
                <a href="#features" className="px-4 py-2 text-slate-300 hover:text-white">Features</a>
                <a href="#pricing" className="px-4 py-2 text-slate-300 hover:text-white">Pricing</a>
                <a href="#faq" className="px-4 py-2 text-slate-300 hover:text-white">FAQ</a>
                <div className="flex gap-2 px-4 pt-2">
                  <Link to="/login" className="flex-1 py-2 text-center text-slate-300 border border-slate-700 rounded-lg">Sign In</Link>
                  <Link to="/register" className="flex-1 py-2 text-center bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg">Get Started</Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 sm:pt-24 pb-20 px-4 relative overflow-hidden" aria-labelledby="hero-heading">
        {/* Animated Mesh Gradient Background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Gradient Orbs */}
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-blob" />
          <div className="absolute top-1/3 -right-20 w-96 h-96 bg-pink-500/30 rounded-full blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-cyan-500/30 rounded-full blur-3xl animate-blob animation-delay-4000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/20 rounded-full blur-3xl animate-pulse-slow" />
          
          {/* Grid overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
          
          {/* Radial fade */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950" />
        </div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex items-center">
            {/* Rocket Animation - Left Side (hidden on mobile) */}
            <div className="hidden lg:flex flex-shrink-0 w-64 xl:w-80 items-center justify-center">
              {rocketAnimation && (
                <div className="relative w-full animate-float">
                  <Suspense fallback={<div className="w-full aspect-square" />}>
                    <Lottie 
                      animationData={rocketAnimation} 
                      loop={true}
                      className="w-full h-auto drop-shadow-[0_0_20px_rgba(168,85,247,0.4)]"
                    />
                  </Suspense>
                </div>
              )}
            </div>
            
            {/* Hero Content - Center */}
            <div className="text-center flex-1 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 mb-6 backdrop-blur-sm">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-sm text-purple-300">Trusted by 100,000+ creators worldwide</span>
              </div>
              
              <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white mb-6 leading-tight">
                One Platform for All
                <br />
                <span className="text-rotate-container inline-block">
                  <span className="text-rotate-item bg-gradient-to-r from-emerald-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                    AI Creation
                  </span>
                  <span className="text-rotate-item bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                    AI Generation
                  </span>
                  <span className="text-rotate-item bg-gradient-to-r from-pink-400 via-rose-400 to-orange-400 bg-clip-text text-transparent">
                    AI Production
                  </span>
                  <span className="text-rotate-item bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent">
                    AI Content
                  </span>
                  <span className="text-rotate-item bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
                    AI Media
                  </span>
                  <span className="text-rotate-item bg-gradient-to-r from-amber-400 via-yellow-400 to-lime-400 bg-clip-text text-transparent">
                    AI Design
                  </span>
                  <span className="text-rotate-item bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                    AI Development
                  </span>
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8">
                Generate images, videos, music, text, and 3D models with 50+ AI models. 
                From GPT-4o to Sora, all creative AI tools in one place.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg hover:opacity-90 transition shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105">
                  Start Creating Free <ArrowRight className="w-5 h-5" />
                </Link>
                <Link to="/app" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-800/80 text-white font-semibold text-lg hover:bg-slate-700 transition border border-slate-700 backdrop-blur-sm hover:scale-105">
                  <Play className="w-5 h-5" /> Try Demo
                </Link>
              </div>
              
              {/* Studio Pills */}
              <div className="flex flex-wrap justify-center gap-3">
                {studios.map((studio) => (
                  <div key={studio.id} className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${studio.bgColor} border ${studio.borderColor} backdrop-blur-sm hover:scale-105 transition cursor-pointer`}>
                    <studio.icon className="w-4 h-4" />
                    <span className="text-sm font-medium text-white">{studio.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Empty space on right for balance (hidden on mobile) */}
            <div className="hidden lg:block flex-shrink-0 w-64 xl:w-80" />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 border-y border-slate-800/50 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 mb-3">
                  <stat.icon className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Providers/Partners Section */}
      <section className="py-16 px-4" aria-labelledby="providers-heading">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <h2 id="providers-heading" className="text-2xl sm:text-3xl font-bold text-white mb-3">
              Powered by Industry Leaders
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Access 50+ AI models from the world's most innovative AI companies
            </p>
          </div>
          
          {/* Animated logo marquee effect - hidden on mobile */}
          <div className="relative overflow-hidden hidden md:block">
            {/* Gradient masks */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-slate-950 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-slate-950 to-transparent z-10 pointer-events-none" />
            
            {/* First row - scrolling left */}
            <div className="flex gap-4 mb-4 animate-marquee-slow">
              {[...providers, ...providers].map((provider, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 px-6 py-3 rounded-xl ${provider.bgColor} border ${provider.borderColor} hover:scale-105 transition-transform cursor-default`}
                >
                  <span className={`font-semibold ${provider.color} whitespace-nowrap`}>
                    {provider.name}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Second row - scrolling right */}
            <div className="flex gap-4 animate-marquee-slow-reverse">
              {[...providers.slice(8), ...providers.slice(0, 8), ...providers.slice(8), ...providers.slice(0, 8)].map((provider, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 px-6 py-3 rounded-xl ${provider.bgColor} border ${provider.borderColor} hover:scale-105 transition-transform cursor-default`}
                >
                  <span className={`font-semibold ${provider.color} whitespace-nowrap`}>
                    {provider.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Static grid for smaller screens */}
          <div className="flex flex-wrap justify-center gap-3 md:hidden">
            {providers.slice(0, 8).map((provider, i) => (
              <div
                key={i}
                className={`px-4 py-2 rounded-lg ${provider.bgColor} border ${provider.borderColor}`}
              >
                <span className={`text-sm font-medium ${provider.color}`}>
                  {provider.name}
                </span>
              </div>
            ))}
            <div className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50">
              <span className="text-sm font-medium text-slate-400">+8 more</span>
            </div>
          </div>
        </div>
      </section>

      {/* Studios Section */}
      <section id="studios" className="py-20 px-4" aria-labelledby="studios-heading">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 id="studios-heading" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              Five Powerful AI Studios
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg">
              Everything you need to create stunning content, all in one platform
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {/* First 4 studios: Image, Video, Sound, Text */}
            {studios.slice(0, 4).map((studio) => (
              <StudioCard key={studio.id} studio={studio} starAnimation={starAnimation} />
            ))}
            
            {/* Robot Animation - middle position (5th slot) - Interactive! */}
            <div 
              ref={robotContainerRef}
              onMouseMove={handleRobotMouseMove}
              onMouseLeave={handleRobotMouseLeave}
              className="hidden xl:flex items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-purple-500/5 to-cyan-500/5 border border-purple-500/20 cursor-pointer group/robot relative overflow-hidden"
              style={{ perspective: "1000px" }}
            >
              {/* Purple glow behind robot */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 bg-purple-500/20 rounded-full blur-3xl group-hover/robot:bg-purple-500/30 group-hover/robot:w-56 group-hover/robot:h-56 transition-all duration-500" />
              </div>
              
              {robotAnimation && (
                <div 
                  className="relative w-full max-w-[280px] aspect-square transition-transform duration-200 ease-out z-10"
                  style={{
                    transform: `rotateX(${robotTilt.x}deg) rotateY(${robotTilt.y}deg) scale(${robotTilt.x !== 0 || robotTilt.y !== 0 ? 1.05 : 1})`,
                    transformStyle: "preserve-3d",
                  }}
                >
                  <Suspense fallback={<div className="w-full h-full bg-purple-500/10 rounded-full animate-pulse" />}>
                    <Lottie 
                      animationData={robotAnimation} 
                      loop={true}
                      className="w-full h-full drop-shadow-[0_0_15px_rgba(168,85,247,0.3)] group-hover/robot:drop-shadow-[0_0_30px_rgba(168,85,247,0.6)] transition-all duration-300"
                    />
                  </Suspense>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-center">
                    <p className="text-sm font-medium bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent group-hover/robot:scale-110 transition-transform">
                      AI-Powered Creation
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* 3D Studio - last position (6th slot) */}
            {studios.slice(4).map((studio) => (
              <StudioCard key={studio.id} studio={studio} starAnimation={starAnimation} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-slate-900/50" aria-labelledby="features-heading">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 id="features-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Built for Professionals
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              Enterprise-grade features for creators, businesses, and developers
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((feature, i) => (
              <div key={i} className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-800/30 border border-slate-700/50 hover:border-purple-500/30 transition">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4" aria-labelledby="testimonials-heading">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 id="testimonials-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Loved by Creators
            </h2>
            <p className="text-slate-400">See what our users are saying</p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((t, i) => (
              <blockquote key={i} className="p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-slate-800/30 border border-slate-700/50">
                <div className="flex gap-1 mb-4">
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-4">"{t.content}"</p>
                <footer className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-medium text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-medium text-white">{t.name}</div>
                    <div className="text-sm text-slate-400">{t.role}</div>
                  </div>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-slate-900/50" aria-labelledby="pricing-heading">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <h2 id="pricing-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto mb-6">
              Start free, upgrade when you need more. No hidden fees.
            </p>
            
            {/* Plan Category Selector */}
            <div className="flex justify-center gap-2 mb-6">
              {planCategories.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedPlanCategory(category.key)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    selectedPlanCategory === category.key
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent shadow-lg shadow-purple-500/25"
                      : "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-slate-600 hover:text-white"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
            
            {/* Billing Period Selector */}
            <div className="inline-flex items-center gap-1 bg-slate-800 rounded-xl p-1">
              {billingPeriods.map((period) => (
                <button
                  key={period.key}
                  onClick={() => setSelectedBillingPeriod(period.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedBillingPeriod === period.key
                      ? "bg-purple-500 text-white shadow-lg shadow-purple-500/25"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {period.label}
                  {period.discount > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                      -{period.discount}%
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
          
          <div className={`grid gap-4 sm:gap-6 ${
            selectedPlanCategory === "individual" ? "sm:grid-cols-2 lg:grid-cols-5" :
            selectedPlanCategory === "collection" ? "sm:grid-cols-2 max-w-3xl mx-auto" :
            "sm:grid-cols-2 lg:grid-cols-4"
          }`}>
            {getCurrentPlans().map((plan, i) => {
              const pricing = calculatePrice(plan.basePrice);
              
              return plan.highlighted ? (
                /* Professional Card with Glowing Border Effect */
                <div key={i} className="relative group">
                  {/* Animated gradient border */}
                  <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 via-purple-600 to-pink-600 opacity-75 blur-sm group-hover:opacity-100 transition duration-500 animate-gradient-border" />
                  <div className="absolute -inset-[2px] rounded-2xl bg-gradient-to-r from-purple-600 via-pink-600 via-purple-600 to-pink-600 animate-gradient-border" />
                  
                  {/* Card content */}
                  <div className="relative p-6 rounded-2xl bg-slate-900 h-full">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium shadow-lg shadow-purple-500/25">
                      Most Popular
                    </div>
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl font-bold text-white">${pricing.monthly.toFixed(0)}</span>
                        <span className="text-slate-400">/month</span>
                      </div>
                      {pricing.discount > 0 && (
                        <div className="mt-1 text-xs text-slate-500 line-through">${plan.basePrice}/month</div>
                      )}
                      <div className="mt-2 text-sm text-purple-400">{plan.tokens} tokens/month</div>
                    </div>
                    <ul className="space-y-3 mb-6">
                      {plan.features.map((f, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                          <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to={plan.href} className="block w-full py-3 rounded-lg font-medium text-center transition bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 shadow-lg shadow-purple-500/25">
                      {plan.cta}
                    </Link>
                  </div>
                </div>
              ) : (
                /* Regular Cards */
                <div key={i} className="p-6 rounded-2xl border relative bg-slate-800/30 border-slate-700/50 hover:border-slate-600/50 transition">
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-semibold text-white mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      {plan.isCustom ? (
                        <span className="text-4xl font-bold text-white">Custom</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-white">
                            ${plan.basePrice === 0 ? "0" : pricing.monthly.toFixed(0)}
                          </span>
                          <span className="text-slate-400">{plan.basePrice === 0 ? " forever" : "/month"}</span>
                        </>
                      )}
                    </div>
                    {pricing.discount > 0 && plan.basePrice > 0 && (
                      <div className="mt-1 text-xs text-slate-500 line-through">${plan.basePrice}/month</div>
                    )}
                    <div className="mt-2 text-sm text-purple-400">{plan.tokens} tokens/month</div>
                  </div>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link to={plan.href} className="block w-full py-3 rounded-lg font-medium text-center transition bg-slate-700 text-white hover:bg-slate-600">
                    {plan.cta}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4" aria-labelledby="faq-heading">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 id="faq-heading" className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div key={i} className="rounded-xl border border-slate-700/50 overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full px-6 py-4 flex items-center justify-between text-left bg-slate-800/30 hover:bg-slate-800/50 transition" aria-expanded={openFaq === i ? "true" : "false"}>
                  <span className="font-medium text-white">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 py-4 bg-slate-800/20 text-slate-400">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-purple-500/5 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to Create with AI?
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Join 100,000+ creators using PixelPerfect AI to bring their ideas to life.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-lg hover:opacity-90 transition">
              Start Free Today <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/app" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-slate-800 text-white font-semibold text-lg hover:bg-slate-700 transition border border-slate-700">
              Explore Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-12 px-4 bg-slate-950" role="contentinfo">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link to="/" className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold text-white">PixelPerfect AI</span>
              </Link>
              <p className="text-sm text-slate-400">The all-in-one AI creative platform for images, videos, music, text, and 3D.</p>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Studios</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/studios/image" className="hover:text-white transition">Image Studio</Link></li>
                <li><Link to="/studios/video" className="hover:text-white transition">Video Studio</Link></li>
                <li><Link to="/studios/sound" className="hover:text-white transition">Sound Studio</Link></li>
                <li><Link to="/studios/text" className="hover:text-white transition">Text Studio</Link></li>
                <li><Link to="/studios/3d" className="hover:text-white transition">3D Studio</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">About</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Careers</a></li>
                <li><a href="#" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/legal/privacy" className="hover:text-white transition">Privacy Policy</Link></li>
                <li><Link to="/legal/terms" className="hover:text-white transition">Terms of Service</Link></li>
                <li><Link to="/legal/cookies" className="hover:text-white transition">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-slate-400 text-sm">© {new Date().getFullYear()} PixelPerfect AI. All rights reserved.</div>
            <div className="flex gap-4">
              <a href="#" className="text-slate-400 hover:text-white transition" aria-label="Twitter"><i className="fa-brands fa-twitter" /></a>
              <a href="#" className="text-slate-400 hover:text-white transition" aria-label="GitHub"><i className="fa-brands fa-github" /></a>
              <a href="#" className="text-slate-400 hover:text-white transition" aria-label="Discord"><i className="fa-brands fa-discord" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
