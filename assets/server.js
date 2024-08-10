const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const { graphqlUploadExpress } = require('graphql-upload');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import the Entry model
const Entry = require('./models/Entry');

const app = express();

// Apply the middleware to handle file uploads
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/graphql')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// GraphQL type definitions
const typeDefs = gql`
  scalar Upload

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
      file: Upload
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
      let filePath = '';

      if (file) {
        const { createReadStream, filename } = await file;
        const stream = createReadStream();
        const out = path.join(__dirname, 'uploads', filename);
        await stream.pipe(fs.createWriteStream(out));
        filePath = `/uploads/${filename}`;
      }

      const entry = new Entry({
        title,
        description,
        file: filePath,
        category,
        rating: parseInt(rating),
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
    uploads: false, // Disable default upload handling in Apollo Server
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen({ port: 4000 }, () =>
    console.log(`Server ready at http://localhost:4000${server.graphqlPath}`)
  );
}

startServer();

// Serve static files
app.use('/uploads', express.static('uploads'));
