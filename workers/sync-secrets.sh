#!/bin/bash
# Sync API keys from backend/.env to Cloudflare Workers secrets

ENV_FILE="../backend/.env"

if [ ! -f "$ENV_FILE" ]; then
    echo "Error: $ENV_FILE not found"
    exit 1
fi

echo "Syncing API keys to Cloudflare Workers..."
echo ""

# Read each API key from .env and add to Workers secrets
while IFS='=' read -r key value; do
    # Skip empty lines and comments
    [[ -z "$key" || "$key" == \#* ]] && continue
    
    # Only process API keys
    if [[ "$key" == *"_API_KEY"* || "$key" == *"_KEY"* ]]; then
        # Remove quotes from value
        value="${value%\"}"
        value="${value#\"}"
        value="${value%\'}"
        value="${value#\'}"
        
        if [ -n "$value" ]; then
            echo "Adding $key..."
            echo "$value" | npx wrangler secret put "$key" 2>/dev/null
        fi
    fi
done < "$ENV_FILE"

echo ""
echo "Done! Secrets synced to Cloudflare Workers."
echo "Deploy with: npx wrangler deploy"
