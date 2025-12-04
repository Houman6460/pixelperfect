import React, { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import SunoTools from "./SunoTools";
import MusicGallery from "./MusicGallery";
import {
  Music,
  Mic,
  Piano,
  AudioWaveform,
  Play,
  Pause,
  Download,
  Loader2,
  Volume2,
  Clock,
  Sliders,
  FileAudio,
  Upload,
  Sparkles,
  RefreshCw,
  Music2,
  User,
  Mic2,
  FileText,
  Languages,
  Users,
  Copy,
  Check,
  Circle,
  Square,
  Trash2,
  Plus,
  X,
  ToggleLeft,
  ToggleRight,
  FileImage,
  ScanLine,
  Music4,
  MessageSquare,
  Smile,
  Type,
  ListMusic,
  Tag,
  Wand2,
  Scissors,
  Save,
  FolderOpen,
  MoreVertical,
  Layers,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

// Dynamic API base URL (without /api suffix - component adds /api/ prefix to routes)
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

// Instrument definitions with verified Font Awesome 6 Free icons
const INSTRUMENTS = [
  { id: "piano", name: "Piano", icon: "fa-solid fa-keyboard", category: "keyboard" },
  { id: "guitar", name: "Guitar", icon: "fa-solid fa-guitar", category: "string" },
  { id: "electric_guitar", name: "Electric Guitar", icon: "fa-solid fa-bolt", category: "string" },
  { id: "bass", name: "Bass", icon: "fa-solid fa-wave-square", category: "string" },
  { id: "violin", name: "Violin", icon: "fa-solid fa-music", category: "string" },
  { id: "cello", name: "Cello", icon: "fa-solid fa-align-left", category: "string" },
  { id: "harp", name: "Harp", icon: "fa-solid fa-grip-lines", category: "string" },
  { id: "drums", name: "Drums", icon: "fa-solid fa-drum", category: "percussion" },
  { id: "percussion", name: "Percussion", icon: "fa-solid fa-drum-steelpan", category: "percussion" },
  { id: "saxophone", name: "Saxophone", icon: "fa-solid fa-scroll", category: "wind" },
  { id: "trumpet", name: "Trumpet", icon: "fa-solid fa-bullhorn", category: "brass" },
  { id: "flute", name: "Flute", icon: "fa-solid fa-wand-magic-sparkles", category: "wind" },
  { id: "clarinet", name: "Clarinet", icon: "fa-solid fa-pen", category: "wind" },
  { id: "harmonica", name: "Harmonica", icon: "fa-solid fa-grip", category: "wind" },
  { id: "accordion", name: "Accordion", icon: "fa-solid fa-compress", category: "keyboard" },
  { id: "organ", name: "Organ", icon: "fa-solid fa-church", category: "keyboard" },
  { id: "synthesizer", name: "Synthesizer", icon: "fa-solid fa-sliders", category: "electronic" },
  { id: "synth_pad", name: "Synth Pad", icon: "fa-solid fa-layer-group", category: "electronic" },
  { id: "808", name: "808 Bass", icon: "fa-solid fa-volume-high", category: "electronic" },
  { id: "strings", name: "Orchestra Strings", icon: "fa-solid fa-align-justify", category: "orchestra" },
  { id: "brass", name: "Brass Section", icon: "fa-solid fa-crown", category: "orchestra" },
  { id: "woodwinds", name: "Woodwinds", icon: "fa-solid fa-wind", category: "orchestra" },
  { id: "bells", name: "Bells/Chimes", icon: "fa-solid fa-bell", category: "percussion" },
  { id: "marimba", name: "Marimba", icon: "fa-solid fa-table-cells", category: "percussion" },
  { id: "ukulele", name: "Ukulele", icon: "fa-solid fa-circle-half-stroke", category: "string" },
  { id: "banjo", name: "Banjo", icon: "fa-regular fa-circle", category: "string" },
  { id: "mandolin", name: "Mandolin", icon: "fa-solid fa-droplet", category: "string" },
  { id: "sitar", name: "Sitar", icon: "fa-solid fa-ankh", category: "string" },
  { id: "tabla", name: "Tabla", icon: "fa-solid fa-circle-dot", category: "percussion" },
  { id: "dj_scratching", name: "DJ Scratching", icon: "fa-solid fa-compact-disc", category: "electronic" },
];

// Vocal type definitions with verified Font Awesome 6 Free icons
const VOCAL_TYPES = [
  { id: "male", name: "Male Voice", icon: "fa-solid fa-mars", description: "Adult male vocals" },
  { id: "female", name: "Female Voice", icon: "fa-solid fa-venus", description: "Adult female vocals" },
  { id: "child", name: "Child Voice", icon: "fa-solid fa-child", description: "Young child vocals" },
  { id: "choir", name: "Choir", icon: "fa-solid fa-users", description: "Full choir ensemble" },
  { id: "duet", name: "Duet", icon: "fa-solid fa-user-group", description: "Two voices harmony" },
  { id: "harmony", name: "Harmony", icon: "fa-solid fa-layer-group", description: "Multi-voice harmonies" },
  { id: "falsetto", name: "Falsetto", icon: "fa-solid fa-arrow-up", description: "High-pitched falsetto" },
  { id: "bass_voice", name: "Bass Voice", icon: "fa-solid fa-arrow-down", description: "Deep bass vocals" },
  { id: "tenor", name: "Tenor", icon: "fa-solid fa-microphone", description: "Tenor range vocals" },
  { id: "soprano", name: "Soprano", icon: "fa-solid fa-star", description: "High soprano vocals" },
  { id: "alto", name: "Alto", icon: "fa-solid fa-minus", description: "Alto range vocals" },
  { id: "rap", name: "Rap/Hip-Hop", icon: "fa-solid fa-fire", description: "Rap style vocals" },
  { id: "opera", name: "Opera", icon: "fa-solid fa-masks-theater", description: "Operatic vocals" },
  { id: "whisper", name: "Whisper", icon: "fa-solid fa-comment", description: "Soft whispered vocals" },
  { id: "robotic", name: "Robotic/Vocoder", icon: "fa-solid fa-robot", description: "Auto-tuned/vocoder effect" },
];

type InstrumentVolume = { id: string; volume: number; auto: boolean };
type VocalVolume = { id: string; volume: number; auto: boolean };

// Model definitions with their specific parameters
const VOCAL_MODELS = [
  {
    id: "minimax/music-1.5",
    name: "MiniMax Music 1.5",
    description: "Full songs up to 4 mins with natural vocals & rich instrumentation (requires reference audio)",
    controls: ["prompt", "reference_audio", "lyrics", "duration", "style"],
    maxDuration: 240,
    maxLyrics: 600,
    maxPrompt: 300,
  },
  {
    id: "minimax/music-01",
    name: "MiniMax Music 01",
    description: "High-quality music with vocals, lyrics support (600 chars), and reference audio",
    controls: ["prompt", "lyrics", "reference_audio"],
    maxDuration: 300,
    maxLyrics: 600,
    maxPrompt: 300,
  },
  {
    id: "google/lyria-2",
    name: "Google Lyria 2",
    description: "48kHz stereo audio from text prompts with vocals",
    controls: ["prompt", "duration"],
    maxDuration: 30,
  },
  {
    id: "lucataco/ace-step",
    name: "ACE-Step",
    description: "Text-to-music with long lyrics support (2000+ chars)",
    controls: ["prompt", "lyrics", "duration", "tags"],
    maxDuration: 120,
    maxLyrics: 3000,
    maxPrompt: 1000,
  },
  {
    id: "suno/ai",
    name: "Suno AI",
    description: "Professional AI music generation with vocals - select version in controls below",
    controls: ["prompt", "lyrics", "style", "title", "suno_mode", "instrumental", "audio_input"],
    maxDuration: 480,
    maxLyrics: 5000,
    maxPrompt: 5000,
    maxStyle: 1000,
    maxTitle: 100,
  },
];

// Suno model versions for the dropdown
const SUNO_MODELS = [
  { id: "V5", name: "Suno V5 (Latest)", description: "Latest Suno model - superior musical expression, up to 4 mins", maxLyrics: 5000, maxStyle: 1000 },
  { id: "V4_5PLUS", name: "Suno V4.5+ (8 min)", description: "Richer sound, new ways to create, up to 8 mins", maxLyrics: 5000, maxStyle: 1000 },
  { id: "V4_5ALL", name: "Suno V4.5 All", description: "Multi-track support with balanced quality (max 1 min audio input)", maxLyrics: 5000, maxStyle: 1000 },
  { id: "V4_5", name: "Suno V4.5", description: "Improved vocal clarity and instrument separation", maxLyrics: 5000, maxStyle: 1000 },
  { id: "V4", name: "Suno V4 (Best Quality)", description: "Best audio quality with refined song structure, up to 4 mins", maxLyrics: 3000, maxStyle: 200 },
];

const INSTRUMENTAL_MODELS = [
  {
    id: "meta/musicgen",
    name: "Meta MusicGen",
    description: "Generate from prompt or melody input - most versatile",
    controls: ["prompt", "melody_audio", "duration", "temperature", "top_k", "top_p"],
    maxDuration: 30,
  },
  {
    id: "stability-ai/stable-audio-2.5",
    name: "Stable Audio 2.5",
    description: "High-quality music & sound from text prompts",
    controls: ["prompt", "duration", "negative_prompt"],
    maxDuration: 180,
  },
  {
    id: "sakemin/musicgen-stereo-chord",
    name: "MusicGen Stereo Chord",
    description: "Stereo music with chord sequences & tempo control",
    controls: ["prompt", "chords", "bpm", "duration", "temperature"],
    maxDuration: 30,
  },
  {
    id: "andreasjansson/musicgen-looper",
    name: "MusicGen Looper",
    description: "Fixed-BPM loops from text prompts",
    controls: ["prompt", "bpm", "bars"],
    maxDuration: 30,
  },
  {
    id: "sakemin/musicgen-remixer",
    name: "MusicGen Remixer",
    description: "Remix music into different styles",
    controls: ["prompt", "input_audio", "duration"],
    maxDuration: 30,
  },
  {
    id: "riffusion/riffusion",
    name: "Riffusion",
    description: "Real-time music generation via spectrograms",
    controls: ["prompt_a", "prompt_b", "denoising", "seed_image"],
    maxDuration: 10,
  },
];

const VOICE_CLONING_MODELS = [
  {
    id: "zsxkib/realistic-voice-cloning",
    name: "Realistic Voice Cloning",
    description: "Create song covers with any RVC v2 trained AI voice",
    controls: ["song_input", "rvc_model", "pitch_change", "index_rate", "filter_radius"],
    maxDuration: 300,
  },
  {
    id: "replicate/train-rvc-model",
    name: "Train RVC Model",
    description: "Train your own custom RVC voice model",
    controls: ["dataset_url", "model_name", "epochs"],
    maxDuration: 0,
  },
];

const TRANSCRIBE_MODELS = [
  {
    id: "openai/whisper",
    name: "OpenAI Whisper",
    description: "Industry-leading speech recognition - supports 99 languages",
    controls: ["audio_file", "model_size", "language", "translate", "temperature"],
    maxDuration: 0,
  },
  {
    id: "vaibhavs10/incredibly-fast-whisper",
    name: "Incredibly Fast Whisper",
    description: "70x faster Whisper with insanely-fast-whisper + batching",
    controls: ["audio_file", "language", "batch_size", "timestamp"],
    maxDuration: 0,
  },
  {
    id: "thomasmol/whisper-diarization",
    name: "Whisper Diarization",
    description: "Transcription with speaker identification & timestamps",
    controls: ["audio_file", "language", "num_speakers", "prompt"],
    maxDuration: 0,
  },
  {
    id: "m-bain/whisperx",
    name: "WhisperX",
    description: "Word-level timestamps with faster-whisper backend",
    controls: ["audio_file", "language", "batch_size", "align_output"],
    maxDuration: 0,
  },
  {
    id: "turian/insanely-fast-whisper-with-video",
    name: "Whisper with Video",
    description: "Transcribe audio from video files directly",
    controls: ["video_file", "language", "batch_size"],
    maxDuration: 0,
  },
];

// Text-to-Speech Models
const TTS_MODELS = [
  {
    id: "lucataco/xtts-v2",
    name: "XTTS v2",
    description: "Coqui's best TTS model - 17 languages, voice cloning support",
    controls: ["text", "language", "speaker_wav", "speed"],
    maxDuration: 0,
  },
  {
    id: "suno-ai/bark",
    name: "Suno Bark",
    description: "Realistic speech with emotions, music, sound effects & more",
    controls: ["text", "voice_preset", "text_temp", "waveform_temp"],
    maxDuration: 0,
  },
  {
    id: "afiaka87/tortoise-tts",
    name: "Tortoise TTS",
    description: "High-quality multi-voice TTS with emotional expressiveness",
    controls: ["text", "voice", "preset", "seed"],
    maxDuration: 0,
  },
  {
    id: "jbilcke-hf/parler-tts-mini-v1",
    name: "Parler TTS",
    description: "Describe the voice you want - natural sounding speech",
    controls: ["text", "description"],
    maxDuration: 0,
  },
  {
    id: "cjwbw/seamless_communication",
    name: "Meta SeamlessM4T",
    description: "Multilingual speech synthesis with translation",
    controls: ["text", "target_language", "speaker_id"],
    maxDuration: 0,
  },
  {
    id: "lucataco/orpheus-3b-0.1-ft",
    name: "Orpheus TTS",
    description: "Expressive speech with emotion control and natural prosody",
    controls: ["text", "voice", "emotion", "speed"],
    maxDuration: 0,
  },
  {
    id: "myshell-ai/openvoice",
    name: "OpenVoice",
    description: "Instant voice cloning with tone, emotion & accent control",
    controls: ["text", "reference_audio", "language", "speed"],
    maxDuration: 0,
  },
  {
    id: "elevenlabs/speech-synthesis",
    name: "ElevenLabs Style",
    description: "High-quality speech with stability and similarity controls",
    controls: ["text", "voice_id", "stability", "similarity_boost"],
    maxDuration: 0,
  },
];

// TTS Voice Presets for Bark model
const BARK_VOICES = [
  // Auto-detect (best for multilingual/Farsi - detects from text)
  { id: "announcer", name: "Auto Detect (Best for Farsi)", lang: "auto" },
  // English
  { id: "en_speaker_0", name: "English Male 1", lang: "en" },
  { id: "en_speaker_1", name: "English Male 2", lang: "en" },
  { id: "en_speaker_2", name: "English Female 1", lang: "en" },
  { id: "en_speaker_3", name: "English Female 2", lang: "en" },
  { id: "en_speaker_6", name: "English Male (Deep)", lang: "en" },
  { id: "en_speaker_9", name: "English Female (Clear)", lang: "en" },
  // German
  { id: "de_speaker_0", name: "German Male", lang: "de" },
  { id: "de_speaker_1", name: "German Female", lang: "de" },
  // Spanish
  { id: "es_speaker_0", name: "Spanish Male", lang: "es" },
  { id: "es_speaker_1", name: "Spanish Female", lang: "es" },
  // French
  { id: "fr_speaker_0", name: "French Male", lang: "fr" },
  { id: "fr_speaker_1", name: "French Female", lang: "fr" },
  // Turkish (closest to Farsi phonetics)
  { id: "tr_speaker_0", name: "Turkish Male (Good for Farsi)", lang: "tr" },
  { id: "tr_speaker_1", name: "Turkish Female (Good for Farsi)", lang: "tr" },
  // Hindi (similar script family)
  { id: "hi_speaker_0", name: "Hindi Male (हिंदी)", lang: "hi" },
  { id: "hi_speaker_1", name: "Hindi Female (हिंदी)", lang: "hi" },
  // Russian
  { id: "ru_speaker_0", name: "Russian Male", lang: "ru" },
  { id: "ru_speaker_1", name: "Russian Female", lang: "ru" },
  // Japanese
  { id: "ja_speaker_0", name: "Japanese Male", lang: "ja" },
  { id: "ja_speaker_1", name: "Japanese Female", lang: "ja" },
  // Korean
  { id: "ko_speaker_0", name: "Korean Male", lang: "ko" },
  { id: "ko_speaker_1", name: "Korean Female", lang: "ko" },
  // Chinese
  { id: "zh_speaker_0", name: "Chinese Male", lang: "zh" },
  { id: "zh_speaker_1", name: "Chinese Female", lang: "zh" },
  // Polish
  { id: "pl_speaker_0", name: "Polish Male", lang: "pl" },
  { id: "pl_speaker_1", name: "Polish Female", lang: "pl" },
  // Italian
  { id: "it_speaker_0", name: "Italian Male", lang: "it" },
  { id: "it_speaker_1", name: "Italian Female", lang: "it" },
  // Portuguese
  { id: "pt_speaker_0", name: "Portuguese Male", lang: "pt" },
  { id: "pt_speaker_1", name: "Portuguese Female", lang: "pt" },
];

// Tortoise TTS Voices
const TORTOISE_VOICES = [
  { id: "random", name: "Random Voice" },
  { id: "train_atkins", name: "Atkins (Male)" },
  { id: "train_daws", name: "Daws (Male)" },
  { id: "train_dotrice", name: "Dotrice (Male - Storyteller)" },
  { id: "train_dreams", name: "Dreams (Female)" },
  { id: "train_empire", name: "Empire (Male)" },
  { id: "train_geralt", name: "Geralt (Male - Deep)" },
  { id: "train_grace", name: "Grace (Female)" },
  { id: "train_halle", name: "Halle (Female)" },
  { id: "train_jlaw", name: "JLaw (Female)" },
  { id: "train_lj", name: "LJ (Female)" },
  { id: "train_mol", name: "Mol (Male)" },
  { id: "train_pat", name: "Pat (Male)" },
  { id: "train_snakes", name: "Snakes (Male)" },
  { id: "train_tom", name: "Tom (Male)" },
  { id: "train_weaver", name: "Weaver (Female)" },
  { id: "train_william", name: "William (Male)" },
];

type TabType = "vocals" | "instrumental" | "cloning" | "transcribe" | "tts";

interface MusicModel {
  id: string;
  name: string;
  description: string;
  controls: string[];
  maxDuration?: number;
}

export default function MusicStudio() {
  const [activeTab, setActiveTab] = useState<TabType>("vocals");
  const [selectedModel, setSelectedModel] = useState<MusicModel>(VOCAL_MODELS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAudio, setGeneratedAudio] = useState<string | null>(null);
  const [generatedTracks, setGeneratedTracks] = useState<Array<{url: string; title?: string; id?: string; imageUrl?: string; taskId?: string}>>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playingTrackIndex, setPlayingTrackIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [showGallery, setShowGallery] = useState(false);
  
  // Suno Post-Processing - taskId for SunoTools component
  const [lastTaskId, setLastTaskId] = useState<string | null>(null);
  
  // Common controls
  const [prompt, setPrompt] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [duration, setDuration] = useState(30);
  const [style, setStyle] = useState("");
  
  // Advanced controls
  const [temperature, setTemperature] = useState(1.0);
  const [topK, setTopK] = useState(250);
  const [topP, setTopP] = useState(0.95);
  const [bpm, setBpm] = useState(120);
  const [bars, setBars] = useState(4);
  const [chords, setChords] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [tags, setTags] = useState("");
  
  // Voice cloning controls
  const [pitchChange, setPitchChange] = useState(0);
  const [indexRate, setIndexRate] = useState(0.75);
  const [filterRadius, setFilterRadius] = useState(3);
  
  // Riffusion specific
  const [promptA, setPromptA] = useState("");
  const [promptB, setPromptB] = useState("");
  const [denoising, setDenoising] = useState(0.75);
  
  // Suno specific controls
  const [sunoTitle, setSunoTitle] = useState("");
  const [sunoCustomMode, setSunoCustomMode] = useState(true); // true = custom lyrics, false = auto-generate
  const [sunoInstrumental, setSunoInstrumental] = useState(false);
  
  // Loop mode - seamlessly sync start and end for looping music
  const [enableLoop, setEnableLoop] = useState(false);
  
  // Prompt enhancement
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isEnhancingLyrics, setIsEnhancingLyrics] = useState(false);
  const [isCondensingLyrics, setIsCondensingLyrics] = useState(false);
  const [enableProRepetition, setEnableProRepetition] = useState(false); // Pro mode: repeat chorus/hooks
  const [isAddingDiacritics, setIsAddingDiacritics] = useState(false); // Adding pronunciation marks
  const [lyricsLanguages, setLyricsLanguages] = useState<string[]>(["persian"]); // Selected languages for pronunciation (multi-select)
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  
  // Lyrics autocomplete state
  const [showLyricsAutocomplete, setShowLyricsAutocomplete] = useState(false);
  const [autocompleteType, setAutocompleteType] = useState<"section" | "vocal" | null>(null);
  const [autocompleteFilter, setAutocompleteFilter] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const lyricsTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [lyricsFontSize, setLyricsFontSize] = useState(14); // Font size in pixels
  
  // Style multi-select state
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [showStyleSelector, setShowStyleSelector] = useState(false);
  
  // File inputs
  const [melodyFile, setMelodyFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [songInputFile, setSongInputFile] = useState<File | null>(null);
  const [rvcModelUrl, setRvcModelUrl] = useState("");
  
  // Training model controls
  const [datasetUrl, setDatasetUrl] = useState("");
  const [trainingModelName, setTrainingModelName] = useState("");
  const [trainingEpochs, setTrainingEpochs] = useState(100);
  
  // Transcription controls
  const [transcribeFile, setTranscribeFile] = useState<File | null>(null);
  const [transcribeLanguage, setTranscribeLanguage] = useState("auto");
  const [modelSize, setModelSize] = useState("large-v3");
  const [translateToEnglish, setTranslateToEnglish] = useState(false);
  const [numSpeakers, setNumSpeakers] = useState(2);
  const [batchSize, setBatchSize] = useState(24);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [alignOutput, setAlignOutput] = useState(true);
  const [transcriptionResult, setTranscriptionResult] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // TTS controls
  const [ttsText, setTtsText] = useState("");
  const [ttsVoice, setTtsVoice] = useState("v2/en_speaker_0");
  const [ttsSpeed, setTtsSpeed] = useState(1.0);
  const [ttsLanguage, setTtsLanguage] = useState("en");
  const [ttsDescription, setTtsDescription] = useState("");
  const [ttsEmotion, setTtsEmotion] = useState("neutral");
  const [ttsStability, setTtsStability] = useState(0.5);
  const [ttsSimilarity, setTtsSimilarity] = useState(0.75);
  const [ttsTextTemp, setTtsTextTemp] = useState(0.7);
  const [ttsWaveformTemp, setTtsWaveformTemp] = useState(0.7);
  const [ttsSpeakerFile, setTtsSpeakerFile] = useState<File | null>(null);
  const [ttsResult, setTtsResult] = useState<string | null>(null);
  const [isTtsGenerating, setIsTtsGenerating] = useState(false);
  const [isEnhancingTts, setIsEnhancingTts] = useState(false);
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [generatedLyricsPreview, setGeneratedLyricsPreview] = useState<string | null>(null);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordedAudioRef = useRef<HTMLAudioElement>(null);
  
  // Instruments and vocals selection
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentVolume[]>([]);
  const [selectedVocals, setSelectedVocals] = useState<VocalVolume[]>([]);
  
  // Sheet music OCR - Multiple files support
  const [sheetMusicFiles, setSheetMusicFiles] = useState<File[]>([]);
  const [sheetMusicNotation, setSheetMusicNotation] = useState<string>("");
  const [isProcessingSheet, setIsProcessingSheet] = useState(false);
  const [showSheetMusic, setShowSheetMusic] = useState(false);
  const [draggedSheetIndex, setDraggedSheetIndex] = useState<number | null>(null);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  const [showInstrumentPicker, setShowInstrumentPicker] = useState(false);
  const [showVocalPicker, setShowVocalPicker] = useState(false);
  
  // Workflow management
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [showSaveWorkflow, setShowSaveWorkflow] = useState(false);
  const [showLoadWorkflow, setShowLoadWorkflow] = useState(false);
  const [workflowName, setWorkflowName] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [workflowCategory, setWorkflowCategory] = useState("custom");
  const [isSavingWorkflow, setIsSavingWorkflow] = useState(false);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null); // Track loaded workflow for updates
  
  // Audio input for Suno (upload/record)
  const [sunoAudioFile, setSunoAudioFile] = useState<File | null>(null);
  const [sunoAudioUrl, setSunoAudioUrl] = useState("");
  const [isSunoUploading, setIsSunoUploading] = useState(false);
  const [sunoRecordedBlob, setSunoRecordedBlob] = useState<Blob | null>(null);
  const [isSunoRecording, setIsSunoRecording] = useState(false);
  const [sunoRecordingTime, setSunoRecordingTime] = useState(0);
  const sunoMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const sunoRecordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sunoFileInputRef = useRef<HTMLInputElement>(null);
  
  // Vocal settings for Add Vocals
  const [vocalGender, setVocalGender] = useState<"m" | "f">("f");
  const [styleWeight, setStyleWeight] = useState(0.5);
  const [creativityWeight, setCreativityWeight] = useState(0.5);
  const [audioWeight, setAudioWeight] = useState(0.5);
  const [showVocalAdvanced, setShowVocalAdvanced] = useState(false);
  
  // Suno model version
  const [sunoModel, setSunoModel] = useState("V5");
  
  // Boost Style settings
  const [boostAudioId, setBoostAudioId] = useState("");
  const [boostIntensity, setBoostIntensity] = useState(0.5);
  const [boostStyleText, setBoostStyleText] = useState("");
  const [isBoostingStyle, setIsBoostingStyle] = useState(false);
  const [showBoostStyle, setShowBoostStyle] = useState(false); // Collapsed by default
  const [showAddVocals, setShowAddVocals] = useState(false); // Collapsed by default
  
  // Suno Credits
  const [sunoCredits, setSunoCredits] = useState<number | null>(null);
  
  // Gallery tracks with Audio IDs for post-processing
  const [galleryTracksWithIds, setGalleryTracksWithIds] = useState<Array<{ id: string; title: string; audioId: string }>>([]);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordedAudio(blob);
        setRecordedUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  }, [isRecording]);

  const deleteRecording = useCallback(() => {
    setRecordedAudio(null);
    if (recordedUrl) {
      URL.revokeObjectURL(recordedUrl);
    }
    setRecordedUrl(null);
    setRecordingTime(0);
  }, [recordedUrl]);

  const playRecording = useCallback(() => {
    if (recordedAudioRef.current) {
      if (isPlayingRecording) {
        recordedAudioRef.current.pause();
      } else {
        recordedAudioRef.current.play();
      }
      setIsPlayingRecording(!isPlayingRecording);
    }
  }, [isPlayingRecording]);

  // Use recorded audio for different purposes
  const useRecordingAsInput = useCallback((target: "song" | "melody" | "reference") => {
    if (recordedAudio) {
      const file = new File([recordedAudio], `recorded_${target}.webm`, { type: "audio/webm" });
      switch (target) {
        case "song":
          setSongInputFile(file);
          break;
        case "melody":
          setMelodyFile(file);
          break;
        case "reference":
          setReferenceFile(file);
          break;
      }
    }
  }, [recordedAudio]);

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Instrument management functions
  const addInstrument = (instrumentId: string) => {
    if (!selectedInstruments.find(i => i.id === instrumentId)) {
      setSelectedInstruments([...selectedInstruments, { id: instrumentId, volume: 50, auto: false }]);
    }
    setShowInstrumentPicker(false);
  };

  const removeInstrument = (instrumentId: string) => {
    setSelectedInstruments(selectedInstruments.filter(i => i.id !== instrumentId));
  };

  const updateInstrumentVolume = (instrumentId: string, volume: number) => {
    setSelectedInstruments(selectedInstruments.map(i => 
      i.id === instrumentId ? { ...i, volume } : i
    ));
  };

  const toggleInstrumentAuto = (instrumentId: string) => {
    setSelectedInstruments(selectedInstruments.map(i => 
      i.id === instrumentId ? { ...i, auto: !i.auto } : i
    ));
  };

  // Vocal management functions
  const addVocal = (vocalId: string) => {
    if (!selectedVocals.find(v => v.id === vocalId)) {
      setSelectedVocals([...selectedVocals, { id: vocalId, volume: 50, auto: false }]);
    }
    setShowVocalPicker(false);
  };

  const removeVocal = (vocalId: string) => {
    setSelectedVocals(selectedVocals.filter(v => v.id !== vocalId));
  };

  const updateVocalVolume = (vocalId: string, volume: number) => {
    setSelectedVocals(selectedVocals.map(v => 
      v.id === vocalId ? { ...v, volume } : v
    ));
  };

  const toggleVocalAuto = (vocalId: string) => {
    setSelectedVocals(selectedVocals.map(v => 
      v.id === vocalId ? { ...v, auto: !v.auto } : v
    ));
  };

  // Workflow management functions
  const fetchWorkflows = async () => {
    setIsLoadingWorkflows(true);
    try {
      const response = await axios.get(`${API_BASE}/api/workflows`);
      if (response.data.success) {
        setWorkflows(response.data.workflows);
      }
    } catch (err) {
      console.error("Failed to fetch workflows:", err);
    } finally {
      setIsLoadingWorkflows(false);
    }
  };

  const saveWorkflow = async (saveAsNew: boolean = false) => {
    if (!workflowName.trim()) {
      setError("Please enter a workflow name");
      return;
    }
    
    setIsSavingWorkflow(true);
    try {
      const workflowData = {
        name: workflowName,
        description: workflowDescription,
        category: workflowCategory,
        modelId: selectedModel.id,
        modelType: activeTab === "instrumental" ? "instrumental" : "vocal",
        prompt,
        lyrics,
        style,
        tags,
        negativePrompt,
        sunoTitle,
        sunoCustomMode,
        sunoInstrumental,
        duration,
        temperature,
        topK,
        topP,
        bpm,
        instruments: selectedInstruments,
        vocals: selectedVocals,
        // New fields
        selectedStyles,
        lyricsLanguages,
        enableProRepetition,
        enableLoop,
      };
      
      let response;
      
      // Update existing workflow or create new
      if (currentWorkflowId && !saveAsNew) {
        // Update existing workflow
        response = await axios.put(`${API_BASE}/api/workflows/${currentWorkflowId}`, workflowData);
      } else {
        // Create new workflow
        response = await axios.post(`${API_BASE}/api/workflows`, workflowData);
        // Set the new workflow as current
        if (response.data.success && response.data.workflow?.id) {
          setCurrentWorkflowId(response.data.workflow.id);
        }
      }
      
      if (response.data.success) {
        setShowSaveWorkflow(false);
        await fetchWorkflows();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save workflow");
    } finally {
      setIsSavingWorkflow(false);
    }
  };

  const loadWorkflow = (workflow: any) => {
    // Store workflow ID for future updates
    setCurrentWorkflowId(workflow.id);
    setWorkflowName(workflow.name || "");
    setWorkflowDescription(workflow.description || "");
    setWorkflowCategory(workflow.category || "custom");
    
    // Set model
    const allModels = [...VOCAL_MODELS, ...INSTRUMENTAL_MODELS];
    const model = allModels.find(m => m.id === workflow.modelId);
    if (model) {
      setSelectedModel(model);
      setActiveTab(workflow.modelType === "instrumental" ? "instrumental" : "vocals");
    }
    
    // Set content
    setPrompt(workflow.prompt || "");
    setLyrics(workflow.lyrics || "");
    setStyle(workflow.style || "");
    setTags(workflow.tags || "");
    setNegativePrompt(workflow.negativePrompt || "");
    
    // Set Suno-specific
    setSunoTitle(workflow.sunoTitle || "");
    setSunoCustomMode(workflow.sunoCustomMode ?? true);
    setSunoInstrumental(workflow.sunoInstrumental ?? false);
    
    // Set audio parameters
    setDuration(workflow.duration || 30);
    setTemperature(workflow.temperature || 1.0);
    setTopK(workflow.topK || 250);
    setTopP(workflow.topP || 0.95);
    setBpm(workflow.bpm || 120);
    
    // Set instruments and vocals (ensure auto field exists for backwards compatibility)
    setSelectedInstruments((workflow.instruments || []).map((i: any) => ({
      id: i.id,
      volume: i.volume ?? 50,
      auto: i.auto ?? false,
    })));
    setSelectedVocals((workflow.vocals || []).map((v: any) => ({
      id: v.id,
      volume: v.volume ?? 50,
      auto: v.auto ?? false,
    })));
    
    // Load new fields
    setSelectedStyles(workflow.selectedStyles || []);
    setLyricsLanguages(workflow.lyricsLanguages || ["persian"]);
    setEnableProRepetition(workflow.enableProRepetition ?? false);
    setEnableLoop(workflow.enableLoop ?? false);
    
    setShowLoadWorkflow(false);
  };
  
  const clearCurrentWorkflow = () => {
    setCurrentWorkflowId(null);
    setWorkflowName("");
    setWorkflowDescription("");
    setWorkflowCategory("custom");
  };

  const deleteWorkflow = async (id: string) => {
    try {
      await axios.delete(`${API_BASE}/api/workflows/${id}`);
      await fetchWorkflows();
    } catch (err) {
      console.error("Failed to delete workflow:", err);
    }
  };

  // Fetch workflows on mount
  React.useEffect(() => {
    fetchWorkflows();
  }, []);

  // Suno audio file upload
  const handleSunoFileUpload = async (file: File) => {
    setIsSunoUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);
      
      const response = await axios.post(`${API_BASE}/api/suno/upload-audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (response.data.success) {
        setSunoAudioUrl(response.data.uploadUrl);
        setSunoAudioFile(file);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upload audio");
    } finally {
      setIsSunoUploading(false);
    }
  };

  // Suno voice recording
  const startSunoRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      sunoMediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setSunoRecordedBlob(blob);
        
        // Upload the recording
        setIsSunoUploading(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            const response = await axios.post(`${API_BASE}/api/suno/upload-recording`, {
              audioData: base64,
              mimeType: "audio/webm",
            });
            
            if (response.data.success) {
              setSunoAudioUrl(response.data.uploadUrl);
            }
          };
          reader.readAsDataURL(blob);
        } catch (err: any) {
          setError(err.response?.data?.error || "Failed to upload recording");
        } finally {
          setIsSunoUploading(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsSunoRecording(true);
      setSunoRecordingTime(0);
      
      sunoRecordingTimerRef.current = setInterval(() => {
        setSunoRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone access denied");
    }
  };

  const stopSunoRecording = () => {
    if (sunoMediaRecorderRef.current && isSunoRecording) {
      sunoMediaRecorderRef.current.stop();
      setIsSunoRecording(false);
      if (sunoRecordingTimerRef.current) {
        clearInterval(sunoRecordingTimerRef.current);
      }
    }
  };

  const clearSunoAudio = () => {
    setSunoRecordedBlob(null);
    setSunoAudioUrl("");
    setSunoAudioFile(null);
    setSunoRecordingTime(0);
  };

  const formatSunoTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Build instruments/vocals string for prompt - include volume/priority or auto mode
  const buildInstrumentsPrompt = () => {
    if (selectedInstruments.length === 0) return "";
    
    return selectedInstruments.map(inst => {
      const info = INSTRUMENTS.find(i => i.id === inst.id);
      
      // If auto mode, let AI decide the priority
      if (inst.auto) {
        return `${info?.name} (AI-controlled mix)`;
      }
      
      // Map volume to Suno-friendly priority terms
      let priority: string;
      if (inst.volume >= 80) {
        priority = "very prominent";
      } else if (inst.volume >= 60) {
        priority = "prominent";
      } else if (inst.volume >= 40) {
        priority = "balanced";
      } else if (inst.volume >= 20) {
        priority = "subtle";
      } else {
        priority = "background";
      }
      return `${info?.name} (${priority}, ${inst.volume}%)`;
    }).join(", ");
  };

  const buildVocalsPrompt = () => {
    if (selectedVocals.length === 0) return "";
    
    return selectedVocals.map(voc => {
      const info = VOCAL_TYPES.find(v => v.id === voc.id);
      
      // If auto mode, let AI decide the priority
      if (voc.auto) {
        return `${info?.name} (AI-controlled mix)`;
      }
      
      // Map volume to Suno-friendly vocal priority terms
      let priority: string;
      if (voc.volume >= 80) {
        priority = "lead/dominant";
      } else if (voc.volume >= 60) {
        priority = "prominent";
      } else if (voc.volume >= 40) {
        priority = "balanced";
      } else if (voc.volume >= 20) {
        priority = "supporting";
      } else {
        priority = "background/subtle";
      }
      return `${info?.name} (${priority}, ${voc.volume}%)`;
    }).join(", ");
  };

  // Render audio recorder section
  const renderAudioRecorder = (target: "song" | "melody" | "reference", title: string, color: string = "purple") => {
    const colorClasses = {
      purple: { border: "border-purple-500/30", text: "text-purple-400", bg: "bg-purple-600 hover:bg-purple-700" },
      emerald: { border: "border-emerald-500/30", text: "text-emerald-400", bg: "bg-emerald-600 hover:bg-emerald-700" },
      amber: { border: "border-amber-500/30", text: "text-amber-400", bg: "bg-amber-600 hover:bg-amber-700" },
    };
    const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.purple;

    return (
      <div className={`p-4 rounded-xl bg-slate-900/50 border ${colors.border}`}>
        <h4 className={`text-sm font-medium ${colors.text} mb-3 flex items-center gap-2`}>
          <Mic className="w-4 h-4" />
          {title}
        </h4>
        
        {/* Recording Controls */}
        <div className="flex items-center gap-3 mb-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium transition"
            >
              <Circle className="w-4 h-4 fill-current" />
              Record
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white font-medium transition animate-pulse"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop
            </button>
          )}
          
          {isRecording && (
            <div className="flex items-center gap-2 text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        {/* Recorded Audio Player */}
        {recordedUrl && !isRecording && (
          <div className="p-3 rounded-lg bg-slate-800 border border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-400">Recorded: {formatTime(recordingTime)}</span>
              <button
                onClick={deleteRecording}
                className="p-1 text-slate-400 hover:text-red-400 transition"
                title="Delete recording"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <audio
              ref={recordedAudioRef}
              src={recordedUrl}
              onEnded={() => setIsPlayingRecording(false)}
              className="hidden"
            />
            
            <div className="flex items-center gap-2">
              <button
                onClick={playRecording}
                className={`w-10 h-10 rounded-full ${colors.bg} flex items-center justify-center text-white transition`}
              >
                {isPlayingRecording ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              
              <button
                onClick={() => useRecordingAsInput(target)}
                className={`flex-1 py-2 rounded-lg ${colors.bg} text-white font-medium text-sm transition`}
              >
                Use This Recording
              </button>
            </div>
          </div>
        )}
        
        <p className="text-xs text-slate-500 mt-2">
          Record audio, then click "Use This Recording" to use it
        </p>
      </div>
    );
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [recordedUrl]);

  const getModelsForTab = (): MusicModel[] => {
    switch (activeTab) {
      case "vocals": return VOCAL_MODELS;
      case "instrumental": return INSTRUMENTAL_MODELS;
      case "cloning": return VOICE_CLONING_MODELS;
      case "transcribe": return TRANSCRIBE_MODELS;
      case "tts": return TTS_MODELS;
      default: return VOCAL_MODELS;
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    const models = tab === "vocals" ? VOCAL_MODELS : 
                   tab === "instrumental" ? INSTRUMENTAL_MODELS : 
                   tab === "cloning" ? VOICE_CLONING_MODELS : 
                   tab === "transcribe" ? TRANSCRIBE_MODELS : TTS_MODELS;
    setSelectedModel(models[0]);
    setGeneratedAudio(null);
    setTranscriptionResult(null);
    setTtsResult(null);
    setError(null);
  };

  // Process multiple sheet music files with OCR
  const handleProcessSheetMusic = async () => {
    if (sheetMusicFiles.length === 0) return;
    
    setIsProcessingSheet(true);
    try {
      const formData = new FormData();
      // Append all files in order
      sheetMusicFiles.forEach((file, index) => {
        formData.append("images", file);
      });
      formData.append("fileCount", sheetMusicFiles.length.toString());
      
      const response = await axios.post(`${API_BASE}/api/music/sheet-ocr`, formData, {
        timeout: 120000, // 2 minutes for multiple files
      });
      
      if (response.data.success && response.data.notation) {
        setSheetMusicNotation(response.data.notation);
        // Append notation to prompt
        const notationPrompt = `[Sheet Music Reference (${sheetMusicFiles.length} pages):\n${response.data.notation}]`;
        setPrompt(prev => prev ? `${prev}\n\n${notationPrompt}` : notationPrompt);
      } else {
        throw new Error(response.data.error || "Failed to process sheet music");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessingSheet(false);
    }
  };

  // Add sheet music files
  const handleAddSheetFiles = (files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    setSheetMusicFiles(prev => [...prev, ...newFiles]);
  };

  // Remove a sheet music file
  const handleRemoveSheet = (index: number) => {
    setSheetMusicFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop reordering
  const handleSheetDragStart = (index: number) => {
    setDraggedSheetIndex(index);
  };

  const handleSheetDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedSheetIndex === null || draggedSheetIndex === index) return;
    
    const newFiles = [...sheetMusicFiles];
    const draggedFile = newFiles[draggedSheetIndex];
    newFiles.splice(draggedSheetIndex, 1);
    newFiles.splice(index, 0, draggedFile);
    setSheetMusicFiles(newFiles);
    setDraggedSheetIndex(index);
  };

  const handleSheetDragEnd = () => {
    setDraggedSheetIndex(null);
  };

  const handleEnhancePrompt = async () => {
    if (!prompt && !lyrics) return;
    
    setIsEnhancing(true);
    try {
      // Build context with instruments and vocals
      const instrumentsStr = buildInstrumentsPrompt();
      const vocalsStr = buildVocalsPrompt();
      
      const response = await axios.post(`${API_BASE}/api/prompt/enhance`, {
        prompt: prompt || promptA,
        model: selectedModel.id,
        type: "music",
        lyrics: lyrics || undefined,
        instruments: instrumentsStr || undefined,
        vocals: vocalsStr || undefined,
      });

      if (response.data.success && response.data.enhancedPrompt) {
        setPrompt(response.data.enhancedPrompt);
        // Note: We intentionally do NOT modify lyrics - only the prompt/description is enhanced
      }
    } catch (err: any) {
      console.error("Prompt enhancement failed:", err);
      setError("Failed to enhance prompt. Please try again.");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleEnhanceLyricsStructure = async () => {
    if (!lyrics) return;
    
    setIsEnhancingLyrics(true);
    try {
      // Build instruments and vocals strings for context
      const instrumentsStr = buildInstrumentsPrompt();
      const vocalsStr = buildVocalsPrompt();
      
      // Use the pro enhancement endpoint with full context
      const response = await axios.post(`${API_BASE}/api/prompt/enhance-pro`, {
        lyrics: lyrics,
        musicDescription: prompt || style,
        instruments: instrumentsStr || undefined,
        vocals: vocalsStr || undefined,
        enableRepetition: enableProRepetition,
        model: selectedModel.id,
      });

      if (response.data.success) {
        // Update lyrics with structured version
        if (response.data.structuredLyrics) {
          setLyrics(response.data.structuredLyrics);
        }
        // Update prompt with enhanced description if available
        if (response.data.enhancedDescription && response.data.enhancedDescription.length > 0) {
          setPrompt(response.data.enhancedDescription);
        }
      }
    } catch (err: any) {
      console.error("Lyrics structure enhancement failed:", err);
      setError("Failed to add structure to lyrics. Please try again.");
    } finally {
      setIsEnhancingLyrics(false);
    }
  };

  // Add diacritical marks for better pronunciation
  const handleAddDiacritics = async () => {
    if (!lyrics) return;
    if (lyricsLanguages.length === 0) {
      setError("Please select at least one language");
      return;
    }
    
    setIsAddingDiacritics(true);
    setShowLanguageSelector(false);
    try {
      const response = await axios.post(`${API_BASE}/api/prompt/add-diacritics`, {
        lyrics: lyrics,
        languages: lyricsLanguages, // Pass array of selected languages
      });

      if (response.data.success && response.data.markedLyrics) {
        setLyrics(response.data.markedLyrics);
        const langNames = lyricsLanguages.map(l => PRONUNCIATION_LANGUAGES.find(pl => pl.id === l)?.name).join(", ");
        setError(`Added pronunciation marks for: ${langNames}`);
      }
    } catch (err: any) {
      console.error("Diacritics addition failed:", err);
      setError("Failed to add pronunciation marks. Please try again.");
    } finally {
      setIsAddingDiacritics(false);
    }
  };
  
  // Toggle language selection (multi-select)
  const toggleLanguageSelection = (langId: string) => {
    if (lyricsLanguages.includes(langId)) {
      // Deselect - remove from array
      setLyricsLanguages(lyricsLanguages.filter(l => l !== langId));
    } else {
      // Select - add to array
      setLyricsLanguages([...lyricsLanguages, langId]);
    }
  };
  
  // Language options for pronunciation (expanded list)
  const PRONUNCIATION_LANGUAGES = [
    // Middle Eastern & Central Asian
    { id: "persian", name: "Persian / Farsi", flag: "🇮🇷", category: "Middle East" },
    { id: "arabic", name: "Arabic", flag: "🇸🇦", category: "Middle East" },
    { id: "turkish", name: "Turkish", flag: "🇹🇷", category: "Middle East" },
    { id: "hebrew", name: "Hebrew", flag: "🇮🇱", category: "Middle East" },
    { id: "kurdish", name: "Kurdish", flag: "🇮🇶", category: "Middle East" },
    { id: "azerbaijani", name: "Azerbaijani", flag: "🇦🇿", category: "Middle East" },
    { id: "pashto", name: "Pashto", flag: "🇦🇫", category: "Middle East" },
    { id: "dari", name: "Dari", flag: "🇦🇫", category: "Middle East" },
    
    // South Asian
    { id: "urdu", name: "Urdu", flag: "🇵🇰", category: "South Asia" },
    { id: "hindi", name: "Hindi", flag: "🇮🇳", category: "South Asia" },
    { id: "punjabi", name: "Punjabi", flag: "🇮🇳", category: "South Asia" },
    { id: "bengali", name: "Bengali", flag: "🇧🇩", category: "South Asia" },
    { id: "tamil", name: "Tamil", flag: "🇮🇳", category: "South Asia" },
    
    // European
    { id: "english", name: "English", flag: "🇬🇧", category: "European" },
    { id: "spanish", name: "Spanish", flag: "🇪🇸", category: "European" },
    { id: "french", name: "French", flag: "🇫🇷", category: "European" },
    { id: "german", name: "German", flag: "🇩🇪", category: "European" },
    { id: "italian", name: "Italian", flag: "🇮🇹", category: "European" },
    { id: "portuguese", name: "Portuguese", flag: "🇵🇹", category: "European" },
    { id: "russian", name: "Russian", flag: "🇷🇺", category: "European" },
    { id: "polish", name: "Polish", flag: "🇵🇱", category: "European" },
    { id: "greek", name: "Greek", flag: "🇬🇷", category: "European" },
    
    // East Asian
    { id: "chinese", name: "Chinese (Mandarin)", flag: "🇨🇳", category: "East Asia" },
    { id: "japanese", name: "Japanese", flag: "🇯🇵", category: "East Asia" },
    { id: "korean", name: "Korean", flag: "🇰🇷", category: "East Asia" },
    { id: "vietnamese", name: "Vietnamese", flag: "🇻🇳", category: "East Asia" },
    { id: "thai", name: "Thai", flag: "🇹🇭", category: "East Asia" },
    
    // African
    { id: "swahili", name: "Swahili", flag: "🇰🇪", category: "African" },
    { id: "amharic", name: "Amharic", flag: "🇪🇹", category: "African" },
  ];

  // Style options for multi-select
  const STYLE_OPTIONS = [
    // Genres
    { id: "pop", name: "Pop", category: "Genre" },
    { id: "rock", name: "Rock", category: "Genre" },
    { id: "hip-hop", name: "Hip-Hop", category: "Genre" },
    { id: "r&b", name: "R&B / Soul", category: "Genre" },
    { id: "electronic", name: "Electronic / EDM", category: "Genre" },
    { id: "jazz", name: "Jazz", category: "Genre" },
    { id: "classical", name: "Classical", category: "Genre" },
    { id: "country", name: "Country", category: "Genre" },
    { id: "folk", name: "Folk / Acoustic", category: "Genre" },
    { id: "indie", name: "Indie", category: "Genre" },
    { id: "metal", name: "Metal", category: "Genre" },
    { id: "punk", name: "Punk", category: "Genre" },
    { id: "reggae", name: "Reggae", category: "Genre" },
    { id: "blues", name: "Blues", category: "Genre" },
    { id: "latin", name: "Latin", category: "Genre" },
    { id: "k-pop", name: "K-Pop", category: "Genre" },
    { id: "disco", name: "Disco", category: "Genre" },
    { id: "funk", name: "Funk", category: "Genre" },
    { id: "trap", name: "Trap", category: "Genre" },
    { id: "lo-fi", name: "Lo-Fi", category: "Genre" },
    { id: "ambient", name: "Ambient", category: "Genre" },
    { id: "cinematic", name: "Cinematic / Epic", category: "Genre" },
    { id: "world", name: "World Music", category: "Genre" },
    { id: "persian", name: "Persian / Iranian", category: "Genre" },
    { id: "arabic", name: "Arabic", category: "Genre" },
    { id: "turkish", name: "Turkish", category: "Genre" },
    
    // Moods
    { id: "happy", name: "Happy / Uplifting", category: "Mood" },
    { id: "sad", name: "Sad / Melancholic", category: "Mood" },
    { id: "energetic", name: "Energetic / Powerful", category: "Mood" },
    { id: "romantic", name: "Romantic / Sensual", category: "Mood" },
    { id: "chill", name: "Chill / Relaxed", category: "Mood" },
    { id: "dark", name: "Dark / Mysterious", category: "Mood" },
    { id: "dreamy", name: "Dreamy / Ethereal", category: "Mood" },
    { id: "aggressive", name: "Aggressive / Intense", category: "Mood" },
    { id: "nostalgic", name: "Nostalgic / Retro", category: "Mood" },
    { id: "hopeful", name: "Hopeful / Inspiring", category: "Mood" },
    { id: "peaceful", name: "Peaceful / Serene", category: "Mood" },
    { id: "epic", name: "Epic / Dramatic", category: "Mood" },
    { id: "playful", name: "Playful / Fun", category: "Mood" },
    { id: "emotional", name: "Emotional / Moving", category: "Mood" },
    { id: "mysterious", name: "Mysterious / Eerie", category: "Mood" },
    
    // Tempo
    { id: "slow", name: "Slow (60-80 BPM)", category: "Tempo" },
    { id: "medium", name: "Medium (80-110 BPM)", category: "Tempo" },
    { id: "upbeat", name: "Upbeat (110-130 BPM)", category: "Tempo" },
    { id: "fast", name: "Fast (130-160 BPM)", category: "Tempo" },
    { id: "very-fast", name: "Very Fast (160+ BPM)", category: "Tempo" },
    
    // Vocal Style
    { id: "male-vocal", name: "Male Vocals", category: "Vocals" },
    { id: "female-vocal", name: "Female Vocals", category: "Vocals" },
    { id: "duet", name: "Duet", category: "Vocals" },
    { id: "choir", name: "Choir / Group", category: "Vocals" },
    { id: "falsetto", name: "Falsetto", category: "Vocals" },
    { id: "rap", name: "Rap / Spoken", category: "Vocals" },
    { id: "whisper", name: "Whisper / Soft", category: "Vocals" },
    { id: "powerful", name: "Powerful / Belting", category: "Vocals" },
    { id: "autotune", name: "Auto-Tune Effect", category: "Vocals" },
    
    // Instruments
    { id: "piano", name: "Piano", category: "Instruments" },
    { id: "guitar", name: "Guitar", category: "Instruments" },
    { id: "synth", name: "Synthesizer", category: "Instruments" },
    { id: "drums", name: "Drums / Percussion", category: "Instruments" },
    { id: "bass", name: "Bass", category: "Instruments" },
    { id: "strings", name: "Strings / Orchestra", category: "Instruments" },
    { id: "brass", name: "Brass / Horns", category: "Instruments" },
    { id: "violin", name: "Violin", category: "Instruments" },
    { id: "saxophone", name: "Saxophone", category: "Instruments" },
    { id: "flute", name: "Flute", category: "Instruments" },
    { id: "808", name: "808 Bass", category: "Instruments" },
    { id: "tar", name: "Tar (Persian)", category: "Instruments" },
    { id: "setar", name: "Setar (Persian)", category: "Instruments" },
    { id: "oud", name: "Oud", category: "Instruments" },
    { id: "santoor", name: "Santoor", category: "Instruments" },
    
    // Production
    { id: "reverb", name: "Heavy Reverb", category: "Production" },
    { id: "distorted", name: "Distorted", category: "Production" },
    { id: "clean", name: "Clean / Crisp", category: "Production" },
    { id: "vintage", name: "Vintage / Analog", category: "Production" },
    { id: "modern", name: "Modern / Polished", category: "Production" },
    { id: "minimalist", name: "Minimalist", category: "Production" },
    { id: "layered", name: "Layered / Rich", category: "Production" },
  ];

  // Toggle style selection (multi-select)
  const toggleStyleSelection = (styleId: string) => {
    if (selectedStyles.includes(styleId)) {
      setSelectedStyles(selectedStyles.filter(s => s !== styleId));
    } else {
      setSelectedStyles([...selectedStyles, styleId]);
    }
  };

  // Build style string from selected styles
  const buildStyleString = () => {
    return selectedStyles.map(s => STYLE_OPTIONS.find(opt => opt.id === s)?.name).filter(Boolean).join(", ");
  };

  // Update style input when styles change
  useEffect(() => {
    if (selectedStyles.length > 0) {
      setStyle(buildStyleString());
    }
  }, [selectedStyles]);

  // Lyrics autocomplete suggestions - ONLY valid Suno tags
  // WARNING: Any other bracket tags will be SUNG as lyrics!
  const SECTION_TAGS = [
    { tag: "[Intro]", desc: "Opening section" },
    { tag: "[Verse]", desc: "Main storytelling section" },
    { tag: "[Verse 1]", desc: "First verse" },
    { tag: "[Verse 2]", desc: "Second verse" },
    { tag: "[Verse 3]", desc: "Third verse" },
    { tag: "[Pre-Chorus]", desc: "Build-up before chorus" },
    { tag: "[Chorus]", desc: "Main hook/refrain" },
    { tag: "[Post-Chorus]", desc: "After chorus section" },
    { tag: "[Bridge]", desc: "Contrasting section" },
    { tag: "[Hook]", desc: "Catchy repeated phrase" },
    { tag: "[Refrain]", desc: "Repeated line/phrase" },
    { tag: "[Break]", desc: "Pause or minimal section" },
    { tag: "[Instrumental]", desc: "Music only, no vocals" },
    { tag: "[Instrumental Break]", desc: "Short music break" },
    { tag: "[Outro]", desc: "Closing section" },
    { tag: "[End]", desc: "Song ending" },
  ];

  const VOCAL_GUIDANCE = [
    { tag: "(soft)", desc: "Gentle, quiet delivery" },
    { tag: "(powerful)", desc: "Strong, intense delivery" },
    { tag: "(whispered)", desc: "Whisper voice" },
    { tag: "(spoken)", desc: "Spoken word, not sung" },
    { tag: "(falsetto)", desc: "High head voice" },
    { tag: "(raspy)", desc: "Rough, gravelly voice" },
    { tag: "(breathy)", desc: "Airy, soft breath" },
    { tag: "(belting)", desc: "Loud, powerful high notes" },
    { tag: "(harmonies)", desc: "Add harmony vocals" },
    { tag: "(ad-lib)", desc: "Improvised vocals" },
    { tag: "(echo)", desc: "Echo effect" },
    { tag: "(building)", desc: "Gradually intensifying" },
    { tag: "(fading)", desc: "Gradually softening" },
    { tag: "(emotional)", desc: "Emotional delivery" },
    { tag: "(playful)", desc: "Light, fun delivery" },
    { tag: "(melancholic)", desc: "Sad, sorrowful tone" },
    { tag: "(x2)", desc: "Repeat line twice" },
    { tag: "(x3)", desc: "Repeat line three times" },
  ];

  // Handle lyrics input with autocomplete detection
  const handleLyricsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    setLyrics(newValue);
    
    // Check for trigger characters
    const textBeforeCursor = newValue.substring(0, cursorPos);
    const lastOpenBracket = textBeforeCursor.lastIndexOf("[");
    const lastOpenParen = textBeforeCursor.lastIndexOf("(");
    const lastCloseBracket = textBeforeCursor.lastIndexOf("]");
    const lastCloseParen = textBeforeCursor.lastIndexOf(")");
    
    // Check if we're inside an unclosed bracket
    if (lastOpenBracket > lastCloseBracket && lastOpenBracket > lastOpenParen) {
      const filterText = textBeforeCursor.substring(lastOpenBracket + 1);
      if (!filterText.includes("\n")) {
        setAutocompleteType("section");
        setAutocompleteFilter(filterText.toLowerCase());
        setShowLyricsAutocomplete(true);
        setSelectedSuggestionIndex(0);
        return;
      }
    }
    
    // Check if we're inside an unclosed parenthesis
    if (lastOpenParen > lastCloseParen && lastOpenParen > lastOpenBracket) {
      const filterText = textBeforeCursor.substring(lastOpenParen + 1);
      if (!filterText.includes("\n")) {
        setAutocompleteType("vocal");
        setAutocompleteFilter(filterText.toLowerCase());
        setShowLyricsAutocomplete(true);
        setSelectedSuggestionIndex(0);
        return;
      }
    }
    
    // Hide autocomplete
    setShowLyricsAutocomplete(false);
    setAutocompleteType(null);
  };

  // Get filtered suggestions based on type and filter
  const getFilteredSuggestions = () => {
    const suggestions = autocompleteType === "section" ? SECTION_TAGS : VOCAL_GUIDANCE;
    if (!autocompleteFilter) return suggestions;
    return suggestions.filter(s => 
      s.tag.toLowerCase().includes(autocompleteFilter) || 
      s.desc.toLowerCase().includes(autocompleteFilter)
    );
  };

  // Insert selected suggestion
  const insertSuggestion = (tag: string) => {
    const textarea = lyricsTextareaRef.current;
    if (!textarea) return;
    
    const cursorPos = textarea.selectionStart;
    const textBeforeCursor = lyrics.substring(0, cursorPos);
    
    // Find the trigger position
    const triggerPos = autocompleteType === "section" 
      ? textBeforeCursor.lastIndexOf("[")
      : textBeforeCursor.lastIndexOf("(");
    
    if (triggerPos === -1) return;
    
    // Build new lyrics
    const beforeTrigger = lyrics.substring(0, triggerPos);
    const afterCursor = lyrics.substring(cursorPos);
    const newLyrics = beforeTrigger + tag + afterCursor;
    
    setLyrics(newLyrics);
    setShowLyricsAutocomplete(false);
    setAutocompleteType(null);
    
    // Set cursor position after inserted tag
    setTimeout(() => {
      const newCursorPos = triggerPos + tag.length;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Handle keyboard navigation in autocomplete
  const handleLyricsKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showLyricsAutocomplete) return;
    
    const suggestions = getFilteredSuggestions();
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (suggestions.length > 0) {
        e.preventDefault();
        insertSuggestion(suggestions[selectedSuggestionIndex].tag);
      }
    } else if (e.key === "Escape") {
      setShowLyricsAutocomplete(false);
      setAutocompleteType(null);
    }
  };

  // Get model-specific lyrics limit
  const getModelLyricsLimit = () => {
    const modelWithLimits = selectedModel as any;
    if (modelWithLimits.maxLyrics) return modelWithLimits.maxLyrics;
    
    // Default limits by model
    if (selectedModel.id === "minimax/music-1.5" || selectedModel.id === "minimax/music-01") return 600;
    if (selectedModel.id === "suno-ai/bark") return 150;
    if (selectedModel.id === "lucataco/ace-step") return 3000;
    return 2000; // Default
  };

  // Generate lyrics with AI
  const handleGenerateLyrics = async () => {
    setIsGeneratingLyrics(true);
    setError(null);
    setGeneratedLyricsPreview(null);
    
    try {
      const context = prompt || style || sunoTitle || "Write a catchy song";
      const response = await axios.post(`${API_BASE}/api/suno/lyrics/generate`, {
        prompt: context,
      });
      
      if (response.data.success && response.data.lyrics) {
        // Store in preview instead of directly setting
        setGeneratedLyricsPreview(response.data.lyrics);
        if (response.data.title && !sunoTitle) {
          setSunoTitle(response.data.title);
        }
      } else {
        throw new Error(response.data.error || "Failed to generate lyrics");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to generate lyrics");
    } finally {
      setIsGeneratingLyrics(false);
    }
  };
  
  // Add generated lyrics to main lyrics section
  const handleAddGeneratedLyrics = () => {
    if (generatedLyricsPreview) {
      setLyrics(generatedLyricsPreview);
      setGeneratedLyricsPreview(null); // Clear preview after adding
    }
  };

  // Boost Style handler
  const handleBoostStyle = async () => {
    if (!boostAudioId) {
      setError("Please enter an Audio ID");
      return;
    }
    
    setIsBoostingStyle(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_BASE}/api/suno/boost-style`, {
        audioId: boostAudioId,
        style: boostStyleText || style,
        boostIntensity,
        model: sunoModel,
      });
      
      if (response.data.success) {
        const result = response.data;
        // Handle tracks
        if (result.tracks && result.tracks.length > 0) {
          const newTracks = result.tracks.map((t: any) => ({
            url: t.audioUrl || t.audio_url || t.url,
            title: t.title || "Boosted Track",
            id: t.id,
            imageUrl: t.imageUrl || t.image_url,
          }));
          setGeneratedTracks(prev => [...prev, ...newTracks]);
          setGeneratedAudio(newTracks[0].url);
        } else if (result.audioUrl) {
          setGeneratedAudio(result.audioUrl);
        }
      } else {
        throw new Error(response.data.error || "Failed to boost style");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to boost style");
    } finally {
      setIsBoostingStyle(false);
    }
  };

  // Fetch Suno credits
  const fetchSunoCredits = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/suno/credits`);
      if (response.data.credits !== undefined) {
        setSunoCredits(response.data.credits);
      }
    } catch (err) {
      console.error("Failed to fetch Suno credits:", err);
    }
  };

  // Fetch gallery tracks with audioIds for Boost Style and post-processing
  const fetchGalleryTracksWithIds = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/music-gallery/tracks`);
      if (response.data.tracks) {
        const tracksWithIds = response.data.tracks
          .filter((t: any) => t.source === "suno" && t.metadata?.audioId)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            audioId: t.metadata.audioId,
          }));
        setGalleryTracksWithIds(tracksWithIds);
      }
    } catch (err) {
      console.error("Failed to fetch gallery tracks:", err);
    }
  };

  // Fetch credits and gallery tracks on mount when Suno model is selected
  useEffect(() => {
    if (selectedModel.controls.includes("suno_mode")) {
      fetchSunoCredits();
      fetchGalleryTracksWithIds();
    }
  }, [selectedModel]);

  // Condense lyrics to fit model limit while preserving structure
  const handleCondenseLyrics = async () => {
    if (!lyrics) return;
    
    const maxChars = getModelLyricsLimit();
    if (lyrics.length <= maxChars) {
      setError(`Lyrics already within limit (${lyrics.length}/${maxChars} chars)`);
      return;
    }
    
    setIsCondensingLyrics(true);
    setError(null);
    
    try {
      // Extract structure tags
      const structureTags = lyrics.match(/\[.*?\]/g) || [];
      const structureTagsLength = structureTags.join("").length + (structureTags.length * 2); // Account for newlines
      
      // Calculate available space for lyrics content
      const availableForContent = maxChars - structureTagsLength - 50; // 50 char buffer
      
      // Ask AI to condense the lyrics content while preserving meaning
      const response = await axios.post(`${API_BASE}/api/prompt/condense`, {
        prompt: lyrics,
        maxChars: maxChars,
      });

      if (response.data.success && response.data.condensedPrompt) {
        let condensed = response.data.condensedPrompt;
        
        // Ensure it fits
        if (condensed.length > maxChars) {
          condensed = condensed.substring(0, maxChars - 3) + "...";
        }
        
        setLyrics(condensed);
        setError(`Lyrics condensed: ${lyrics.length} → ${condensed.length} chars (limit: ${maxChars})`);
      }
    } catch (err: any) {
      console.error("Lyrics condensing failed:", err);
      
      // Fallback: simple truncation preserving structure
      const structureTags = lyrics.match(/\[.*?\]\n?/g) || [];
      const contentWithoutTags = lyrics.replace(/\[.*?\]\n?/g, "");
      const availableSpace = maxChars - structureTags.join("").length;
      
      let truncatedContent = contentWithoutTags.substring(0, availableSpace - 3) + "...";
      
      // Try to keep at least some structure
      if (structureTags.length > 0 && truncatedContent.length < maxChars - 50) {
        truncatedContent = structureTags[0] + truncatedContent;
      }
      
      setLyrics(truncatedContent.substring(0, maxChars));
      setError(`Lyrics truncated to ${maxChars} chars (AI condensing unavailable)`);
    } finally {
      setIsCondensingLyrics(false);
    }
  };

  // TTS Functions
  const handleEnhanceTtsText = async () => {
    if (!ttsText) return;
    
    setIsEnhancingTts(true);
    try {
      const selectedVocalType = selectedVocals.length > 0 
        ? selectedVocals.map(v => VOCAL_TYPES.find(vt => vt.id === v.id)?.name).join(", ")
        : undefined;
      
      const response = await axios.post(`${API_BASE}/api/prompt/enhance`, {
        prompt: ttsText,
        model: selectedModel.id,
        type: "tts",
        vocals: selectedVocalType,
        description: ttsDescription || undefined,
      });

      if (response.data.success && response.data.enhancedPrompt) {
        setTtsText(response.data.enhancedPrompt);
      }
    } catch (err: any) {
      console.error("TTS text enhancement failed:", err);
      setError("Failed to enhance text. Please try again.");
    } finally {
      setIsEnhancingTts(false);
    }
  };

  const handleTtsGenerate = async () => {
    if (!ttsText) {
      setError("Please enter text to synthesize");
      return;
    }

    setIsTtsGenerating(true);
    setError(null);
    setTtsResult(null);

    try {
      const formData = new FormData();
      formData.append("model", selectedModel.id);
      formData.append("text", ttsText);
      formData.append("language", ttsLanguage);
      formData.append("speed", ttsSpeed.toString());
      
      // Model-specific parameters
      if (selectedModel.controls.includes("voice_preset")) {
        formData.append("voice_preset", ttsVoice);
      }
      if (selectedModel.controls.includes("voice")) {
        formData.append("voice", ttsVoice);
      }
      if (selectedModel.controls.includes("description") && ttsDescription) {
        formData.append("description", ttsDescription);
      }
      if (selectedModel.controls.includes("emotion")) {
        formData.append("emotion", ttsEmotion);
      }
      if (selectedModel.controls.includes("stability")) {
        formData.append("stability", ttsStability.toString());
      }
      if (selectedModel.controls.includes("similarity_boost")) {
        formData.append("similarity_boost", ttsSimilarity.toString());
      }
      if (selectedModel.controls.includes("text_temp")) {
        formData.append("text_temp", ttsTextTemp.toString());
      }
      if (selectedModel.controls.includes("waveform_temp")) {
        formData.append("waveform_temp", ttsWaveformTemp.toString());
      }
      if (selectedModel.controls.includes("speaker_wav") && ttsSpeakerFile) {
        formData.append("speaker_wav", ttsSpeakerFile);
      }
      if (selectedModel.controls.includes("reference_audio") && ttsSpeakerFile) {
        formData.append("reference_audio", ttsSpeakerFile);
      }

      const response = await axios.post(`${API_BASE}/api/music/tts`, formData, {
        timeout: 300000,
      });

      if (response.data.success && response.data.audioUrl) {
        setTtsResult(response.data.audioUrl);
      } else {
        throw new Error(response.data.error || "TTS generation failed");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsTtsGenerating(false);
    }
  };

  const handleTranscribe = async () => {
    if (!transcribeFile) {
      setError("Please upload an audio file to transcribe");
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setTranscriptionResult(null);

    try {
      const formData = new FormData();
      formData.append("model", selectedModel.id);
      formData.append("audio", transcribeFile);
      formData.append("language", transcribeLanguage);
      
      if (selectedModel.controls.includes("model_size")) {
        formData.append("model_size", modelSize);
      }
      if (selectedModel.controls.includes("translate")) {
        formData.append("translate", String(translateToEnglish));
      }
      if (selectedModel.controls.includes("num_speakers")) {
        formData.append("num_speakers", String(numSpeakers));
      }
      if (selectedModel.controls.includes("batch_size")) {
        formData.append("batch_size", String(batchSize));
      }
      if (selectedModel.controls.includes("timestamp")) {
        formData.append("timestamp", String(includeTimestamps));
      }
      if (selectedModel.controls.includes("align_output")) {
        formData.append("align_output", String(alignOutput));
      }
      if (selectedModel.controls.includes("temperature")) {
        formData.append("temperature", String(temperature));
      }

      const response = await axios.post(`${API_BASE}/api/music/transcribe`, formData, {
        timeout: 300000, // 5 minutes for transcription
      });

      if (response.data.success && response.data.transcription) {
        setTranscriptionResult(response.data.transcription);
      } else {
        throw new Error(response.data.error || "Transcription failed");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const copyToClipboard = () => {
    if (transcriptionResult) {
      navigator.clipboard.writeText(transcriptionResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Helper to condense prompt using AI
  const condensePromptForModel = async (fullPrompt: string, maxChars: number): Promise<string> => {
    console.log(`[CONDENSE] Input: ${fullPrompt.length} chars, limit: ${maxChars}`);
    
    // If already within limit, return as-is
    if (fullPrompt.length <= maxChars) {
      console.log("[CONDENSE] Already within limit, no condensing needed");
      return fullPrompt;
    }
    
    try {
      console.log("[CONDENSE] Calling AI to condense...");
      const response = await axios.post(`${API_BASE}/api/prompt/condense`, {
        prompt: fullPrompt,
        maxChars: maxChars,
      }, { timeout: 15000 });
      
      if (response.data.success && response.data.condensedPrompt) {
        const condensed = response.data.condensedPrompt;
        console.log(`[CONDENSE] Success! ${fullPrompt.length} -> ${condensed.length} chars`);
        // Double-check it's within limit
        if (condensed.length <= maxChars) {
          return condensed;
        }
        console.warn("[CONDENSE] AI output still too long, truncating");
      }
    } catch (err: any) {
      console.warn("[CONDENSE] AI condensing failed:", err.message);
    }
    
    // Fallback: smart truncation - keep first part and add ellipsis
    console.log("[CONDENSE] Using fallback truncation");
    const truncated = fullPrompt.substring(0, maxChars - 3).trim() + "...";
    return truncated;
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGeneratedAudio(null);

    try {
      // Build full prompt with instruments and vocals
      const instrumentsStr = buildInstrumentsPrompt();
      const vocalsStr = buildVocalsPrompt();
      
      // Check if prompt contains non-ASCII (Farsi, Arabic, etc.)
      const hasNonAscii = /[^\x00-\x7F]/.test(prompt);
      
      // For ACE-Step: move non-English text to lyrics, use English prompt
      let workingPrompt = prompt;
      let workingLyrics = lyrics;
      
      if (selectedModel?.id === "lucataco/ace-step" && hasNonAscii) {
        console.log("[GENERATE] ACE-Step with non-ASCII prompt - moving to lyrics");
        // Move the Farsi/non-ASCII content to lyrics
        if (!workingLyrics) {
          workingLyrics = prompt;  // Use prompt as lyrics
        }
        // Create a simple English prompt
        workingPrompt = "Persian poetry ballad with emotional vocals";
      } else if (hasNonAscii) {
        // Check which models support non-ASCII
        const nonAsciiSupportedModels = [
          "lucataco/ace-step",  // Handled above
          "minimax/music-1.5",  // Supports Farsi in lyrics
          "minimax/music-01",   // Supports Farsi in lyrics
          "suno-ai/bark",       // Supports short Farsi
          "suno/v5",            // Suno supports multilingual lyrics
          "suno/v4.5-plus",     // Suno supports multilingual lyrics
          "suno/v4.5-all",      // Suno supports multilingual lyrics
          "suno/v4.5",          // Suno supports multilingual lyrics
          "suno/v4",            // Suno supports multilingual lyrics
        ];
        
        if (!nonAsciiSupportedModels.includes(selectedModel?.id || "")) {
          setError(`${selectedModel?.name || "This model"} only supports English text. For Farsi/Persian, use Suno, ACE-Step, or MiniMax instead.`);
          setIsGenerating(false);
          return;
        }
      }
      
      let fullPrompt = workingPrompt;
      if (instrumentsStr) {
        fullPrompt += `. Instruments: ${instrumentsStr}`;
      }
      if (vocalsStr) {
        fullPrompt += `. Vocals: ${vocalsStr}`;
      }
      
      // Get model-specific limits from model definition or use defaults
      const modelWithLimits = selectedModel as any;
      let maxPromptChars = modelWithLimits.maxPrompt || 1000;
      let maxLyricsChars = modelWithLimits.maxLyrics || 2000;
      let minPromptChars = 1;
      
      // MiniMax has minimum prompt requirement
      if (selectedModel.id === "minimax/music-1.5" || selectedModel.id === "minimax/music-01") {
        minPromptChars = 10;
        maxPromptChars = Math.min(maxPromptChars, 290); // Safety buffer
      }
      
      console.log(`[GENERATE] Model limits - prompt: ${maxPromptChars}, lyrics: ${maxLyricsChars}`);
      
      console.log(`[GENERATE] Full prompt: "${fullPrompt}" (${fullPrompt.length} chars)`);
      
      // Condense prompt if needed (AI-powered)
      let finalPrompt = await condensePromptForModel(fullPrompt, maxPromptChars);
      
      // Ensure minimum length for MiniMax
      if (finalPrompt.length < minPromptChars) {
        finalPrompt = finalPrompt.padEnd(minPromptChars, " ");
      }
      
      console.log(`[GENERATE] Final prompt: "${finalPrompt}" (${finalPrompt.length} chars)`);
      
      // Condense lyrics if needed (use workingLyrics which may include Farsi moved from prompt)
      let finalLyrics = workingLyrics;
      if (workingLyrics && workingLyrics.length > maxLyricsChars) {
        finalLyrics = await condensePromptForModel(workingLyrics, maxLyricsChars);
      }
      
      console.log(`[GENERATE] Lyrics: "${finalLyrics?.substring(0, 50)}..." (${finalLyrics?.length || 0} chars)`);

      const formData = new FormData();
      formData.append("model", selectedModel.id);
      
      // Add controls based on model
      if (selectedModel.controls.includes("prompt")) {
        formData.append("prompt", finalPrompt);
      }
      if (selectedModel.controls.includes("prompt_a")) {
        formData.append("prompt_a", promptA);
        formData.append("prompt_b", promptB || promptA);
      }
      if (selectedModel.controls.includes("lyrics") && finalLyrics) {
        // MiniMax sings tags literally - strip them out
        let cleanLyrics = finalLyrics;
        if (selectedModel.id === "minimax/music-1.5" || selectedModel.id === "minimax/music-01") {
          // Remove structure tags like [Verse], [Chorus], (Male Vocal), etc.
          cleanLyrics = finalLyrics
            .replace(/\[.*?\]/g, '')  // Remove [tags]
            .replace(/\(.*?\)/g, '')  // Remove (instructions)
            .replace(/\n{3,}/g, '\n\n')  // Clean up extra newlines
            .trim();
        }
        formData.append("lyrics", cleanLyrics);
      }
      if (selectedModel.controls.includes("duration")) {
        formData.append("duration", duration.toString());
      }
      if (selectedModel.controls.includes("style") && style) {
        formData.append("style", style);
      }
      if (selectedModel.controls.includes("temperature")) {
        formData.append("temperature", temperature.toString());
      }
      if (selectedModel.controls.includes("top_k")) {
        formData.append("top_k", topK.toString());
      }
      if (selectedModel.controls.includes("top_p")) {
        formData.append("top_p", topP.toString());
      }
      if (selectedModel.controls.includes("bpm")) {
        formData.append("bpm", bpm.toString());
      }
      if (selectedModel.controls.includes("bars")) {
        formData.append("bars", bars.toString());
      }
      if (selectedModel.controls.includes("chords") && chords) {
        formData.append("chords", chords);
      }
      if (selectedModel.controls.includes("negative_prompt") && negativePrompt) {
        formData.append("negative_prompt", negativePrompt);
      }
      if (selectedModel.controls.includes("tags")) {
        // ACE-Step requires tags - use default if not provided
        const tagsToSend = tags || "pop, ballad, emotional, persian";
        formData.append("tags", tagsToSend);
      }
      // Suno API parameters
      if (selectedModel.controls.includes("suno_mode")) {
        formData.append("sunoModel", sunoModel); // Send selected Suno version (V5, V4_5PLUS, etc.)
        formData.append("customMode", sunoCustomMode.toString());
        formData.append("instrumental", sunoInstrumental.toString());
        if (sunoTitle) {
          formData.append("title", sunoTitle);
        }
        // Add audio URL for cover/extend if provided
        if (sunoAudioUrl) {
          formData.append("uploadUrl", sunoAudioUrl);
        }
        // Add vocal gender if audio is provided
        if (sunoAudioUrl && vocalGender) {
          formData.append("vocalGender", vocalGender);
        }
      }
      if (selectedModel.controls.includes("denoising")) {
        formData.append("denoising", denoising.toString());
      }
      
      // Instruments and vocals are already included in finalPrompt above
      // But also send separately for backend compatibility
      if (instrumentsStr) {
        formData.append("instruments", instrumentsStr);
      }
      if (vocalsStr) {
        formData.append("vocals", vocalsStr);
      }
      
      // Loop mode - seamlessly sync start and end
      if (enableLoop) {
        formData.append("loop", "true");
      }
      
      // Voice cloning specific
      if (selectedModel.controls.includes("pitch_change")) {
        formData.append("pitch_change", pitchChange.toString());
      }
      if (selectedModel.controls.includes("index_rate")) {
        formData.append("index_rate", indexRate.toString());
      }
      if (selectedModel.controls.includes("filter_radius")) {
        formData.append("filter_radius", filterRadius.toString());
      }
      if (selectedModel.controls.includes("rvc_model") && rvcModelUrl) {
        formData.append("rvc_model", rvcModelUrl);
      }
      
      // File uploads
      if (selectedModel.controls.includes("melody_audio") && melodyFile) {
        formData.append("melody_audio", melodyFile);
      }
      if (selectedModel.controls.includes("reference_audio") && referenceFile) {
        formData.append("reference_audio", referenceFile);
      }
      if (selectedModel.controls.includes("input_audio") && referenceFile) {
        formData.append("input_audio", referenceFile);
      }
      if (selectedModel.controls.includes("song_input") && songInputFile) {
        formData.append("song_input", songInputFile);
      }
      
      // Training model parameters
      if (selectedModel.controls.includes("dataset_url") && datasetUrl) {
        formData.append("dataset_url", datasetUrl);
      }
      if (selectedModel.controls.includes("model_name") && trainingModelName) {
        formData.append("model_name", trainingModelName);
      }
      if (selectedModel.controls.includes("epochs")) {
        formData.append("epochs", trainingEpochs.toString());
      }
      
      // Bark music mode parameters
      if (selectedModel.controls.includes("bark_music")) {
        formData.append("voice_preset", ttsVoice);
        formData.append("text_temp", ttsTextTemp.toString());
        formData.append("waveform_temp", ttsWaveformTemp.toString());
      }

      const response = await axios.post(`${API_BASE}/api/music/generate`, formData, {
        timeout: 720000, // 12 minutes for Suno music generation (can take 10+ mins)
      });

      if (response.data.success && response.data.audioUrl) {
        setGeneratedAudio(response.data.audioUrl);
        
        // Store taskId for post-processing tools
        if (response.data.taskId) {
          setLastTaskId(response.data.taskId);
        }
        
        // Store all tracks if available (Suno generates 2 songs per call)
        if (response.data.tracks && Array.isArray(response.data.tracks)) {
          const tracks = response.data.tracks.map((track: any) => ({
            url: track.audio_url || track.audioUrl || track.url,
            title: track.title || track.name,
            id: track.id || track.audio_id,
            imageUrl: track.image_url || track.imageUrl || track.cover_url,
            taskId: response.data.taskId,
          })).filter((t: any) => t.url);
          setGeneratedTracks(tracks);
          setPlayingTrackIndex(0);
          // Auto-save to gallery
          saveTracksToGallery(tracks);
        } else {
          // Single track fallback
          const singleTrack = [{ url: response.data.audioUrl, title: sunoTitle || "Generated Track", taskId: response.data.taskId }];
          setGeneratedTracks(singleTrack);
          // Auto-save to gallery
          saveTracksToGallery(singleTrack);
        }
      } else {
        throw new Error(response.data.error || "Generation failed");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = () => {
    if (generatedAudio) {
      const link = document.createElement("a");
      link.href = generatedAudio;
      link.download = `music_${selectedModel.name.replace(/\s+/g, "_")}_${Date.now()}.mp3`;
      link.click();
    }
  };

  // Save tracks to gallery
  const saveTracksToGallery = async (tracks: Array<{url: string; title?: string; id?: string; imageUrl?: string}>) => {
    if (tracks.length === 0) return;
    
    try {
      await axios.post(`${API_BASE}/api/music-gallery/tracks/save-suno`, {
        tracks: tracks.map(t => ({
          url: t.url,
          title: t.title || sunoTitle || "Generated Track",
          id: t.id,
          imageUrl: t.imageUrl,
        })),
        workflowId: currentWorkflowId,
        workflowName: workflowName || "Uncategorized",
        metadata: {
          prompt: prompt,
          lyrics: lyrics,
          style: style,
          model: selectedModel.id,
        },
      });
      console.log("[GALLERY] Tracks saved to gallery");
    } catch (error) {
      console.error("[GALLERY] Failed to save tracks:", error);
    }
  };

  const renderControls = () => {
    const controls = selectedModel.controls;
    
    return (
      <div className="space-y-4">
        {/* Tab Description for Instrumental */}
        {activeTab === "instrumental" && !controls.includes("suno_mode") && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-xs text-slate-400">
              <i className="fa-solid fa-music text-emerald-400 mr-1" />
              <strong className="text-emerald-400">Instrumental:</strong> Generate music without vocals. Perfect for background tracks, soundscapes, beats, and compositions. Choose from various AI models specialized in different music styles.
            </p>
          </div>
        )}
        
        {/* 1. Suno AI Studio - FIRST */}
        {controls.includes("suno_mode") && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-pink-500/10 border border-orange-500/30">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <Music className="w-5 h-5 text-orange-400" />
                Suno AI Studio
              </h4>
              {sunoCredits !== null && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-700/50">
                  <span className="text-sm text-slate-400">Credits:</span>
                  <span className="text-sm font-bold text-orange-400">{sunoCredits}</span>
                  <button 
                    onClick={fetchSunoCredits} 
                    className="text-slate-400 hover:text-white transition" 
                    title="Refresh credits"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            
            {/* Song Title */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">Song Title</label>
              <input
                type="text"
                value={sunoTitle}
                onChange={(e) => setSunoTitle(e.target.value)}
                placeholder="Enter song title..."
                maxLength={100}
                title="Song title"
                aria-label="Song title"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500"
              />
              <span className="text-xs text-slate-500 mt-1">{sunoTitle.length}/100 chars</span>
            </div>
            
            {/* Mode Toggles */}
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sunoCustomMode}
                  onChange={(e) => setSunoCustomMode(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-slate-300">Custom Lyrics</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sunoInstrumental}
                  onChange={(e) => setSunoInstrumental(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-slate-300">Instrumental Only</span>
              </label>
            </div>
            
            {/* Info */}
            <div className="text-xs text-slate-400 space-y-1">
              {sunoCustomMode ? (
                <p><i className="fa-solid fa-pen-to-square text-orange-400 mr-1" /> <strong>Custom Mode:</strong> Your lyrics will be sung exactly as written.</p>
              ) : (
                <p><i className="fa-solid fa-wand-magic-sparkles text-purple-400 mr-1" /> <strong>Auto Mode:</strong> AI will generate lyrics based on your description.</p>
              )}
              {sunoInstrumental && (
                <p><i className="fa-solid fa-sliders text-emerald-400 mr-1" /> <strong>Instrumental:</strong> No vocals, music only.</p>
              )}
            </div>
          </div>
        )}

        {/* Model Selector for Suno */}
        {controls.includes("suno_mode") && (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Model:</label>
              <select
                value={sunoModel}
                onChange={(e) => setSunoModel(e.target.value)}
                title="Select Suno model version"
                aria-label="Model version"
                className="flex-1 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
              >
                {SUNO_MODELS.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <p className="text-xs text-slate-500 ml-16">
              <i className="fa-solid fa-circle-info text-blue-400 mr-1" />
              {SUNO_MODELS.find(m => m.id === sunoModel)?.description}
            </p>
          </div>
        )}

        {/* 2. Style - Multi-select dropdown */}
        {controls.includes("style") && (
          <div className="relative">
            <p className="text-xs text-slate-500 mb-2">
              <i className="fa-solid fa-palette text-purple-400 mr-1" />
              Define the musical style, genre, mood, and tempo. You can select from presets or type custom styles.
            </p>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                Style <span className="text-xs text-slate-500">(genre, mood, tempo)</span>
              </label>
              <button
                type="button"
                onClick={() => setShowStyleSelector(!showStyleSelector)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 transition"
              >
                <Music className="w-3 h-3" />
                {selectedStyles.length > 0 ? `${selectedStyles.length} selected` : "Select Styles"}
                <i className="fa-solid fa-chevron-down text-[8px]" />
              </button>
            </div>
            
            {/* Selected styles display */}
            {selectedStyles.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {selectedStyles.map(s => {
                  const styleOpt = STYLE_OPTIONS.find(opt => opt.id === s);
                  return (
                    <span key={s} className="flex items-center gap-1 px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
                      {styleOpt?.name}
                      <button 
                        type="button"
                        onClick={() => toggleStyleSelection(s)} 
                        className="hover:text-red-400"
                        title={`Remove ${styleOpt?.name}`}
                        aria-label={`Remove ${styleOpt?.name}`}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            
            <input
              type="text"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Or type custom style: upbeat pop with synth, melancholic indie..."
              maxLength={1000}
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm"
              title="Style description"
              aria-label="Style description"
            />
            <span className="text-xs text-slate-500 mt-1">{style.length}/1000 chars</span>
            
            {/* Multi-Select Style Dropdown */}
            {showStyleSelector && (
              <div className="absolute left-0 right-0 mt-2 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 max-w-md">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-slate-300">Select Styles (click to toggle)</p>
                  <button
                    type="button"
                    onClick={() => setShowStyleSelector(false)}
                    className="text-slate-400 hover:text-white"
                    title="Close"
                    aria-label="Close style selector"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="max-h-80 overflow-y-auto space-y-3">
                  {["Genre", "Mood", "Tempo", "Vocals", "Instruments", "Production"].map(category => (
                    <div key={category}>
                      <p className="text-xs font-medium text-slate-500 uppercase mb-2">{category}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STYLE_OPTIONS.filter(opt => opt.category === category).map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => toggleStyleSelection(opt.id)}
                            className={`px-2 py-1 text-xs rounded-lg transition ${
                              selectedStyles.includes(opt.id)
                                ? "bg-purple-500 text-white"
                                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                            }`}
                          >
                            {opt.name}
                            {selectedStyles.includes(opt.id) && (
                              <i className="fa-solid fa-check ml-1 text-[9px]" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between">
                  <button
                    type="button"
                    onClick={() => setSelectedStyles([])}
                    className="text-xs text-slate-400 hover:text-red-400"
                  >
                    Clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowStyleSelector(false)}
                    className="px-3 py-1 text-xs bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Instruments Selection */}
        {(activeTab === "vocals" || activeTab === "instrumental") && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              <i className="fa-solid fa-guitar text-emerald-400 mr-1" />
              Add instruments to your track. Adjust volume or let AI mix automatically.
            </p>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Piano className="w-4 h-4" />
                Instruments
              </label>
              <button
                onClick={() => setShowInstrumentPicker(!showInstrumentPicker)}
                className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {showInstrumentPicker && (
              <div className="p-3 rounded-lg bg-slate-800 border border-slate-600 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {INSTRUMENTS.filter(i => !selectedInstruments.find(s => s.id === i.id)).map(inst => (
                    <button key={inst.id} onClick={() => addInstrument(inst.id)} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition text-left">
                      <i className={`${inst.icon} w-4`} />{inst.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedInstruments.length > 0 && (
              <div className="space-y-2">
                {selectedInstruments.map(inst => {
                  const info = INSTRUMENTS.find(i => i.id === inst.id);
                  return (
                    <div key={inst.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800 border border-emerald-500/30">
                      <i className={`${info?.icon} w-4 text-emerald-400`} />
                      <span className="text-sm text-slate-300 min-w-[80px]">{info?.name}</span>
                      <button onClick={() => toggleInstrumentAuto(inst.id)} className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium transition ${inst.auto ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`} title={inst.auto ? "AI controls mix" : "Click for AI mix"}>
                        <i className={`fa-solid ${inst.auto ? "fa-wand-magic-sparkles" : "fa-sliders"} text-[10px]`} />{inst.auto ? "AI" : "Auto"}
                      </button>
                      {!inst.auto && (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="range" min="10" max="100" value={inst.volume} onChange={(e) => updateInstrumentVolume(inst.id, parseInt(e.target.value))} className="w-full h-1 accent-emerald-500" title={`${info?.name} Volume`} />
                          <span className="text-xs text-slate-400 w-8">{inst.volume}%</span>
                        </div>
                      )}
                      {inst.auto && <span className="flex-1 text-xs text-cyan-400 italic">AI decides mix</span>}
                      <button onClick={() => removeInstrument(inst.id)} className="p-1 text-slate-400 hover:text-red-400 transition" title={`Remove ${info?.name}`}><X className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 4. Vocal Types */}
        {activeTab === "vocals" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              <i className="fa-solid fa-microphone-lines text-purple-400 mr-1" />
              Choose vocal styles (male, female, choir, rap, etc.) to include in your track.
            </p>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Vocal Types
              </label>
              <button
                onClick={() => setShowVocalPicker(!showVocalPicker)}
                className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            </div>
            {showVocalPicker && (
              <div className="p-3 rounded-lg bg-slate-800 border border-slate-600 max-h-48 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {VOCAL_TYPES.filter(v => !selectedVocals.find(s => s.id === v.id)).map(voc => (
                    <button key={voc.id} onClick={() => addVocal(voc.id)} className="flex items-center gap-2 px-2 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition text-left" title={voc.description}>
                      <i className={`${voc.icon} w-4`} />{voc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {selectedVocals.length > 0 && (
              <div className="space-y-2">
                {selectedVocals.map(voc => {
                  const info = VOCAL_TYPES.find(v => v.id === voc.id);
                  return (
                    <div key={voc.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800 border border-purple-500/30">
                      <i className={`${info?.icon} w-4 text-purple-400`} />
                      <span className="text-sm text-slate-300 min-w-[80px]">{info?.name}</span>
                      <button onClick={() => toggleVocalAuto(voc.id)} className={`flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium transition ${voc.auto ? "bg-cyan-600 text-white" : "bg-slate-700 text-slate-400 hover:bg-slate-600"}`} title={voc.auto ? "AI controls mix" : "Click for AI mix"}>
                        <i className={`fa-solid ${voc.auto ? "fa-wand-magic-sparkles" : "fa-sliders"} text-[10px]`} />{voc.auto ? "AI" : "Auto"}
                      </button>
                      {!voc.auto && (
                        <div className="flex items-center gap-2 flex-1">
                          <input type="range" min="10" max="100" value={voc.volume} onChange={(e) => updateVocalVolume(voc.id, parseInt(e.target.value))} className="w-full h-1 accent-purple-500" title={`${info?.name} Volume`} />
                          <span className="text-xs text-slate-400 w-8">{voc.volume}%</span>
                        </div>
                      )}
                      {voc.auto && <span className="flex-1 text-xs text-cyan-400 italic">AI decides mix</span>}
                      <button onClick={() => removeVocal(voc.id)} className="p-1 text-slate-400 hover:text-red-400 transition" title={`Remove ${info?.name}`}><X className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. Advanced Volume Control Toggle */}
        {(selectedInstruments.length > 0 || selectedVocals.length > 0) && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">Advanced Volume Control</span>
            </div>
            <button
              onClick={() => setShowVolumeControls(!showVolumeControls)}
              className="text-slate-400 hover:text-white transition"
              title={showVolumeControls ? "Hide volume controls" : "Show volume controls"}
            >
              {showVolumeControls ? (
                <ToggleRight className="w-6 h-6 text-emerald-400" />
              ) : (
                <ToggleLeft className="w-6 h-6" />
              )}
            </button>
          </div>
        )}

        {/* 6. Music Description */}
        {controls.includes("prompt") && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-300">
                <Sparkles className="w-4 h-4 inline mr-2" />
                Music Description
              </label>
              <button
                onClick={handleEnhancePrompt}
                disabled={isEnhancing || (!prompt && !lyrics)}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Enhance prompt with AI"
              >
                {isEnhancing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                {isEnhancing ? "Enhancing..." : "AI Enhance"}
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the music you want... e.g., 'upbeat electronic dance track with synth leads'"
              className="w-full min-h-24 px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 resize-y"
            />
            
            {/* Quick Insert for MusicGen/Stable Audio - Genre & Style Tags */}
            {(selectedModel.id === "meta/musicgen" || selectedModel.id === "stability-ai/stable-audio-2.5") && (
              <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                <h4 className="text-xs font-medium text-emerald-300 mb-2 flex items-center gap-1.5"><Music className="w-3 h-3" /> Quick Genre & Style Tags</h4>
                <div className="flex flex-wrap gap-1.5">
                  {["electronic", "ambient", "cinematic", "orchestral", "jazz", "lo-fi", "hip-hop", "rock", "classical", "acoustic", "synth", "piano", "guitar", "drums", "bass", "strings", "epic", "calm", "upbeat", "melancholic", "dreamy", "energetic", "atmospheric", "dark", "bright"].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                      className="px-2 py-0.5 text-xs rounded bg-emerald-600/50 hover:bg-emerald-600 text-emerald-100 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Insert for MiniMax - Lyrics Structure Tags */}
            {(selectedModel.id === "minimax/music-1.5" || selectedModel.id === "minimax/music-01") && (
              <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <h4 className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1.5"><Mic className="w-3 h-3" /> MiniMax Music Tips</h4>
                <p className="text-xs text-slate-400 mb-2">Add genre, mood, and style keywords for best results</p>
                <div className="flex flex-wrap gap-1.5">
                  {["pop", "rock", "r&b", "ballad", "dance", "country", "jazz", "hip-hop", "emotional", "uplifting", "romantic", "energetic", "nostalgic", "powerful", "soft", "male vocal", "female vocal", "duet", "harmony", "chorus"].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                      className="px-2 py-0.5 text-xs rounded bg-purple-600/50 hover:bg-purple-600 text-purple-100 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Insert for ACE-Step */}
            {selectedModel.id === "lucataco/ace-step" && (
              <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <h4 className="text-xs font-medium text-amber-300 mb-2 flex items-center gap-1.5"><i className="fa-solid fa-guitar w-3" /> ACE-Step Music Tags</h4>
                <p className="text-xs text-slate-400 mb-2">Combine genres, instruments, and moods</p>
                <div className="flex flex-wrap gap-1.5">
                  {["indie", "folk", "blues", "soul", "funk", "reggae", "metal", "punk", "grunge", "acoustic guitar", "electric guitar", "violin", "cello", "flute", "saxophone", "trumpet", "mellow", "groovy", "intense", "raw", "smooth", "vintage", "modern", "retro"].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                      className="px-2 py-0.5 text-xs rounded bg-amber-600/50 hover:bg-amber-600 text-amber-100 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quick Insert for Google Lyria */}
            {selectedModel.id === "google/lyria-2" && (
              <div className="mt-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <h4 className="text-xs font-medium text-blue-300 mb-2 flex items-center gap-1.5"><Sparkles className="w-3 h-3" /> Google Lyria 2 Tips</h4>
                <p className="text-xs text-slate-400 mb-2">High-quality 48kHz stereo audio generation</p>
                <div className="flex flex-wrap gap-1.5">
                  {["studio quality", "professional mix", "high fidelity", "stereo wide", "rich bass", "clear highs", "warm tone", "crisp sound", "dynamic range", "layered", "polished", "broadcast ready", "vocal harmony", "backing vocals", "lead vocals"].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setPrompt(prev => prev ? `${prev}, ${tag}` : tag)}
                      className="px-2 py-0.5 text-xs rounded bg-blue-600/50 hover:bg-blue-600 text-blue-100 transition"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <p className="text-xs text-slate-500 mt-1">Tip: Click "AI Enhance" to optimize your prompt for {selectedModel.name}</p>
          </div>
        )}

        {/* Riffusion prompts */}
        {controls.includes("prompt_a") && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Start Style</label>
                <input
                  type="text"
                  value={promptA}
                  onChange={(e) => setPromptA(e.target.value)}
                  placeholder="e.g., jazz piano"
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">End Style (blend)</label>
                <input
                  type="text"
                  value={promptB}
                  onChange={(e) => setPromptB(e.target.value)}
                  placeholder="e.g., electronic beats"
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                />
              </div>
            </div>
            
            {/* Riffusion Quick Insert */}
            <div className="mt-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
              <h4 className="text-xs font-medium text-cyan-300 mb-2 flex items-center gap-1.5"><AudioWaveform className="w-3 h-3" /> Riffusion Style Blending Tips</h4>
              <p className="text-xs text-slate-400 mb-2">Click to add to Start or End style for smooth transitions</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Start Style:</p>
                  <div className="flex flex-wrap gap-1">
                    {["jazz piano", "acoustic guitar", "ambient pad", "soft strings", "clean bass", "gentle drums", "mellow synth", "lo-fi beat"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPromptA(prev => prev ? `${prev}, ${tag}` : tag)}
                        className="px-1.5 py-0.5 text-xs rounded bg-cyan-600/50 hover:bg-cyan-600 text-cyan-100 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">End Style:</p>
                  <div className="flex flex-wrap gap-1">
                    {["electronic beats", "heavy bass", "distorted guitar", "epic drums", "synth arp", "dubstep wobble", "techno kick", "orchestra hit"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPromptB(prev => prev ? `${prev}, ${tag}` : tag)}
                        className="px-1.5 py-0.5 text-xs rounded bg-cyan-600/50 hover:bg-cyan-600 text-cyan-100 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Generate Lyrics Section */}
        {controls.includes("suno_mode") && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/30">
            <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Generate Lyrics with AI
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Describe what the song should be about:</label>
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., A love song about missing someone, an upbeat party anthem, a sad ballad about heartbreak..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm"
                  title="Lyrics prompt"
                />
              </div>
              <button
                onClick={handleGenerateLyrics}
                disabled={isGeneratingLyrics}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isGeneratingLyrics ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Lyrics...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Lyrics
                  </>
                )}
              </button>
              
              {/* Generated Lyrics Preview */}
              {generatedLyricsPreview && (
                <div className="mt-3 p-3 rounded-lg bg-slate-800 border border-purple-500/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-purple-300 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Generated Lyrics Preview
                    </span>
                    <span className="text-xs text-slate-500">{generatedLyricsPreview.length} chars</span>
                  </div>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto font-mono bg-slate-900/50 p-2 rounded">
                    {generatedLyricsPreview}
                  </pre>
                  <button
                    onClick={handleAddGeneratedLyrics}
                    className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white transition"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Lyrics
                  </button>
                </div>
              )}
              
              {!generatedLyricsPreview && (
                <p className="text-xs text-slate-500">
                  AI will generate complete lyrics with structure tags based on your description.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Lyrics */}
        {controls.includes("lyrics") && (
          <div>
            <p className="text-xs text-slate-500 mb-2">
              <i className="fa-solid fa-music text-pink-400 mr-1" />
              Write your song lyrics with structure tags like [Verse], [Chorus], [Bridge]. Use AI to generate or enhance lyrics.
            </p>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-slate-300">
                  <Mic className="w-4 h-4 inline mr-2" />
                  Lyrics (optional) <span className="text-xs text-slate-500">- limit: {getModelLyricsLimit()} chars</span>
                </label>
                {/* Font Size Controls */}
                <div className="flex items-center gap-1 bg-slate-700 rounded-lg px-1">
                  <button
                    type="button"
                    onClick={() => setLyricsFontSize(Math.max(10, lyricsFontSize - 2))}
                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 rounded transition"
                    title="Decrease font size"
                    aria-label="Decrease font size"
                  >
                    <i className="fa-solid fa-minus text-[10px]" />
                  </button>
                  <span className="text-xs text-slate-400 w-8 text-center">{lyricsFontSize}px</span>
                  <button
                    type="button"
                    onClick={() => setLyricsFontSize(Math.min(24, lyricsFontSize + 2))}
                    className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 rounded transition"
                    title="Increase font size"
                    aria-label="Increase font size"
                  >
                    <i className="fa-solid fa-plus text-[10px]" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                {/* Fix Limit Button */}
                <button
                  onClick={handleCondenseLyrics}
                  disabled={isCondensingLyrics || !lyrics || lyrics.length <= getModelLyricsLimit()}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition ${
                    lyrics.length > getModelLyricsLimit()
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                      : "bg-slate-600 text-slate-300"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={`Condense lyrics to fit ${getModelLyricsLimit()} char limit for ${selectedModel.name}`}
                >
                  {isCondensingLyrics ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Scissors className="w-3 h-3" />
                  )}
                  {isCondensingLyrics ? "Fixing..." : "Fix Limit"}
                </button>
                {/* Pro Structure Toggle */}
                <button
                  onClick={() => setEnableProRepetition(!enableProRepetition)}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition ${
                    enableProRepetition
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-slate-600 text-slate-400 hover:bg-slate-500"
                  }`}
                  title={enableProRepetition 
                    ? "Pro Mode ON: Will repeat chorus/hooks for longer songs" 
                    : "Pro Mode OFF: Structure tags only, no repetition"}
                >
                  <i className={`fa-solid ${enableProRepetition ? "fa-repeat" : "fa-list"} text-[10px]`} />
                  {enableProRepetition ? "Pro: Repeat" : "Pro: Off"}
                </button>
                {/* Add Structure Button */}
                <button
                  onClick={handleEnhanceLyricsStructure}
                  disabled={isEnhancingLyrics || !lyrics}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  title={enableProRepetition 
                    ? "Add Suno meta tags + repeat chorus/hooks for professional song length" 
                    : "Add Suno meta tags like [Verse], [Chorus], [Mood], [Energy]"}
                >
                  {isEnhancingLyrics ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  {isEnhancingLyrics ? "Enhancing..." : enableProRepetition ? "Pro Enhance" : "Add Structure"}
                </button>
                {/* Language Selector + Pronunciation Button */}
                <div className="relative flex items-center">
                  <button
                    onClick={() => setShowLanguageSelector(!showLanguageSelector)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-l-lg bg-slate-600 text-slate-300 hover:bg-slate-500 border-r border-slate-500 transition"
                    title="Select lyrics languages (multi-select)"
                  >
                    <span className="flex gap-0.5">
                      {lyricsLanguages.slice(0, 3).map(l => (
                        <span key={l}>{PRONUNCIATION_LANGUAGES.find(pl => pl.id === l)?.flag}</span>
                      ))}
                      {lyricsLanguages.length > 3 && <span>+{lyricsLanguages.length - 3}</span>}
                      {lyricsLanguages.length === 0 && "🌐"}
                    </span>
                    <i className="fa-solid fa-chevron-down text-[8px]" />
                  </button>
                  <button
                    onClick={handleAddDiacritics}
                    disabled={isAddingDiacritics || !lyrics || lyricsLanguages.length === 0}
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-r-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title={lyricsLanguages.length > 0 
                      ? `Add pronunciation for: ${lyricsLanguages.map(l => PRONUNCIATION_LANGUAGES.find(pl => pl.id === l)?.name).join(", ")}` 
                      : "Select languages first"}
                  >
                    {isAddingDiacritics ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <i className="fa-solid fa-language text-[10px]" />
                    )}
                    {isAddingDiacritics ? "Adding..." : "Pronunciation"}
                  </button>
                  
                  {/* Multi-Select Language Dropdown */}
                  {showLanguageSelector && (
                    <div className="absolute top-full left-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-2 min-w-[220px] max-w-[280px]">
                      <div className="flex items-center justify-between mb-2 px-2">
                        <p className="text-xs text-slate-400">Select languages (click to toggle):</p>
                        <button
                          onClick={() => setShowLanguageSelector(false)}
                          className="text-slate-400 hover:text-white"
                          title="Close"
                          aria-label="Close language selector"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                      {lyricsLanguages.length > 0 && (
                        <div className="flex flex-wrap gap-1 px-2 mb-2 pb-2 border-b border-slate-700">
                          {lyricsLanguages.map(l => {
                            const lang = PRONUNCIATION_LANGUAGES.find(pl => pl.id === l);
                            return (
                              <span key={l} className="flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-300 rounded">
                                {lang?.flag} {lang?.name}
                                <button 
                                  onClick={() => toggleLanguageSelection(l)} 
                                  className="hover:text-red-400"
                                  title={`Remove ${lang?.name}`}
                                  aria-label={`Remove ${lang?.name}`}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {["Middle East", "South Asia", "European", "East Asia", "African"].map(category => (
                          <div key={category}>
                            <p className="text-[10px] text-slate-500 uppercase px-2 mb-1">{category}</p>
                            <div className="space-y-0.5">
                              {PRONUNCIATION_LANGUAGES.filter(l => l.category === category).map(lang => (
                                <button
                                  key={lang.id}
                                  onClick={() => toggleLanguageSelection(lang.id)}
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition ${
                                    lyricsLanguages.includes(lang.id)
                                      ? "bg-amber-500 text-white"
                                      : "text-slate-300 hover:bg-slate-700"
                                  }`}
                                >
                                  <span>{lang.flag}</span>
                                  <span className="flex-1 text-left">{lang.name}</span>
                                  {lyricsLanguages.includes(lang.id) && (
                                    <i className="fa-solid fa-check text-[10px]" />
                                  )}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-700 px-2">
                        <button
                          onClick={() => {
                            setLyricsLanguages([]);
                          }}
                          className="text-xs text-slate-400 hover:text-red-400"
                        >
                          Clear all
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="relative">
              {/* eslint-disable-next-line react/forbid-dom-props -- dynamic font size required */}
              <textarea
                ref={lyricsTextareaRef}
                value={lyrics}
                onChange={handleLyricsChange}
                onKeyDown={handleLyricsKeyDown}
                onBlur={() => setTimeout(() => setShowLyricsAutocomplete(false), 200)}
                placeholder="Enter lyrics... Type [ for section tags, ( for vocal guidance"
                style={{ fontSize: `${lyricsFontSize}px` }}
                className={`w-full min-h-32 px-4 py-3 rounded-lg bg-slate-700 border text-white placeholder-slate-400 resize-y font-mono ${
                  lyrics.length > getModelLyricsLimit()
                    ? "border-red-500" 
                    : "border-slate-600"
                }`}
              />
              
              {/* Autocomplete Dropdown */}
              {showLyricsAutocomplete && (
                <div className="absolute left-0 right-0 mt-1 z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                  <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
                    <span className={`text-xs font-medium ${autocompleteType === "section" ? "text-cyan-400" : "text-pink-400"}`}>
                      {autocompleteType === "section" ? "📋 Section Tags" : "🎤 Vocal Guidance"}
                    </span>
                    <span className="text-xs text-slate-500">↑↓ navigate • Enter/Tab select • Esc close</span>
                  </div>
                  {getFilteredSuggestions().length === 0 ? (
                    <div className="px-3 py-2 text-xs text-slate-500">No matches found</div>
                  ) : (
                    getFilteredSuggestions().map((suggestion, index) => (
                      <button
                        key={suggestion.tag}
                        type="button"
                        onClick={() => insertSuggestion(suggestion.tag)}
                        onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between transition ${
                          index === selectedSuggestionIndex
                            ? autocompleteType === "section" 
                              ? "bg-cyan-500/20 text-cyan-300" 
                              : "bg-pink-500/20 text-pink-300"
                            : "text-slate-300 hover:bg-slate-700"
                        }`}
                      >
                        <code className={`text-sm font-mono ${
                          autocompleteType === "section" ? "text-cyan-400" : "text-pink-400"
                        }`}>
                          {suggestion.tag}
                        </code>
                        <span className="text-xs text-slate-500">{suggestion.desc}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            {/* Character counter with model limits */}
            <div className="flex items-center justify-between mt-1">
              <span className={`text-xs ${
                lyrics.length > getModelLyricsLimit()
                  ? "text-red-400"
                  : lyrics.length > 0 ? "text-slate-400" : "text-slate-500"
              }`}>
                {lyrics.length} / {getModelLyricsLimit()} characters
                {lyrics.length > getModelLyricsLimit() && (
                  <span className="ml-1 text-red-400">
                    (exceeds limit - click "Fix Limit")
                  </span>
                )}
              </span>
              <span className="text-xs text-slate-500">
                {selectedModel.name}
              </span>
            </div>
            
            {/* Lyrics Structure Quick Insert */}
            <div className="mt-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
              <h4 className="text-xs font-medium text-pink-300 mb-2 flex items-center gap-1.5"><ListMusic className="w-3 h-3" /> Quick Lyrics Structure Tags</h4>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Section Tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {["[Verse]", "[Chorus]", "[Bridge]", "[Pre-Chorus]", "[Intro]", "[Outro]", "[Instrumental]", "[Hook]", "[Ad-lib]", "[Break]"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setLyrics(prev => prev ? `${prev}\n\n${tag}\n` : `${tag}\n`)}
                        className="px-1.5 py-0.5 text-xs rounded bg-pink-600/50 hover:bg-pink-600 text-pink-100 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Vocal Guidance:</p>
                  <div className="flex flex-wrap gap-1">
                    {["(male vocal)", "(female vocal)", "(soft)", "(powerful)", "(whisper)", "(falsetto)", "(harmonies)", "(duet)", "(choir)", "(spoken word)", "(rap)", "(scream)"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setLyrics(prev => prev ? `${prev} ${tag}` : tag)}
                        className="px-1.5 py-0.5 text-xs rounded bg-pink-600/50 hover:bg-pink-600 text-pink-100 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mt-1">
              Click "Add Structure" to auto-format with AI, or use quick tags above
            </p>
          </div>
        )}

        {/* Tags for ACE-Step */}
        {controls.includes("tags") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Tags (genre, mood, instruments)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., pop, energetic, guitar, drums"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
            />
          </div>
        )}

        {/* Duration */}
        {controls.includes("duration") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Clock className="w-4 h-4 inline mr-2" />
              Duration: {duration}s
            </label>
            <input
              type="range"
              min="5"
              max={selectedModel.maxDuration || 30}
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full accent-purple-500"
              title="Duration"
              aria-label="Duration"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>5s</span>
              <span>{selectedModel.maxDuration || 30}s</span>
            </div>
          </div>
        )}

        {/* Loop Mode Toggle */}
        {(controls.includes("duration") || controls.includes("style")) && (
          <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
            <label className="flex items-center justify-between cursor-pointer">
              <div className="flex items-center gap-2">
                <i className="fa-solid fa-repeat text-cyan-400" />
                <div>
                  <span className="text-sm font-medium text-slate-300">Loop Mode</span>
                  <p className="text-xs text-slate-500">Sync start & end for seamless looping</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnableLoop(!enableLoop)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  enableLoop ? "bg-cyan-500" : "bg-slate-600"
                }`}
                title={enableLoop ? "Disable loop mode" : "Enable loop mode"}
                aria-label={enableLoop ? "Disable loop mode" : "Enable loop mode"}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    enableLoop ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </label>
          </div>
        )}

        {/* Sheets Music Upload (Optional) */}
        {(activeTab === "vocals" || activeTab === "instrumental" || controls.includes("suno_mode")) && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              <i className="fa-solid fa-file-image text-indigo-400 mr-1" />
              Upload sheet music images for AI to analyze melody, chords, and structure to guide generation.
            </p>
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <FileImage className="w-4 h-4" />
                Sheets Music (Optional)
              </label>
              <button
                onClick={() => setShowSheetMusic(!showSheetMusic)}
                className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition"
              >
                {showSheetMusic ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                {showSheetMusic ? "Hide" : "Add"}
              </button>
            </div>
            
            {showSheetMusic && (
              <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/30 space-y-3">
                <p className="text-xs text-slate-400">
                  Upload multiple sheet music pages. Drag to reorder. AI will analyze all pages in sequence as a complete piece.
                </p>
                
                {/* File Upload */}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,.pdf,application/pdf"
                    multiple
                    onChange={(e) => handleAddSheetFiles(e.target.files)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-700 border border-slate-600 text-white file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-indigo-600 file:text-white file:cursor-pointer file:text-xs"
                    title="Upload sheet music images or PDFs"
                    aria-label="Upload sheet music images or PDFs"
                  />
                </div>
                
                {/* Uploaded Sheets List with Drag & Drop */}
                {sheetMusicFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-indigo-300 flex items-center gap-1">
                        <ListMusic className="w-3 h-3" /> {sheetMusicFiles.length} page{sheetMusicFiles.length > 1 ? "s" : ""} - Drag to reorder
                      </span>
                      <button
                        onClick={() => setSheetMusicFiles([])}
                        className="text-xs text-slate-400 hover:text-red-400"
                      >
                        Clear All
                      </button>
                    </div>
                    
                    <div className="space-y-1">
                      {sheetMusicFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          draggable
                          onDragStart={() => handleSheetDragStart(index)}
                          onDragOver={(e) => handleSheetDragOver(e, index)}
                          onDragEnd={handleSheetDragEnd}
                          className={`flex items-center gap-2 p-2 rounded-lg border cursor-move transition ${
                            draggedSheetIndex === index
                              ? "bg-indigo-600/30 border-indigo-400"
                              : "bg-slate-800 border-slate-600 hover:border-indigo-500/50"
                          }`}
                        >
                          <i className="fa-solid fa-grip-vertical text-slate-500 text-xs" />
                          <span className="text-xs text-indigo-300 font-medium w-6">{index + 1}.</span>
                          {file.type === "application/pdf" ? (
                            <i className="fa-solid fa-file-pdf text-red-400 text-xs" />
                          ) : (
                            <i className="fa-solid fa-image text-indigo-400 text-xs" />
                          )}
                          <span className="text-xs text-slate-300 flex-1 truncate">{file.name}</span>
                          <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(0)}KB</span>
                          <button
                            onClick={() => handleRemoveSheet(index)}
                            className="p-1 text-slate-400 hover:text-red-400 transition"
                            title="Remove"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                    
                    {/* Analyze Button */}
                    <button
                      onClick={handleProcessSheetMusic}
                      disabled={sheetMusicFiles.length === 0 || isProcessingSheet}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {isProcessingSheet ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing {sheetMusicFiles.length} page{sheetMusicFiles.length > 1 ? "s" : ""}...
                        </>
                      ) : (
                        <>
                          <ScanLine className="w-4 h-4" />
                          Analyze All Sheets ({sheetMusicFiles.length})
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Detected Notation Result */}
                {sheetMusicNotation && (
                  <div className="p-3 rounded-lg bg-slate-800 border border-indigo-500/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-indigo-300 flex items-center gap-1">
                        <Music className="w-3 h-3" /> Combined Notation ({sheetMusicFiles.length} pages)
                      </span>
                      <button
                        onClick={() => {
                          setSheetMusicNotation("");
                          setSheetMusicFiles([]);
                        }}
                        className="text-xs text-slate-400 hover:text-red-400"
                      >
                        Clear
                      </button>
                    </div>
                    <pre className="text-xs text-slate-300 whitespace-pre-wrap font-mono max-h-32 overflow-auto">
                      {sheetMusicNotation}
                    </pre>
                  </div>
                )}
                
                <p className="text-xs text-slate-500">
                  Supported: Images (PNG, JPG) and PDFs. Standard notation, chord charts, tablature, lead sheets. Upload pages in order or reorder by dragging.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add Vocals - Audio Input for Suno (Collapsible) */}
        {controls.includes("suno_mode") && (
          <div className="rounded-lg bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30">
            <button
              type="button"
              onClick={() => setShowAddVocals(!showAddVocals)}
              className="w-full p-3 flex items-center justify-between hover:bg-orange-500/5 transition rounded-lg"
            >
              <span className="text-sm font-medium text-orange-300 flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Add Vocals (Optional - for Cover/Extend)
              </span>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-xs">{showAddVocals ? "Collapse" : "Expand"}</span>
                {showAddVocals ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            
            {showAddVocals && (
              <div className="p-4 pt-0">
                <p className="text-xs text-slate-500 mb-3">
                  <i className="fa-solid fa-upload text-orange-400 mr-1" />
                  Upload or record audio for Cover/Extend features. Suno will analyze and create variations based on your input.
                </p>
                {/* File input hidden */}
            <input
              ref={sunoFileInputRef}
              type="file"
              accept="audio/mp3,audio/wav,audio/webm,audio/ogg,audio/flac,audio/m4a,audio/aac,.mp3,.wav,.webm,.ogg,.flac,.m4a,.aac"
              onChange={(e) => e.target.files?.[0] && handleSunoFileUpload(e.target.files[0])}
              className="hidden"
              aria-label="Upload audio file"
            />
            
            {/* Upload and Record buttons */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => sunoFileInputRef.current?.click()}
                disabled={isSunoUploading || isSunoRecording}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition disabled:opacity-50"
                title="Upload audio file (mp3, wav, webm, ogg, flac, m4a, aac)"
              >
                {isSunoUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {isSunoUploading ? "Uploading..." : "Upload Audio"}
              </button>
              
              <button
                type="button"
                onClick={isSunoRecording ? stopSunoRecording : startSunoRecording}
                disabled={isSunoUploading}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
                  isSunoRecording 
                    ? "bg-red-600 hover:bg-red-700 animate-pulse" 
                    : "bg-orange-600 hover:bg-orange-700"
                } text-white disabled:opacity-50`}
                title={isSunoRecording ? "Stop recording" : "Record voice/audio"}
              >
                <Mic className="w-4 h-4" />
                {isSunoRecording ? `Stop (${formatSunoTime(sunoRecordingTime)})` : "Record Voice"}
              </button>
            </div>
            
            {/* Audio status/preview */}
            {(sunoAudioUrl || sunoAudioFile || sunoRecordedBlob) && (
              <div className="flex items-center gap-2 p-2 rounded bg-slate-700/50 mb-3">
                <FileAudio className="w-4 h-4 text-green-400" />
                <span className="text-sm text-slate-300 flex-1 truncate">
                  {sunoAudioFile?.name || (sunoRecordedBlob ? `Recording (${formatSunoTime(sunoRecordingTime)})` : "Audio ready")}
                </span>
                <button
                  type="button"
                  onClick={clearSunoAudio}
                  className="text-red-400 hover:text-red-300 p-1"
                  title="Clear audio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            
            {/* Manual URL input */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">Or enter audio URL:</label>
              <input
                type="text"
                value={sunoAudioUrl}
                onChange={(e) => setSunoAudioUrl(e.target.value)}
                placeholder="https://example.com/audio.mp3"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm"
                title="Audio URL for Suno processing"
              />
            </div>
            
            {/* Voice Gender Selection */}
            <div className="flex gap-4 mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="vocalGender"
                  checked={vocalGender === "m"}
                  onChange={() => setVocalGender("m")}
                  className="w-4 h-4 text-orange-500"
                  title="Male voice"
                />
                <span className="text-sm text-slate-300">Male Voice</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="vocalGender"
                  checked={vocalGender === "f"}
                  onChange={() => setVocalGender("f")}
                  className="w-4 h-4 text-orange-500"
                  title="Female voice"
                />
                <span className="text-sm text-slate-300">Female Voice</span>
              </label>
            </div>
            
            {/* Advanced Settings */}
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setShowVocalAdvanced(!showVocalAdvanced)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
              >
                {showVocalAdvanced ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                Advanced Settings
              </button>
              
              {showVocalAdvanced && (
                <div className="mt-3 space-y-3 p-3 bg-slate-800/50 rounded-lg">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Style Weight: {styleWeight.toFixed(2)}</label>
                    <input
                      type="range"
                      value={styleWeight}
                      onChange={(e) => setStyleWeight(Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.05}
                      title="Style weight"
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Creativity: {creativityWeight.toFixed(2)}</label>
                    <input
                      type="range"
                      value={creativityWeight}
                      onChange={(e) => setCreativityWeight(Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.05}
                      title="Creativity constraint"
                      className="w-full accent-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Audio Weight: {audioWeight.toFixed(2)}</label>
                    <input
                      type="range"
                      value={audioWeight}
                      onChange={(e) => setAudioWeight(Number(e.target.value))}
                      min={0}
                      max={1}
                      step={0.05}
                      title="Audio weight"
                      className="w-full accent-orange-500"
                    />
                  </div>
                </div>
              )}
            </div>
            
            <p className="text-xs text-slate-500 mt-2">
                <i className="fa-solid fa-music text-orange-400" /> Provide audio to create covers or extend existing tracks. Max 8 min (1 min for V4.5-All).
                <br />
                <i className="fa-solid fa-triangle-exclamation text-amber-400" /> For production: URL must be publicly accessible on the internet.
              </p>
              </div>
            )}
          </div>
        )}

        {/* Bark Music Mode Controls */}
        {controls.includes("bark_music") && (
          <>
            <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
              <h4 className="text-sm font-medium text-purple-300 mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Bark Music Tips
              </h4>
              <p className="text-xs text-slate-400 mb-2">
                Use ♪ symbols around lyrics to make Bark sing! Add emotional expressions for realistic vocals.
              </p>
              <div className="space-y-2 mt-2">
                <div>
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Music className="w-3 h-3" /> Music & Singing:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["♪", "♪♪", "la la la", "na na na", "oh oh oh", "yeah yeah", "mmm", "ooh", "ah ah"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPrompt(prev => prev ? `${prev} ${tag}` : tag)}
                        className="px-2 py-0.5 text-xs rounded bg-purple-600/70 hover:bg-purple-600 text-white transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Smile className="w-3 h-3" /> Emotions & Expressions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["[laughter]", "[sighs]", "[gasps]", "[clears throat]", "[cries]", "[sniffs]", "[groans]", "[yawns]", "[hums]", "[whistles]"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPrompt(prev => prev ? `${prev} ${tag}` : tag)}
                        className="px-2 py-0.5 text-xs rounded bg-purple-600/70 hover:bg-purple-600 text-white transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Speech Style:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {["...", "—", "!", "?!", "CAPS FOR EMPHASIS", "(whispers)", "(shouts)", "(singing)", "(rapping)"].map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setPrompt(prev => prev ? `${prev} ${tag}` : tag)}
                        className="px-2 py-0.5 text-xs rounded bg-purple-600/70 hover:bg-purple-600 text-white transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3 italic">
                Example: "♪ La la la, I'm singing a song ♪ [laughter] This is so much fun! ... oh yeah!"
              </p>
            </div>

            {/* Voice Preset for Bark Music */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Voice Preset
              </label>
              <select
                value={ttsVoice}
                onChange={(e) => setTtsVoice(e.target.value)}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                title="Voice preset"
                aria-label="Voice preset"
              >
                {BARK_VOICES.map(voice => (
                  <option key={voice.id} value={voice.id}>{voice.name}</option>
                ))}
              </select>
            </div>

            {/* Text Temperature for Bark Music */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Text Temperature: {ttsTextTemp.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={ttsTextTemp}
                onChange={(e) => setTtsTextTemp(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
                title="Text temperature"
                aria-label="Text temperature"
              />
              <p className="text-xs text-slate-500 mt-1">Lower = consistent vocals, Higher = expressive</p>
            </div>

            {/* Waveform Temperature for Bark Music */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Waveform Temperature: {ttsWaveformTemp.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={ttsWaveformTemp}
                onChange={(e) => setTtsWaveformTemp(parseFloat(e.target.value))}
                className="w-full accent-purple-500"
                title="Waveform temperature"
                aria-label="Waveform temperature"
              />
              <p className="text-xs text-slate-500 mt-1">Controls audio quality variation</p>
            </div>
          </>
        )}

{/* Boost Style Section (Collapsible) */}
        {controls.includes("suno_mode") && (
          <div className="rounded-lg bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/30">
            <button
              type="button"
              onClick={() => setShowBoostStyle(!showBoostStyle)}
              className="w-full p-3 flex items-center justify-between hover:bg-amber-500/5 transition rounded-lg"
            >
              <span className="text-sm font-medium text-amber-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Boost Style
              </span>
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-xs">{showBoostStyle ? "Collapse" : "Expand"}</span>
                {showBoostStyle ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>
            
            {showBoostStyle && (
              <div className="p-4 pt-0">
                <p className="text-xs text-slate-500 mb-3">
                  <i className="fa-solid fa-wand-magic-sparkles text-amber-400 mr-1" />
                  Enhance your track's style by adding more intensity, changing the mood, or strengthening specific elements.
                </p>
                {/* Select from Gallery or Current Tracks */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">Select Track</label>
              {(galleryTracksWithIds.length > 0 || generatedTracks.some(t => t.id)) ? (
                <select
                  value={boostAudioId}
                  onChange={(e) => setBoostAudioId(e.target.value)}
                  title="Select from generated tracks"
                  aria-label="Select track"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm mb-2"
                >
                  <option value="">Select a track...</option>
                  {generatedTracks.filter(t => t.id).length > 0 && (
                    <optgroup label="Current Session">
                      {generatedTracks.filter(t => t.id).map((track, idx) => (
                        <option key={`current-${idx}`} value={track.id}>
                          {track.title || `Track ${idx + 1}`} ({track.id?.substring(0, 8)}...)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {galleryTracksWithIds.length > 0 && (
                    <optgroup label="Gallery">
                      {galleryTracksWithIds.map((track) => (
                        <option key={track.id} value={track.audioId}>
                          {track.title} ({track.audioId?.substring(0, 8)}...)
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              ) : (
                <p className="text-xs text-slate-500 mb-2">Generate a track first to get Audio IDs</p>
              )}
            </div>
            
            {/* Audio ID Manual Input */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">Audio ID *</label>
              <input
                type="text"
                value={boostAudioId}
                onChange={(e) => setBoostAudioId(e.target.value)}
                placeholder="Or enter audio ID manually"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500"
                title="Audio ID from previous generation"
              />
            </div>
            
            {/* Boost Intensity */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Boost Intensity: {boostIntensity.toFixed(2)}
              </label>
              <input
                type="range"
                value={boostIntensity}
                onChange={(e) => setBoostIntensity(Number(e.target.value))}
                min={0}
                max={1}
                step={0.05}
                title="Boost intensity"
                className="w-full accent-amber-500"
              />
            </div>
            
            {/* Style */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-1">Style</label>
              <input
                type="text"
                value={boostStyleText}
                onChange={(e) => setBoostStyleText(e.target.value)}
                placeholder="New style to apply..."
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-500"
                title="Style to boost"
              />
            </div>
            
            {/* Process Button */}
            <button
              onClick={handleBoostStyle}
              disabled={!boostAudioId || isBoostingStyle}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isBoostingStyle ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Boost Style
                </>
              )}
            </button>
              </div>
            )}
          </div>
        )}

        {/* BPM */}
        {controls.includes("bpm") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              BPM: {bpm}
            </label>
            <input
              type="range"
              min="60"
              max="180"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value))}
              className="w-full accent-purple-500"
              title="BPM"
              aria-label="BPM"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>60 (Slow)</span>
              <span>180 (Fast)</span>
            </div>
          </div>
        )}

        {/* Bars */}
        {controls.includes("bars") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Bars: {bars}
            </label>
            <input
              type="range"
              min="2"
              max="16"
              value={bars}
              onChange={(e) => setBars(parseInt(e.target.value))}
              className="w-full accent-purple-500"
              title="Bars"
              aria-label="Bars"
            />
          </div>
        )}

        {/* Chords */}
        {controls.includes("chords") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Piano className="w-4 h-4 inline mr-2" />
              Chord Progression
            </label>
            <input
              type="text"
              value={chords}
              onChange={(e) => setChords(e.target.value)}
              placeholder="e.g., C G Am F or Dm7 G7 Cmaj7"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">Use standard chord notation separated by spaces</p>
          </div>
        )}

        {/* Temperature */}
        {controls.includes("temperature") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Creativity: {temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-purple-500"
              title="Creativity"
              aria-label="Creativity"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>Conservative</span>
              <span>Creative</span>
            </div>
          </div>
        )}

        {/* Top K */}
        {controls.includes("top_k") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Top K: {topK}
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={topK}
              onChange={(e) => setTopK(parseInt(e.target.value))}
              className="w-full accent-purple-500"
              title="Top K"
              aria-label="Top K"
            />
          </div>
        )}

        {/* Top P */}
        {controls.includes("top_p") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Top P: {topP.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={topP}
              onChange={(e) => setTopP(parseFloat(e.target.value))}
              className="w-full accent-purple-500"
              title="Top P"
              aria-label="Top P"
            />
          </div>
        )}

        {/* Denoising (Riffusion) */}
        {controls.includes("denoising") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Denoising Strength: {denoising.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              value={denoising}
              onChange={(e) => setDenoising(parseFloat(e.target.value))}
              className="w-full accent-purple-500"
              title="Denoising"
              aria-label="Denoising"
            />
          </div>
        )}

        {/* Negative Prompt */}
        {controls.includes("negative_prompt") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Negative Prompt (what to avoid)
            </label>
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="e.g., vocals, distortion, noise"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
            />
          </div>
        )}

        {/* Melody Audio Upload */}
        {controls.includes("melody_audio") && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <AudioWaveform className="w-4 h-4 inline mr-2" />
                Melody Reference (optional)
              </label>
              <div className="flex gap-2">
                <label className="flex-1 px-4 py-3 rounded-lg bg-slate-700 border border-dashed border-slate-500 text-slate-400 cursor-pointer hover:border-emerald-500 hover:text-emerald-400 transition text-center">
                  {melodyFile ? melodyFile.name : "Upload melody audio file"}
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setMelodyFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {melodyFile && (
                  <button
                    onClick={() => setMelodyFile(null)}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">The AI will extract the melody and generate new music around it</p>
            </div>
            {renderAudioRecorder("melody", "Or Record Melody", "emerald")}
          </div>
        )}

        {/* Reference Audio Upload */}
        {(controls.includes("reference_audio") || controls.includes("input_audio")) && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <FileAudio className="w-4 h-4 inline mr-2" />
                Reference Track
              </label>
              <div className="flex gap-2">
                <label className="flex-1 px-4 py-3 rounded-lg bg-slate-700 border border-dashed border-slate-500 text-slate-400 cursor-pointer hover:border-purple-500 hover:text-purple-400 transition text-center">
                  {referenceFile ? referenceFile.name : "Upload reference audio"}
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setReferenceFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {referenceFile && (
                  <button
                    onClick={() => setReferenceFile(null)}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">Upload a reference track for style matching</p>
            </div>
            {renderAudioRecorder("reference", "Or Record Reference", "purple")}
          </div>
        )}

        {/* Voice Cloning: Song Input */}
        {controls.includes("song_input") && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                <Music className="w-4 h-4 inline mr-2" />
                Song to Clone Voice On
              </label>
              <div className="flex gap-2">
                <label className="flex-1 px-4 py-3 rounded-lg bg-slate-700 border border-dashed border-slate-500 text-slate-400 cursor-pointer hover:border-amber-500 hover:text-amber-400 transition text-center">
                  {songInputFile ? songInputFile.name : "Upload song (with vocals)"}
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => setSongInputFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {songInputFile && (
                  <button
                    onClick={() => setSongInputFile(null)}
                    className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white"
                  >
                    ✕
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">Upload a song with vocals to apply the cloned voice</p>
            </div>
            {renderAudioRecorder("song", "Or Record Voice/Song", "amber")}
          </div>
        )}

        {/* RVC Model URL */}
        {controls.includes("rvc_model") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              RVC Model URL
            </label>
            <input
              type="text"
              value={rvcModelUrl}
              onChange={(e) => setRvcModelUrl(e.target.value)}
              placeholder="URL to .pth model file or Hugging Face repo"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">Find RVC models on Hugging Face or AI Hub</p>
          </div>
        )}

        {/* Pitch Change */}
        {controls.includes("pitch_change") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Pitch Change: {pitchChange > 0 ? "+" : ""}{pitchChange} semitones
            </label>
            <input
              type="range"
              min="-12"
              max="12"
              value={pitchChange}
              onChange={(e) => setPitchChange(parseInt(e.target.value))}
              className="w-full accent-purple-500"
              title="Pitch Change"
              aria-label="Pitch Change"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>-12 (Lower)</span>
              <span>+12 (Higher)</span>
            </div>
          </div>
        )}

        {/* Index Rate */}
        {controls.includes("index_rate") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Index Rate: {indexRate.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={indexRate}
              onChange={(e) => setIndexRate(parseFloat(e.target.value))}
              className="w-full accent-purple-500"
              title="Index Rate"
              aria-label="Index Rate"
            />
            <p className="text-xs text-slate-500 mt-1">Higher = more similar to original voice</p>
          </div>
        )}

        {/* Filter Radius */}
        {controls.includes("filter_radius") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Filter Radius: {filterRadius}
            </label>
            <input
              type="range"
              min="0"
              max="7"
              value={filterRadius}
              onChange={(e) => setFilterRadius(parseInt(e.target.value))}
              className="w-full accent-purple-500"
              title="Filter Radius"
              aria-label="Filter Radius"
            />
            <p className="text-xs text-slate-500 mt-1">Median filtering for pitch extraction (reduces breathiness)</p>
          </div>
        )}

        {/* Training Model: Dataset URL */}
        {controls.includes("dataset_url") && (
          <div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mb-4">
              <p className="text-xs text-slate-400">
                <i className="fa-solid fa-clone text-amber-400 mr-1" />
                <strong className="text-amber-400">Voice Cloning:</strong> Train a custom AI model to replicate any voice. Upload 10-30 minutes of clean audio samples, name your model, and let AI learn the voice characteristics.
              </p>
            </div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <Upload className="w-4 h-4 inline mr-2" />
              Dataset URL
            </label>
            <input
              type="text"
              value={datasetUrl}
              onChange={(e) => setDatasetUrl(e.target.value)}
              placeholder="URL to ZIP file with audio samples (10-30 mins of clean voice)"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">Upload a ZIP file containing clean audio samples of the voice you want to clone</p>
          </div>
        )}

        {/* Training Model: Model Name */}
        {controls.includes("model_name") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Model Name
            </label>
            <input
              type="text"
              value={trainingModelName}
              onChange={(e) => setTrainingModelName(e.target.value)}
              placeholder="my-custom-voice-model"
              className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
            />
            <p className="text-xs text-slate-500 mt-1">Name for your trained voice model</p>
          </div>
        )}

        {/* Training Model: Epochs */}
        {controls.includes("epochs") && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Training Epochs: {trainingEpochs}
            </label>
            <input
              type="range"
              min="50"
              max="500"
              step="10"
              value={trainingEpochs}
              onChange={(e) => setTrainingEpochs(parseInt(e.target.value))}
              className="w-full accent-amber-500"
              title="Training Epochs"
              aria-label="Training Epochs"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>50 (Fast)</span>
              <span>500 (Best Quality)</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">More epochs = better quality but longer training time</p>
          </div>
        )}

        {/* Suno AI Studio - Full Featured Tools */}
        {controls.includes("suno_mode") && (
          <SunoTools 
            onAudioGenerated={(url) => {
              setGeneratedAudio(url);
            }} 
            onTracksGenerated={(tracks) => {
              const newTracks = tracks.map(t => ({ 
                url: t.url, 
                title: t.title, 
                id: t.id, 
                imageUrl: t.imageUrl 
              }));
              setGeneratedTracks(prev => [...prev, ...newTracks]);
              if (newTracks.length > 0) {
                setGeneratedAudio(newTracks[0].url);
                setPlayingTrackIndex(generatedTracks.length);
              }
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <Music2 className="w-6 h-6 text-purple-400" />
          Music Studio
        </h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => handleTabChange("vocals")}
          className={`flex-1 min-w-[100px] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-1 sm:gap-2 font-medium transition whitespace-nowrap text-sm sm:text-base ${
            activeTab === "vocals"
              ? "text-purple-400 border-b-2 border-purple-400 bg-slate-800/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">With</span> Vocals
        </button>
        <button
          onClick={() => handleTabChange("instrumental")}
          className={`flex-1 min-w-[100px] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-1 sm:gap-2 font-medium transition whitespace-nowrap text-sm sm:text-base ${
            activeTab === "instrumental"
              ? "text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Piano className="w-4 h-4 sm:w-5 sm:h-5" />
          Instrumental
        </button>
        <button
          onClick={() => handleTabChange("cloning")}
          className={`flex-1 min-w-[100px] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-1 sm:gap-2 font-medium transition whitespace-nowrap text-sm sm:text-base ${
            activeTab === "cloning"
              ? "text-amber-400 border-b-2 border-amber-400 bg-slate-800/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Mic2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Voice</span> Clone
        </button>
        <button
          onClick={() => handleTabChange("transcribe")}
          className={`flex-1 min-w-[100px] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-1 sm:gap-2 font-medium transition whitespace-nowrap text-sm sm:text-base ${
            activeTab === "transcribe"
              ? "text-cyan-400 border-b-2 border-cyan-400 bg-slate-800/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          Transcribe
        </button>
        <button
          onClick={() => handleTabChange("tts")}
          className={`flex-1 min-w-[100px] px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-center gap-1 sm:gap-2 font-medium transition whitespace-nowrap text-sm sm:text-base ${
            activeTab === "tts"
              ? "text-pink-400 border-b-2 border-pink-400 bg-slate-800/50"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
          TTS
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Workflow Toolbar */}
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => setShowSaveWorkflow(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition"
              title="Save current settings as workflow"
            >
              <Save className="w-4 h-4" />
              Save Workflow
            </button>
            <button
              onClick={() => {
                fetchWorkflows();
                setShowLoadWorkflow(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium transition"
              title="Load saved workflow"
            >
              <FolderOpen className="w-4 h-4" />
              Load Workflow
              {workflows.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs rounded-full bg-purple-500 text-white">
                  {workflows.length}
                </span>
              )}
            </button>
            
            {/* Music Gallery Button */}
            <button
              onClick={() => setShowGallery(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium transition"
              title="Open Music Gallery"
            >
              <Layers className="w-4 h-4" />
              Gallery
            </button>
          </div>

          {/* Model Selection */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Select Model</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {getModelsForTab().map((model) => (
                <button
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`p-4 rounded-xl border text-left transition ${
                    model.id === "suno/ai" ? "md:col-span-2" : ""
                  } ${
                    selectedModel.id === model.id
                      ? activeTab === "vocals"
                        ? "border-purple-500 bg-purple-500/10"
                        : activeTab === "instrumental"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : activeTab === "cloning"
                        ? "border-amber-500 bg-amber-500/10"
                        : activeTab === "transcribe"
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-pink-500 bg-pink-500/10"
                      : "border-slate-700 hover:border-slate-500 bg-slate-800/50"
                  }`}
                >
                  <h4 className="font-medium text-white mb-1">{model.name}</h4>
                  <p className="text-xs text-slate-400">{model.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Model Controls */}
          <div className="bg-slate-800 rounded-xl p-6 mb-6">
            <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Sliders className="w-5 h-5" />
              {selectedModel.name} Controls
            </h3>
            {activeTab === "transcribe" ? (
              /* Transcription Controls */
              <div className="space-y-4">
                {/* Tab Description */}
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <p className="text-xs text-slate-400">
                    <i className="fa-solid fa-file-lines text-cyan-400 mr-1" />
                    <strong className="text-cyan-400">Transcription:</strong> Convert speech from audio or video files into text. Supports multiple languages with automatic detection. Get accurate transcripts with timestamps.
                  </p>
                </div>
                
                {/* Audio File Upload */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Upload className="w-4 h-4 inline mr-2" />
                    Audio/Video File
                  </label>
                  <input
                    type="file"
                    accept="audio/*,video/*"
                    onChange={(e) => setTranscribeFile(e.target.files?.[0] || null)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:text-white file:cursor-pointer"
                    title="Upload audio or video file"
                    aria-label="Upload audio or video file"
                  />
                  {transcribeFile && (
                    <p className="text-xs text-slate-400 mt-1">Selected: {transcribeFile.name}</p>
                  )}
                </div>

                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Languages className="w-4 h-4 inline mr-2" />
                    Language
                  </label>
                  <select
                    value={transcribeLanguage}
                    onChange={(e) => setTranscribeLanguage(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                    title="Select language"
                    aria-label="Select language"
                  >
                    <option value="auto">Auto Detect</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                    <option value="nl">Dutch</option>
                    <option value="pl">Polish</option>
                    <option value="tr">Turkish</option>
                  </select>
                </div>

                {/* Model Size (for Whisper) */}
                {selectedModel.controls.includes("model_size") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Model Size</label>
                    <select
                      value={modelSize}
                      onChange={(e) => setModelSize(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                      title="Model size"
                      aria-label="Model size"
                    >
                      <option value="tiny">Tiny (fastest)</option>
                      <option value="base">Base</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large-v2">Large V2</option>
                      <option value="large-v3">Large V3 (best quality)</option>
                    </select>
                  </div>
                )}

                {/* Translate to English */}
                {selectedModel.controls.includes("translate") && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="translate"
                      checked={translateToEnglish}
                      onChange={(e) => setTranslateToEnglish(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                    <label htmlFor="translate" className="text-sm text-slate-300">
                      Translate to English
                    </label>
                  </div>
                )}

                {/* Number of Speakers (for diarization) */}
                {selectedModel.controls.includes("num_speakers") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Users className="w-4 h-4 inline mr-2" />
                      Number of Speakers: {numSpeakers}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={numSpeakers}
                      onChange={(e) => setNumSpeakers(parseInt(e.target.value))}
                      className="w-full accent-cyan-500"
                      title="Number of speakers"
                      aria-label="Number of speakers"
                    />
                  </div>
                )}

                {/* Batch Size */}
                {selectedModel.controls.includes("batch_size") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Batch Size: {batchSize}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="64"
                      value={batchSize}
                      onChange={(e) => setBatchSize(parseInt(e.target.value))}
                      className="w-full accent-cyan-500"
                      title="Batch size"
                      aria-label="Batch size"
                    />
                    <p className="text-xs text-slate-500 mt-1">Higher = faster but uses more memory</p>
                  </div>
                )}

                {/* Include Timestamps */}
                {selectedModel.controls.includes("timestamp") && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="timestamps"
                      checked={includeTimestamps}
                      onChange={(e) => setIncludeTimestamps(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                    <label htmlFor="timestamps" className="text-sm text-slate-300">
                      Include timestamps
                    </label>
                  </div>
                )}

                {/* Align Output (for WhisperX) */}
                {selectedModel.controls.includes("align_output") && (
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="align"
                      checked={alignOutput}
                      onChange={(e) => setAlignOutput(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                    <label htmlFor="align" className="text-sm text-slate-300">
                      Word-level alignment
                    </label>
                  </div>
                )}
              </div>
            ) : activeTab === "tts" ? (
              /* TTS Controls */
              <div className="space-y-4">
                {/* Tab Description */}
                <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
                  <p className="text-xs text-slate-400">
                    <i className="fa-solid fa-volume-high text-pink-400 mr-1" />
                    <strong className="text-pink-400">Text to Speech:</strong> Convert written text into natural-sounding speech. Add emotions, pauses, and effects to make it sound more human-like.
                  </p>
                </div>
                
                {/* Text Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-slate-300">
                      <FileText className="w-4 h-4 inline mr-2" />
                      Text to Speak
                    </label>
                    <button
                      onClick={handleEnhanceTtsText}
                      disabled={isEnhancingTts || !ttsText}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      title="Enhance text with AI"
                    >
                      {isEnhancingTts ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {isEnhancingTts ? "Enhancing..." : "AI Enhance"}
                    </button>
                  </div>
                  <textarea
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Enter the text you want to convert to speech..."
                    className="w-full h-32 px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 resize-none"
                  />
                  
                  {/* TTS Quick Insert - Bark specific */}
                  {selectedModel.id === "suno-ai/bark" && (
                    <div className="mt-3 p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
                      <h4 className="text-xs font-medium text-pink-300 mb-2 flex items-center gap-1.5"><Smile className="w-3 h-3" /> Bark Speech Effects</h4>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Emotions:</p>
                          <div className="flex flex-wrap gap-1">
                            {["[laughter]", "[sighs]", "[gasps]", "[clears throat]", "[cries]", "[sniffs]", "[yawns]", "[hums]"].map(tag => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setTtsText(prev => prev ? `${prev} ${tag}` : tag)}
                                className="px-1.5 py-0.5 text-xs rounded bg-pink-600/50 hover:bg-pink-600 text-pink-100 transition"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 mb-1">Speech Style:</p>
                          <div className="flex flex-wrap gap-1">
                            {["...", "—", "!", "?!", "EMPHASIS", "(whispers)", "(shouts)"].map(tag => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => setTtsText(prev => prev ? `${prev} ${tag}` : tag)}
                                className="px-1.5 py-0.5 text-xs rounded bg-pink-600/50 hover:bg-pink-600 text-pink-100 transition"
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Quick tips for other TTS models */}
                  {selectedModel.id !== "suno-ai/bark" && (
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedModel.id === "jbilcke-hf/parler-tts-mini-v1" 
                        ? "Tip: Describe the voice you want in the Voice Description field below"
                        : "Tip: Use proper punctuation for natural pauses and intonation"}
                    </p>
                  )}
                </div>

                {/* Voice Description (for Parler TTS) */}
                {selectedModel.controls.includes("description") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Mic className="w-4 h-4 inline mr-2" />
                      Voice Description
                    </label>
                    <textarea
                      value={ttsDescription}
                      onChange={(e) => setTtsDescription(e.target.value)}
                      placeholder="Describe the voice: e.g., 'A warm female voice with a slight British accent, speaking slowly and clearly'"
                      className="w-full h-20 px-4 py-3 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 resize-none"
                    />
                  </div>
                )}

                {/* Voice Selection for Bark */}
                {selectedModel.controls.includes("voice_preset") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Voice Preset
                    </label>
                    <select
                      value={ttsVoice}
                      onChange={(e) => setTtsVoice(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                      title="Voice preset"
                      aria-label="Voice preset"
                    >
                      {BARK_VOICES.map(voice => (
                        <option key={voice.id} value={voice.id}>{voice.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Voice Selection for Tortoise */}
                {selectedModel.controls.includes("voice") && selectedModel.id.includes("tortoise") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <User className="w-4 h-4 inline mr-2" />
                      Voice
                    </label>
                    <select
                      value={ttsVoice}
                      onChange={(e) => setTtsVoice(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                      title="Voice"
                      aria-label="Voice"
                    >
                      {TORTOISE_VOICES.map(voice => (
                        <option key={voice.id} value={voice.id}>{voice.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Speaker Reference Audio */}
                {(selectedModel.controls.includes("speaker_wav") || selectedModel.controls.includes("reference_audio")) && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <Upload className="w-4 h-4 inline mr-2" />
                      Reference Voice (Optional)
                    </label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setTtsSpeakerFile(e.target.files?.[0] || null)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-pink-600 file:text-white file:cursor-pointer"
                      title="Upload reference voice"
                      aria-label="Upload reference voice"
                    />
                    {ttsSpeakerFile && (
                      <p className="text-xs text-slate-400 mt-1">Selected: {ttsSpeakerFile.name}</p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">Upload a voice sample for voice cloning</p>
                  </div>
                )}

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    <Languages className="w-4 h-4 inline mr-2" />
                    Language
                  </label>
                  <select
                    value={ttsLanguage}
                    onChange={(e) => setTtsLanguage(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                    title="Language"
                    aria-label="Language"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="zh">Chinese</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="ar">Arabic</option>
                    <option value="hi">Hindi</option>
                    <option value="nl">Dutch</option>
                    <option value="pl">Polish</option>
                    <option value="tr">Turkish</option>
                  </select>
                </div>

                {/* Speed */}
                {selectedModel.controls.includes("speed") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Speed: {ttsSpeed.toFixed(1)}x
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={ttsSpeed}
                      onChange={(e) => setTtsSpeed(parseFloat(e.target.value))}
                      className="w-full accent-pink-500"
                      title="Speed"
                      aria-label="Speed"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>0.5x (Slow)</span>
                      <span>2x (Fast)</span>
                    </div>
                  </div>
                )}

                {/* Emotion (for Orpheus) */}
                {selectedModel.controls.includes("emotion") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">Emotion</label>
                    <select
                      value={ttsEmotion}
                      onChange={(e) => setTtsEmotion(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                      title="Emotion"
                      aria-label="Emotion"
                    >
                      <option value="neutral">Neutral</option>
                      <option value="happy">Happy</option>
                      <option value="sad">Sad</option>
                      <option value="angry">Angry</option>
                      <option value="fearful">Fearful</option>
                      <option value="surprised">Surprised</option>
                      <option value="disgusted">Disgusted</option>
                    </select>
                  </div>
                )}

                {/* Text Temperature (for Bark) */}
                {selectedModel.controls.includes("text_temp") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Text Temperature: {ttsTextTemp.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={ttsTextTemp}
                      onChange={(e) => setTtsTextTemp(parseFloat(e.target.value))}
                      className="w-full accent-pink-500"
                      title="Text temperature"
                      aria-label="Text temperature"
                    />
                    <p className="text-xs text-slate-500 mt-1">Lower = more consistent, Higher = more varied</p>
                  </div>
                )}

                {/* Waveform Temperature (for Bark) */}
                {selectedModel.controls.includes("waveform_temp") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Waveform Temperature: {ttsWaveformTemp.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.05"
                      value={ttsWaveformTemp}
                      onChange={(e) => setTtsWaveformTemp(parseFloat(e.target.value))}
                      className="w-full accent-pink-500"
                      title="Waveform temperature"
                      aria-label="Waveform temperature"
                    />
                  </div>
                )}

                {/* Stability (for ElevenLabs style) */}
                {selectedModel.controls.includes("stability") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Stability: {ttsStability.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ttsStability}
                      onChange={(e) => setTtsStability(parseFloat(e.target.value))}
                      className="w-full accent-pink-500"
                      title="Stability"
                      aria-label="Stability"
                    />
                    <p className="text-xs text-slate-500 mt-1">Higher = more stable, Lower = more expressive</p>
                  </div>
                )}

                {/* Similarity Boost */}
                {selectedModel.controls.includes("similarity_boost") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Similarity: {ttsSimilarity.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ttsSimilarity}
                      onChange={(e) => setTtsSimilarity(parseFloat(e.target.value))}
                      className="w-full accent-pink-500"
                      title="Similarity"
                      aria-label="Similarity"
                    />
                  </div>
                )}

                {/* Vocal Types Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                      <Mic className="w-4 h-4" />
                      Vocal Style (AI Enhance)
                    </label>
                    <button
                      onClick={() => setShowVocalPicker(!showVocalPicker)}
                      className="flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-pink-600 hover:bg-pink-700 text-white transition"
                    >
                      <Plus className="w-3 h-3" />
                      Add
                    </button>
                  </div>
                  
                  {showVocalPicker && (
                    <div className="p-3 rounded-lg bg-slate-800 border border-slate-600 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-2">
                        {VOCAL_TYPES.filter(v => !selectedVocals.find(s => s.id === v.id)).map(voc => (
                          <button
                            key={voc.id}
                            onClick={() => addVocal(voc.id)}
                            className="flex items-center gap-2 px-2 py-1.5 text-xs rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition text-left"
                            title={voc.description}
                          >
                            <i className={`${voc.icon} w-4`} />
                            {voc.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedVocals.length > 0 && (
                    <div className="space-y-2">
                      {selectedVocals.map(voc => {
                        const info = VOCAL_TYPES.find(v => v.id === voc.id);
                        return (
                          <div key={voc.id} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800 border border-pink-500/30">
                            <i className={`${info?.icon} w-4 text-pink-400`} />
                            <span className="text-sm text-slate-300 flex-1">{info?.name}</span>
                            <button
                              onClick={() => removeVocal(voc.id)}
                              className="p-1 text-slate-400 hover:text-red-400 transition"
                              title={`Remove ${info?.name}`}
                              aria-label={`Remove ${info?.name}`}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-slate-500">Selected vocal styles will be used to enhance your text</p>
                </div>
              </div>
            ) : (
              renderControls()
            )}
          </div>

          {/* Action Button */}
          {activeTab === "transcribe" ? (
            <button
              onClick={handleTranscribe}
              disabled={isTranscribing || !transcribeFile}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <FileText className="w-6 h-6" />
                  Transcribe Audio
                </>
              )}
            </button>
          ) : activeTab === "tts" ? (
            <button
              onClick={handleTtsGenerate}
              disabled={isTtsGenerating || !ttsText}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isTtsGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Generating Speech...
                </>
              ) : (
                <>
                  <Volume2 className="w-6 h-6" />
                  Generate Speech
                </>
              )}
            </button>
          ) : selectedModel.controls.includes("dataset_url") ? (
            // Training Model Button
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !datasetUrl || !trainingModelName}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Training Model...
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" />
                  Start Training
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!prompt && !promptA && !songInputFile)}
              className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition ${
                activeTab === "vocals"
                  ? "bg-purple-600 hover:bg-purple-700"
                  : activeTab === "instrumental"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Generating Music...
                </>
              ) : (
                <>
                  <Sparkles className="w-6 h-6" />
                  Generate Music
                </>
              )}
            </button>
          )}

          
          {/* Error */}
          {error && (
            <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              {error}
            </div>
          )}

          {/* Transcription Result */}
          {transcriptionResult && (
            <div className="mt-6 p-6 rounded-xl bg-slate-800 border border-cyan-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Transcription Result
                </h3>
                <button
                  onClick={copyToClipboard}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm flex items-center gap-2 transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Text
                    </>
                  )}
                </button>
              </div>
              <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-auto">
                <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono">
                  {transcriptionResult}
                </pre>
              </div>
            </div>
          )}

          {/* TTS Result Player */}
          {ttsResult && (
            <div className="mt-6 p-6 rounded-xl bg-slate-800 border border-pink-500/30">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-pink-400" />
                Generated Speech
              </h3>
              
              <audio
                controls
                src={ttsResult}
                className="w-full"
              />
              
              <div className="flex items-center gap-4 mt-4">
                <a
                  href={ttsResult}
                  download={`speech_${selectedModel.name.replace(/\s+/g, "_")}_${Date.now()}.mp3`}
                  className="flex-1 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download Audio
                </a>
                
                <button
                  onClick={handleTtsGenerate}
                  disabled={isTtsGenerating}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Regenerate
                </button>
              </div>
            </div>
          )}

          {/* Audio Player - Multi-track support */}
          {(generatedAudio || generatedTracks.length > 0) && (
            <div className="mt-6 p-6 rounded-xl bg-slate-800 border border-slate-700">
              <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
                <Volume2 className="w-5 h-5" />
                Generated Audio
                {generatedTracks.length > 1 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
                    {generatedTracks.length} tracks
                  </span>
                )}
              </h3>
              
              {/* Hidden audio element for current track */}
              <audio
                ref={audioRef}
                src={generatedTracks[playingTrackIndex]?.url || generatedAudio || ""}
                onEnded={() => setIsPlaying(false)}
                loop={enableLoop}
                className="hidden"
              />
              
              {/* Multi-track grid */}
              {generatedTracks.length > 1 ? (
                <div className="space-y-3 mb-4">
                  {generatedTracks.map((track, index) => (
                    <div 
                      key={index}
                      className={`flex items-center gap-4 p-3 rounded-lg transition ${
                        playingTrackIndex === index 
                          ? "bg-purple-500/20 border border-purple-500/50" 
                          : "bg-slate-700/50 hover:bg-slate-700"
                      }`}
                    >
                      {/* Cover image if available */}
                      {track.imageUrl && (
                        <img 
                          src={track.imageUrl} 
                          alt={track.title || `Track ${index + 1}`}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      {!track.imageUrl && (
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <Music className="w-6 h-6 text-white" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">
                          {track.title || `Track ${index + 1}`}
                        </p>
                        {track.id && (
                          <p className="text-xs text-slate-500">ID: {track.id}</p>
                        )}
                      </div>
                      
                      <button
                        onClick={() => {
                          setPlayingTrackIndex(index);
                          if (audioRef.current) {
                            audioRef.current.src = track.url;
                            audioRef.current.play();
                            setIsPlaying(true);
                          }
                        }}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                          playingTrackIndex === index && isPlaying
                            ? "bg-purple-600 text-white"
                            : "bg-slate-600 hover:bg-slate-500 text-white"
                        }`}
                      >
                        {playingTrackIndex === index && isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4 ml-0.5" />
                        )}
                      </button>
                      
                      <a
                        href={track.url}
                        download={`${track.title || `track_${index + 1}`}_${Date.now()}.mp3`}
                        className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white"
                        title="Download track"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                /* Single track view */
                <div className="flex items-center gap-4 mb-4">
                  <button
                    onClick={handlePlayPause}
                    className="w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-700 flex items-center justify-center text-white transition"
                  >
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                  </button>
                  
                  <div className="flex-1">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 w-0" />
                    </div>
                  </div>
                  
                  {/* Loop indicator/toggle */}
                  <button
                    onClick={() => setEnableLoop(!enableLoop)}
                    className={`px-3 py-2 rounded-lg flex items-center gap-2 transition ${
                      enableLoop 
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/50" 
                        : "bg-slate-700 hover:bg-slate-600 text-slate-400"
                    }`}
                    title={enableLoop ? "Loop enabled - click to disable" : "Enable loop playback"}
                  >
                    <i className="fa-solid fa-repeat" />
                    {enableLoop && <span className="text-xs">Loop</span>}
                  </button>
                  
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </button>
                </div>
              )}
              
              <div className="flex gap-2 justify-end">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white flex items-center gap-2"
                >
                  <RefreshCw className="w-5 h-5" />
                  Regenerate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Workflow Modal */}
      {showSaveWorkflow && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                {currentWorkflowId ? (
                  <>
                    <i className="fa-solid fa-pen-to-square text-cyan-400" />
                    Update Workflow
                  </>
                ) : (
                  <>
                    <Save className="w-5 h-5 text-emerald-400" />
                    Save Workflow
                  </>
                )}
              </h3>
              <button
                onClick={() => setShowSaveWorkflow(false)}
                className="text-slate-400 hover:text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  value={workflowName}
                  onChange={(e) => setWorkflowName(e.target.value)}
                  placeholder="My Awesome Workflow"
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={workflowDescription}
                  onChange={(e) => setWorkflowDescription(e.target.value)}
                  placeholder="Optional description..."
                  rows={2}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={workflowCategory}
                  onChange={(e) => setWorkflowCategory(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                  title="Select category"
                >
                  <option value="custom">Custom</option>
                  <option value="pop">Pop</option>
                  <option value="rock">Rock</option>
                  <option value="electronic">Electronic</option>
                  <option value="classical">Classical</option>
                  <option value="jazz">Jazz</option>
                  <option value="hiphop">Hip-Hop</option>
                  <option value="ambient">Ambient</option>
                  <option value="cinematic">Cinematic</option>
                </select>
              </div>
              
              <div className="p-3 bg-slate-700/50 rounded-lg">
                <p className="text-xs text-slate-400">
                  This will save: Model ({selectedModel.name}), prompt, lyrics, style, 
                  instruments ({selectedInstruments.length}), vocals ({selectedVocals.length}), 
                  and all audio parameters.
                </p>
                {currentWorkflowId && (
                  <p className="text-xs text-cyan-400 mt-2 flex items-center gap-1">
                    <i className="fa-solid fa-pen-to-square" />
                    Updating existing workflow. Use "Save as New" to create a copy.
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSaveWorkflow(false)}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
              >
                Cancel
              </button>
              
              {/* Save as New button - only show when updating existing workflow */}
              {currentWorkflowId && (
                <button
                  onClick={() => saveWorkflow(true)}
                  disabled={isSavingWorkflow || !workflowName.trim()}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-copy text-sm" />
                  Save as New
                </button>
              )}
              
              <button
                onClick={() => saveWorkflow(false)}
                disabled={isSavingWorkflow || !workflowName.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingWorkflow ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : currentWorkflowId ? (
                  <>
                    <i className="fa-solid fa-floppy-disk text-sm" />
                    Update
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Workflow Modal */}
      {showLoadWorkflow && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl border border-slate-700 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-purple-400" />
                Load Workflow
              </h3>
              <button
                onClick={() => setShowLoadWorkflow(false)}
                className="text-slate-400 hover:text-white"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              {isLoadingWorkflows ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
              ) : workflows.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No saved workflows yet</p>
                  <p className="text-sm text-slate-500">Save your first workflow to see it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {workflows.map((workflow) => (
                    <div
                      key={workflow.id}
                      className="p-4 bg-slate-700/50 rounded-lg border border-slate-600 hover:border-purple-500/50 transition group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 cursor-pointer" onClick={() => loadWorkflow(workflow)}>
                          <h4 className="font-medium text-white group-hover:text-purple-300 transition">
                            {workflow.name}
                          </h4>
                          {workflow.description && (
                            <p className="text-sm text-slate-400 mt-1">{workflow.description}</p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-0.5 text-xs rounded bg-slate-600 text-slate-300">
                              {workflow.modelId}
                            </span>
                            {workflow.category && (
                              <span className="px-2 py-0.5 text-xs rounded bg-purple-600/50 text-purple-200">
                                {workflow.category}
                              </span>
                            )}
                            {workflow.instruments?.length > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded bg-emerald-600/50 text-emerald-200">
                                {workflow.instruments.length} instruments
                              </span>
                            )}
                            {workflow.vocals?.length > 0 && (
                              <span className="px-2 py-0.5 text-xs rounded bg-pink-600/50 text-pink-200">
                                {workflow.vocals.length} vocals
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => loadWorkflow(workflow)}
                            className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-sm transition"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this workflow?')) {
                                deleteWorkflow(workflow.id);
                              }
                            }}
                            className="p-1.5 rounded bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition"
                            title="Delete workflow"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700">
              <button
                onClick={() => setShowLoadWorkflow(false)}
                className="w-full px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Gallery Modal */}
      {showGallery && (
        <MusicGallery
          onClose={() => setShowGallery(false)}
          currentWorkflowId={currentWorkflowId}
          currentWorkflowName={workflowName}
        />
      )}
    </div>
  );
}
