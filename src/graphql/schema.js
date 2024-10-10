const schema = `
  scalar JSON

  type User {
    id: ID!
    username: String!
    email: String!
    role: String!
  }
  
  type AuthPayload {
    user: User
  }

  input Details {
    description: String
  }
  
  type Event {
    eventType: String!
    deviceType: String!
    elementId: String! 
    page: String!
    userId: ID!
    timestamp: String!
    details: JSON
    value: Float!
  }

  type Query {
    users: [User]
    user(id: ID!): User
    events(
      userId: ID,
      eventType: String,
      deviceType: String,
      elementId: String, 
      page: String,
      startTime: String,
      endTime: String,
      limit: Int,
      offset: Int
    ): [Event]
  }

  type Subscription {
    eventAdded(
      userId: ID, 
      eventType: String,
      deviceType: String,
      elementId: String, 
      page: String,
      startTime: String,
      endTime: String,
    ): Event
  }

  type Mutation {
    createUser(username: String!, email: String!, password: String!, role: String): User
    login(username: String!, password: String!): AuthPayload
    logout: Boolean
    updateUser(id: ID!, username: String, email: String, password: String, role: String): User
    deleteUser(id: ID!): Boolean
    produceEvent(eventType: String!, deviceType: String!, elementId: String!, page: String!, userId: ID!, details: Details, value: Float!, timestamp: String!): String
  }
`;

export default schema;

