import express from "express";
import { 
  createUser, 
  findUserByEmail, 
  validatePassword,
  findUserById,
  getSubscriptions,
  updateUser,
  addTokensToUser,
  createTransaction,
  getUserTransactions,
} from "../database/db";
import { generateToken, authMiddleware, AuthRequest } from "../middleware/auth";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }
    
    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }
    
    const user = await createUser(email, password, name);
    const token = generateToken(user.id);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tokensBalance: user.tokensBalance,
        subscriptionId: user.subscriptionId,
      },
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }
    
    const user = await findUserByEmail(email);
    
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    
    if (!user.isActive) {
      res.status(401).json({ error: "Account is inactive" });
      return;
    }
    
    const isValid = await validatePassword(user, password);
    
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    
    const token = generateToken(user.id);
    
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tokensBalance: user.tokensBalance,
        tokensUsed: user.tokensUsed,
        subscriptionId: user.subscriptionId,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const user = req.user!;
  const subscriptions = await getSubscriptions();
  const currentSubscription = subscriptions.find(s => s.id === user.subscriptionId);
  
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tokensBalance: user.tokensBalance,
    tokensUsed: user.tokensUsed,
    subscriptionId: user.subscriptionId,
    subscription: currentSubscription,
    createdAt: user.createdAt,
  });
});

// Update profile
router.put("/profile", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { name } = req.body;
    const user = req.user!;
    
    const updated = await updateUser(user.id, { name });
    
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    
    res.json({
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      tokensBalance: updated.tokensBalance,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get available subscriptions
router.get("/subscriptions", async (_req, res) => {
  const subscriptions = await getSubscriptions();
  res.json(subscriptions.filter(s => s.isActive));
});

// Upgrade subscription
router.post("/subscription/upgrade", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { subscriptionId } = req.body;
    const user = req.user!;
    
    const subscriptions = await getSubscriptions();
    const newSubscription = subscriptions.find(s => s.id === subscriptionId);
    
    if (!newSubscription) {
      res.status(400).json({ error: "Invalid subscription" });
      return;
    }
    
    // Update user subscription
    await updateUser(user.id, { subscriptionId });
    
    // Add tokens for the new subscription
    await addTokensToUser(user.id, newSubscription.tokensPerMonth);
    
    // Record transaction
    await createTransaction(
      user.id,
      "subscription",
      newSubscription.price,
      newSubscription.tokensPerMonth,
      `Upgraded to ${newSubscription.name} plan`
    );
    
    res.json({ 
      success: true, 
      message: `Upgraded to ${newSubscription.name}`,
      tokensAdded: newSubscription.tokensPerMonth,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Purchase additional tokens
router.post("/tokens/purchase", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { amount } = req.body; // amount in tokens
    const user = req.user!;
    
    if (!amount || amount < 100) {
      res.status(400).json({ error: "Minimum purchase is 100 tokens" });
      return;
    }
    
    const price = (amount / 100) * 0.99; // $0.99 per 100 tokens
    
    // Add tokens to user
    await addTokensToUser(user.id, amount);
    
    // Record transaction
    await createTransaction(
      user.id,
      "token_purchase",
      price,
      amount,
      `Purchased ${amount} tokens`
    );
    
    const updatedUser = await findUserById(user.id);
    
    res.json({
      success: true,
      tokensAdded: amount,
      price,
      newBalance: updatedUser?.tokensBalance,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user transactions
router.get("/transactions", authMiddleware, async (req: AuthRequest, res) => {
  const transactions = await getUserTransactions(req.user!.id);
  res.json(transactions.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ));
});

export default router;
