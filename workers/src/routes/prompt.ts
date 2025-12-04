import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

type Variables = {
  user: User;
  userId: string;
};

export const promptRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Enhance a prompt using AI
promptRoutes.post('/enhance', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { prompt, model = 'gemini', type = 'image' } = await c.req.json();
    
    if (!prompt) {
      return c.json({ success: false, error: 'Prompt is required' }, 400);
    }
    
    // Check token balance (prompt enhancement costs 1 token)
    const tokenCost = 1;
    if (user.tokens < tokenCost) {
      return c.json({ 
        success: false, 
        error: 'Insufficient tokens',
        tokensRequired: tokenCost,
        tokensAvailable: user.tokens 
      }, 402);
    }
    
    // Check if OPENAI_API_KEY is configured (use GPT for prompt enhancement)
    if (!c.env.OPENAI_API_KEY) {
      // Return the original prompt if no API key
      return c.json({ 
        success: true, 
        enhancedPrompt: prompt,
        originalPrompt: prompt,
        message: 'AI prompt enhancement not configured, returning original prompt'
      });
    }
    
    // System prompt for enhancement
    const systemPrompt = type === 'image' 
      ? `You are an expert at writing prompts for AI image generation. Enhance the user's prompt to be more detailed, descriptive, and effective for generating high-quality images. Include details about:
- Composition and framing
- Lighting and atmosphere
- Style and artistic direction
- Colors and textures
- Quality modifiers (high resolution, detailed, professional)

Keep the enhanced prompt concise but comprehensive. Respond with ONLY the enhanced prompt, no explanations.`
      : `You are an expert at writing AI prompts. Enhance the user's prompt to be more detailed and effective. Respond with ONLY the enhanced prompt, no explanations.`;
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      // Return original prompt on error
      return c.json({ 
        success: true, 
        enhancedPrompt: prompt,
        originalPrompt: prompt,
        message: 'Enhancement failed, returning original prompt'
      });
    }
    
    const result = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    
    const enhancedPrompt = result.choices[0]?.message?.content?.trim() || prompt;
    
    // Deduct tokens
    await c.env.DB.prepare(
      'UPDATE users SET tokens = tokens - ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(tokenCost, user.id).run();
    
    return c.json({
      success: true,
      enhancedPrompt,
      originalPrompt: prompt,
      tokensUsed: tokenCost,
      tokensRemaining: user.tokens - tokenCost,
    });
  } catch (error) {
    console.error('Prompt enhancement error:', error);
    return c.json({ success: false, error: 'Failed to enhance prompt' }, 500);
  }
});

// Suggest prompts based on category
promptRoutes.get('/suggestions', async (c) => {
  const category = c.req.query('category') || 'general';
  
  const suggestions: Record<string, string[]> = {
    general: [
      'A majestic mountain landscape at sunset with vibrant colors',
      'A futuristic city skyline with flying cars and neon lights',
      'A cozy coffee shop interior with warm lighting',
      'An enchanted forest with magical creatures',
    ],
    portrait: [
      'A professional headshot with studio lighting',
      'A candid portrait with natural bokeh background',
      'An artistic portrait with dramatic lighting',
      'A vintage-style portrait with soft focus',
    ],
    landscape: [
      'A serene beach at golden hour with gentle waves',
      'A misty mountain valley in early morning',
      'A colorful autumn forest path',
      'A dramatic desert landscape under stormy skies',
    ],
    artistic: [
      'Abstract geometric patterns in vibrant colors',
      'Surrealist scene inspired by Salvador Dali',
      'Impressionist style garden with flowers',
      'Pop art style portrait with bold colors',
    ],
    product: [
      'Professional product photography on white background',
      'Lifestyle product shot with contextual props',
      'Minimalist product showcase with soft shadows',
      'Creative product flat lay composition',
    ],
  };
  
  return c.json({
    success: true,
    category,
    suggestions: suggestions[category] || suggestions.general,
  });
});
