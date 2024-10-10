import { InfluxDB } from '@influxdata/influxdb-client';
let influx;

const initInfluxDBV2 = async () => {
    try {
        influx = new InfluxDB({
            url: process.env.INFLUXDB_URL,
            token: process.env.INFLUXDB_TOKEN,
        });
        
        console.log('InfluxDB client initialized successfully.');

        return influx;
    } catch (error) {
        console.error(`Failed to initialize InfluxDB client: ${error.message}`);
        process.exit(1);
    }
};

const getInfluxDBV2 = async () => {
    try {
        if(influx){
            return influx;
        } else {
            return await initInfluxDBV2();
        }
    } catch (error) {
        console.error(`Error getting Influx client: ${error.message}`)
    }
};

export { getInfluxDBV2};
