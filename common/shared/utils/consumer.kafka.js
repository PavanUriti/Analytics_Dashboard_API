import { consumer } from './kafka.js';
import {getInfluxDB} from '../../startup/db.influx.js';
import { Point } from '@influxdata/influxdb3-client';
import { createTopicIfNotExists } from './topic.kafka.js';

const consumeMessage = async (app) => {
    const influx = await getInfluxDB();

    try {
        
        await consumer.connect();
        await createTopicIfNotExists(process.env.KAFKA_TOPIC);
        await consumer.subscribe({ topic: process.env.KAFKA_TOPIC, fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ topic, partition, message }) => {
                try {
                    const data = JSON.parse(message.value.toString());

                    const point = Point.measurement('events')
                                    .setTag('eventType', data.eventType)
                                    .setTag('eventId', data.eventId)
                                    .setTag('userId', data.userId)
                                    .setTag('sessionId', data.sessionId)
                                    .setTag('deviceType', data.deviceType)
                                    .setTag('elementId', data.elementId)
                                    .setTag('page', data.page) 
                                    .setFloatField('value', parseFloat(data.value))
                                    .setTimestamp(new Date(data.timestamp).getTime() * 1000000)

                    await influx.write(point, process.env.INFLUXDB_BUCKET, process.env.INFLUXDB_ORG)
                    
                    app.log.info(`Data written to InfluxDB: ${data.eventType}`);
                } catch (err) {
                    app.log.error(`Error processing message: ${err.message}`);
                }
            },
        });
    } catch (error) {
        app.log.error(`Consumer error: ${error.message}`);
    } finally {
        // await influx.close();

        process.on('SIGINT', async () => {
            await consumer.disconnect();
            app.log.info('Kafka consumer disconnected');
            process.exit(0);
        });
    }
};

export { consumeMessage }
