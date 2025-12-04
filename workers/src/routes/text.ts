import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

type Variables = {
  user: User;
  userId: string;
};

export const textRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// LLM Model configurations with token costs
const LLM_MODELS: Record<string, { 
  tokenCost: number; 
  provider: string;
  apiType: 'openai' | 'anthropic' | 'google' | 'replicate';
}> = {
  // OpenAI
  'gpt-4o': { tokenCost: 8, provider: 'openai', apiType: 'openai' },
  'gpt-4o-mini': { tokenCost: 2, provider: 'openai', apiType: 'openai' },
  'o1-preview': { tokenCost: 15, provider: 'openai', apiType: 'openai' },
  'o1-mini': { tokenCost: 6, provider: 'openai', apiType: 'openai' },
  // Anthropic
  'claude-3-5-sonnet-20241022': { tokenCost: 6, provider: 'anthropic', apiType: 'anthropic' },
  'claude-3-5-haiku-20241022': { tokenCost: 2, provider: 'anthropic', apiType: 'anthropic' },
  'claude-3-opus-20240229': { tokenCost: 12, provider: 'anthropic', apiType: 'anthropic' },
  // Google
  'gemini-2.0-flash': { tokenCost: 4, provider: 'google', apiType: 'google' },
  'gemini-1.5-pro': { tokenCost: 8, provider: 'google', apiType: 'google' },
  'gemini-1.5-flash': { tokenCost: 2, provider: 'google', apiType: 'google' },
  // Meta/Llama (via Replicate)
  'meta/llama-3.3-70b-instruct': { tokenCost: 4, provider: 'meta', apiType: 'replicate' },
  'meta/llama-3.2-90b-vision-instruct': { tokenCost: 5, provider: 'meta', apiType: 'replicate' },
  'meta/llama-3.1-405b-instruct': { tokenCost: 10, provider: 'meta', apiType: 'replicate' },
  // Mistral
  'mistralai/mistral-large-latest': { tokenCost: 5, provider: 'mistral', apiType: 'replicate' },
  'mistralai/mixtral-8x22b-instruct': { tokenCost: 4, provider: 'mistral', apiType: 'replicate' },
  // DeepSeek
  'deepseek-ai/deepseek-v3': { tokenCost: 3, provider: 'deepseek', apiType: 'replicate' },
  // Qwen
  'qwen/qwen-2.5-72b-instruct': { tokenCost: 3, provider: 'alibaba', apiType: 'replicate' },
};

// Helper: Get token cost
function getTokenCost(model: string): number {
  return LLM_MODELS[model]?.tokenCost || 5;
}

// Helper: Deduct tokens
async function deductTokens(db: D1Database, userId: string, amount: number, operation: string) {
  await db.prepare(
    'UPDATE users SET tokens = tokens - ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(amount, userId).run();
  
  await db.prepare(`
    INSERT INTO token_usage_log (id, user_id, operation, tokens_used, created_at)
    VALUES (?, ?, ?, ?, datetime('now'))
  `).bind(`log_${nanoid(16)}`, userId, operation, amount).run();
}

// Generate text with LLM
textRoutes.post('/generate', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { model, apiType, messages, temperature = 0.7, maxTokens = 2048 } = await c.req.json();
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return c.json({ success: false, error: 'Messages are required' }, 400);
    }
    
    const tokenCost = getTokenCost(model);
    if (user.tokens < tokenCost) {
      return c.json({ 
        success: false, 
        error: 'Insufficient tokens',
        tokensRequired: tokenCost,
        tokensAvailable: user.tokens 
      }, 402);
    }
    
    let response: Response;
    let content: string = '';
    
    // Route to appropriate API
    if (apiType === 'openai' && c.env.OPENAI_API_KEY) {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature,
          max_tokens: maxTokens,
        }),
      });
      
      if (response.ok) {
        const data = await response.json() as { choices: Array<{ message: { content: string } }> };
        content = data.choices?.[0]?.message?.content || '';
      }
    } else if (apiType === 'anthropic' && c.env.ANTHROPIC_API_KEY) {
      // Filter system message for Anthropic
      const systemMessage = messages.find((m: { role: string }) => m.role === 'system');
      const userMessages = messages.filter((m: { role: string }) => m.role !== 'system');
      
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': c.env.ANTHROPIC_API_KEY,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: model,
          system: systemMessage?.content || '',
          messages: userMessages,
          max_tokens: maxTokens,
          temperature,
        }),
      });
      
      if (response.ok) {
        const data = await response.json() as { content: Array<{ text: string }> };
        content = data.content?.[0]?.text || '';
      }
    } else if (apiType === 'google' && c.env.GOOGLE_API_KEY) {
      // Convert messages to Gemini format
      const contents = messages
        .filter((m: { role: string }) => m.role !== 'system')
        .map((m: { role: string; content: string }) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));
      
      const systemInstruction = messages.find((m: { role: string }) => m.role === 'system');
      
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${c.env.GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents,
            systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction.content }] } : undefined,
            generationConfig: {
              temperature,
              maxOutputTokens: maxTokens,
            },
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
        content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
    } else if (apiType === 'replicate' && c.env.REPLICATE_API_KEY) {
      // Use Replicate for open-source models
      const prompt = messages.map((m: { role: string; content: string }) => 
        m.role === 'system' ? `System: ${m.content}` :
        m.role === 'user' ? `User: ${m.content}` :
        `Assistant: ${m.content}`
      ).join('\n\n');
      
      response = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.REPLICATE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: model,
          input: {
            prompt: prompt + '\n\nAssistant:',
            temperature,
            max_tokens: maxTokens,
          },
        }),
      });
      
      if (response.ok) {
        const prediction = await response.json() as { id: string; urls: { get: string } };
        
        // Poll for result
        for (let i = 0; i < 60; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const statusResponse = await fetch(prediction.urls.get, {
            headers: { 'Authorization': `Bearer ${c.env.REPLICATE_API_KEY}` },
          });
          const result = await statusResponse.json() as { status: string; output?: string | string[] };
          
          if (result.status === 'succeeded' && result.output) {
            content = Array.isArray(result.output) ? result.output.join('') : result.output;
            break;
          }
          if (result.status === 'failed') break;
        }
      }
    } else {
      return c.json({ 
        success: false, 
        error: `API key not configured for ${apiType}` 
      }, 500);
    }
    
    if (!content) {
      return c.json({ success: false, error: 'Failed to generate text' }, 500);
    }
    
    await deductTokens(c.env.DB, user.id, tokenCost, `text_${apiType}`);
    
    return c.json({
      success: true,
      content,
      model,
      tokensUsed: tokenCost,
      tokensRemaining: user.tokens - tokenCost,
    });
  } catch (error) {
    console.error('Text generation error:', error);
    return c.json({ success: false, error: 'Failed to generate text' }, 500);
  }
});

// Get available models
textRoutes.get('/models', async (c) => {
  const models = Object.entries(LLM_MODELS).map(([id, config]) => ({
    id,
    ...config,
  }));
  return c.json({ success: true, models });
});

// Save conversation
textRoutes.post('/conversations', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { title, messages, model, persona } = await c.req.json();
    
    const conversationId = `conv_${nanoid(16)}`;
    
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, model, created_at)
      VALUES (?, ?, 'conversation', 'completed', ?, ?, datetime('now'))
    `).bind(conversationId, user.id, JSON.stringify({ title, messages, persona }), model).run();
    
    return c.json({ success: true, conversationId });
  } catch (error) {
    console.error('Save conversation error:', error);
    return c.json({ success: false, error: 'Failed to save conversation' }, 500);
  }
});

// Get conversations
textRoutes.get('/conversations', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    const conversations = await c.env.DB.prepare(`
      SELECT * FROM generation_jobs 
      WHERE user_id = ? AND type = 'conversation'
      ORDER BY created_at DESC
      LIMIT 50
    `).bind(user.id).all();
    
    return c.json({ 
      success: true, 
      conversations: conversations.results?.map(conv => ({
        id: conv.id,
        model: conv.model,
        createdAt: conv.created_at,
        ...(conv.input_data ? JSON.parse(conv.input_data as string) : {}),
      })) || [],
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return c.json({ success: false, error: 'Failed to get conversations' }, 500);
  }
});
