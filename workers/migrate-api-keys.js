#!/usr/bin/env node
/**
 * Migrate API keys from backend/.env to Cloudflare KV via the admin API
 * Run: node migrate-api-keys.js
 */

const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '../backend/.env');
const API_BASE = 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';

// Map .env key names to our provider IDs
const KEY_MAP = {
  'OPENAI_API_KEY': 'openai',
  'ANTHROPIC_API_KEY': 'anthropic',
  'GOOGLE_API_KEY': 'google',
  'GEMINI_API_KEY': 'google', // Same as Google
  'STABILITY_API_KEY': 'stability',
  'REPLICATE_API_KEY': 'replicate',
  'SUNO_API_KEY': 'suno',
  'KLING_API_KEY': 'kling',
  'MESHY_API_KEY': 'meshy',
  'ELEVENLABS_API_KEY': 'elevenlabs',
  'RUNWAY_API_KEY': 'runway',
  'LUMA_API_KEY': 'luma',
  'MIDJOURNEY_API_KEY': 'midjourney',
  'MISTRAL_API_KEY': 'mistral',
  'DEEPSEEK_API_KEY': 'deepseek',
  'BFL_API_KEY': 'bfl',
  'IDEOGRAM_API_KEY': 'ideogram',
  'MINIMAX_API_KEY': 'minimax',
  'PIXVERSE_API_KEY': 'pixverse',
  'UDIO_API_KEY': 'udio',
};

async function migrateKeys() {
  // Read .env file
  if (!fs.existsSync(ENV_FILE)) {
    console.error('Error: backend/.env not found');
    process.exit(1);
  }

  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  const lines = envContent.split('\n');
  
  console.log('Migrating API keys to Cloudflare KV...\n');
  
  // You need to be logged in as admin to use this
  // Get your auth token from localStorage after logging in
  const AUTH_TOKEN = process.env.AUTH_TOKEN;
  
  if (!AUTH_TOKEN) {
    console.log('To migrate, you need an admin auth token.');
    console.log('1. Log in to the admin panel');
    console.log('2. Open browser DevTools > Application > Local Storage');
    console.log('3. Copy the "token" value');
    console.log('4. Run: AUTH_TOKEN="your-token" node migrate-api-keys.js\n');
    
    // For now, just print what would be migrated
    console.log('Keys found in .env:');
    for (const line of lines) {
      if (line.includes('_API_KEY') || line.includes('_KEY=')) {
        const [key] = line.split('=');
        const provider = KEY_MAP[key];
        if (provider) {
          console.log(`  - ${key} -> ${provider}`);
        }
      }
    }
    return;
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    
    const key = trimmed.substring(0, eqIndex);
    let value = trimmed.substring(eqIndex + 1);
    
    // Remove quotes
    value = value.replace(/^["']|["']$/g, '');
    
    const provider = KEY_MAP[key];
    if (!provider || !value) continue;
    
    try {
      const response = await fetch(`${API_BASE}/admin/api-keys/${provider}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AUTH_TOKEN}`,
        },
        body: JSON.stringify({ apiKey: value, isBackup: false }),
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`✓ ${key} -> ${provider}`);
      } else {
        console.log(`✗ ${key}: ${result.error}`);
      }
    } catch (err) {
      console.log(`✗ ${key}: ${err.message}`);
    }
  }
  
  console.log('\nDone! Refresh the Model API Settings page to see your keys.');
}

migrateKeys();
