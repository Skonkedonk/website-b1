const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Entry = require('./models/Entry');

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Set up Express app
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/fileuploads', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define GraphQL schema
const typeDefs = gql`
  type Entry {
    id: ID!
    title: String!
    description: String!
    category: String!
    filePath: String!
    fileType: String!
    fileSize: Int!
    rating: Int!
  }

  type Query {
    entries: [Entry]
  }

  type Mutation {
    uploadFile(
      title: String!,
      description: String!,
      category: String!,
      rating: Int!,
      file: String!
    ): Entry!
  }
`;

// Define GraphQL resolvers
const resolvers = {
  Query: {
    entries: async () => await Entry.find(),
  },
  Mutation: {
    uploadFile: async (parent, { title, description, category, rating, file }) => {
      const filePath = path.join(__dirname, 'uploads', file);

      // Simulate saving the file to disk (already handled by multer in a real app)
      // Save file metadata to MongoDB
      const entry = new Entry({
        title,
        description,
        category,
        filePath: `/uploads/${file}`, // Store relative path to file
        fileType: 'unknown', // Assuming fileType not handled by multer in this simplified example
        fileSize: 0, // Placeholder since we don't handle file size here
        rating,
      });

      return await entry.save();
    },
  },
};

// Set up Apollo Server
async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start(); // Await the server start before applying middleware
  server.applyMiddleware({ app });

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Start the server
  app.listen(4000, () => {
    console.log('Server running at http://localhost:4000');
  });
}

startServer();
