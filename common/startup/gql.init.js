import mercurius from 'mercurius';
import schema from '../../src/graphql/schema.js'; 
import {resolvers, initializeModels} from '../../src/graphql/resolvers.js'; 

const gqlInit = async (app) => {
    try {
        await initializeModels(app);

        await app.register(mercurius, {
            schema,
            resolvers,
            subscription: true,
            graphiql: true,
            context: (request, reply) => ({
                request,
                bcrypt: app.bcrypt, 
                user: request.user,
            }),
        });
        app.log.info('gqlInit initialized successfully.');
    } catch (error) {
        app.log.error(`Failed to initialize gqlInit: ${error.message}`);
        process.exit(1);
    }
};

export { gqlInit };