-- Auto-Refill Settings Migration
-- Migration: 005_auto_refill
-- Adds user preferences for automatic token refill

-- User auto-refill settings
CREATE TABLE IF NOT EXISTS user_auto_refill (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  enabled INTEGER DEFAULT 0,
  threshold INTEGER DEFAULT 10, -- Refill when balance drops below this
  refill_amount INTEGER DEFAULT 100, -- How many tokens to purchase
  package_id TEXT, -- Token package to auto-purchase
  payment_method TEXT DEFAULT 'card', -- card, paypal, etc.
  stripe_payment_method_id TEXT, -- Saved payment method for auto-charge
  max_refills_per_month INTEGER DEFAULT 5, -- Limit auto-refills
  refills_this_month INTEGER DEFAULT 0,
  last_refill_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_auto_refill_user_id ON user_auto_refill(user_id);

-- Auto-refill history log
CREATE TABLE IF NOT EXISTS auto_refill_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tokens_before INTEGER NOT NULL,
  tokens_after INTEGER NOT NULL,
  tokens_purchased INTEGER NOT NULL,
  amount_charged REAL NOT NULL,
  payment_method TEXT NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_auto_refill_log_user_id ON auto_refill_log(user_id);

-- Add low_balance_warning to user preferences (use admin_settings for now)
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES
  ('low_balance_warning_threshold', '10', 'Show warning when user tokens below this');
