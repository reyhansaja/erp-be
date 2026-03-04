const prisma = require('../utils/prisma');

// Get All Projects
const getProjects = async (req, res) => {
    try {
        const { is_done, search } = req.query;

        // Build filter
        let where = {};
        if (is_done !== undefined) {
            where.is_done = is_done === 'true';
        }

        // Restrict Admins to only see projects they are assigned to
        if (req.roleName === 'Admin') {
            where.admins = {
                some: {
                    id: req.userId
                }
            };
        }

        if (search) {
            where.prospect = {
                OR: [
                    { name_project: { contains: search, mode: 'insensitive' } },
                    { no_project: { contains: search, mode: 'insensitive' } },
                    { client_name: { contains: search, mode: 'insensitive' } },
                ]
            };
        }

        const projects = await prisma.project.findMany({
            where,
            include: {
                prospect: true,
                subtasks: true,
                admins: {
                    select: {
                        id: true,
                        username: true,
                    }
                }
            },

            orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        });

        // Calculate progress for each project
        const projectsWithProgress = projects.map(p => {
            const totalSubtasks = p.subtasks.length;
            let progress = 0;
            if (totalSubtasks > 0) {
                const totalProgress = p.subtasks.reduce((sum, task) => sum + task.progress, 0);
                progress = Math.round(totalProgress / totalSubtasks);
            }
            return { ...p, progress };
        });

        res.json(projectsWithProgress);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching projects' });
    }
};

// Get Single Project
const getProjectById = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await prisma.project.findUnique({
            where: { id: parseInt(id) },
            include: {
                prospect: true,
                admins: {
                    select: {
                        id: true,
                        username: true
                    }
                },
                subtasks: {
                    include: { createdBy: { select: { username: true } } },
                    orderBy: { deadline: 'asc' }
                },
            },
        });

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        // Authorization check
        if (req.roleName === 'Admin') {
            const isAssigned = project.admins.some(admin => admin.id === req.userId);
            if (!isAssigned) {
                return res.status(403).json({ message: 'Access denied. You are not assigned to this project.' });
            }
        }

        // Calculate Progress
        const totalSubtasks = project.subtasks.length;
        let progress = 0;
        if (totalSubtasks > 0) {
            const totalProgress = project.subtasks.reduce((sum, task) => sum + task.progress, 0);
            progress = Math.round(totalProgress / totalSubtasks);
        }

        res.json({ ...project, progress });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error fetching project' });
    }
};

// Reorder Projects
const reorderProjects = async (req, res) => {
    try {
        const { orderedIds } = req.body; // Array of project IDs in new order

        if (!orderedIds || !Array.isArray(orderedIds)) {
            return res.status(400).json({ message: 'Invalid data format' });
        }

        // Transaction to update all projects
        await prisma.$transaction(
            orderedIds.map((id, index) =>
                prisma.project.update({
                    where: { id: parseInt(id) },
                    data: { order: index },
                })
            )
        );

        res.json({ message: 'Projects reordered successfully' });
    } catch (error) {
        console.error("Error reordering projects:", error);
        res.status(500).json({ message: 'Error reordering projects' });
    }
};


// Update Project (Link, etc)
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;
        const { link, is_done, adminIds } = req.body;

        const project = await prisma.project.findUnique({ where: { id: parseInt(id) } });
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const dataToUpdate = {
            link,
            is_done: is_done !== undefined ? is_done : undefined
        };

        // If adminIds array is provided, update the relations
        if (adminIds && Array.isArray(adminIds)) {
            dataToUpdate.admins = {
                set: adminIds.map(adminId => ({ id: adminId }))
            };
        }

        const updatedProject = await prisma.project.update({
            where: { id: parseInt(id) },
            data: dataToUpdate,
            include: {
                admins: {
                    select: { id: true, username: true }
                }
            }
        });

        res.json(updatedProject);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error updating project' });
    }
};

module.exports = { getProjects, getProjectById, reorderProjects, updateProject };
