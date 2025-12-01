import { Router, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

// Model-specific prompt guidelines
const PROMPT_GUIDELINES: Record<string, string> = {
  // === IMAGE MODELS ===
  "flux-schnell": `You are a prompt engineer for FLUX Schnell image generation.
FLUX best practices:
- Be descriptive but concise
- Specify art style, lighting, camera angle
- Use quality tags: "high quality", "detailed", "8k", "professional"
- Mention composition: "centered", "rule of thirds", "portrait", "landscape"
- Include mood/atmosphere: "cinematic", "dramatic lighting", "soft light"
- Avoid negative words, instead describe what you want
Example structure: "[subject] [action/pose], [style], [lighting], [quality tags]"`,

  "sdxl": `You are a prompt engineer for Stable Diffusion XL.
SDXL best practices:
- Front-load important elements
- Use weighted emphasis with parentheses for important parts
- Include style keywords: "photorealistic", "digital art", "oil painting"
- Add quality boosters: "masterpiece", "best quality", "highly detailed"
- Specify negative aspects to avoid separately
- Be specific about colors, textures, materials
Example: "A (beautiful woman:1.2) with flowing red hair, photorealistic portrait, soft studio lighting, 8k, highly detailed"`,

  "gemini-image": `You are a prompt engineer for Google Gemini image generation.
Gemini best practices:
- Use natural, conversational language
- Be specific about the scene, subjects, and their relationships
- Describe the mood and atmosphere clearly
- Mention specific artistic styles or references
- Include details about time of day, weather, setting
- Keep prompts clear and well-structured`,

  // === INPAINTING MODELS ===
  "flux-fill": `You are a prompt engineer for FLUX Fill inpainting.
FLUX Fill is used to fill masked areas in images. Best practices:
- Describe WHAT should appear in the masked area, not the whole image
- Be specific about the object, texture, or element to generate
- Include material, color, and style details
- Consider the surrounding context of the image
- Use natural descriptions: "a red rose", "wooden texture", "clear blue sky"
- Mention lighting consistency: "matching ambient light", "soft shadows"
- For objects: describe position, size relation, and how it fits the scene
- For backgrounds: describe texture, pattern, depth
- Avoid describing areas outside the mask
Example prompts:
- "A fluffy orange cat sitting comfortably"
- "Smooth marble texture with gray veins"
- "Clear blue sky with a few white clouds"
- "A vintage leather armchair"
- "Green grass with small wildflowers"`,

  // === MUSIC MODELS - WITH VOCALS ===
  "minimax/music-01": `You are a prompt engineer for MiniMax Music-01.
MiniMax Music-01 best practices:
- Focus on genre, mood, and instruments
- Reference specific artists or songs for style
- Describe tempo: "upbeat", "slow", "moderate"
- Include emotional qualities: "melancholic", "joyful", "intense"
- Mention production style: "lo-fi", "polished", "raw"
Example: "An upbeat pop song with catchy synth hooks, inspired by 80s new wave, energetic drums, bright and joyful mood"`,

  "minimax/music-1.5": `You are a prompt engineer for MiniMax Music-1.5 with lyrics support.
MiniMax Music-1.5 best practices:
- For the PROMPT: describe genre, mood, instruments, tempo
- For LYRICS: use structured format with [Verse], [Chorus], [Bridge] tags
- Lyrics should match the described mood
- Keep verses 4-8 lines, choruses 4 lines
- Use natural, singable phrasing
Lyrics format example:
[Verse 1]
Line 1 of verse
Line 2 of verse

[Chorus]
Catchy chorus line
Repeat hook

Prompt example: "Emotional pop ballad with piano and strings, powerful vocals, building to an epic chorus"`,

  "google/lyria-2": `You are a prompt engineer for Google Lyria 2.
Lyria 2 best practices:
- Describe the overall musical narrative
- Specify genre blends if applicable
- Include dynamic changes: "starts soft, builds to powerful"
- Mention vocal characteristics: "soulful", "ethereal", "powerful"
- Reference musical eras or movements
Example: "A soulful R&B track with smooth vocals, starting with intimate piano, building to a full band arrangement with brass accents"`,

  "lucataco/ace-step": `You are a prompt engineer for ACE-Step music generation.
ACE-Step best practices:
- Be specific about musical elements
- Describe the sonic texture and layering
- Include tempo and rhythm patterns
- Mention specific instruments and their roles
- Describe the overall energy arc
Example: "Indie rock with jangly guitars, driving drums at 120 BPM, introspective male vocals, building chorus with layered harmonies"`,

  // === MUSIC MODELS - INSTRUMENTAL ===
  "meta/musicgen": `You are a prompt engineer for Meta MusicGen.
MusicGen best practices:
- Be specific about genre and sub-genre
- Describe instrumentation in detail
- Include tempo description (not exact BPM)
- Mention mood and energy level
- Reference time period or style influences
- Keep prompts focused, 1-2 sentences
Example: "A relaxing lo-fi hip hop beat with jazzy piano chords, soft vinyl crackle, mellow drums, and warm bass"`,

  "stability-ai/stable-audio-2.5": `You are a prompt engineer for Stable Audio 2.5.
Stable Audio best practices:
- Use natural language descriptions
- Specify production quality: "professional", "studio quality"
- Include sonic characteristics: "warm", "crisp", "spacious"
- Describe the arrangement and structure
- Mention specific sound design elements
Example: "Professional electronic dance track with punchy kicks, shimmering synth pads, driving bassline, and euphoric breakdown"`,

  "sakemin/musicgen-stereo-chord": `You are a prompt engineer for MusicGen Stereo Chord.
This model works with chord progressions. Best practices:
- Describe the emotional quality of the progression
- Mention genre context for the chords
- Include rhythmic feel: "strummed", "arpeggiated", "sustained"
- Specify instrument playing the chords
Example: "Warm jazz piano chords with rich voicings, gentle arpeggiated pattern, intimate late-night club atmosphere"`,

  "fofr/musicgen-looper": `You are a prompt engineer for MusicGen Looper.
Looper creates seamless loops. Best practices:
- Focus on elements that loop well
- Avoid descriptions with builds or changes
- Keep energy consistent throughout
- Describe repetitive, hypnotic elements
- Perfect for beats, ambient, electronic
Example: "Minimal techno loop with deep kick drum, clicking hi-hats, subtle acid bassline, hypnotic and repetitive"`,

  "fofr/musicgen-remixer": `You are a prompt engineer for MusicGen Remixer.
Remixer transforms audio. Best practices:
- Describe the target style clearly
- Include specific genre transformations
- Mention production techniques to apply
- Specify what elements to preserve vs change
Example: "Transform into a tropical house remix with steel drums, uplifting synths, and summer beach vibes"`,

  "riffusion/riffusion": `You are a prompt engineer for Riffusion.
Riffusion best practices:
- Use simple, direct descriptions
- Focus on single genre or style
- Include instrument types
- Describe mood in one or two words
- Keep prompts short and punchy
Example: "Chill acoustic guitar melody, peaceful, fingerpicked, folk"`,

  // === VOICE CLONING ===
  "zsxkib/realistic-voice-cloning": `You are a prompt engineer for voice cloning input text.
Voice cloning text best practices:
- Write clear, natural sentences
- Avoid complex words that might be mispronounced
- Include variety in sentence length
- Add natural pauses with punctuation
- Match the tone to the intended voice character
Example: "Hello there! I hope you're having a wonderful day. Let me tell you about something exciting."`,

  // === TEXT-TO-SPEECH ===
  "lucataco/xtts-v2": `You are a text enhancement assistant for XTTS text-to-speech.
XTTS best practices:
- Write natural, conversational text
- Use proper punctuation for natural pauses
- Avoid excessive punctuation or symbols
- Break long paragraphs into shorter sentences
- Use commas and periods to control pacing
- Avoid abbreviations - write them out fully`,

  "suno-ai/bark": `You are a text enhancement assistant for Suno Bark TTS.
Bark special features:
- Can express emotions with [laughter], [sighs], [gasps], [clears throat]
- Can add music with ♪ symbols around lyrics
- Use ... for hesitation, - for interruptions
- Write naturally with emotional cues in brackets
- Can do multiple speakers with different voice presets
Example: "[clears throat] Hello everyone! [laughter] I'm so excited to be here today..."`,

  "afiaka87/tortoise-tts": `You are a text enhancement assistant for Tortoise TTS.
Tortoise best practices:
- Write clear, expressive sentences
- Use natural dialogue patterns
- Include emotional context in the text
- Proper punctuation helps with prosody
- Avoid very long sentences
- Can handle dramatic or narrative text well`,

  "jbilcke-hf/parler-tts-mini-v1": `You are a text enhancement assistant for Parler TTS.
Parler TTS works with voice descriptions. Enhance the text AND suggest a voice description.
- Text should be clear and well-punctuated
- Suggest natural voice characteristics
- Include speaking style in description
Example description: "A warm female voice with a slight British accent, speaking slowly and clearly with a friendly tone"`,

  // === DEFAULT ===
  "default": `You are a helpful prompt engineer.
General best practices:
- Be specific and descriptive
- Use clear, unambiguous language
- Include relevant style and quality keywords
- Structure prompts logically
- Avoid contradictions`
};

// Enhance prompt endpoint
router.post("/enhance", async (req: Request, res: Response) => {
  try {
    const { prompt, model, type, lyrics, instruments, vocals } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Get model-specific guidelines
    const guidelines = PROMPT_GUIDELINES[model] || PROMPT_GUIDELINES["default"];

    let systemPrompt = `${guidelines}

Your task is to enhance the user's music description prompt while keeping their original intent.
- Improve clarity and specificity for AI music generation
- Add relevant musical keywords and modifiers
- Optimize for the specific model's strengths
- Keep the enhanced prompt concise but complete
- MUST include all user-selected instruments and vocals with their volume/priority settings
- Do NOT add explanations, just return the enhanced prompt`;

    // Add instruments and vocals context for music prompts
    if (type === "music") {
      if (instruments) {
        systemPrompt += `\n\nCRITICAL - User has selected these instruments with mix levels: ${instruments}
- You MUST include these instruments in the enhanced prompt
- "AI-controlled mix" means let AI decide the volume/presence
- "prominent/very prominent" means feature this instrument heavily
- "balanced" means equal presence in the mix
- "subtle/background" means keep it quiet/supportive
- Describe the arrangement incorporating these exact instruments and their levels`;
      }
      
      if (vocals) {
        systemPrompt += `\n\nCRITICAL - User has selected these vocal types with mix levels: ${vocals}
- You MUST include these vocals in the enhanced prompt
- "AI-controlled mix" means let AI decide the vocal presence
- "lead/dominant" means vocals should be the focus
- "prominent" means vocals are important but not overwhelming  
- "balanced" means equal with instruments
- "supporting/background" means vocals should be subtle
- Describe how these vocal types should be featured`;
      }
    }

    // Add TTS-specific context
    if (type === "tts") {
      if (vocals) {
        systemPrompt += `\n\nUser wants a ${vocals} style voice. Adapt the text to suit this vocal style:
- Adjust tone and phrasing to match the voice type
- Add appropriate emotional cues or punctuation
- Make the text sound natural when spoken in this style`;
      }
      
      const description = req.body.description;
      if (description) {
        systemPrompt += `\n\nTarget voice description: "${description}"
- Ensure the text sounds natural with this voice
- Match the pacing and style to the voice description`;
      }
    }

    let userMessage = `Original music description: "${prompt}"`;
    
    if (instruments) {
      userMessage += `\n\nSelected instruments (MUST include in enhanced prompt): ${instruments}`;
    }
    if (vocals) {
      userMessage += `\n\nSelected vocals (MUST include in enhanced prompt): ${vocals}`;
    }
    
    if (type === "tts") {
      userMessage += `\n\nPlease enhance this text for natural speech synthesis. Keep the meaning but improve clarity and natural flow.`;
    } else {
      userMessage += `\n\nPlease enhance this music prompt. You MUST incorporate the selected instruments and vocal types with their specified volume/mix levels into the enhanced description.`;
    }

    // For music with lyrics - only enhance the prompt, NOT the lyrics
    if (type === "music" && lyrics) {
      systemPrompt += `

IMPORTANT: The user has provided lyrics. DO NOT modify, change, or rewrite the lyrics.
Only enhance the music description/style prompt.
Consider the lyrics theme when enhancing the music prompt for better musical context.`;

      userMessage += `\n\nUser's lyrics (for context only, DO NOT CHANGE):
---
${lyrics}
---

Enhance ONLY the music description. Consider the lyrics' mood and theme. Return ONLY the enhanced music prompt, no lyrics.`;
    }

    const result = await geminiModel.generateContent([
      { text: systemPrompt },
      { text: userMessage }
    ]);

    const response = result.response;
    let enhancedText = response.text().trim();
    
    // Clean up any PROMPT: prefix the AI might add
    if (enhancedText.startsWith("PROMPT:")) {
      enhancedText = enhancedText.replace(/^PROMPT:\s*/i, "").trim();
    }
    
    // Remove any lyrics section the AI might have accidentally included
    if (enhancedText.includes("LYRICS:")) {
      enhancedText = enhancedText.split("LYRICS:")[0].trim();
    }

    // Never return enhanced lyrics - only enhance the prompt
    res.json({
      success: true,
      enhancedPrompt: enhancedText
      // Note: We intentionally do NOT return enhancedLyrics
    });

  } catch (error) {
    console.error("Prompt enhancement error:", error);
    res.status(500).json({ 
      error: "Failed to enhance prompt",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// Get guidelines for a specific model
router.get("/guidelines/:model", (req: Request, res: Response) => {
  const { model } = req.params;
  const guidelines = PROMPT_GUIDELINES[model] || PROMPT_GUIDELINES["default"];
  res.json({ model, guidelines });
});

// Model-specific lyrics structure tags
const LYRICS_STRUCTURE_GUIDELINES: Record<string, string> = {
  "minimax/music-1.5": `You are a lyrics structure assistant for MiniMax Music 1.5.
Your task is to add structural tags and vocal guidance to lyrics WITHOUT changing the actual lyrics content.

SUPPORTED TAGS for MiniMax Music 1.5:
- [Verse], [Verse 1], [Verse 2] - For verse sections
- [Chorus] - For chorus/hook sections  
- [Pre-Chorus] - Build-up before chorus
- [Bridge] - Contrasting section
- [Outro], [Intro] - Beginning/ending sections
- [Instrumental], [Interlude] - Music-only sections (no vocals)
- [Break] - Short pause or breakdown

VOCAL GUIDANCE (add in parentheses after section tag):
- (male vocal) or (female vocal) - Specify singer gender
- (duet) - Both voices together
- (spoken) - Spoken word, not sung
- (whisper) - Soft, whispered delivery
- (powerful) - Strong, belting vocals
- (falsetto) - High register
- (harmonies) - Background harmonies

Example format:
[Intro] (instrumental)

[Verse 1] (male vocal)
Original lyrics here unchanged
More lyrics here

[Pre-Chorus] (building)
Lyrics building up

[Chorus] (female vocal, powerful)
Chorus lyrics unchanged

[Instrumental]

[Bridge] (duet, harmonies)
Bridge lyrics

[Outro] (fade out)`,

  "minimax/music-01": `You are a lyrics structure assistant for MiniMax Music 01.
Your task is to add structural tags to lyrics WITHOUT changing the actual lyrics content.

SUPPORTED TAGS:
- [Verse], [Chorus], [Bridge], [Outro], [Intro]
- [Instrumental] - For music-only sections

VOCAL GUIDANCE:
- (male) or (female) - Voice type
- (soft) or (powerful) - Intensity
- (harmony) - For layered vocals`,

  "lucataco/ace-step": `You are a lyrics structure assistant for ACE-Step.
Your task is to add structural tags to lyrics WITHOUT changing the actual lyrics content.

SUPPORTED TAGS:
- [verse], [chorus], [bridge], [intro], [outro] (lowercase)
- [instrumental], [solo] - Non-vocal sections
- [break] - Rhythmic breaks

STYLE MARKERS (add on same line):
- <male> or <female> - Voice gender
- <rap> or <sing> - Delivery style
- <soft> <loud> - Dynamics
- <fast> <slow> - Tempo hints`,

  "google/lyria-2": `You are a lyrics structure assistant for Google Lyria 2.
Your task is to add structural tags to lyrics WITHOUT changing the actual lyrics content.

SUPPORTED TAGS:
- [Verse], [Chorus], [Bridge], [Hook]
- [Intro], [Outro]
- [Instrumental Break]

PERFORMANCE NOTES (in parentheses):
- (soulful), (ethereal), (powerful)
- (male voice), (female voice)
- (building intensity), (soft and intimate)`,

  "default": `You are a lyrics structure assistant.
Your task is to add structural tags to lyrics WITHOUT changing the actual lyrics content.

COMMON TAGS:
- [Verse 1], [Verse 2], etc.
- [Chorus]
- [Bridge]
- [Intro], [Outro]
- [Instrumental]

VOCAL NOTES (in parentheses):
- (male vocal), (female vocal)
- (spoken), (whispered)
- (harmonies)`
};

// Enhance lyrics structure endpoint (adds tags without changing lyrics)
router.post("/enhance-lyrics-structure", async (req: Request, res: Response) => {
  try {
    const { lyrics, model } = req.body;

    if (!lyrics) {
      return res.status(400).json({ error: "Lyrics are required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Get model-specific guidelines
    const guidelines = LYRICS_STRUCTURE_GUIDELINES[model] || LYRICS_STRUCTURE_GUIDELINES["default"];

    const systemPrompt = `You are a lyrics structure tagger. Your ONLY job is to insert structural tags.

${guidelines}

ABSOLUTE RULES - VIOLATION IS FORBIDDEN:
1. NEVER change ANY word in the lyrics - not even spelling or punctuation
2. NEVER rewrite, improve, shorten, or modify the lyrics content
3. NEVER remove any lines or words
4. NEVER add new lyrics or words that weren't there
5. ONLY INSERT these tags on NEW LINES before sections:
   - [Verse], [Verse 2], [Verse 3]
   - [Chorus]
   - [Pre-Chorus]
   - [Bridge]
   - [Outro], [Intro]
   - [Instrumental]
6. You may add vocal guidance ONLY at the END of lines in parentheses like (soft) or (powerful)
7. Return ONLY the tagged lyrics, no explanations or commentary
8. The original lyrics text must appear EXACTLY as given - character for character`;

    const userMessage = `Insert structure tags into these lyrics. DO NOT MODIFY THE LYRICS TEXT IN ANY WAY.

ORIGINAL LYRICS (preserve exactly):
---
${lyrics}
---

Return the exact same lyrics with [Verse], [Chorus], etc. tags inserted on new lines before each section. Do not change any words.`;

    const result = await geminiModel.generateContent([
      { text: systemPrompt },
      { text: userMessage }
    ]);

    const response = result.response;
    const structuredLyrics = response.text();

    res.json({
      success: true,
      structuredLyrics: structuredLyrics.trim()
    });

  } catch (error) {
    console.error("Lyrics structure enhancement error:", error);
    res.status(500).json({ 
      error: "Failed to add lyrics structure",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/prompt/enhance-pro - Professional enhancement with Suno meta tags
// This reads lyrics, understands context, and adds professional structure with optional repetition
router.post("/enhance-pro", async (req: Request, res: Response) => {
  try {
    const { 
      lyrics, 
      musicDescription, 
      instruments, 
      vocals, 
      enableRepetition = false,  // Toggle for repeating chorus/hooks
      model = "suno/v5"
    } = req.body;

    if (!lyrics) {
      return res.status(400).json({ error: "Lyrics are required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Build context from music description, instruments, and vocals
    let contextInfo = "";
    if (musicDescription) {
      contextInfo += `\nMusic Description: "${musicDescription}"`;
    }
    if (instruments) {
      contextInfo += `\nInstruments: ${instruments}`;
    }
    if (vocals) {
      contextInfo += `\nVocal Types: ${vocals}`;
    }

    const systemPrompt = `You are a professional music producer and lyrics structuring expert for Suno AI.
Your task is to analyze the lyrics deeply, understand their meaning and emotion, then add ONLY VALID Suno structure tags.

IMPORTANT: Suno will SING anything in brackets that it doesn't recognize as a valid tag!
ONLY use these EXACT tags - anything else will be sung as lyrics!

VALID SUNO STRUCTURE TAGS (on their own line, EXACTLY as shown):
- [Intro]
- [Verse] or [Verse 1], [Verse 2], [Verse 3]
- [Pre-Chorus]
- [Chorus]
- [Post-Chorus]
- [Bridge]
- [Outro]
- [Instrumental] or [Instrumental Break] or [Break]
- [Hook]
- [Refrain]
- [End]

VALID INLINE VOCAL GUIDANCE (at END of lyric lines, in parentheses):
- (whisper), (whispered), (whispering)
- (spoken), (spoken word)
- (soft), (softly)
- (powerful), (belting)
- (falsetto), (high falsetto)
- (raspy), (gritty)
- (breathy)
- (harmonies), (harmony)
- (ad-lib), (ad libs)
- (echo)
- (fade out)
- (x2), (x3) - for repeating lines

DO NOT USE these - they will be SUNG as lyrics:
- [Mood: X] - WRONG!
- [Energy: X] - WRONG!
- [Vocal Style: X] - WRONG!
- [Instrument: X] - WRONG!
- [Texture: X] - WRONG!
- Any descriptive tags in brackets - WRONG!

${enableRepetition ? `
REPETITION MODE ENABLED - INTELLIGENT HOOK SELECTION:
You must analyze the lyrics deeply to find the BEST phrases to repeat:

1. IDENTIFY MELODIC PHRASES - Look for:
   - Lines with strong rhythm and natural flow
   - Emotionally powerful statements
   - Short, memorable phrases (4-8 syllables work best)
   - Lines with rhyme or alliteration
   - The emotional climax or core message of the song

2. ANALYZE FOR HOOK POTENTIAL:
   - Which line would listeners remember and sing along to?
   - Which phrase captures the song's essence?
   - Which lines have natural musical cadence?

3. REPETITION RULES:
   - Repeat the [Chorus] section 2-3 times (after verses, before outro)
   - Add (x2) or (x3) ONLY to the most melodic, catchy lines within chorus
   - Create a hook by repeating the single most powerful phrase
   - DO NOT repeat random lines - only lines with high melodic/emotional value
   - The repeated sections should feel natural, like a real professional song

4. SONG STRUCTURE for longer songs:
   [Intro] → [Verse 1] → [Pre-Chorus] → [Chorus] → [Verse 2] → [Chorus] → [Bridge] → [Chorus] → [Outro]
` : `
REPETITION MODE DISABLED:
- Do NOT repeat any lyrics or sections
- Add structure tags only, no duplication
- Keep original lyrics exactly as written
`}

CRITICAL RULES:
1. ${enableRepetition ? "You may repeat chorus/hook sections for professional structure" : "NEVER change or repeat the original lyrics text"}
2. ONLY use valid structure tags: [Verse], [Chorus], [Bridge], [Intro], [Outro], [Pre-Chorus], [Hook], [Instrumental]
3. ONLY use valid inline vocal guidance in parentheses: (whisper), (soft), (powerful), (falsetto), (spoken), (x2), etc.
4. NEVER add [Mood: X], [Energy: X], [Vocal Style: X] or any descriptive bracket tags - they will be SUNG!
5. Keep lines 6-12 syllables for optimal vocal clarity
6. Return ONLY the enhanced lyrics with valid tags, no explanations
7. Preserve the original language and lyrics exactly - only add structure tags`;

    const userMessage = `Analyze and structure these lyrics professionally.
${contextInfo}

ORIGINAL LYRICS:
---
${lyrics}
---

Instructions:
1. First, deeply understand the lyrics' meaning, story, and emotional journey
2. Identify natural verse/chorus/bridge sections and add ONLY valid structure tags
3. DO NOT add [Mood], [Energy], [Vocal Style], [Instrument] tags - these will be sung as lyrics!
4. ${enableRepetition ? "Repeat the chorus 2-3 times for professional song structure" : "Do not repeat any sections"}
5. Add inline vocal guidance like (soft), (powerful), (whisper) at the END of lines where emotionally appropriate
6. Return the fully structured lyrics with ONLY valid Suno tags`;

    const result = await geminiModel.generateContent([
      { text: systemPrompt },
      { text: userMessage }
    ]);

    const response = result.response;
    let structuredLyrics = response.text().trim();
    
    // Clean up any markdown code blocks the AI might add
    structuredLyrics = structuredLyrics.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');

    // Now enhance the music description based on lyrics understanding
    let enhancedDescription = musicDescription || "";
    
    if (musicDescription || instruments || vocals) {
      const descriptionPrompt = `Based on these lyrics and their emotional content, enhance the music description prompt.

Lyrics context: "${lyrics.substring(0, 500)}..."
${contextInfo}

Create a concise, powerful music description that:
1. Captures the mood and emotion from the lyrics
2. Incorporates the specified instruments with their prominence levels
3. Includes the vocal types and their roles
4. Uses Suno-optimized keywords for best generation results
5. Keep it under 200 characters

Return ONLY the enhanced description, no explanations.`;

      const descResult = await geminiModel.generateContent(descriptionPrompt);
      enhancedDescription = descResult.response.text().trim();
      
      // Clean any quotes
      enhancedDescription = enhancedDescription.replace(/^["']|["']$/g, '');
    }

    res.json({
      success: true,
      structuredLyrics: structuredLyrics,
      enhancedDescription: enhancedDescription
    });

  } catch (error) {
    console.error("Pro enhancement error:", error);
    res.status(500).json({ 
      error: "Failed to enhance lyrics",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/prompt/add-diacritics - Add diacritical marks/vocalization to lyrics for better pronunciation
router.post("/add-diacritics", async (req: Request, res: Response) => {
  try {
    const { lyrics, languages, language } = req.body;

    if (!lyrics) {
      return res.status(400).json({ error: "Lyrics are required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Support both single language and array of languages
    let targetLanguages: string[] = [];
    
    if (languages && Array.isArray(languages) && languages.length > 0) {
      targetLanguages = languages;
    } else if (language) {
      targetLanguages = [language];
    } else {
      targetLanguages = ["auto"];
    }

    console.log(`[DIACRITICS] Target languages: ${targetLanguages.join(", ")}`);

    // Build language-specific instructions for each selected language
    const languageInstructions: string[] = [];
    
    // Check for each language type
    const hasPersian = targetLanguages.some(l => l.includes("persian") || l.includes("farsi") || l === "dari");
    const hasArabic = targetLanguages.some(l => l.includes("arabic"));
    const hasTurkish = targetLanguages.some(l => l.includes("turkish") || l.includes("azerbaijani"));
    const hasHebrew = targetLanguages.some(l => l.includes("hebrew"));
    const hasUrdu = targetLanguages.some(l => l.includes("urdu") || l.includes("pashto"));
    const hasHindi = targetLanguages.some(l => l.includes("hindi") || l.includes("punjabi") || l.includes("bengali") || l.includes("tamil"));
    const hasKurdish = targetLanguages.some(l => l.includes("kurdish"));
    
    if (hasPersian) {
      languageInstructions.push(`
PERSIAN/FARSI DIACRITICAL MARKS:
- زَبَر (zabar/fatha): َ  - for 'a' sound (مَن، دَر، بَر)
- زیر (zir/kasra): ِ  - for 'e/i' sound (دِل، کِه، مِن)
- پیش (pish/damma): ُ  - for 'o/u' sound (تُو، گُل، خُوب)
- سُکون (sokun): ْ  - no vowel after consonant
- تَشدید (tashdid): ّ  - doubled consonant
- کسره اضافه (ezafe): ِ  - connecting words (دل ِ من، شب ِ تاریک)

PERSIAN RULES:
- Mark ALL ambiguous vowels - Persian writing often omits vowels
- Common words: که→کِه, من→مَن, تو→تُو, از→اَز, در→دَر, بر→بَر, هر→هَر
- Add ezafe (ِ) between nouns and adjectives
- Add tashdid (ّ) on doubled letters`);
    }
    
    if (hasArabic) {
      languageInstructions.push(`
ARABIC DIACRITICAL MARKS (tashkeel):
- فَتْحَة (fatha): َ - short 'a'
- كَسْرَة (kasra): ِ - short 'i'
- ضَمَّة (damma): ُ - short 'u'
- سُكُون (sukun): ْ - no vowel
- شَدَّة (shadda): ّ - doubled consonant
- تَنْوِين (tanween): ً ٍ ٌ - nunation

ARABIC RULES:
- Add FULL tashkeel for clear pronunciation
- Mark every consonant with appropriate vowel`);
    }
    
    if (hasTurkish) {
      languageInstructions.push(`
TURKISH PRONUNCIATION:
- Mark soft g (ğ) with phonetic guide
- Add stress marks where important
- For words with special Turkish letters (ı, ö, ü, ş, ç, ğ), ensure correct rendering`);
    }
    
    if (hasHebrew) {
      languageInstructions.push(`
HEBREW NIKUD (vowel points):
- פַּתָּח (patach) - 'a' sound
- צֵירֵי (tsere) - 'e' sound
- חִירִיק (chirik) - 'i' sound
- חוֹלָם (cholam) - 'o' sound
- שׁוּרוּק (shuruk) - 'u' sound
- שְׁוָא (shva) - very short/silent`);
    }
    
    if (hasUrdu || hasKurdish) {
      languageInstructions.push(`
URDU/KURDISH MARKS:
- زَبر (zabar): َ - 'a' sound
- زیر (zer): ِ - 'i/e' sound
- پیش (pesh): ُ - 'u/o' sound
- جزم (jazm): ْ - no vowel
- تشدید (tashdeed): ّ - doubled`);
    }
    
    if (hasHindi) {
      languageInstructions.push(`
HINDI/DEVANAGARI MARKS:
- Add anusvara (ं) where needed
- Add chandrabindu (ँ) for nasalization
- Add halant (्) where appropriate
- Add visarga (ः) when needed`);
    }

    const systemPrompt = `You are a multilingual pronunciation expert specializing in adding diacritical marks for AI singing.
The lyrics contain text in these languages: ${targetLanguages.join(", ")}

Your task is to add ACCURATE diacritical marks so AI can pronounce EVERY word CORRECTLY.

${languageInstructions.join("\n")}

CRITICAL RULES:
1. Add marks to EVERY word that needs pronunciation guidance
2. Focus on ambiguous vowels and consonants
3. Do NOT change the words themselves - ONLY add marks
4. PRESERVE all structure tags [Verse], [Chorus], etc.
5. PRESERVE line breaks and formatting
6. Return ONLY the marked lyrics, no explanations`;

    const userMessage = `Add diacritical marks/vocalization to these multilingual lyrics for correct AI pronunciation.
Languages present: ${targetLanguages.join(", ")}

LYRICS:
---
${lyrics}
---

Return the lyrics with ALL diacritical marks added for proper pronunciation:`;

    const result = await geminiModel.generateContent([
      { text: systemPrompt },
      { text: userMessage }
    ]);

    let markedLyrics = result.response.text().trim();
    
    // Clean up any markdown
    markedLyrics = markedLyrics.replace(/^```[\w]*\n?/gm, '').replace(/\n?```$/gm, '');

    res.json({
      success: true,
      markedLyrics: markedLyrics,
      languages: targetLanguages
    });

  } catch (error) {
    console.error("Diacritics addition error:", error);
    res.status(500).json({ 
      error: "Failed to add diacritical marks",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
});

// POST /api/prompt/condense - Condense a prompt to fit within character limits
router.post("/condense", async (req: Request, res: Response) => {
  try {
    const { prompt, maxChars } = req.body;

    if (!prompt || !maxChars) {
      return res.status(400).json({ error: "prompt and maxChars are required" });
    }

    // If already within limit, return as-is
    if (prompt.length <= maxChars) {
      return res.json({ success: true, condensedPrompt: prompt });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Fallback to simple truncation
      return res.json({ 
        success: true, 
        condensedPrompt: prompt.substring(0, maxChars - 3) + "..." 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const systemPrompt = `You are a music prompt condenser. Your job is to shorten music generation prompts while preserving the essential meaning.

Rules:
1. Output MUST be ${maxChars} characters or less
2. Keep the most important musical elements: genre, mood, instruments, vocal style
3. Remove redundant words and filler
4. Use concise musical terminology
5. Preserve language/cultural style hints (e.g., "Persian", "Farsi", "Iranian")
6. Output ONLY the condensed prompt, nothing else`;

    const userMessage = `Condense this music prompt to ${maxChars} characters or less:

"${prompt}"

Return ONLY the condensed prompt.`;

    console.log(`[CONDENSE] Original: ${prompt.length} chars, target: ${maxChars} chars`);

    const result = await geminiModel.generateContent([
      { text: systemPrompt },
      { text: userMessage }
    ]);

    const response = result.response;
    let condensedPrompt = response.text().trim();
    
    // Remove quotes if AI added them
    condensedPrompt = condensedPrompt.replace(/^["']|["']$/g, '');
    
    // Safety check - if still too long, truncate
    if (condensedPrompt.length > maxChars) {
      condensedPrompt = condensedPrompt.substring(0, maxChars - 3) + "...";
    }

    console.log(`[CONDENSE] Result: ${condensedPrompt.length} chars`);

    res.json({
      success: true,
      condensedPrompt: condensedPrompt
    });

  } catch (error) {
    console.error("Prompt condensing error:", error);
    // Fallback to truncation
    const { prompt, maxChars } = req.body;
    res.json({ 
      success: true, 
      condensedPrompt: prompt?.substring(0, maxChars - 3) + "..." || ""
    });
  }
});

export default router;
