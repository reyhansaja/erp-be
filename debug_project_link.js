const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const prisma = require('./src/utils/prisma');

async function main() {
    console.log('Testing Project Link Update...');

    // 1. Create a dummy prospect & project
    const id = 'PROJ-DEBUG-' + Date.now();

    try {
        console.log('Creating prospect...');
        await prisma.prospect.create({
            data: {
                no_project: id,
                name_project: 'Debug Project Link',
                client_name: 'Debug Client',
                contact_name: 'Debug Contact',
                status: 'WON'
            }
        });

        console.log('Creating project...');
        const project = await prisma.project.create({
            data: {
                prospectId: id,
                is_done: false
            }
        });
        console.log('Project created ID:', project.id);

        // 2. Update Link
        console.log('Updating request with link...');
        const updated = await prisma.project.update({
            where: { id: project.id },
            data: { link: 'https://example.com' }
        });

        console.log('Update success! Link is:', updated.link);

        if (updated.link !== 'https://example.com') {
            throw new Error('Link mismatch!');
        }

    } catch (e) {
        console.error('FULL ERROR:', e);
    } finally {
        // Cleanup
        console.log('Cleaning up...');
        try {
            const p = await prisma.project.findFirst({ where: { prospectId: id } });
            if (p) await prisma.project.delete({ where: { id: p.id } });
            await prisma.prospect.delete({ where: { no_project: id } });
        } catch (err) {
            console.log('Cleanup error:', err.message);
        }
        await prisma.$disconnect();
    }
}

main();
