import { Kafka } from 'kafkajs';

const kafka = new Kafka({
    clientId: process.env.KAFKA_CLIENT_ID,
    brokers: [process.env.KAFKA_BROKER],
});

const admin = kafka.admin();

const producer = kafka.producer();

const consumer = kafka.consumer({ groupId: process.env.KAFKA_GROUP_ID });

export {admin, producer, consumer, kafka };
