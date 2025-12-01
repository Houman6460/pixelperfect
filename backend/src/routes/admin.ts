import express from "express";
import { 
  getAllUsers,
  updateUser,
  getSubscriptions,
  getAllTransactions,
  getAnalytics,
  getSettings,
  updateSettings,
  getTokenRules,
  updateTokenRule,
  addTokensToUser,
  createTransaction,
  db,
} from "../database/db";
import { authMiddleware, adminMiddleware, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Apply auth and admin middleware to all routes
router.use(authMiddleware);
router.use(adminMiddleware);

// Get dashboard analytics
router.get("/analytics", async (_req, res) => {
  try {
    const analytics = await getAnalytics();
    res.json(analytics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users
router.get("/users", async (_req, res) => {
  try {
    const users = await getAllUsers();
    // Remove passwords from response
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user
router.put("/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow password updates through this endpoint
    delete updates.password;
    
    const user = await updateUser(id, updates);
    
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    const { password, ...safeUser } = user;
    res.json(safeUser);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Add tokens to user
router.post("/users/:id/tokens", async (req, res) => {
  try {
    const { id } = req.params;
    const { tokens, reason } = req.body;
    
    if (!tokens || tokens <= 0) {
      res.status(400).json({ error: "Invalid token amount" });
      return;
    }
    
    await addTokensToUser(id, tokens);
    await createTransaction(id, "token_purchase", 0, tokens, reason || "Admin granted tokens");
    
    res.json({ success: true, tokensAdded: tokens });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle user status
router.post("/users/:id/toggle-status", async (req, res) => {
  try {
    const { id } = req.params;
    await db.read();
    const user = db.data!.users.find(u => u.id === id);
    
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    const updated = await updateUser(id, { isActive: !user.isActive });
    res.json({ success: true, isActive: updated?.isActive });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all subscriptions
router.get("/subscriptions", async (_req, res) => {
  try {
    const subscriptions = await getSubscriptions();
    res.json(subscriptions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update subscription
router.put("/subscriptions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    await db.read();
    const index = db.data!.subscriptions.findIndex(s => s.id === id);
    
    if (index === -1) {
      res.status(404).json({ error: "Subscription not found" });
      return;
    }
    
    db.data!.subscriptions[index] = { ...db.data!.subscriptions[index], ...updates };
    await db.write();
    
    res.json(db.data!.subscriptions[index]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get all transactions
router.get("/transactions", async (_req, res) => {
  try {
    const transactions = await getAllTransactions();
    res.json(transactions.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get settings
router.get("/settings", async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update settings
router.put("/settings", async (req, res) => {
  try {
    const settings = await updateSettings(req.body);
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get token rules
router.get("/token-rules", async (_req, res) => {
  try {
    const rules = await getTokenRules();
    res.json(rules);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update token rule
router.put("/token-rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await updateTokenRule(id, req.body);
    
    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }
    
    res.json(rule);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// AI SETTINGS ENDPOINTS
// ==========================================
import { 
  getSettings as getAISettings, 
  saveSettings as saveAISettings, 
  getApiKeys,
  AdminSettings,
  getModelApiSettings,
  saveModelApiSettings,
  toggleModelApi,
  ModelApiSettings,
} from "../services/adminSettings";

// Get AI settings
router.get("/ai-settings", async (_req, res) => {
  try {
    const settings = getAISettings();
    const apiKeys = getApiKeys();
    res.json({ settings, apiKeys });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update AI settings
router.put("/ai-settings", async (req, res) => {
  try {
    const updates: Partial<AdminSettings> = req.body;
    const settings = saveAISettings(updates);
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// MODEL API PROVIDER SETTINGS (Per-Model Toggle)
// ==========================================

// Get all model API settings
router.get("/model-api-settings", async (_req, res) => {
  try {
    const settings = getModelApiSettings();
    const apiKeys = getApiKeys();
    res.json({ settings, apiKeys });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update model API settings (batch update)
router.put("/model-api-settings", async (req, res) => {
  try {
    const updates: { modelId: string; useDirectApi: boolean }[] = req.body.updates;
    if (!Array.isArray(updates)) {
      res.status(400).json({ error: "Updates must be an array" });
      return;
    }
    const settings = saveModelApiSettings(updates);
    res.json({ success: true, settings });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Toggle a single model's API provider
router.post("/model-api-settings/:modelId/toggle", async (req, res) => {
  try {
    const { modelId } = req.params;
    const model = toggleModelApi(modelId);
    if (!model) {
      res.status(404).json({ error: "Model not found" });
      return;
    }
    res.json({ success: true, model });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get models by category
router.get("/model-api-settings/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const settings = getModelApiSettings();
    const filtered = settings.models.filter(m => m.category === category);
    res.json({ models: filtered });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
