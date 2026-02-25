const prisma = require('../utils/prisma');

// Create Prospect
const createProspect = async (req, res) => {
    try {
        const { no_project, name_project, client_name, contact_name, status } = req.body;

        // Check if duplicate
        const existing = await prisma.prospect.findUnique({ where: { no_project } });
        if (existing) {
            return res.status(400).json({ message: 'Prospect with this No Project already exists' });
        }

        const prospect = await prisma.prospect.create({
            data: {
                no_project,
                name_project,
                client_name,
                contact_name,
                status: status || 'LEAD',
            },
        });

        // If created directly as WON, create Project
        if (prospect.status === 'WON') {
            await prisma.project.create({
                data: {
                    prospectId: prospect.no_project,
                },
            });
        }

        res.status(201).json(prospect);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error creating prospect' });
    }
};

// Get All Prospects
const getProspects = async (req, res) => {
    try {
        const prospects = await prisma.prospect.findMany({
            orderBy: { createdAt: 'desc' },
            include: { project: true }
        });
        res.json(prospects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching prospects' });
    }
};

// Update Prospect
const updateProspect = async (req, res) => {
    try {
        const { id } = req.params; // id is no_project (string)
        const { status, name_project, client_name, contact_name } = req.body;

        const oldProspect = await prisma.prospect.findUnique({ where: { no_project: id } });

        if (!oldProspect) {
            return res.status(404).json({ message: 'Prospect not found' });
        }

        const prospect = await prisma.prospect.update({
            where: { no_project: id },
            data: {
                status,
                name_project,
                client_name,
                contact_name
            },
        });

        // Check transition to WON
        // Check transition to WON or if already WON but missing project
        // Check transition to WON or REAL_LOSS
        if (prospect.status === 'WON' || prospect.status === 'REAL_LOSS') {
            const isDone = prospect.status === 'REAL_LOSS';

            // Create Project if not exists
            let project = await prisma.project.findUnique({ where: { prospectId: id } });

            if (!project) {
                try {
                    project = await prisma.project.create({
                        data: {
                            prospectId: id,
                            is_done: isDone
                        },
                    });
                } catch (createError) {
                    console.error(`Failed to create project for prospect ${id}:`, createError);
                }
            } else {
                // Ensure is_done matches the status
                if (isDone && !project.is_done) {
                    project = await prisma.project.update({
                        where: { id: project.id },
                        data: { is_done: true }
                    });
                }
            }

            // Sync subtasks to the project
            if (project) {
                await prisma.subtask.updateMany({
                    where: { prospectId: id },
                    data: { projectId: project.id }
                });
            }
        }

        res.json(prospect);
    } catch (error) {
        console.error("Update Prospect Error:", error);
        res.status(500).json({ message: error.message || 'Error updating prospect' });
    }
};

// Get Single Prospect
const getProspectById = async (req, res) => {
    try {
        const { id } = req.params;
        const prospect = await prisma.prospect.findUnique({
            where: { no_project: id },
            include: {
                project: true,
                subtasks: {
                    include: { createdBy: { select: { username: true } } },
                    orderBy: { deadline: 'asc' }
                }
            },
        });

        if (!prospect) {
            return res.status(404).json({ message: 'Prospect not found' });
        }

        res.json(prospect);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching prospect' });
    }
};

// Delete Prospect
const deleteProspect = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.prospect.delete({ where: { no_project: id } });
        res.json({ message: 'Prospect deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error deleting prospect' });
    }
};

module.exports = {
    createProspect,
    getProspects,
    updateProspect,
    deleteProspect,
    getProspectById
};
