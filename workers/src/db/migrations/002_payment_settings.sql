-- Payment Settings Migration
-- Migration: 002_payment_settings

-- Payment methods configuration table
CREATE TABLE IF NOT EXISTS payment_methods (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- Icon name for frontend
  is_enabled INTEGER DEFAULT 1,
  requires_setup INTEGER DEFAULT 0,
  setup_status TEXT DEFAULT 'not_configured' CHECK (setup_status IN ('not_configured', 'configured', 'error')),
  supported_currencies TEXT, -- JSON array of currency codes
  min_amount REAL DEFAULT 0,
  max_amount REAL,
  processing_fee_percent REAL DEFAULT 0,
  processing_fee_fixed REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Token packages table (configurable by admin)
CREATE TABLE IF NOT EXISTS token_packages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  tokens INTEGER NOT NULL,
  price REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  is_popular INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Payment logs table for tracking
CREATE TABLE IF NOT EXISTS payment_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  payment_method TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL CHECK (status IN ('initiated', 'pending', 'completed', 'failed', 'refunded', 'cancelled')),
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  metadata TEXT, -- JSON additional data
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  completed_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_logs_user_id ON payment_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_status ON payment_logs(status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_created_at ON payment_logs(created_at);

-- Insert default payment methods
INSERT OR IGNORE INTO payment_methods (id, name, display_name, description, icon, is_enabled, supported_currencies, sort_order) VALUES
  ('pm_card', 'card', 'Credit/Debit Card', 'Pay with Visa, Mastercard, American Express, or other cards', 'credit-card', 1, '["USD","EUR","GBP","SEK"]', 1),
  ('pm_klarna', 'klarna', 'Klarna', 'Buy now, pay later with Klarna', 'shopping-bag', 1, '["USD","EUR","GBP","SEK"]', 2),
  ('pm_swish', 'swish', 'Swish', 'Pay instantly with Swish (Sweden only)', 'smartphone', 1, '["SEK"]', 3),
  ('pm_paypal', 'paypal', 'PayPal', 'Pay with your PayPal account', 'wallet', 0, '["USD","EUR","GBP"]', 4),
  ('pm_apple_pay', 'apple_pay', 'Apple Pay', 'Pay with Apple Pay', 'apple', 0, '["USD","EUR","GBP","SEK"]', 5),
  ('pm_google_pay', 'google_pay', 'Google Pay', 'Pay with Google Pay', 'smartphone', 0, '["USD","EUR","GBP","SEK"]', 6);

-- Insert default token packages
INSERT OR IGNORE INTO token_packages (id, name, tokens, price, currency, is_popular, is_active, sort_order) VALUES
  ('pkg_100', '100 Tokens', 100, 4.99, 'USD', 0, 1, 1),
  ('pkg_500', '500 Tokens', 500, 19.99, 'USD', 1, 1, 2),
  ('pkg_1000', '1000 Tokens', 1000, 34.99, 'USD', 0, 1, 3),
  ('pkg_5000', '5000 Tokens', 5000, 149.99, 'USD', 0, 1, 4);

-- Insert payment-related admin settings
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES
  ('stripe_enabled', 'true', 'Enable Stripe payment processing'),
  ('default_currency', 'USD', 'Default currency for payments'),
  ('min_token_purchase', '100', 'Minimum tokens per purchase'),
  ('max_token_purchase', '50000', 'Maximum tokens per purchase');
