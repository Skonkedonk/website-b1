const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import the Entry model
const Entry = require('./models/Entry'); // Adjust the path as necessary

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/graphql')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err)); 

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// GraphQL type definitions
const typeDefs = gql`
  type Entry {
    id: ID!
    title: String!
    description: String!
    file: String
    category: String!
    rating: Int!
  }

  type Query {
    entries: [Entry]
  }

  type Mutation {
    createEntry(
      title: String!, 
      description: String!, 
      category: String!, 
      rating: Int!, 
      file: String
    ): Entry!
  }
`;

// GraphQL resolvers
const resolvers = {
  Query: {
    entries: async () => await Entry.find(),
  },
  Mutation: {
    createEntry: async (parent, { title, description, category, rating, file }) => {
      const entry = new Entry({
        title,
        description,
        file,
        category,
        rating: parseInt(rating), // Ensure rating is stored as an integer
      });
      return await entry.save();
    }
  }
};

// Set up Apollo Server with Express
async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen({ port: 4000 }, () =>
    console.log(`Server ready at ${server.graphqlPath}`)
  );
}

startServer();
