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
            console.log(`Prospect ${id} is ${prospect.status}. Checking for existing project...`);

            const isDone = prospect.status === 'REAL_LOSS';

            // Create Project if not exists
            const existingProject = await prisma.project.findUnique({ where: { prospectId: id } });

            if (!existingProject) {
                console.log(`Creating new project for prospect ${id}`);
                try {
                    await prisma.project.create({
                        data: {
                            prospectId: id,
                            is_done: isDone
                        },
                    });
                    console.log(`Project created for prospect ${id}`);
                } catch (createError) {
                    console.error(`Failed to create project for prospect ${id}:`, createError);
                }
            } else {
                console.log(`Project already exists for prospect ${id}. Updating status...`);
                // Ensure is_done matches the status
                if (isDone && !existingProject.is_done) {
                    await prisma.project.update({
                        where: { id: existingProject.id },
                        data: { is_done: true }
                    });
                }
            }
        } else {
            console.log(`Status is ${prospect.status}. No project creation needed.`);
        }

        res.json(prospect);
    } catch (error) {
        console.error("Update Prospect Error:", error);
        res.status(500).json({ message: error.message || 'Error updating prospect' });
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
    deleteProspect
};
