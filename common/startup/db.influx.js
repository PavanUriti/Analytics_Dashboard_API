import { InfluxDBClient } from '@influxdata/influxdb3-client';
let influx;

const initInfluxDB = async (app) => {
    try {
        influx = new InfluxDBClient({
            host: process.env.INFLUXDB_URL,
            token: process.env.INFLUXDB_TOKEN,
        });
        
        app.log.info('InfluxDB client initialized successfully.');

        return influx;
    } catch (error) {
        app.log.error(`Failed to initialize InfluxDB client: ${error.message}`);
        process.exit(1);
    }
};

const getInfluxDB = async () => {
    try {
        return influx;
    } catch (error) {
        process.exit(1);
    }
};

export { initInfluxDB, getInfluxDB};
