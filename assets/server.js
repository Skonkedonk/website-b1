const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/graphql');

// Define a Mongoose model for User
const User = mongoose.model('User', {
  name: String
});

// Define GraphQL type definitions
const typeDefs = `
  type User {
    id: ID!
    name: String!
  }

  type Query {
    user(id: ID!): User
    users: [User]
  }

  type Mutation {
    createUser(name: String!): User
  }
`;

// Define GraphQL resolvers
const resolvers = {
  Query: {
    user: async (parent, args) => User.findById(args.id),
    users: async () => User.find()
  },
  Mutation: {
    createUser: async (parent, args) => {
      const user = new User({ name: args.name });
      return user.save();
    }
  }
};

// Create and start the Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers
});

startStandaloneServer(server, {
  listen: { port: 5000, host: 'localhost' }
}).then(({ url }) => {
  console.log(`Server is running on ${url}`);
});

