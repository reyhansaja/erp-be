const prisma = require('../utils/prisma');

// Add Subtask
const createSubtask = async (req, res) => {
    try {
        const { projectId, prospectId, name, deadline, description, link } = req.body;

        if (!projectId && !prospectId) {
            return res.status(400).json({ message: 'projectId or prospectId is required' });
        }

        let data = {
            createdBy: { connect: { id: req.userId } },
            name,
            deadline: new Date(deadline), // Ensure ISO string from frontend
            description,
            link,
        };

        if (projectId) {
            const project = await prisma.project.findUnique({ where: { id: parseInt(projectId) } });
            if (!project) return res.status(404).json({ message: 'Project not found' });
            if (project.is_done) {
                return res.status(400).json({ message: 'Cannot add task to a completed project' });
            }
            data.project = { connect: { id: project.id } };
            data.prospect = { connect: { no_project: project.prospectId } };
        } else {
            const prospect = await prisma.prospect.findUnique({ where: { no_project: prospectId } });
            if (!prospect) return res.status(404).json({ message: 'Prospect not found' });
            data.prospect = { connect: { no_project: prospectId } };

            const project = await prisma.project.findUnique({ where: { prospectId } });
            if (project) {
                if (project.is_done) {
                    return res.status(400).json({ message: 'Cannot add task to a completed project' });
                }
                data.project = { connect: { id: project.id } };
            }
        }

        const subtask = await prisma.subtask.create({ data });

        res.status(201).json(subtask);
    } catch (error) {
        console.error('Error creating subtask:', error);
        res.status(500).json({ message: 'Error creating subtask: ' + String(error.message || error) });
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

        res.json({ message: 'Subtask deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting subtask' });
    }
};

// Helper: Check if all tasks are done -> Project Done
const evaluateProjectStatus = async (projectId) => {
    // This function can still be used to trigger other side effects or 
    // re-calculate read-only stats if necessary.
    // However, as per new requirement, project.is_done is now MANUAL.
    return;
};

// Get Subtask by ID
const getSubtaskById = async (req, res) => {
    try {
        const { id } = req.params;
        const subtask = await prisma.subtask.findUnique({
            where: { id: parseInt(id) },
            include: {
                createdBy: {
                    select: {
                        id: true,
                        username: true
                    }
                }
            }
        });

        if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

        res.json(subtask);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching subtask' });
    }
};

module.exports = { createSubtask, updateSubtask, deleteSubtask, getSubtaskById };
