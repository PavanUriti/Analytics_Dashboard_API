const { SubscriptionClient } = require('@mercuriusjs/subscription-client');
const { once } = require('events');
const { gql } = require('graphql-tag');

const SUBSCRIPTION_QUERY = gql`
  subscription {
    eventAdded(userId: "5118f6d9-18ff-431e-b829-0bba00924c87") {
      eventType
      deviceType
      elementId
      page
      userId
      timestamp
    }
  }
`;

const client = new SubscriptionClient('ws://localhost:3000/graphql', {
  protocols: ["graphql-transport-ws"],
  reconnect: true,
  maxReconnectAttempts: 10,
  serviceName: "test-service",
  connectionCallback: () => {
    console.log('Connected to the subscription server');
  },
  failedConnectionCallback: (err) => {
    console.error('Connection error:', err);
  },
  failedReconnectCallback: () => {
    console.error('Failed to reconnect');
  },
  connectionInitPayload: { foo: 'bar' },
  rewriteConnectionInitPayload: (connectionInit, context) => {
    return connectionInit;
  },
  keepAlive: 1000,
});

client.connect();

(async () => {
  await once(client, 'ready');

  const operationId = client.createSubscription(SUBSCRIPTION_QUERY, {}, (data) => {
    console.log('New event received:', data.payload.eventAdded);
  });

  client.on('error', (err) => {
    console.error('Error in subscription:', err);
  });
})();

process.on('SIGINT', async () => {
  await client.close();
  console.log('Client closed');
  process.exit();
});
