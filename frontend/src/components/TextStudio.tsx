import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  MessageSquare, FileText, Sparkles, Wand2, Send, Copy, Download, Loader2,
  Settings, ChevronDown, RefreshCw, Trash2, Plus, Save, FolderOpen, History,
  Users, Bot, Brain, Zap, Star, Clock, DollarSign, Filter, Check, AlertCircle,
  BookOpen, Code, Search, Database, FileUp, Palette, Shuffle, Layers, Target,
  PenTool, Edit3, Type, AlignLeft, Globe, Image as ImageIcon, X,
} from "lucide-react";

// Dynamic API base URL
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('pages.dev')) {
    return 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';
  }
  return 'http://localhost:4000';
};
const API_BASE = getApiBaseUrl();

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ===================== MODEL DEFINITIONS =====================
interface LLMModel {
  id: string;
  name: string;
  provider: string;
  providerColor: string;
  description: string;
  contextLength: number;
  speed: "fast" | "standard" | "slow";
  quality: "standard" | "high" | "premium";
  cost: "free" | "low" | "medium" | "high" | "premium";
  features: string[];
  capabilities: string[];
  apiType: "replicate" | "openai" | "anthropic" | "google" | "direct";
  modelId: string;
  isNew?: boolean;
  isFeatured?: boolean;
  supportsVision?: boolean;
  supportsTools?: boolean;
  supportsStreaming?: boolean;
}

const ALL_LLM_MODELS: LLMModel[] = [
  // OpenAI
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", providerColor: "bg-emerald-500", description: "Most capable multimodal model", contextLength: 128000, speed: "fast", quality: "premium", cost: "high", features: ["Vision", "Function calling", "JSON mode"], capabilities: ["text", "vision", "code"], apiType: "openai", modelId: "gpt-4o", isFeatured: true, supportsVision: true, supportsTools: true, supportsStreaming: true },
  { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", providerColor: "bg-emerald-500", description: "Fast and affordable multimodal", contextLength: 128000, speed: "fast", quality: "high", cost: "low", features: ["Vision", "Function calling"], capabilities: ["text", "vision", "code"], apiType: "openai", modelId: "gpt-4o-mini", supportsVision: true, supportsTools: true, supportsStreaming: true },
  { id: "o1-preview", name: "o1 Preview", provider: "OpenAI", providerColor: "bg-emerald-500", description: "Advanced reasoning model", contextLength: 128000, speed: "slow", quality: "premium", cost: "premium", features: ["Advanced reasoning", "Chain of thought"], capabilities: ["reasoning", "math", "code"], apiType: "openai", modelId: "o1-preview", isNew: true },
  { id: "o1-mini", name: "o1 Mini", provider: "OpenAI", providerColor: "bg-emerald-500", description: "Fast reasoning for code and math", contextLength: 128000, speed: "standard", quality: "high", cost: "medium", features: ["Reasoning", "Code generation"], capabilities: ["reasoning", "math", "code"], apiType: "openai", modelId: "o1-mini", isNew: true },
  // Anthropic
  { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet", provider: "Anthropic", providerColor: "bg-purple-500", description: "Best balance of intelligence and speed", contextLength: 200000, speed: "fast", quality: "premium", cost: "medium", features: ["Vision", "200K context", "Artifacts"], capabilities: ["text", "vision", "code", "creative"], apiType: "anthropic", modelId: "claude-3-5-sonnet-20241022", isFeatured: true, supportsVision: true, supportsTools: true, supportsStreaming: true },
  { id: "claude-3-5-haiku", name: "Claude 3.5 Haiku", provider: "Anthropic", providerColor: "bg-purple-500", description: "Fastest Claude model", contextLength: 200000, speed: "fast", quality: "high", cost: "low", features: ["Vision", "200K context"], capabilities: ["text", "vision", "code"], apiType: "anthropic", modelId: "claude-3-5-haiku-20241022", isNew: true, supportsVision: true, supportsTools: true, supportsStreaming: true },
  { id: "claude-3-opus", name: "Claude 3 Opus", provider: "Anthropic", providerColor: "bg-purple-500", description: "Most powerful Claude", contextLength: 200000, speed: "slow", quality: "premium", cost: "premium", features: ["Vision", "Deep analysis"], capabilities: ["text", "vision", "code", "research"], apiType: "anthropic", modelId: "claude-3-opus-20240229", supportsVision: true, supportsTools: true, supportsStreaming: true },
  // Google
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", providerColor: "bg-blue-500", description: "Latest Gemini with multimodal", contextLength: 1000000, speed: "fast", quality: "premium", cost: "medium", features: ["1M context", "Vision", "Audio"], capabilities: ["text", "vision", "audio", "code"], apiType: "google", modelId: "gemini-2.0-flash", isNew: true, isFeatured: true, supportsVision: true, supportsTools: true, supportsStreaming: true },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", provider: "Google", providerColor: "bg-blue-500", description: "Long context multimodal", contextLength: 2000000, speed: "standard", quality: "premium", cost: "high", features: ["2M context", "Vision", "Video"], capabilities: ["text", "vision", "video", "code"], apiType: "google", modelId: "gemini-1.5-pro", supportsVision: true, supportsTools: true, supportsStreaming: true },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", provider: "Google", providerColor: "bg-blue-500", description: "Fast and efficient", contextLength: 1000000, speed: "fast", quality: "high", cost: "low", features: ["1M context", "Vision"], capabilities: ["text", "vision", "code"], apiType: "google", modelId: "gemini-1.5-flash", supportsVision: true, supportsStreaming: true },
  // Meta/Llama
  { id: "llama-3.3-70b", name: "Llama 3.3 70B", provider: "Meta", providerColor: "bg-blue-600", description: "Latest open-source flagship", contextLength: 128000, speed: "standard", quality: "premium", cost: "medium", features: ["Open source", "128K context"], capabilities: ["text", "code", "creative"], apiType: "replicate", modelId: "meta/llama-3.3-70b-instruct", isNew: true, isFeatured: true, supportsStreaming: true },
  { id: "llama-3.2-90b-vision", name: "Llama 3.2 90B Vision", provider: "Meta", providerColor: "bg-blue-600", description: "Multimodal Llama with vision", contextLength: 128000, speed: "slow", quality: "premium", cost: "high", features: ["Vision", "Open source"], capabilities: ["text", "vision", "code"], apiType: "replicate", modelId: "meta/llama-3.2-90b-vision-instruct", supportsVision: true, supportsStreaming: true },
  { id: "llama-3.1-405b", name: "Llama 3.1 405B", provider: "Meta", providerColor: "bg-blue-600", description: "Largest open-source model", contextLength: 128000, speed: "slow", quality: "premium", cost: "high", features: ["405B parameters", "Open source"], capabilities: ["text", "code", "research"], apiType: "replicate", modelId: "meta/llama-3.1-405b-instruct", supportsStreaming: true },
  { id: "llama-3.1-70b", name: "Llama 3.1 70B", provider: "Meta", providerColor: "bg-blue-600", description: "Balanced performance", contextLength: 128000, speed: "standard", quality: "high", cost: "medium", features: ["Open source", "Fine-tunable"], capabilities: ["text", "code"], apiType: "replicate", modelId: "meta/llama-3.1-70b-instruct", supportsStreaming: true },
  // Mistral
  { id: "mistral-large", name: "Mistral Large 2", provider: "Mistral", providerColor: "bg-orange-500", description: "Most capable Mistral", contextLength: 128000, speed: "standard", quality: "premium", cost: "medium", features: ["128K context", "Multilingual"], capabilities: ["text", "code", "creative"], apiType: "replicate", modelId: "mistralai/mistral-large-2411", isFeatured: true, supportsTools: true, supportsStreaming: true },
  { id: "mixtral-8x22b", name: "Mixtral 8x22B", provider: "Mistral", providerColor: "bg-orange-500", description: "MoE with excellent quality/cost", contextLength: 65000, speed: "standard", quality: "high", cost: "medium", features: ["MoE architecture", "Open source"], capabilities: ["text", "code"], apiType: "replicate", modelId: "mistralai/mixtral-8x22b-instruct-v0.1", supportsStreaming: true },
  // Others
  { id: "qwen-2.5-72b", name: "Qwen 2.5 72B", provider: "Alibaba", providerColor: "bg-red-500", description: "Top-tier multilingual", contextLength: 128000, speed: "standard", quality: "premium", cost: "medium", features: ["Multilingual", "Open source"], capabilities: ["text", "code", "creative"], apiType: "replicate", modelId: "qwen/qwen-2.5-72b-instruct", isNew: true, supportsStreaming: true },
  { id: "deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek", providerColor: "bg-cyan-500", description: "Powerful for code", contextLength: 128000, speed: "standard", quality: "premium", cost: "low", features: ["Open source", "Code expert"], capabilities: ["text", "code"], apiType: "replicate", modelId: "deepseek-ai/deepseek-v3", isNew: true, isFeatured: true, supportsStreaming: true },
  { id: "command-r-plus", name: "Command R+", provider: "Cohere", providerColor: "bg-pink-500", description: "Enterprise RAG-optimized", contextLength: 128000, speed: "standard", quality: "high", cost: "medium", features: ["RAG optimized", "Citations"], capabilities: ["text", "research", "rag"], apiType: "replicate", modelId: "cohere/command-r-plus", supportsTools: true, supportsStreaming: true },
];

// Text Tools
interface TextTool { id: string; name: string; description: string; icon: string; category: string; systemPrompt: string; placeholder: string; }
const TEXT_TOOLS: TextTool[] = [
  { id: "story", name: "Story Generator", description: "Create engaging stories", icon: "fa-solid fa-book-open", category: "Creative", systemPrompt: "You are a creative story writer.", placeholder: "Write a story about..." },
  { id: "lyrics", name: "Lyrics Generator", description: "Write song lyrics", icon: "fa-solid fa-music", category: "Creative", systemPrompt: "You are a professional songwriter.", placeholder: "Write lyrics for..." },
  { id: "poetry", name: "Poetry Writer", description: "Compose poems", icon: "fa-solid fa-feather-pointed", category: "Creative", systemPrompt: "You are a skilled poet.", placeholder: "Write a poem about..." },
  { id: "screenplay", name: "Screenplay Writer", description: "Write scripts", icon: "fa-solid fa-clapperboard", category: "Creative", systemPrompt: "You are a screenwriter.", placeholder: "Write a scene where..." },
  { id: "blog", name: "Blog Writer", description: "SEO blog posts", icon: "fa-solid fa-pen-to-square", category: "Business", systemPrompt: "You are an expert blog writer.", placeholder: "Write a blog about..." },
  { id: "ad-copy", name: "Ad Copy Writer", description: "Compelling ads", icon: "fa-solid fa-bullhorn", category: "Business", systemPrompt: "You are an ad copywriter.", placeholder: "Write ad copy for..." },
  { id: "email", name: "Email Writer", description: "Professional emails", icon: "fa-solid fa-envelope", category: "Business", systemPrompt: "You are an email writer.", placeholder: "Write an email to..." },
  { id: "code", name: "Code Generator", description: "Generate code", icon: "fa-solid fa-code", category: "Technical", systemPrompt: "You are an expert programmer.", placeholder: "Write code to..." },
  { id: "research", name: "Research Assistant", description: "Research & analysis", icon: "fa-solid fa-flask", category: "Technical", systemPrompt: "You are a research assistant.", placeholder: "Research and summarize..." },
  { id: "rewrite", name: "Rewriter", description: "Improve text", icon: "fa-solid fa-pencil", category: "Editing", systemPrompt: "You are an expert editor.", placeholder: "Rewrite this: " },
  { id: "summarize", name: "Summarizer", description: "Summarize content", icon: "fa-solid fa-compress", category: "Editing", systemPrompt: "You are a summarizer.", placeholder: "Summarize this: " },
  { id: "translate", name: "Translator", description: "Translate text", icon: "fa-solid fa-language", category: "Editing", systemPrompt: "You are a translator.", placeholder: "Translate to [lang]: " },
  { id: "brainstorm", name: "Brainstorm Agent", description: "Generate ideas", icon: "fa-solid fa-lightbulb", category: "Agents", systemPrompt: "You are a brainstorming agent.", placeholder: "Brainstorm ideas for..." },
];

// Personas
interface Persona { id: string; name: string; description: string; icon: string; systemPrompt: string; }
const PERSONAS: Persona[] = [
  { id: "default", name: "Assistant", description: "Helpful AI", icon: "fa-solid fa-robot", systemPrompt: "You are a helpful AI assistant." },
  { id: "poet", name: "Persian Poet", description: "Classical Persian style", icon: "fa-solid fa-scroll", systemPrompt: "You are a Persian poet like Rumi." },
  { id: "screenwriter", name: "Screenwriter", description: "Cinematic content", icon: "fa-solid fa-film", systemPrompt: "You are a Hollywood screenwriter." },
  { id: "comedian", name: "Comedian", description: "Humorous content", icon: "fa-solid fa-face-laugh-squint", systemPrompt: "You are a stand-up comedian." },
  { id: "philosopher", name: "Philosopher", description: "Deep thoughts", icon: "fa-solid fa-brain", systemPrompt: "You are a philosopher." },
  { id: "novelist", name: "Novelist", description: "Narrative fiction", icon: "fa-solid fa-book", systemPrompt: "You are a bestselling novelist." },
];

// Message interface
interface Message { role: "user" | "assistant"; content: string; timestamp: Date; model?: string; }

export default function TextStudio() {
  const [activeTab, setActiveTab] = useState<"chat" | "tools" | "personas">("chat");
  const [selectedModel, setSelectedModel] = useState<LLMModel>(ALL_LLM_MODELS[4]); // Claude 3.5 Sonnet
  const [selectedTool, setSelectedTool] = useState<TextTool | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PERSONAS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [filterProvider, setFilterProvider] = useState("all");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [showSettings, setShowSettings] = useState(false);
  const [variationMode, setVariationMode] = useState<"standard" | "a-side" | "b-side" | "extended" | "dark" | "funny">("standard");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const providers = Array.from(new Set(ALL_LLM_MODELS.map(m => m.provider)));
  const filteredModels = filterProvider === "all" ? ALL_LLM_MODELS : ALL_LLM_MODELS.filter(m => m.provider === filterProvider);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const buildSystemPrompt = () => {
    let prompt = selectedPersona.systemPrompt;
    if (selectedTool) prompt = selectedTool.systemPrompt;
    const variations: Record<string, string> = {
      "a-side": " Provide the main, polished version.",
      "b-side": " Provide an alternative version with different style.",
      "extended": " Provide an extended, detailed version.",
      "dark": " Provide a darker, dramatic version.",
      "funny": " Provide a humorous, witty version.",
    };
    if (variationMode !== "standard") prompt += variations[variationMode] || "";
    return prompt;
  };

  const handleSend = async () => {
    if (!inputText.trim() || isGenerating) return;
    const userMessage: Message = { role: "user", content: inputText, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputText("");
    setIsGenerating(true);
    try {
      const response = await axios.post(`${API_BASE}/api/text/generate`, {
        model: selectedModel.modelId, apiType: selectedModel.apiType,
        messages: [{ role: "system", content: buildSystemPrompt() }, ...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: inputText }],
        temperature, maxTokens,
      }, { headers: getAuthHeaders() });
      setMessages(prev => [...prev, { role: "assistant", content: response.data.content || response.data.text, timestamp: new Date(), model: selectedModel.name }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${error.response?.data?.error || error.message}`, timestamp: new Date(), model: selectedModel.name }]);
    } finally { setIsGenerating(false); }
  };

  const getSpeedColor = (s: string) => s === "fast" ? "bg-green-500/20 text-green-400" : s === "standard" ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400";
  const getCostColor = (c: string) => c === "low" ? "bg-green-500/20 text-green-400" : c === "medium" ? "bg-yellow-500/20 text-yellow-400" : c === "high" ? "bg-orange-500/20 text-orange-400" : "bg-red-500/20 text-red-400";
  const formatCtx = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(0)}K` : n.toString();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600"><Brain className="w-6 h-6" /></div>
                AI Text Studio
              </h1>
              <p className="text-sm text-slate-400 mt-1">Generate text with world's best LLMs</p>
            </div>
            <button onClick={() => setShowModelSelector(!showModelSelector)} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:border-slate-600">
              <div className={`w-3 h-3 rounded-full ${selectedModel.providerColor}`} />
              <div className="text-left"><div className="text-sm font-medium text-white">{selectedModel.name}</div><div className="text-xs text-slate-400">{selectedModel.provider}</div></div>
              <ChevronDown className={`w-4 h-4 text-slate-400 ${showModelSelector ? "rotate-180" : ""}`} />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-4">
            {[{ id: "chat", label: "Chat", icon: MessageSquare }, { id: "tools", label: "Tools", icon: Wand2, count: TEXT_TOOLS.length }, { id: "personas", label: "Personas", icon: Users, count: PERSONAS.length }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id as any)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition ${activeTab === t.id ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                <t.icon className="w-4 h-4" />{t.label}{t.count && <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">{t.count}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Model Selector Modal */}
      {showModelSelector && (
        <div className="fixed inset-0 z-50" onClick={() => setShowModelSelector(false)}>
          <div className="absolute top-24 right-4 w-[550px] max-h-[70vh] overflow-y-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-700">
              <h3 className="font-semibold text-white mb-3">Select Model</h3>
              <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} title="Filter by provider" aria-label="Filter by provider" className="px-3 py-1.5 text-sm rounded bg-slate-800 text-white border border-slate-600">
                <option value="all">All Providers</option>
                {providers.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="p-2 space-y-1">
              {filteredModels.map(model => (
                <button key={model.id} onClick={() => { setSelectedModel(model); setShowModelSelector(false); }} className={`w-full p-3 rounded-lg text-left transition ${selectedModel.id === model.id ? "bg-indigo-500/20 border border-indigo-500/50" : "hover:bg-slate-800"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${model.providerColor}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{model.name}</span>
                        {model.isNew && <span className="px-1.5 py-0.5 text-[10px] bg-green-500 text-white rounded">NEW</span>}
                        {model.isFeatured && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                      </div>
                      <div className="text-xs text-slate-400">{model.provider} • {model.description}</div>
                    </div>
                    <div className="flex gap-1">
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${getSpeedColor(model.speed)}`}>{model.speed}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] rounded ${getCostColor(model.cost)}`}>{model.cost}</span>
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-700 text-slate-300">{formatCtx(model.contextLength)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "chat" && (
          <div className="grid lg:grid-cols-[1fr_300px] gap-6">
            {/* Chat Area */}
            <div className="flex flex-col h-[calc(100vh-240px)] bg-slate-900/50 rounded-xl border border-slate-800">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center py-12"><Brain className="w-16 h-16 mx-auto text-slate-600 mb-4" /><h3 className="text-lg font-medium text-slate-400">Start a conversation</h3><p className="text-sm text-slate-500">Using {selectedModel.name}</p></div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl p-4 ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-100"}`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
                        <span className="text-xs opacity-60">{msg.model && `${msg.model} • `}{msg.timestamp.toLocaleTimeString()}</span>
                        <button onClick={() => navigator.clipboard.writeText(msg.content)} title="Copy" aria-label="Copy" className="p-1 rounded hover:bg-white/10"><Copy className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                ))}
                {isGenerating && <div className="flex justify-start"><div className="rounded-xl p-4 bg-slate-800"><Loader2 className="w-5 h-5 animate-spin text-indigo-400" /></div></div>}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-2">
                  <span className="text-xs text-slate-500">Mode:</span>
                  {[{ id: "standard", label: "Standard", icon: "fa-solid fa-file-lines" }, { id: "a-side", label: "A-Side", icon: "fa-solid fa-a" }, { id: "b-side", label: "B-Side", icon: "fa-solid fa-b" }, { id: "extended", label: "Extended", icon: "fa-solid fa-expand" }, { id: "dark", label: "Dark", icon: "fa-solid fa-moon" }, { id: "funny", label: "Funny", icon: "fa-solid fa-face-grin-tears" }].map(m => (
                    <button key={m.id} onClick={() => setVariationMode(m.id as any)} className={`px-2 py-1 text-xs rounded whitespace-nowrap flex items-center gap-1 ${variationMode === m.id ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}><i className={m.icon} /> {m.label}</button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <textarea value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}} placeholder={selectedTool?.placeholder || "Type your message..."} className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 resize-none" rows={3} />
                  <div className="flex flex-col gap-2">
                    <button onClick={handleSend} disabled={isGenerating || !inputText.trim()} className="flex-1 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">{isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}</button>
                    <button onClick={() => setMessages([])} title="Clear" aria-label="Clear chat" className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
            {/* Sidebar */}
            <div className="space-y-4">
              {selectedTool && (
                <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-white flex items-center gap-2"><i className={`${selectedTool.icon} text-cyan-400`} />{selectedTool.name}</h3>
                    <button onClick={() => setSelectedTool(null)} title="Clear tool" aria-label="Clear tool" className="p-1 rounded hover:bg-slate-700 text-slate-400"><X className="w-4 h-4" /></button>
                  </div>
                  <p className="text-xs text-slate-400">{selectedTool.description}</p>
                </div>
              )}
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2"><Users className="w-4 h-4" />Persona</h3>
                <div className="space-y-1">
                  {PERSONAS.map(p => (
                    <button key={p.id} onClick={() => setSelectedPersona(p)} className={`w-full p-2 rounded-lg text-left flex items-center gap-2 ${selectedPersona.id === p.id ? "bg-indigo-500/20" : "hover:bg-slate-700"}`}>
                      <i className={`${p.icon} text-orange-400`} /><span className="text-sm text-white">{p.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                <button onClick={() => setShowSettings(!showSettings)} className="w-full flex items-center justify-between text-sm font-medium text-white">
                  <span className="flex items-center gap-2"><Settings className="w-4 h-4" />Settings</span><ChevronDown className={`w-4 h-4 ${showSettings ? "rotate-180" : ""}`} />
                </button>
                {showSettings && (
                  <div className="mt-4 space-y-4">
                    <div><label className="text-xs text-slate-400 block mb-1">Temperature: {temperature}</label><input type="range" min={0} max={2} step={0.1} value={temperature} onChange={e => setTemperature(Number(e.target.value))} title="Temperature" aria-label="Temperature" className="w-full accent-indigo-500" /></div>
                    <div><label className="text-xs text-slate-400 block mb-1">Max Tokens: {maxTokens}</label><input type="range" min={256} max={32768} step={256} value={maxTokens} onChange={e => setMaxTokens(Number(e.target.value))} title="Max tokens" aria-label="Max tokens" className="w-full accent-indigo-500" /></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tools" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <p className="text-sm text-slate-300"><i className="fa-solid fa-wand-magic-sparkles text-cyan-400 mr-2" /><strong className="text-cyan-400">Text Tools:</strong> Select a tool to configure AI for specific tasks.</p>
            </div>
            {Array.from(new Set(TEXT_TOOLS.map(t => t.category))).map(cat => (
              <div key={cat}>
                <h3 className="text-lg font-semibold text-white mb-3">{cat}</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {TEXT_TOOLS.filter(t => t.category === cat).map(tool => (
                    <button key={tool.id} onClick={() => { setSelectedTool(tool); setActiveTab("chat"); }} className={`p-4 rounded-xl text-left border ${selectedTool?.id === tool.id ? "bg-cyan-500/20 border-cyan-500/50" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"}`}>
                      <div className="flex items-center gap-3 mb-2"><i className={`${tool.icon} text-xl text-cyan-400`} /><span className="font-medium text-white">{tool.name}</span></div>
                      <p className="text-xs text-slate-400">{tool.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "personas" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20">
              <p className="text-sm text-slate-300"><i className="fa-solid fa-masks-theater text-orange-400 mr-2" /><strong className="text-orange-400">AI Personas:</strong> Select a persona to change the AI's writing style and personality.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {PERSONAS.map(p => (
                <button key={p.id} onClick={() => { setSelectedPersona(p); setActiveTab("chat"); }} className={`p-6 rounded-xl text-left border ${selectedPersona.id === p.id ? "bg-orange-500/20 border-orange-500/50" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"}`}>
                  <i className={`${p.icon} text-3xl text-orange-400 block mb-3`} />
                  <h3 className="font-semibold text-white mb-1">{p.name}</h3>
                  <p className="text-sm text-slate-400">{p.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
