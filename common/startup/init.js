import compress from '@fastify/compress';
import cors from '@fastify/cors';
import csrfProtection from '@fastify/csrf-protection';
import helmet from '@fastify/helmet';
import bodyParser from '@fastify/formbody';
import fileUpload from 'fastify-file-upload';
import { sanitize } from '../shared/utils/xss-sanitizer';
import { initInfluxDB } from './db.influx.js';
import { postgresDB } from './db.psql.js';
import fastifyBcrypt from 'fastify-bcrypt';
import { gqlInit } from './gql.init.js';
import { consumeMessage } from '../../common/shared/utils/consumer.kafka.js';

export default async (app) => {
    
    process.on('uncaughtException', (error) => {
        app.log.error(`Uncaught Exception: ${error}`);
    });

    process.on('unhandledRejection', (error) => {
        app.log.error(`Unhandled Rejection: ${error}`);
    });


    await postgresDB(app);

    await initInfluxDB(app);

    await app.register(fastifyBcrypt);
    await app.register(compress);
    await app.register(cors, { 
        origin: true, 
    });
    await app.register(csrfProtection); 
    await app.register(helmet);
    await app.register(fileUpload, { debug: false });

    await gqlInit(app);

    await consumeMessage(app);

    app.addHook('preHandler', (request, reply, done) => {
        if (request.body) {
            request.body = sanitize(request.body);
        }
        done();
    });
};
