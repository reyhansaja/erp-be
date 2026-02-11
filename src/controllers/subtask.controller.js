const prisma = require('../utils/prisma');

// Add Subtask
const createSubtask = async (req, res) => {
    try {
        const { projectId, name, deadline, description, link } = req.body;

        // Check if project exists
        const project = await prisma.project.findUnique({ where: { id: parseInt(projectId) } });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        if (project.is_done) {
            return res.status(400).json({ message: 'Cannot add task to a completed project' });
        }

        const subtask = await prisma.subtask.create({
            data: {
                projectId: parseInt(projectId),
                name,
                deadline: new Date(deadline), // Ensure ISO string from frontend
                description,
                link,
                createdById: req.userId,
            },
        });

        // Update project done status (re-evaluate)
        await evaluateProjectStatus(parseInt(projectId));

        res.status(201).json(subtask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating subtask' });
    }
};

// Update Subtask (Progress, etc)
const updateSubtask = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, deadline, progress, description, documents, link } = req.body;

        const subtask = await prisma.subtask.findUnique({ where: { id: parseInt(id) } });
        if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

        const updatedSubtask = await prisma.subtask.update({
            where: { id: parseInt(id) },
            data: {
                name,
                deadline: deadline ? new Date(deadline) : undefined,
                progress: progress !== undefined ? parseInt(progress) : undefined,
                description,
                link,
                documents,
            },
        });

        // Evaluate Project Status
        await evaluateProjectStatus(subtask.projectId);

        res.json(updatedSubtask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating subtask' });
    }
};

// Delete Subtask
const deleteSubtask = async (req, res) => {
    try {
        const { id } = req.params;
        const subtask = await prisma.subtask.findUnique({ where: { id: parseInt(id) } });
        if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

        await prisma.subtask.delete({ where: { id: parseInt(id) } });

        // Evaluate Project Status
        await evaluateProjectStatus(subtask.projectId);

        res.json({ message: 'Subtask deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting subtask' });
    }
};

// Helper: Check if all tasks are done -> Project Done
const evaluateProjectStatus = async (projectId) => {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { subtasks: true },
    });

    if (!project) return;

    if (project.subtasks.length === 0) {
        // No tasks = Not done? Or Done? Assume not done until tasks added and completed. 
        // Or if manual completion is needed.
        // User said: "saat main task di 100% kan progressnya maka main task dan subtasknya dipindah ke project done"
        // I will auto-set to true if progress is 100%.
        return;
    }

    const totalProgress = project.subtasks.reduce((sum, t) => sum + t.progress, 0);
    const avgProgress = Math.round(totalProgress / project.subtasks.length);

    const isDone = avgProgress === 100;

    if (project.is_done !== isDone) {
        await prisma.project.update({
            where: { id: projectId },
            data: { is_done: isDone },
        });
    }
};

module.exports = { createSubtask, updateSubtask, deleteSubtask };
