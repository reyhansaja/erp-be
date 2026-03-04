const prisma = require('../utils/prisma');
const bcrypt = require('bcrypt');

const getUsers = async (req, res) => {
    try {
        if (req.roleName !== 'Superadmin') {
            return res.status(403).json({ message: 'Only Superadmin can view users' });
        }

        const users = await prisma.user.findMany({
            include: {
                role: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Remove passwords from response
        const safeUsers = users.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        res.json(safeUsers);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ message: 'Error fetching users' });
    }
};

const createUser = async (req, res) => {
    try {
        if (req.roleName !== 'Superadmin') {
            return res.status(403).json({ message: 'Only Superadmin can create users' });
        }

        const { username, email, password, roleName } = req.body;

        if (!username || !email || !password || !roleName) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check user existence
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Username or email already exists' });
        }

        // Get Role
        const role = await prisma.role.findUnique({
            where: { name: roleName }
        });

        if (!role) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                roleId: role.id
            },
            include: { role: true }
        });

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ message: 'Error creating user' });
    }
};

const updateUser = async (req, res) => {
    try {
        if (req.roleName !== 'Superadmin') {
            return res.status(403).json({ message: 'Only Superadmin can update users' });
        }

        const { id } = req.params;
        const { username, email, password, roleName } = req.body;

        const dataToUpdate = {};

        if (username) dataToUpdate.username = username;
        if (email) dataToUpdate.email = email;

        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        if (roleName) {
            const role = await prisma.role.findUnique({ where: { name: roleName } });
            if (!role) return res.status(400).json({ message: 'Invalid role' });
            dataToUpdate.roleId = role.id;
        }

        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data: dataToUpdate,
            include: { role: true }
        });

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: 'Error updating user' });
    }
};

const deleteUser = async (req, res) => {
    try {
        if (req.roleName !== 'Superadmin') {
            return res.status(403).json({ message: 'Only Superadmin can delete users' });
        }

        const { id } = req.params;

        // Block deleting yourself
        if (parseInt(id) === req.userId) {
            return res.status(400).json({ message: 'You cannot delete yourself' });
        }

        await prisma.user.delete({
            where: { id: parseInt(id) }
        });

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error("Error deleting user:", error);
        res.status(500).json({ message: 'Error deleting user' });
    }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
