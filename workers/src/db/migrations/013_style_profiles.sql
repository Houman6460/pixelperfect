-- Migration 013: Add Style Profile System for Scenario & Timeline
-- Enables director/animation/visual style selection that propagates through the entire pipeline

-- =============================================
-- 1. SCENARIOS TABLE: Add style profile fields
-- =============================================

-- Add style_id for referencing predefined styles
ALTER TABLE scenarios ADD COLUMN style_id TEXT;

-- Add full style profile JSON (cached from KV at creation time)
ALTER TABLE scenarios ADD COLUMN style_profile_json TEXT;

-- Add custom style prompt for user-defined styles
ALTER TABLE scenarios ADD COLUMN custom_style_prompt TEXT;

-- Create index for style lookups
CREATE INDEX IF NOT EXISTS idx_scenarios_style ON scenarios(style_id);

-- =============================================
-- 2. TIMELINES TABLE: Add style fields
-- =============================================

-- Add style_id inherited from scenario (or overridden)
ALTER TABLE timelines ADD COLUMN style_id TEXT;

-- Add style profile snapshot at plan creation
ALTER TABLE timelines ADD COLUMN style_profile_json TEXT;

CREATE INDEX IF NOT EXISTS idx_timelines_style ON timelines(style_id);

-- =============================================
-- 3. SEGMENTS TABLE: Add per-segment style fields
-- =============================================

-- Note: style_preset already exists, but we extend with style_id
ALTER TABLE segments ADD COLUMN style_id TEXT;

-- Add style override flag (false = inherit from timeline)
ALTER TABLE segments ADD COLUMN style_override INTEGER DEFAULT 0;

-- Add style-specific prompt additions
ALTER TABLE segments ADD COLUMN style_prompt_suffix TEXT;

CREATE INDEX IF NOT EXISTS idx_segments_style ON segments(style_id);

-- =============================================
-- 4. STYLE PROFILES TABLE: Store style definitions (backup to KV)
-- =============================================

CREATE TABLE IF NOT EXISTS style_profiles (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL, -- director, animation, cinematic, custom
    label TEXT NOT NULL,
    description TEXT,
    
    -- Camera settings
    camera_default TEXT DEFAULT 'static',
    camera_variants TEXT, -- JSON array
    camera_hints TEXT, -- JSON array of prompt hints
    
    -- Motion settings
    motion_default TEXT DEFAULT 'smooth',
    motion_variants TEXT, -- JSON array
    
    -- Lighting settings
    lighting_profile TEXT,
    lighting_hints TEXT, -- JSON array
    
    -- Color grading
    color_grade TEXT,
    color_hints TEXT, -- JSON array
    
    -- Transition preferences
    transition_default TEXT DEFAULT 'cut',
    transition_hints TEXT, -- JSON array
    
    -- General prompt hints
    prompt_hints TEXT, -- JSON array of style-specific prompt additions
    negative_prompt_hints TEXT, -- JSON array of things to avoid
    
    -- Composition hints
    composition_hints TEXT, -- JSON array
    
    -- Pacing guidance
    pacing TEXT, -- slow, medium, fast, varied
    
    -- Visual characteristics
    visual_keywords TEXT, -- JSON array
    
    -- Enhancement preferences
    enhance_profile TEXT, -- grainy, clean, filmic, anime, etc.
    upscaler_preference TEXT,
    
    -- Metadata
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    icon TEXT,
    preview_image_url TEXT,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_style_profiles_type ON style_profiles(type);
CREATE INDEX IF NOT EXISTS idx_style_profiles_active ON style_profiles(is_active);

-- =============================================
-- 5. Insert Default Style Profiles
-- =============================================

-- Director Styles
INSERT OR IGNORE INTO style_profiles (id, type, label, description, camera_default, camera_hints, motion_default, lighting_profile, color_grade, transition_default, prompt_hints, pacing, visual_keywords, enhance_profile)
VALUES
    ('director-wes-anderson', 'director', 'Wes Anderson', 'Symmetrical compositions, pastel colors, whimsical aesthetics', 
     'static', '["perfectly centered framing", "symmetrical composition", "tableau vivant staging"]',
     'minimal', 'soft-even', 'pastel-saturated', 'cut',
     '["Wes Anderson style", "symmetrical framing", "pastel color palette", "whimsical aesthetic", "centered composition", "dollhouse staging"]',
     'slow', '["pastel", "symmetry", "whimsical", "vintage", "centered"]', 'clean'),
     
    ('director-david-fincher', 'director', 'David Fincher', 'Dark, precise cinematography with desaturated colors',
     'dolly', '["precise camera movements", "slow creeping dolly", "controlled tracking shots"]',
     'smooth', 'low-key', 'desaturated-green', 'dissolve',
     '["David Fincher style", "dark moody atmosphere", "desaturated color palette", "precision cinematography", "psychological intensity"]',
     'slow', '["dark", "moody", "desaturated", "precise", "tension"]', 'filmic'),
     
    ('director-christopher-nolan', 'director', 'Christopher Nolan', 'IMAX-scale visuals, practical effects, time manipulation themes',
     'wide', '["IMAX-style wide shots", "epic scale framing", "practical cinematography"]',
     'cinematic', 'natural-dramatic', 'rich-contrast', 'cut',
     '["Christopher Nolan style", "epic scale", "IMAX cinematography", "dramatic natural lighting", "practical effects aesthetic"]',
     'medium', '["epic", "grand", "intense", "time", "scale"]', 'clean'),
     
    ('director-tarantino', 'director', 'Quentin Tarantino', 'Bold colors, intense dialogue scenes, stylized violence',
     'tracking', '["trunk shot perspective", "low angle close-ups", "long dialogue tracking"]',
     'dynamic', 'high-contrast', 'saturated-bold', 'cut',
     '["Tarantino style", "bold saturated colors", "intense close-ups", "stylized cinematography", "pulp aesthetic"]',
     'varied', '["bold", "saturated", "intense", "stylized", "pulp"]', 'filmic'),
     
    ('director-kubrick', 'director', 'Stanley Kubrick', 'One-point perspective, cold precision, unsettling symmetry',
     'tracking', '["one-point perspective", "steady tracking shots", "symmetrical framing"]',
     'smooth', 'cold-clinical', 'neutral-cold', 'fade',
     '["Kubrick style", "one-point perspective", "cold clinical atmosphere", "unsettling symmetry", "sterile precision"]',
     'slow', '["cold", "symmetry", "precision", "unsettling", "clinical"]', 'clean'),

    ('director-spielberg', 'director', 'Steven Spielberg', 'Emotional close-ups, lens flares, wonder and spectacle',
     'dolly', '["emotional reaction shots", "lens flares", "wonder reveal shots"]',
     'smooth', 'warm-golden', 'warm-saturated', 'dissolve',
     '["Spielberg style", "emotional cinematography", "lens flares", "sense of wonder", "warm golden lighting", "heartfelt moments"]',
     'medium', '["warm", "emotional", "wonder", "flare", "heartfelt"]', 'clean'),

    ('director-denis-villeneuve', 'director', 'Denis Villeneuve', 'Slow, contemplative, vast landscapes, minimal dialogue',
     'wide', '["vast landscape establishing shots", "slow contemplative movements", "minimalist framing"]',
     'minimal', 'natural-atmospheric', 'muted-earthy', 'dissolve',
     '["Denis Villeneuve style", "contemplative pacing", "vast landscapes", "atmospheric cinematography", "minimal dialogue visual storytelling"]',
     'slow', '["vast", "contemplative", "atmospheric", "minimal", "earthy"]', 'filmic');

-- Animation Styles
INSERT OR IGNORE INTO style_profiles (id, type, label, description, camera_default, motion_default, lighting_profile, color_grade, prompt_hints, visual_keywords, enhance_profile)
VALUES
    ('anime-ghibli', 'animation', 'Studio Ghibli', 'Hand-drawn look, lush environments, magical realism',
     'pan', 'gentle', 'soft-natural', 'warm-nostalgic',
     '["Studio Ghibli style", "hand-drawn animation aesthetic", "lush detailed backgrounds", "magical realism", "warm nostalgic colors", "soft natural lighting"]',
     '["ghibli", "hand-drawn", "lush", "magical", "nostalgic", "warmth"]', 'anime'),
     
    ('anime-cyberpunk', 'animation', 'Cyberpunk Anime', 'Neon-lit, futuristic, high contrast anime style',
     'tracking', 'dynamic', 'neon-high-contrast', 'neon-saturated',
     '["cyberpunk anime style", "neon lighting", "futuristic cityscape", "high contrast", "rain-slicked streets", "holographic advertisements"]',
     '["neon", "cyberpunk", "futuristic", "rain", "holographic", "contrast"]', 'anime'),
     
    ('anime-shonen', 'animation', 'Shonen Action', 'Dynamic action, speed lines, dramatic poses',
     'dynamic', 'fast', 'dramatic-high', 'vivid-saturated',
     '["shonen anime style", "dynamic action poses", "speed lines", "dramatic lighting", "intense expressions", "power aura effects"]',
     '["action", "dynamic", "speed", "dramatic", "intense", "power"]', 'anime'),
     
    ('pixar-3d', 'animation', 'Pixar 3D Animation', 'Polished 3D, expressive characters, vibrant colors',
     'dolly', 'smooth', 'soft-cinematic', 'vibrant-clean',
     '["Pixar animation style", "polished 3D rendering", "expressive characters", "vibrant colors", "emotional storytelling", "soft cinematic lighting"]',
     '["pixar", "3D", "polished", "expressive", "vibrant", "emotional"]', 'clean'),
     
    ('cartoon-classic', 'animation', 'Classic Cartoon', 'Exaggerated expressions, squash and stretch, bold outlines',
     'static', 'exaggerated', 'flat-bright', 'primary-bold',
     '["classic cartoon style", "exaggerated expressions", "squash and stretch", "bold outlines", "bright primary colors", "slapstick energy"]',
     '["cartoon", "exaggerated", "bold", "bright", "slapstick", "fun"]', 'clean');

-- Cinematic Styles
INSERT OR IGNORE INTO style_profiles (id, type, label, description, camera_default, lighting_profile, color_grade, prompt_hints, visual_keywords, enhance_profile)
VALUES
    ('noir', 'cinematic', 'Film Noir', 'High contrast, shadows, mysterious atmosphere',
     'static', 'low-key-dramatic', 'black-white-high-contrast',
     '["film noir style", "high contrast black and white", "dramatic shadows", "venetian blind lighting", "mysterious atmosphere", "femme fatale aesthetic"]',
     '["noir", "shadows", "contrast", "mystery", "black-white", "dramatic"]', 'grainy'),
     
    ('neo-noir', 'cinematic', 'Neo-Noir', 'Modern noir with neon accents and urban grit',
     'tracking', 'mixed-neon', 'desaturated-neon-accents',
     '["neo-noir style", "neon accents in darkness", "urban grit", "rain-soaked streets", "moral ambiguity", "modern noir aesthetic"]',
     '["neo-noir", "neon", "urban", "rain", "gritty", "modern"]', 'filmic'),
     
    ('surreal', 'cinematic', 'Surrealist', 'Dreamlike, impossible geometries, symbolic imagery',
     'static', 'otherworldly', 'dreamlike-muted',
     '["surrealist style", "dreamlike atmosphere", "impossible geometries", "symbolic imagery", "Dali-esque", "subconscious visions"]',
     '["surreal", "dream", "impossible", "symbolic", "abstract", "subconscious"]', 'clean'),
     
    ('retro-80s', 'cinematic', 'Retro 80s', 'Synthwave aesthetics, neon grids, VHS texture',
     'zoom', 'neon-sunset', 'synthwave-gradient',
     '["80s retro aesthetic", "synthwave style", "neon grids", "sunset gradients", "VHS texture", "chrome reflections", "palm trees silhouette"]',
     '["80s", "synthwave", "neon", "retro", "VHS", "chrome", "sunset"]', 'grainy'),
     
    ('documentary', 'cinematic', 'Documentary', 'Naturalistic, handheld, observational',
     'handheld', 'natural-available', 'natural-minimal',
     '["documentary style", "naturalistic lighting", "handheld camera", "observational cinematography", "authentic moments", "fly on wall perspective"]',
     '["documentary", "natural", "handheld", "authentic", "observational", "real"]', 'clean'),
     
    ('horror', 'cinematic', 'Horror', 'Dark, unsettling, tension-building compositions',
     'slow-push', 'low-key-unsettling', 'desaturated-cold',
     '["horror style", "unsettling atmosphere", "creeping dread", "dark shadows", "cold desaturated colors", "tension-building cinematography"]',
     '["horror", "dark", "unsettling", "tension", "cold", "dread"]', 'grainy'),
     
    ('romantic', 'cinematic', 'Romantic', 'Soft focus, warm tones, intimate framing',
     'dolly', 'soft-warm', 'warm-soft-glow',
     '["romantic style", "soft focus", "warm golden tones", "intimate close-ups", "lens flares", "dreamy atmosphere", "golden hour lighting"]',
     '["romantic", "soft", "warm", "intimate", "golden", "dreamy"]', 'clean'),

    ('epic-fantasy', 'cinematic', 'Epic Fantasy', 'Grand vistas, dramatic lighting, mythical atmosphere',
     'crane', 'dramatic-golden', 'rich-saturated',
     '["epic fantasy style", "grand sweeping vistas", "dramatic sky", "mythical atmosphere", "majestic landscapes", "heroic lighting"]',
     '["epic", "fantasy", "grand", "mythical", "majestic", "heroic"]', 'clean'),
     
    ('sci-fi-clean', 'cinematic', 'Clean Sci-Fi', 'Minimalist futuristic, white spaces, sleek design',
     'dolly', 'soft-clinical', 'cool-clinical',
     '["clean sci-fi aesthetic", "minimalist futuristic design", "white spaces", "sleek technology", "sterile environments", "blue accents"]',
     '["sci-fi", "clean", "minimalist", "futuristic", "sleek", "white"]', 'clean');
