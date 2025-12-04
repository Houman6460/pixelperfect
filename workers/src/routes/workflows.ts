import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

export const workflowRoutes = new Hono<{ Bindings: Env }>();

// Get user's workflows
workflowRoutes.get('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    const workflows = await c.env.DB.prepare(
      'SELECT * FROM music_workflows WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(user.id).all();
    
    return c.json({
      success: true,
      workflows: workflows.results || [],
    });
  } catch (error) {
    console.error('Get workflows error:', error);
    return c.json({ success: false, error: 'Failed to get workflows' }, 500);
  }
});

// Get single workflow
workflowRoutes.get('/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const workflowId = c.req.param('id');
    
    const workflow = await c.env.DB.prepare(
      'SELECT * FROM music_workflows WHERE id = ? AND user_id = ?'
    ).bind(workflowId, user.id).first();
    
    if (!workflow) {
      return c.json({ success: false, error: 'Workflow not found' }, 404);
    }
    
    return c.json({
      success: true,
      workflow,
    });
  } catch (error) {
    console.error('Get workflow error:', error);
    return c.json({ success: false, error: 'Failed to get workflow' }, 500);
  }
});

// Create workflow
workflowRoutes.post('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { name, description, workflow_data } = await c.req.json();
    
    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }
    
    const workflowId = `wf_${nanoid(16)}`;
    
    await c.env.DB.prepare(`
      INSERT INTO music_workflows (id, user_id, name, description, workflow_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(workflowId, user.id, name, description || '', JSON.stringify(workflow_data || {})).run();
    
    return c.json({
      success: true,
      workflow: {
        id: workflowId,
        name,
        description: description || '',
        workflow_data: workflow_data || {},
      },
    });
  } catch (error) {
    console.error('Create workflow error:', error);
    return c.json({ success: false, error: 'Failed to create workflow' }, 500);
  }
});

// Update workflow
workflowRoutes.put('/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const workflowId = c.req.param('id');
    const { name, description, workflow_data } = await c.req.json();
    
    const existing = await c.env.DB.prepare(
      'SELECT * FROM music_workflows WHERE id = ? AND user_id = ?'
    ).bind(workflowId, user.id).first();
    
    if (!existing) {
      return c.json({ success: false, error: 'Workflow not found' }, 404);
    }
    
    await c.env.DB.prepare(`
      UPDATE music_workflows 
      SET name = ?, description = ?, workflow_data = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(name, description || '', JSON.stringify(workflow_data || {}), workflowId, user.id).run();
    
    return c.json({
      success: true,
      workflow: {
        id: workflowId,
        name,
        description: description || '',
        workflow_data: workflow_data || {},
      },
    });
  } catch (error) {
    console.error('Update workflow error:', error);
    return c.json({ success: false, error: 'Failed to update workflow' }, 500);
  }
});

// Delete workflow
workflowRoutes.delete('/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const workflowId = c.req.param('id');
    
    const existing = await c.env.DB.prepare(
      'SELECT * FROM music_workflows WHERE id = ? AND user_id = ?'
    ).bind(workflowId, user.id).first();
    
    if (!existing) {
      return c.json({ success: false, error: 'Workflow not found' }, 404);
    }
    
    await c.env.DB.prepare('DELETE FROM music_workflows WHERE id = ?').bind(workflowId).run();
    
    return c.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  } catch (error) {
    console.error('Delete workflow error:', error);
    return c.json({ success: false, error: 'Failed to delete workflow' }, 500);
  }
});
