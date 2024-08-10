const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const Entry = require('./models/Entry');

// Define the Upload scalar type
const Upload = new GraphQLScalarType({
  name: 'Upload',
  description: 'A file upload.',
  parseValue(value) {
    return value; // value from the client
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return ast.value; // ast value is always in string format
    }
    return null;
  },
  serialize(value) {
    return value;
  }
});

// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Set up Express app
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/fileuploads')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define GraphQL schema
const typeDefs = gql`
  scalar Upload

  type Entry {
    id: ID!
    title: String!
    description: String!
    category: String!
    filePath: String
    fileType: String
    fileSize: Int
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
      file: Upload
    ): Entry!
  }
`;


const resolvers = {
  Upload, // Add the Upload scalar to your resolvers

  Query: {
    entries: async () => await Entry.find(),
  },
  Mutation: {
    uploadFile: async (parent, { title, description, category, rating, file }) => {
      let filePath = null;
      let fileType = null;
      let fileSize = null;

      if (file) {
        const { createReadStream, filename, mimetype } = await file;
        const stream = createReadStream();
        filePath = path.join(__dirname, 'uploads', filename);

        // Save file to disk
        const out = fs.createWriteStream(filePath);
        await new Promise((resolve, reject) => {
          stream.pipe(out);
          out.on('finish', resolve);
          out.on('error', reject);
        });

        filePath = `/uploads/${filename}`;
        fileType = mimetype;
        fileSize = fs.statSync(filePath).size;
      }

      // Save metadata (and optionally the file path) to MongoDB
      const entry = new Entry({
        title,
        description,
        category,
        filePath,
        fileType,
        fileSize,
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
    console.log('Server running at http://127.0.0.1:4000');
  });
}

startServer();
