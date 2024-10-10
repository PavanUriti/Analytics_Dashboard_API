import { Sequelize } from 'sequelize';

let sequelize;

const postgresDB = async (app) => {
    try {

        if (sequelize) return sequelize;

        const dbUrl = process.env.POSTGRES_DATABASE_URL;

        sequelize = new Sequelize(dbUrl, {
            dialect: 'postgres',
        });

        await sequelize.authenticate();

        app.log.info('PostgresDB initialized successfully.');
    } catch (error) {
        app.log.error(`Failed to initialize PostgresDB: ${error.message}`);
        process.exit(1);
    }
};

export { postgresDB, sequelize };
