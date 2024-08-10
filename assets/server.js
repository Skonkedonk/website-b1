const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { graphqlUploadExpress } = require('graphql-upload'); // Ensure correct import
const Entry = require('./models/Entry');


// Set up Multer for file uploads
const upload = multer({ dest: 'uploads/' }); // 'uploads/' is the directory where files will be stored

// Set up Express app
const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/fileuploads', { useNewUrlParser: true, useUnifiedTopology: true })
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
      file: Upload!
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
      const { createReadStream, filename, mimetype } = await file;
      const stream = createReadStream();
      const filePath = path.join(__dirname, 'uploads', filename);

      // Save file to disk
      const out = fs.createWriteStream(filePath);
      await new Promise((resolve, reject) => {
        stream.pipe(out);
        out.on('finish', resolve);
        out.on('error', reject);
      });

      // Save file metadata to MongoDB
      const entry = new Entry({
        title,
        description,
        category,
        filePath: `/uploads/${filename}`, // Store relative path to file
        fileType: mimetype,
        fileSize: fs.statSync(filePath).size, // Get the file size in bytes
        rating,
      });

      return await entry.save();
    },
  },
};

// Set up Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.applyMiddleware({ app });

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start the server
app.listen(4000, () => {
  console.log('Server running at http://localhost:4000');
});
