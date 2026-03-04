const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');

require('dotenv').config();

const app = express();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'https://erp.portorey.my.id'],
    credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

// Basic Route
app.get('/', (req, res) => {
    res.json({ message: 'ERP API is running' });
});

// Import Routes (Placeholder)
const authRoutes = require('./src/routes/auth.routes');
const prospectRoutes = require('./src/routes/prospect.routes');
const projectRoutes = require('./src/routes/project.routes');

app.use('/api/auth', authRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/projects', projectRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
});
