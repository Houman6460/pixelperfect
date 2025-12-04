/**
 * Scenario Tag Editor Component
 * VS Code-style inline markup editor for cinematic scenario tags
 * 
 * Supports: [category: value] syntax with autocomplete, color-coding, and inline editing
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Camera,
  Sun,
  Palette,
  Volume2,
  Sparkles,
  Film,
  Clock,
  Heart,
  Cloud,
  Aperture,
  Wand2,
  Plus,
  X,
  ChevronDown,
  Check,
  Copy,
  Trash2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

// ==================== TAG CATEGORIES & VALUES ====================

export interface TagCategory {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ElementType;
  values: string[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    id: 'camera',
    label: 'Camera',
    color: 'text-blue-300',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/50',
    icon: Camera,
    values: [
      'close-up', 'extreme-close-up', 'medium-shot', 'wide', 'extreme-wide',
      'dolly-in', 'dolly-out', 'crane-up', 'crane-down', 'tracking', 'pan-left',
      'pan-right', 'tilt-up', 'tilt-down', 'gimbal-smooth', 'handheld', 'fpv',
      '360-orbit', 'push-in', 'pull-out', 'arc-shot', 'dutch-angle', 'pov',
      'over-shoulder', 'two-shot', 'aerial', 'low-angle', 'high-angle', 'static'
    ],
  },
  {
    id: 'lighting',
    label: 'Lighting',
    color: 'text-yellow-300',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/50',
    icon: Sun,
    values: [
      'natural', 'golden-hour', 'sunset', 'sunrise', 'overcast', 'harsh-midday',
      'neon', 'low-key', 'high-key', 'silhouette', 'backlit', 'rim-light',
      'volumetric', 'foggy', 'moonlight', 'candlelight', 'fluorescent',
      'studio-soft', 'dramatic-shadows', 'chiaroscuro', 'colored-gel',
      'underwater-caustics', 'bioluminescent', 'holographic', 'fire-glow'
    ],
  },
  {
    id: 'mood',
    label: 'Mood',
    color: 'text-teal-300',
    bgColor: 'bg-teal-500/20',
    borderColor: 'border-teal-500/50',
    icon: Heart,
    values: [
      'calm', 'peaceful', 'serene', 'tense', 'dramatic', 'suspenseful',
      'mysterious', 'eerie', 'melancholic', 'nostalgic', 'hopeful', 'joyful',
      'romantic', 'intense', 'chaotic', 'lonely', 'triumphant', 'ominous',
      'whimsical', 'dreamy', 'energetic', 'contemplative', 'anxious', 'epic'
    ],
  },
  {
    id: 'genre',
    label: 'Genre',
    color: 'text-purple-300',
    bgColor: 'bg-purple-500/20',
    borderColor: 'border-purple-500/50',
    icon: Film,
    values: [
      'sci-fi', 'fantasy', 'horror', 'thriller', 'drama', 'comedy', 'romance',
      'action', 'adventure', 'noir', 'western', 'documentary', 'animation',
      'cyberpunk', 'steampunk', 'post-apocalyptic', 'historical', 'war',
      'musical', 'experimental', 'surreal', 'realism', 'noir', 'mockumentary'
    ],
  },
  {
    id: 'fx',
    label: 'Visual FX',
    color: 'text-red-300',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/50',
    icon: Sparkles,
    values: [
      'slow-motion', 'time-lapse', 'speed-ramp', 'freeze-frame', 'motion-blur',
      'lens-flare', 'bokeh', 'depth-blur', 'chromatic-aberration', 'glitch',
      'vhs-effect', 'film-grain', 'color-grading', 'split-screen', 'overlay',
      'particles', 'sparks', 'smoke', 'fire-embers', 'rain-drops', 'snow',
      'dust-motes', 'light-rays', 'anamorphic', 'double-exposure'
    ],
  },
  {
    id: 'sfx',
    label: 'Sound/Audio',
    color: 'text-pink-300',
    bgColor: 'bg-pink-500/20',
    borderColor: 'border-pink-500/50',
    icon: Volume2,
    values: [
      'silence', 'ambient', 'wind', 'rain', 'thunder', 'ocean-waves', 'city-noise',
      'crowd-murmur', 'footsteps', 'heartbeat', 'breathing', 'metallic-hum',
      'electronic-buzz', 'distant-traffic', 'birdsong', 'insects', 'fire-crackle',
      'water-drip', 'clock-ticking', 'whispers', 'echo', 'reverb', 'bass-rumble'
    ],
  },
  {
    id: 'style',
    label: 'Style',
    color: 'text-cyan-300',
    bgColor: 'bg-cyan-500/20',
    borderColor: 'border-cyan-500/50',
    icon: Palette,
    values: [
      'cinematic', 'documentary', 'music-video', 'commercial', 'art-film',
      'anime', 'pixar-style', 'ghibli', 'noir', 'grindhouse', 'instagram',
      'tiktok', 'youtube', 'broadcast', 'film-photography', 'polaroid',
      'vintage', 'modern', 'minimalist', 'maximalist', 'abstract', 'hyperreal'
    ],
  },
  {
    id: 'pace',
    label: 'Pace',
    color: 'text-slate-300',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/50',
    icon: Clock,
    values: [
      'very-slow', 'slow', 'moderate', 'fast', 'very-fast', 'rhythmic',
      'building', 'climactic', 'frenetic', 'hypnotic', 'breath', 'pulse',
      'staccato', 'flowing', 'abrupt', 'gradual', 'explosive', 'meditative'
    ],
  },
  {
    id: 'weather',
    label: 'Weather',
    color: 'text-sky-300',
    bgColor: 'bg-sky-500/20',
    borderColor: 'border-sky-500/50',
    icon: Cloud,
    values: [
      'clear', 'sunny', 'cloudy', 'overcast', 'rain-light', 'rain-heavy',
      'storm', 'snow-light', 'snow-heavy', 'blizzard', 'fog', 'mist',
      'haze', 'sandstorm', 'hail', 'rainbow', 'aurora', 'humid', 'dry'
    ],
  },
  {
    id: 'lens',
    label: 'Lens',
    color: 'text-amber-300',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/50',
    icon: Aperture,
    values: [
      '14mm-ultra-wide', '24mm-wide', '35mm-standard', '50mm-normal',
      '85mm-portrait', '135mm-telephoto', '200mm-long', 'macro', 'fisheye',
      'tilt-shift', 'anamorphic', 'vintage-glass', 'soft-focus', 'sharp'
    ],
  },
  {
    id: 'transition',
    label: 'Transition',
    color: 'text-indigo-300',
    bgColor: 'bg-indigo-500/20',
    borderColor: 'border-indigo-500/50',
    icon: Wand2,
    values: [
      'cut', 'crossfade', 'dissolve', 'wipe', 'iris', 'fade-to-black',
      'fade-from-black', 'fade-to-white', 'match-cut', 'jump-cut', 'whip-pan',
      'morph', 'zoom-transition', 'glitch-cut', 'flash', 'blur-transition'
    ],
  },
];

// ==================== TAG PARSING ====================

export interface ParsedTag {
  category: string;
  value: string;
  start: number;
  end: number;
  raw: string;
}

export function parseTags(text: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  const regex = /\[(\w+):\s*([^\]]+)\]/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    tags.push({
      category: match[1].toLowerCase(),
      value: match[2].trim(),
      start: match.index,
      end: match.index + match[0].length,
      raw: match[0],
    });
  }
  
  return tags;
}

export function getCategoryById(id: string): TagCategory | undefined {
  return TAG_CATEGORIES.find(c => c.id === id);
}

// ==================== COMPONENT PROPS ====================

interface ScenarioTagEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minRows?: number;
  disabled?: boolean;
  onTagsChange?: (tags: ParsedTag[]) => void;
}

// ==================== MAIN COMPONENT ====================

export function ScenarioTagEditor({
  value,
  onChange,
  placeholder,
  className = '',
  minRows = 12,
  disabled = false,
  onTagsChange,
}: ScenarioTagEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Autocomplete state
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteStep, setAutocompleteStep] = useState<'category' | 'value'>('category');
  const [selectedCategory, setSelectedCategory] = useState<TagCategory | null>(null);
  const [autocompleteFilter, setAutocompleteFilter] = useState('');
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [bracketStart, setBracketStart] = useState(-1);
  
  // Tag editing state
  const [editingTag, setEditingTag] = useState<ParsedTag | null>(null);
  const [editMenuPosition, setEditMenuPosition] = useState({ top: 0, left: 0 });
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{ tag: ParsedTag; x: number; y: number } | null>(null);

  // Parse tags from current value
  const parsedTags = useMemo(() => parseTags(value), [value]);
  
  // Notify parent of tag changes
  useEffect(() => {
    onTagsChange?.(parsedTags);
  }, [parsedTags, onTagsChange]);

  // Get filtered items for autocomplete
  const filteredItems = useMemo(() => {
    if (autocompleteStep === 'category') {
      return TAG_CATEGORIES.filter(c => 
        c.id.includes(autocompleteFilter.toLowerCase()) ||
        c.label.toLowerCase().includes(autocompleteFilter.toLowerCase())
      );
    } else if (selectedCategory) {
      return selectedCategory.values.filter(v =>
        v.includes(autocompleteFilter.toLowerCase())
      );
    }
    return [];
  }, [autocompleteStep, selectedCategory, autocompleteFilter]);

  // Sync scroll between textarea and overlay
  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  // Handle text input
  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    
    // Check for [ to trigger autocomplete
    const textBefore = newValue.slice(0, cursorPos);
    const lastBracket = textBefore.lastIndexOf('[');
    const lastCloseBracket = textBefore.lastIndexOf(']');
    
    if (lastBracket > lastCloseBracket) {
      // We're inside a bracket
      const afterBracket = textBefore.slice(lastBracket + 1);
      const colonPos = afterBracket.indexOf(':');
      
      setBracketStart(lastBracket);
      
      if (colonPos === -1) {
        // Still selecting category
        setAutocompleteStep('category');
        setAutocompleteFilter(afterBracket);
        setSelectedCategory(null);
      } else {
        // Category selected, now selecting value
        const categoryName = afterBracket.slice(0, colonPos).trim();
        const category = getCategoryById(categoryName);
        if (category) {
          setSelectedCategory(category);
          setAutocompleteStep('value');
          setAutocompleteFilter(afterBracket.slice(colonPos + 1).trim());
        }
      }
      
      // Calculate position for autocomplete
      if (textareaRef.current) {
        const rect = textareaRef.current.getBoundingClientRect();
        // Approximate position - in a real implementation, use a hidden span
        setAutocompletePosition({
          top: rect.top + 30,
          left: rect.left + 20,
        });
      }
      
      setShowAutocomplete(true);
      setHighlightedIndex(0);
    } else {
      setShowAutocomplete(false);
      setBracketStart(-1);
    }
  }, [onChange]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showAutocomplete) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          Math.min(prev + 1, filteredItems.length - 1)
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (filteredItems.length > 0) {
          selectAutocompleteItem(highlightedIndex);
        }
        break;
      case 'Escape':
        setShowAutocomplete(false);
        break;
    }
  }, [showAutocomplete, filteredItems, highlightedIndex]);

  // Select autocomplete item
  const selectAutocompleteItem = useCallback((index: number) => {
    if (!textareaRef.current) return;
    
    const cursorPos = textareaRef.current.selectionStart;
    
    if (autocompleteStep === 'category') {
      const category = filteredItems[index] as TagCategory;
      if (category) {
        // Insert category and colon
        const before = value.slice(0, bracketStart + 1);
        const after = value.slice(cursorPos);
        const newValue = `${before}${category.id}: ${after}`;
        onChange(newValue);
        
        // Move to value selection
        setSelectedCategory(category);
        setAutocompleteStep('value');
        setAutocompleteFilter('');
        setHighlightedIndex(0);
        
        // Set cursor position
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = bracketStart + 1 + category.id.length + 2;
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
            textareaRef.current.focus();
          }
        }, 0);
      }
    } else {
      const selectedValue = filteredItems[index] as string;
      if (selectedValue && selectedCategory) {
        // Complete the tag
        const before = value.slice(0, bracketStart);
        const afterBracket = value.slice(bracketStart);
        const closeBracket = afterBracket.indexOf(']');
        const after = closeBracket !== -1 
          ? value.slice(bracketStart + closeBracket + 1) 
          : value.slice(cursorPos);
        
        const newTag = `[${selectedCategory.id}: ${selectedValue}]`;
        const newValue = `${before}${newTag}${after}`;
        onChange(newValue);
        
        // Close autocomplete
        setShowAutocomplete(false);
        setBracketStart(-1);
        setSelectedCategory(null);
        setAutocompleteStep('category');
        setAutocompleteFilter('');
        
        // Set cursor after tag
        setTimeout(() => {
          if (textareaRef.current) {
            const newPos = before.length + newTag.length;
            textareaRef.current.selectionStart = newPos;
            textareaRef.current.selectionEnd = newPos;
            textareaRef.current.focus();
          }
        }, 0);
      }
    }
  }, [autocompleteStep, filteredItems, bracketStart, value, onChange, selectedCategory]);

  // Handle tag click for editing
  const handleTagClick = useCallback((tag: ParsedTag, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTag(tag);
    setEditMenuPosition({ top: e.clientY, left: e.clientX });
    setContextMenu(null);
  }, []);

  // Handle tag context menu
  const handleTagContextMenu = useCallback((tag: ParsedTag, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ tag, x: e.clientX, y: e.clientY });
    setEditingTag(null);
  }, []);

  // Update tag value
  const updateTagValue = useCallback((tag: ParsedTag, newValue: string) => {
    const newTag = `[${tag.category}: ${newValue}]`;
    const newText = value.slice(0, tag.start) + newTag + value.slice(tag.end);
    onChange(newText);
    setEditingTag(null);
  }, [value, onChange]);

  // Remove tag
  const removeTag = useCallback((tag: ParsedTag) => {
    const newText = value.slice(0, tag.start) + value.slice(tag.end);
    onChange(newText.replace(/\s+/g, ' ').trim());
    setContextMenu(null);
    setEditingTag(null);
  }, [value, onChange]);

  // Duplicate tag
  const duplicateTag = useCallback((tag: ParsedTag) => {
    const newText = value.slice(0, tag.end) + tag.raw + value.slice(tag.end);
    onChange(newText);
    setContextMenu(null);
  }, [value, onChange]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
        setEditingTag(null);
        setContextMenu(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Render highlighted text with tags
  const renderHighlightedText = useMemo(() => {
    if (!value) return null;
    
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    
    for (const tag of parsedTags) {
      // Add text before tag
      if (tag.start > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-transparent">
            {value.slice(lastIndex, tag.start)}
          </span>
        );
      }
      
      // Add tag
      const category = getCategoryById(tag.category);
      const Icon = category?.icon || Sparkles;
      
      parts.push(
        <span
          key={`tag-${tag.start}`}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer
            ${category?.bgColor || 'bg-slate-500/20'} 
            ${category?.borderColor || 'border-slate-500/50'}
            ${category?.color || 'text-slate-300'}
            border text-xs font-medium hover:brightness-125 transition-all`}
          onClick={(e) => handleTagClick(tag, e)}
          onContextMenu={(e) => handleTagContextMenu(tag, e)}
        >
          <Icon className="w-3 h-3" />
          <span>{tag.category}:</span>
          <span className="font-semibold">{tag.value}</span>
        </span>
      );
      
      lastIndex = tag.end;
    }
    
    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className="text-transparent">
          {value.slice(lastIndex)}
        </span>
      );
    }
    
    return parts;
  }, [value, parsedTags, handleTagClick, handleTagContextMenu]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Tag categories legend */}
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="text-xs text-slate-500">Tags:</span>
        {TAG_CATEGORIES.slice(0, 6).map(cat => (
          <button
            key={cat.id}
            onClick={() => {
              if (textareaRef.current) {
                const pos = textareaRef.current.selectionStart;
                const newValue = value.slice(0, pos) + `[${cat.id}: ]` + value.slice(pos);
                onChange(newValue);
                setTimeout(() => {
                  if (textareaRef.current) {
                    const newPos = pos + cat.id.length + 3;
                    textareaRef.current.selectionStart = newPos;
                    textareaRef.current.selectionEnd = newPos;
                    textareaRef.current.focus();
                    // Trigger autocomplete
                    setBracketStart(pos);
                    setSelectedCategory(cat);
                    setAutocompleteStep('value');
                    setAutocompleteFilter('');
                    setShowAutocomplete(true);
                  }
                }, 10);
              }
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${cat.bgColor} ${cat.color} ${cat.borderColor} border hover:brightness-125 transition`}
          >
            <cat.icon className="w-3 h-3" />
            {cat.label}
          </button>
        ))}
        <button
          onClick={() => {
            if (textareaRef.current) {
              textareaRef.current.focus();
              const pos = textareaRef.current.selectionStart;
              const newValue = value.slice(0, pos) + '[' + value.slice(pos);
              onChange(newValue);
              setTimeout(() => {
                if (textareaRef.current) {
                  const newPos = pos + 1;
                  textareaRef.current.selectionStart = newPos;
                  textareaRef.current.selectionEnd = newPos;
                }
              }, 10);
            }
          }}
          className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-slate-700/50 text-slate-400 border border-slate-600 hover:bg-slate-600/50 transition"
        >
          <Plus className="w-3 h-3" />
          More
        </button>
      </div>

      {/* Editor container */}
      <div className="relative">
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          placeholder={placeholder}
          rows={minRows}
          disabled={disabled}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm leading-relaxed z-10 relative"
          style={{ caretColor: 'white' }}
        />
        
        {/* Overlay for highlighted tags */}
        <div
          ref={overlayRef}
          className="absolute inset-0 px-4 py-3 pointer-events-none overflow-hidden font-mono text-sm leading-relaxed whitespace-pre-wrap break-words"
          aria-hidden="true"
        >
          {renderHighlightedText}
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {showAutocomplete && filteredItems.length > 0 && (
        <div
          className="absolute z-50 mt-1 w-64 max-h-64 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-xl"
          style={{
            top: '100%',
            left: 0,
          }}
        >
          <div className="p-2 border-b border-slate-700 text-xs text-slate-400">
            {autocompleteStep === 'category' ? (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Select tag category
              </span>
            ) : (
              <span className="flex items-center gap-1">
                {selectedCategory && <selectedCategory.icon className="w-3 h-3" />}
                {selectedCategory?.label}: Select value
              </span>
            )}
          </div>
          {autocompleteStep === 'category' ? (
            (filteredItems as TagCategory[]).map((item, index) => (
              <button
                key={item.id}
                onClick={() => selectAutocompleteItem(index)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-700 transition
                  ${index === highlightedIndex ? 'bg-slate-700' : ''}`}
              >
                <span className={`p-1 rounded ${item.bgColor}`}>
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                </span>
                <span className="text-white">{item.label}</span>
                <span className="text-slate-500 text-xs ml-auto">{item.values.length} options</span>
              </button>
            ))
          ) : (
            (filteredItems as string[]).map((item, index) => (
              <button
                key={item}
                onClick={() => selectAutocompleteItem(index)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-700 transition
                  ${index === highlightedIndex ? 'bg-slate-700' : ''}
                  ${selectedCategory?.color || 'text-white'}`}
              >
                <span>{item}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Edit tag dropdown */}
      {editingTag && (
        <div
          className="fixed z-50 w-56 max-h-64 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-xl"
          style={{
            top: editMenuPosition.top,
            left: editMenuPosition.left,
          }}
        >
          <div className="p-2 border-b border-slate-700 text-xs text-slate-400 flex items-center justify-between">
            <span>Edit {editingTag.category}</span>
            <button 
              onClick={() => setEditingTag(null)} 
              className="hover:text-white"
              aria-label="Close edit menu"
              title="Close"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          {getCategoryById(editingTag.category)?.values.map((val) => (
            <button
              key={val}
              onClick={() => updateTagValue(editingTag, val)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-slate-700 transition
                ${val === editingTag.value ? 'bg-purple-500/20 text-purple-300' : 'text-white'}`}
            >
              {val === editingTag.value && <Check className="w-3 h-3" />}
              <span className={val === editingTag.value ? 'font-medium' : ''}>{val}</span>
            </button>
          ))}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 w-48 bg-slate-800 border border-slate-600 rounded-lg shadow-xl overflow-hidden"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <button
            onClick={() => {
              setEditingTag(contextMenu.tag);
              setEditMenuPosition({ top: contextMenu.y, left: contextMenu.x });
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-white hover:bg-slate-700 transition"
          >
            <ChevronDown className="w-4 h-4" />
            Edit Value
          </button>
          <button
            onClick={() => duplicateTag(contextMenu.tag)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-white hover:bg-slate-700 transition"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            onClick={() => removeTag(contextMenu.tag)}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-red-400 hover:bg-slate-700 transition"
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
          <div className="border-t border-slate-700">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left text-slate-400 hover:bg-slate-700 transition"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs">
                {getCategoryById(contextMenu.tag.category)?.label || contextMenu.tag.category}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Tag count indicator */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>{value.length} characters</span>
        <span className="flex items-center gap-2">
          {parsedTags.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">
              <Sparkles className="w-3 h-3" />
              {parsedTags.length} tag{parsedTags.length !== 1 ? 's' : ''}
            </span>
          )}
          <span>Type [ to add tags</span>
        </span>
      </div>
    </div>
  );
}

export default ScenarioTagEditor;
