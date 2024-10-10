import fastifyPassport from '@fastify/passport';
import { Strategy as LocalStrategy } from 'passport-local';
import {initializeModels} from '../../src/graphql/resolvers.js'; 

export default async (app) => {
    let {User} = await initializeModels();

    fastifyPassport.use('local', new LocalStrategy(async (username, password, done) => {
        try {
            const user = await User.findOne({ where: { username } });

            if (!user) {
                return done(null, false, { message: 'Incorrect username.' });
            }

            const isValidPassword = await app.bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return done(null, false, { message: 'Incorrect password.' });
            }

            return done(null, { id: user.id, username: user.username });
        } catch (error) {
            return done(error);
        }
    }));

    fastifyPassport.registerUserSerializer((user, request) => {
        return user.id;
    });

    fastifyPassport.registerUserDeserializer(async (id, request) => {
        try {
            const user = await User.findByPk(id);
            if (!user) {
                throw new Error('User not found.');
            }
            return user;
        } catch (error) {
            throw new Error('User not found.');
        }
    });
};
