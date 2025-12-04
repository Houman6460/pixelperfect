/**
 * Scenario Assistant Component
 * Full scenario editing with AI improvement and timeline generation
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  FileText,
  Sparkles,
  Wand2,
  Play,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Film,
  Users,
  MessageSquare,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Layers,
  Settings,
  ImagePlus,
  X,
  Brain,
  Tag,
} from 'lucide-react';
import { ScenarioTagEditor, parseTags, ParsedTag, TAG_CATEGORIES } from './ScenarioTagEditor';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';

// Types
interface SceneBreakdown {
  scene_id: string;
  scene_number: number;
  title?: string;
  estimated_duration_sec: number;
  summary: string;
  characters: string[];
  dialogue_blocks: { character: string; line: string }[];
  emotions: string[];
  visual_style: string;
}

interface ScenarioBreakdown {
  scenario_id: string;
  total_duration_sec: number;
  scene_count: number;
  scenes: SceneBreakdown[];
  characters: { name: string; description: string }[];
  warnings: string[];
}

interface TimelineSegment {
  segment_id: string;
  segment_number: number;
  scene_id: string;
  duration_sec: number;
  model_id: string;
  prompt: string;
  final_prompt?: string;
  dialogue?: string;
  motion_profile: string;
  camera_path: string;
  transition: string;
  status: string;
}

interface GeneratedTimeline {
  timeline_id: string;
  total_duration_sec: number;
  segment_count: number;
  segments: TimelineSegment[];
  warnings: string[];
}

interface ScenarioAssistantProps {
  onTimelineGenerated?: (timeline: GeneratedTimeline) => void;
  initialScenario?: string;
  className?: string;
}

interface Model {
  model_id: string;
  display_name: string;
  max_duration_sec: number;
  supports_dialogue: string;
  recommended_for_scenario: boolean;
}

interface StoryboardImage {
  id: string;
  file: File;
  preview: string;
  caption?: string;
}

// Vision-capable AI models for scenario analysis
const VISION_AI_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o (OpenAI)', provider: 'openai', description: 'Best for detailed analysis' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini (OpenAI)', provider: 'openai', description: 'Fast & cost-effective' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro (Google)', provider: 'google', description: 'Great for visual stories' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash (Google)', provider: 'google', description: 'Fast processing' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet (Anthropic)', provider: 'anthropic', description: 'Creative storytelling' },
];

export function ScenarioAssistant({
  onTimelineGenerated,
  initialScenario = '',
  className = '',
}: ScenarioAssistantProps) {
  // State
  const [scenario, setScenario] = useState(initialScenario);
  const [improvedScenario, setImprovedScenario] = useState<string | null>(null);
  const [targetDuration, setTargetDuration] = useState(60); // seconds
  const [selectedModelId, setSelectedModelId] = useState('kling-2.5-pro');
  const [models, setModels] = useState<Model[]>([]);
  
  const [isImproving, setIsImproving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [breakdown, setBreakdown] = useState<ScenarioBreakdown | null>(null);
  const [timeline, setTimeline] = useState<GeneratedTimeline | null>(null);
  
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [improvementSuccess, setImprovementSuccess] = useState(false);
  
  // Storyboard images
  const [storyboardImages, setStoryboardImages] = useState<StoryboardImage[]>([]);
  const [visionModelId, setVisionModelId] = useState('gpt-4o');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Scenario tags (parsed from inline markup)
  const [scenarioTags, setScenarioTags] = useState<ParsedTag[]>([]);
  
  // Concept Prompt (optional - for generating scenario from simple idea)
  const [conceptPrompt, setConceptPrompt] = useState('');
  const [isGeneratingFromPrompt, setIsGeneratingFromPrompt] = useState(false);
  const [showConceptPrompt, setShowConceptPrompt] = useState(true);
  
  // Style Profile (director/animation/cinematic style)
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  const [availableStyles, setAvailableStyles] = useState<{
    director: { id: string; label: string; description: string }[];
    animation: { id: string; label: string; description: string }[];
    cinematic: { id: string; label: string; description: string }[];
  }>({
    director: [],
    animation: [],
    cinematic: [],
  });

  // Get auth token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/v1/scenario/models`);
        if (response.data.success) {
          setModels(response.data.data.recommended || response.data.data.models);
          if (response.data.data.recommended?.length > 0) {
            setSelectedModelId(response.data.data.recommended[0].model_id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };
    fetchModels();
  }, []);

  // Fetch available style profiles
  useEffect(() => {
    const fetchStyles = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/v1/scenario/styles`);
        if (response.data.success && response.data.data.grouped) {
          setAvailableStyles(response.data.data.grouped);
        }
      } catch (err) {
        console.error('Failed to fetch styles:', err);
      }
    };
    fetchStyles();
  }, []);

  // Handle storyboard image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const newImages: StoryboardImage[] = [];
    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const id = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        newImages.push({
          id,
          file,
          preview: URL.createObjectURL(file),
        });
      }
    });
    
    setStoryboardImages(prev => [...prev, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  // Remove storyboard image
  const removeImage = (id: string) => {
    setStoryboardImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.preview);
      return prev.filter(i => i.id !== id);
    });
  };
  
  // Update image caption
  const updateImageCaption = (id: string, caption: string) => {
    setStoryboardImages(prev => 
      prev.map(img => img.id === id ? { ...img, caption } : img)
    );
  };
  
  // Generate scenario from concept prompt
  const handleGenerateFromPrompt = async () => {
    if (!conceptPrompt.trim() || conceptPrompt.length < 10) {
      setError('Please enter at least 10 characters describing your concept');
      return;
    }
    if (isGeneratingFromPrompt) return;

    setIsGeneratingFromPrompt(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await axios.post(
        `${API_BASE}/api/v1/scenario/from-prompt`,
        {
          concept_prompt: conceptPrompt,
          target_model_id: selectedModelId,
          target_duration_sec: targetDuration,
          genre: 'cinematic',
          mood: 'compelling',
          style_id: selectedStyleId || undefined,
          custom_style_prompt: customStylePrompt || undefined,
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        const data = response.data.data;
        // Fill the scenario textarea with the improved scenario
        setScenario(data.improved_scenario || data.raw_scenario);
        setImprovedScenario(data.improved_scenario);
        setWarnings(data.warnings || []);
        setImprovementSuccess(true);
        setTimeout(() => setImprovementSuccess(false), 3000);
        
        // Collapse the concept prompt section after successful generation
        setShowConceptPrompt(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate scenario from prompt');
    } finally {
      setIsGeneratingFromPrompt(false);
    }
  };

  // Convert images to base64 for API
  const imagesToBase64 = async (): Promise<{ data: string; caption?: string }[]> => {
    const results: { data: string; caption?: string }[] = [];
    for (const img of storyboardImages) {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(img.file);
      });
      results.push({ data: base64, caption: img.caption });
    }
    return results;
  };

  // Improve scenario
  const handleImproveScenario = async () => {
    if (!scenario.trim() && storyboardImages.length === 0) return;
    if (isImproving) return;

    setIsImproving(true);
    setError(null);
    setWarnings([]);

    try {
      // Convert images to base64 if any
      const images = storyboardImages.length > 0 ? await imagesToBase64() : undefined;
      
      // Parse inline tags from scenario
      const inlineTags = parseTags(scenario).map(tag => ({
        type: tag.category,
        value: tag.value,
        offset: tag.start,
      }));
      
      const response = await axios.post(
        `${API_BASE}/api/v1/scenario/improve`,
        {
          scenario_text: scenario,
          target_duration_sec: targetDuration,
          target_model_id: selectedModelId,
          // Vision AI settings
          vision_model_id: storyboardImages.length > 0 ? visionModelId : undefined,
          storyboard_images: images,
          // Inline scenario tags
          inline_tags: inlineTags.length > 0 ? inlineTags : undefined,
          preserve_tags: true, // Tell AI to preserve existing tags
          style_hints: {
            genre: 'cinematic',
            mood: 'compelling',
            pacing: 'medium',
          },
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        const data = response.data.data;
        setImprovedScenario(data.improved_scenario);
        setScenario(data.improved_scenario);
        setWarnings(data.warnings || []);
        setImprovementSuccess(true);
        setTimeout(() => setImprovementSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to improve scenario');
    } finally {
      setIsImproving(false);
    }
  };

  // Generate plan
  const handleGeneratePlan = async () => {
    if (!scenario.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setWarnings([]);

    try {
      // Parse inline tags for timeline generation
      const inlineTags = parseTags(scenario).map(tag => ({
        type: tag.category,
        value: tag.value,
        offset: tag.start,
      }));
      
      const response = await axios.post(
        `${API_BASE}/api/v1/scenario/generate-plan`,
        {
          scenario_text: scenario,
          target_duration_sec: targetDuration,
          target_model_id: selectedModelId,
          // Inline tags to inform segment generation
          inline_tags: inlineTags.length > 0 ? inlineTags : undefined,
          options: {
            enable_frame_chaining: true,
            style_consistency: true,
            character_consistency: true,
            // Use inline tags for generation
            use_inline_tags: inlineTags.length > 0,
          },
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        const data = response.data.data;
        setBreakdown(data.breakdown);
        setTimeline(data.timeline);
        setWarnings(data.warnings || []);
        setShowBreakdown(true);
        
        // Notify parent
        if (onTimelineGenerated && data.timeline) {
          onTimelineGenerated(data.timeline);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate plan');
    } finally {
      setIsGenerating(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const selectedModel = models.find(m => m.model_id === selectedModelId);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Scenario Assistant</h2>
          <p className="text-xs text-slate-400">Write your story, let AI handle the rest</p>
        </div>
      </div>

      {/* Concept Prompt Section - Optional */}
      <div className="p-4 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl border border-indigo-500/30">
        <button
          onClick={() => setShowConceptPrompt(!showConceptPrompt)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-medium text-slate-200">Concept Prompt</span>
            <span className="text-xs text-indigo-400/70">(optional)</span>
          </div>
          {showConceptPrompt ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        
        {showConceptPrompt && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-slate-400">
              Shortly describe what you want. AI will turn this into a full cinematic scenario with scenes, camera directions, and visual details.
            </p>
            
            <textarea
              value={conceptPrompt}
              onChange={(e) => setConceptPrompt(e.target.value)}
              placeholder="A lonely astronaut on Mars discovering an ancient alien ruin beneath the red sand..."
              className="w-full px-4 py-3 bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none"
              rows={3}
            />
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerateFromPrompt}
                disabled={isGeneratingFromPrompt || !conceptPrompt.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isGeneratingFromPrompt ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Generate Scenario from Prompt
                  </>
                )}
              </button>
              
              {conceptPrompt && (
                <span className="text-xs text-slate-500">
                  {conceptPrompt.length} characters
                </span>
              )}
            </div>
            
            {conceptPrompt && !scenario && (
              <div className="flex items-center gap-2 text-xs text-indigo-400/70">
                <Sparkles className="w-3 h-3" />
                Click "Generate Scenario from Prompt" to create a full cinematic story
              </div>
            )}
          </div>
        )}
        
        {!showConceptPrompt && conceptPrompt && (
          <div className="mt-2 text-xs text-slate-500 truncate">
            Original prompt: "{conceptPrompt.substring(0, 60)}..."
          </div>
        )}
      </div>

      {/* Scenario Input with Inline Tag Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="scenario-input" className="text-sm font-medium text-slate-300 flex items-center gap-2">
            <Tag className="w-4 h-4" />
            Your Scenario
            <span className="text-xs text-purple-400 font-normal">(type [ to add tags)</span>
          </label>
        </div>
        <ScenarioTagEditor
          value={scenario}
          onChange={(newValue) => {
            setScenario(newValue);
            setImprovedScenario(null);
            setTimeline(null);
          }}
          onTagsChange={setScenarioTags}
          placeholder={`Write your cinematic story with inline tags...

Example:
SCENE 1: A misty mountain ridge at dawn. [lighting: golden-hour][camera: wide][mood: serene]
A lone traveler stands at the edge, looking out at the vast landscape below.

Traveler: "I've come so far..." [mood: melancholic][pace: slow]

The camera slowly pans across the horizon [camera: pan-right][fx: lens-flare] as the sun begins to rise.

SCENE 2: A small village in the valley. [lighting: overcast][sfx: distant-wind]
The traveler walks through the quiet streets... [camera: tracking][pace: moderate]

💡 Click tags to edit • Right-click for options • Type [ to add new tags`}
          minRows={14}
        />
        {/* Tag summary */}
        {scenarioTags.length > 0 && (
          <div className="mt-3 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50">
            <div className="text-xs text-slate-400 mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Scene Instructions ({scenarioTags.length} tags detected)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(
                scenarioTags.reduce((acc, tag) => {
                  acc[tag.category] = (acc[tag.category] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([category, count]) => {
                const cat = TAG_CATEGORIES.find(c => c.id === category);
                return (
                  <span 
                    key={category}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${cat?.bgColor || 'bg-slate-500/20'} ${cat?.color || 'text-slate-300'}`}
                  >
                    {cat && <cat.icon className="w-3 h-3" />}
                    {category}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {/* Success notification */}
        {improvementSuccess && (
          <div className="flex items-center gap-2 mt-2 text-xs text-green-400">
            <Check className="w-3 h-3" />
            Scenario improved successfully (tags preserved)
          </div>
        )}
      </div>

      {/* Storyboard Upload Section */}
      <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImagePlus className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-medium text-slate-300">Storyboard Images</span>
            <span className="text-xs text-slate-500">(optional)</span>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-lg text-xs hover:bg-purple-500/30 transition"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            Add Images
          </button>
        </div>
        
        <p className="text-xs text-slate-500">
          Upload storyboard sketches, reference images, or visual concepts. AI will analyze them along with your text.
        </p>
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
          aria-label="Upload storyboard images"
        />
        
        {/* Uploaded images grid */}
        {storyboardImages.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {storyboardImages.map((img, index) => (
              <div key={img.id} className="relative group">
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-700">
                  <img
                    src={img.preview}
                    alt={`Storyboard ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 bg-black/70 rounded text-[10px] text-white">
                    #{index + 1}
                  </div>
                </div>
                <button
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-full opacity-0 group-hover:opacity-100 transition"
                  aria-label="Remove image"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                <input
                  type="text"
                  value={img.caption || ''}
                  onChange={(e) => updateImageCaption(img.id, e.target.value)}
                  placeholder="Caption (optional)"
                  className="w-full mt-1 px-2 py-1 bg-slate-900/50 border border-slate-700 rounded text-xs text-white placeholder-slate-500"
                  aria-label={`Caption for image ${index + 1}`}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Vision AI Model Selection - only show when images uploaded */}
        {storyboardImages.length > 0 && (
          <div className="pt-3 border-t border-slate-700/50">
            <label className="text-sm font-medium text-slate-300 mb-2 block">
              <Brain className="w-4 h-4 inline mr-2" />
              Vision AI Model
            </label>
            <select
              value={visionModelId}
              onChange={(e) => setVisionModelId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              aria-label="Select vision AI model"
            >
              {VISION_AI_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              This AI will analyze your storyboard images and incorporate visual details into the scenario.
            </p>
          </div>
        )}
      </div>

      {/* Settings Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Model Selection */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">
            <Film className="w-4 h-4 inline mr-2" />
            Target Model
          </label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            aria-label="Select target model"
          >
            {models.map((model) => (
              <option key={model.model_id} value={model.model_id}>
                {model.display_name} ({model.max_duration_sec}s max)
              </option>
            ))}
          </select>
          {selectedModel && (
            <p className="text-xs text-slate-500 mt-1">
              Dialogue: {selectedModel.supports_dialogue}
            </p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">
            <Clock className="w-4 h-4 inline mr-2" />
            Target Duration: {formatDuration(targetDuration)}
          </label>
          <input
            type="range"
            min={30}
            max={600}
            step={30}
            value={targetDuration}
            onChange={(e) => setTargetDuration(Number(e.target.value))}
            className="w-full accent-purple-500"
            aria-label="Target duration"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>30s</span>
            <span>10m</span>
          </div>
        </div>
      </div>

      {/* Style Profile Selector */}
      <div className="p-4 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-xl border border-amber-500/30">
        <button
          onClick={() => setShowStyleSelector(!showStyleSelector)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-slate-200">Style Profile</span>
            <span className="text-xs text-amber-400/70">(optional)</span>
            {selectedStyleId && (
              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded text-xs">
                {availableStyles.director.find(s => s.id === selectedStyleId)?.label ||
                 availableStyles.animation.find(s => s.id === selectedStyleId)?.label ||
                 availableStyles.cinematic.find(s => s.id === selectedStyleId)?.label ||
                 selectedStyleId}
              </span>
            )}
          </div>
          {showStyleSelector ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
        
        {showStyleSelector && (
          <div className="mt-3 space-y-4">
            <p className="text-xs text-slate-400">
              Select a director, animation, or cinematic style. AI will apply it consistently across your entire scenario and timeline.
            </p>
            
            {/* Style Type Tabs */}
            <div className="space-y-3">
              {/* Director Styles */}
              {availableStyles.director.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                    🎬 Director Styles
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {availableStyles.director.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyleId(selectedStyleId === style.id ? '' : style.id)}
                        className={`p-2 rounded-lg border text-left transition ${
                          selectedStyleId === style.id
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="text-xs font-medium">{style.label}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Animation Styles */}
              {availableStyles.animation.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                    🎨 Animation Styles
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {availableStyles.animation.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyleId(selectedStyleId === style.id ? '' : style.id)}
                        className={`p-2 rounded-lg border text-left transition ${
                          selectedStyleId === style.id
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="text-xs font-medium">{style.label}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Cinematic Styles */}
              {availableStyles.cinematic.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                    🎞️ Cinematic Styles
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {availableStyles.cinematic.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => setSelectedStyleId(selectedStyleId === style.id ? '' : style.id)}
                        className={`p-2 rounded-lg border text-left transition ${
                          selectedStyleId === style.id
                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                            : 'bg-slate-800/30 border-slate-700/50 text-slate-300 hover:bg-slate-700/50'
                        }`}
                      >
                        <div className="text-xs font-medium">{style.label}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{style.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Custom Style Prompt */}
            <div className="pt-3 border-t border-slate-700/50">
              <label className="text-xs font-medium text-slate-400 mb-1 block">
                Custom Style Description (optional)
              </label>
              <textarea
                value={customStylePrompt}
                onChange={(e) => setCustomStylePrompt(e.target.value)}
                placeholder="Describe your own visual style: slow motion, specific color palette, unique camera movements..."
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                rows={2}
              />
            </div>
            
            {/* Clear Selection */}
            {(selectedStyleId || customStylePrompt) && (
              <button
                onClick={() => {
                  setSelectedStyleId('');
                  setCustomStylePrompt('');
                }}
                className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Clear style selection
              </button>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleImproveScenario}
          disabled={!scenario.trim() || isImproving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Improve scenario with AI"
        >
          {isImproving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          Improve Scenario
        </button>

        <button
          onClick={handleGeneratePlan}
          disabled={!scenario.trim() || isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Generate timeline plan"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          Generate Plan
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Breakdown Preview */}
      {breakdown && (
        <div className="space-y-3">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition w-full"
            aria-expanded={showBreakdown ? "true" : "false"}
          >
            {showBreakdown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Scenario Breakdown
            <span className="ml-auto text-xs text-slate-500">
              {breakdown.scene_count} scenes • {formatDuration(breakdown.total_duration_sec)}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
          </button>

          {showBreakdown && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {breakdown.scenes.map((scene) => (
                <div
                  key={scene.scene_id}
                  className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      Scene {scene.scene_number}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDuration(scene.estimated_duration_sec)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{scene.summary}</p>
                  {scene.characters.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-500">
                        {scene.characters.join(', ')}
                      </span>
                    </div>
                  )}
                  {scene.dialogue_blocks.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-500">
                        {scene.dialogue_blocks.length} dialogue lines
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline Preview */}
      {timeline && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              Timeline Generated
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{timeline.segment_count}</div>
              <div className="text-xs text-slate-400">Segments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{formatDuration(timeline.total_duration_sec)}</div>
              <div className="text-xs text-slate-400">Duration</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{breakdown?.scene_count || '-'}</div>
              <div className="text-xs text-slate-400">Scenes</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Ready to generate! Check the Timeline tab to preview and edit segments.
          </p>
        </div>
      )}
    </div>
  );
}

export default ScenarioAssistant;
