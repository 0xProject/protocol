import { logger } from './logger';
import { PrismaClient } from 'integrator-db';

const prisma = new PrismaClient({
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
    ],
});

prisma.$on('query', (e) => {
    logger.debug(e, 'prisma query');
});

prisma.$on('error', (e) => {
    logger.error(e, 'prisma error');
});

prisma.$on('info', (e) => {
    logger.info(e, 'prisma info');
});

prisma.$on('warn', (e) => {
    logger.warn(e, 'prisma warn');
});

export default prisma;
