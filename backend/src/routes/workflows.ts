import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { db, MusicWorkflow } from "../database/db";

const router = Router();

// Get all workflows
router.get("/", async (req: Request, res: Response) => {
  try {
    await db.read();
    const workflows = db.data?.musicWorkflows || [];
    
    // Sort by most recent first
    const sorted = [...workflows].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    res.json({
      success: true,
      workflows: sorted,
      count: sorted.length,
    });
  } catch (error: any) {
    console.error("[WORKFLOWS] List error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflow by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await db.read();
    const workflow = db.data?.musicWorkflows.find(w => w.id === id);
    
    if (!workflow) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }
    
    res.json({
      success: true,
      workflow,
    });
  } catch (error: any) {
    console.error("[WORKFLOWS] Get error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Create new workflow
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      description,
      category,
      modelId,
      modelType,
      prompt,
      lyrics,
      style,
      tags,
      negativePrompt,
      sunoTitle,
      sunoCustomMode,
      sunoInstrumental,
      duration,
      temperature,
      topK,
      topP,
      bpm,
      instruments,
      vocals,
      isPublic,
      userId,
    } = req.body;

    if (!name || !modelId) {
      return res.status(400).json({ 
        success: false, 
        error: "Name and modelId are required" 
      });
    }

    const now = new Date().toISOString();
    const workflow: MusicWorkflow = {
      id: uuidv4(),
      name,
      description: description || "",
      category: category || "custom",
      modelId,
      modelType: modelType || "vocal",
      prompt: prompt || "",
      lyrics: lyrics || "",
      style: style || "",
      tags: tags || "",
      negativePrompt: negativePrompt || "",
      sunoTitle: sunoTitle || "",
      sunoCustomMode: sunoCustomMode ?? true,
      sunoInstrumental: sunoInstrumental ?? false,
      duration: duration || 30,
      temperature: temperature || 1.0,
      topK: topK || 250,
      topP: topP || 0.95,
      bpm: bpm || 120,
      instruments: instruments || [],
      vocals: vocals || [],
      createdAt: now,
      updatedAt: now,
      isPublic: isPublic ?? false,
      userId: userId || null,
    };

    await db.read();
    if (!db.data) {
      return res.status(500).json({ success: false, error: "Database not initialized" });
    }
    
    db.data.musicWorkflows.push(workflow);
    await db.write();

    console.log(`[WORKFLOWS] Created: ${workflow.name} (${workflow.id})`);
    
    res.json({
      success: true,
      workflow,
      message: "Workflow saved successfully",
    });
  } catch (error: any) {
    console.error("[WORKFLOWS] Create error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Update workflow
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    await db.read();
    if (!db.data) {
      return res.status(500).json({ success: false, error: "Database not initialized" });
    }
    
    const index = db.data.musicWorkflows.findIndex(w => w.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }

    // Update workflow, preserving id and createdAt
    const existing = db.data.musicWorkflows[index];
    db.data.musicWorkflows[index] = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    await db.write();

    console.log(`[WORKFLOWS] Updated: ${db.data.musicWorkflows[index].name} (${id})`);
    
    res.json({
      success: true,
      workflow: db.data.musicWorkflows[index],
      message: "Workflow updated successfully",
    });
  } catch (error: any) {
    console.error("[WORKFLOWS] Update error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Delete workflow
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.read();
    if (!db.data) {
      return res.status(500).json({ success: false, error: "Database not initialized" });
    }
    
    const index = db.data.musicWorkflows.findIndex(w => w.id === id);
    if (index === -1) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }

    const deleted = db.data.musicWorkflows.splice(index, 1)[0];
    await db.write();

    console.log(`[WORKFLOWS] Deleted: ${deleted.name} (${id})`);
    
    res.json({
      success: true,
      message: "Workflow deleted successfully",
    });
  } catch (error: any) {
    console.error("[WORKFLOWS] Delete error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Duplicate workflow
router.post("/:id/duplicate", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    await db.read();
    if (!db.data) {
      return res.status(500).json({ success: false, error: "Database not initialized" });
    }
    
    const original = db.data.musicWorkflows.find(w => w.id === id);
    if (!original) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }

    const now = new Date().toISOString();
    const duplicated: MusicWorkflow = {
      ...original,
      id: uuidv4(),
      name: name || `${original.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };

    db.data.musicWorkflows.push(duplicated);
    await db.write();

    console.log(`[WORKFLOWS] Duplicated: ${duplicated.name} from ${original.name}`);
    
    res.json({
      success: true,
      workflow: duplicated,
      message: "Workflow duplicated successfully",
    });
  } catch (error: any) {
    console.error("[WORKFLOWS] Duplicate error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get workflows by category
router.get("/category/:category", async (req: Request, res: Response) => {
  try {
    const { category } = req.params;

    await db.read();
    const workflows = db.data?.musicWorkflows.filter(w => w.category === category) || [];
    
    res.json({
      success: true,
      workflows,
      count: workflows.length,
    });
  } catch (error: any) {
    console.error("[WORKFLOWS] Category list error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
