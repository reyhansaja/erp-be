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

        // Prospect model in the current Prisma client does not have a
        // `subtasks` relation, so we first load the prospect + project,
        // then load subtasks via the project's id.
        const prospect = await prisma.prospect.findUnique({
            where: { no_project: id },
            include: { project: true },
        });

        if (!prospect) {
            return res.status(404).json({ message: 'Prospect not found' });
        }

        let subtasks = [];
        subtasks = await prisma.subtask.findMany({
            where: {
                OR: [
                    prospect.project ? { projectId: prospect.project.id } : undefined,
                    { prospectId: id }
                ].filter(Boolean)
            },
            include: {
                createdBy: { select: { username: true } },
            },
            orderBy: { deadline: 'asc' },
        });

        res.json({ ...prospect, subtasks });
    } catch (error) {
        console.error('Error fetching prospect by id:', error);
        res.status(500).json({ message: 'Error fetching prospect' });
    }
};

// Delete Prospect
const deleteProspect = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.$transaction(async (tx) => {
            // Check if prospect exists
            const prospect = await tx.prospect.findUnique({
                where: { no_project: id },
                include: { project: true }
            });

            if (!prospect) {
                const error = new Error('Prospect not found');
                error.status = 404;
                throw error;
            }

            // Step 1: Delete all subtasks connected to this prospect directly
            await tx.subtask.deleteMany({ where: { prospectId: id } });

            if (prospect.project) {
                // Step 2: Delete subtasks connected to the project
                await tx.subtask.deleteMany({ where: { projectId: prospect.project.id } });

                // Step 3: Delete the project
                await tx.project.delete({ where: { id: prospect.project.id } });
            }

            // Step 4: Finally, delete the prospect
            await tx.prospect.delete({ where: { no_project: id } });
        });

        res.json({ message: 'Prospect deleted successfully' });
    } catch (error) {
        console.error("Error deleting prospect:", error);
        if (error.status === 404) {
            return res.status(404).json({ message: error.message });
        }
        res.status(500).json({ message: 'Error deleting prospect: ' + String(error.message || error) });
    }
};

module.exports = {
    createProspect,
    getProspects,
    updateProspect,
    deleteProspect,
    getProspectById
};
