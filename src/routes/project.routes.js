const express = require('express');
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const { getProjects, getProjectById, reorderProjects, updateProject } = require('../controllers/project.controller');
const { createSubtask, updateSubtask, deleteSubtask, getSubtaskById } = require('../controllers/subtask.controller');

const router = express.Router();

// Projects
router.get('/', verifyToken, getProjects);
router.put('/reorder', verifyToken, checkRole(['Manager', 'Superadmin']), reorderProjects);
router.get('/:id', verifyToken, getProjectById);
router.put('/:id', verifyToken, checkRole(['Manager', 'Superadmin', 'Engineer']), updateProject);

// Subtasks (can be nested or separate, separate is easier for CRUD)
// POST /api/projects/subtask -> body { projectId, ... }
router.get('/subtasks/:id', verifyToken, getSubtaskById);
router.post('/subtasks', verifyToken, checkRole(['Manager', 'Superadmin', 'Engineer']), createSubtask);
router.put('/subtasks/:id', verifyToken, checkRole(['Manager', 'Superadmin', 'Engineer']), updateSubtask);
router.delete('/subtasks/:id', verifyToken, checkRole(['Manager', 'Superadmin']), deleteSubtask);

module.exports = router;
