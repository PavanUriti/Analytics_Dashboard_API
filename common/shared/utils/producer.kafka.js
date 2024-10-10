import { producer } from './kafka.js';

export const produceMessage = async (event) => {
    await producer.connect();
    try {
        await producer.send({
            topic: process.env.KAFKA_TOPIC,
            messages: [{ value: JSON.stringify(event) }],
        });
        console.log('Message sent');
    } catch (error) {
        console.error('Error sending message:', error);
    } finally {
        await producer.disconnect();
    }
};