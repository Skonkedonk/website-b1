const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/graphql')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a Mongoose model for User
const User = mongoose.model('User', {
  name: String
});

// Define GraphQL type definitions
const typeDefs = `
  type User {
    id: ID!
    name: String!
    second: String!
  }

  type Query {
    user(id: ID!): User
    users: [User]
  }

  type Mutation {
    createUser(name: String!, second: String!): User
  }
`;

// Define GraphQL resolvers
const resolvers = {
  Query: {
    users: async () => User.find(),
    user: async (parent, args) => User.findById(args.id)    
  },
  Mutation: {
    createUser: async (parent, args) => {
      try {
        const user = new User({
          name: args.name,
          second: args.second
        });
        return await user.save();
      } catch (error) {
        console.error('Error creating user:', error);
        throw new Error('Error creating user');
      }
    }
  }
};

// Create the Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers
});

// Read port from environment variable or use default
const PORT = process.env.PORT || 4000;

startStandaloneServer(server, {
  listen: { port: PORT, host: '0.0.0.0' }
}).then(({ url }) => {
  console.log(`Server is running on ${url}`);
}).catch(err => {
  console.error('Failed to start the server:', err);
});
