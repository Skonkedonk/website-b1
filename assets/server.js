const { ApolloServer } = require('@apollo/server');
const { startStandaloneServer } = require('@apollo/server/standalone');
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/graphql')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define a Mongoose model for User
const User = mongoose.model('User', {
  name: { type: String, required: true }, // Make sure name is required
  second: { type: String, required: false } // Allow second to be nullable
});


// Define GraphQL type definitions
const typeDefs = `
  type User {
    id: ID!
    name: String!
    second: String  # Nullable field
  }

  type Query {
    user(id: ID!): User
    users: [User]
  }

  type Mutation {
    createUser(name: String!, second: String): User  # Make second optional
  }
`;

const resolvers = {
  Query: {
    users: async () => {
      try {
        const users = await User.find();
        return users;
      } catch (error) {
        console.error('Error fetching users:', error);
        return null;
      }
    },
  },
  Mutation: {
    createUser: async (parent, args) => {
      console.log('Received createUser mutation with args:', args); // Debugging log
      const user = new User({
        name: args.name,
        second: args.second || null  // Ensure the second field is handled correctly
      });
      const savedUser = await user.save();
      console.log('User saved:', savedUser); // Debugging log
      return savedUser;
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
