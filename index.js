'use strict';

import fastify from 'fastify';
import fastifyPassport from '@fastify/passport';
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import authenticate from './common/auth/authenticate.js';
import initApp from './common/startup/init.js';
import errorHandler from './common/middleware/errorhandler.js';
import path from 'path';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';

const startServer = async () => {
  const app = fastify({
    logger: {
      transport: {
        target: "@fastify/one-line-logger",
      },
    },
  });

  const PORT = process.env.PORT || 3000;

  try {
    await initApp(app);

    await app.register(fastifyCookie);
    await app.register(fastifySession, {
      secret: 'secret with minimum length of 32 characters',
      cookie: { secure: false },
    });

    await app.register(fastifyPassport.initialize());
    await app.register(fastifyPassport.secureSession());

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    await app.register(fastifyStatic, {
      root: path.join(__dirname, 'public'),
      prefix: '/',
    });

    await authenticate(app);
    
    await app.register(import('@fastify/rate-limit'), {
      max: 100,
      timeWindow: '1 minute',
    });

    app.setErrorHandler(errorHandler);

    app.get('/', (request, reply) => {
      reply.sendFile('index.html');
    });

    app.listen({ port: PORT });
    app.log.info(`Server is running on Port: ${PORT}`);

  } catch (error) {
    app.log.error(`Error starting the server on port ${PORT}: ${error.message}`);
    process.exit(1);
  }
};

startServer();
