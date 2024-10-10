import { admin } from './kafka.js';

const createTopicIfNotExists = async (topicName) => {
  await admin.connect();
  
  try {
    const existingTopics = await admin.listTopics();
    
    if (!existingTopics.includes(topicName)) {

      await admin.createTopics({
        topics: [
          {
            topic: topicName,
            numPartitions: 1, 
            replicationFactor: 1,
          },
        ],
      });
      console.log(`Topic ${topicName} created.`);
    } else {
      console.log(`Topic ${topicName} already exists.`);
    }
  } catch (error) {
    console.error(`Failed to create topic: ${error.message}`);
  } finally {
    await admin.disconnect();
  }
};

export {createTopicIfNotExists}