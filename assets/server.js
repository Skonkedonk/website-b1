const { ApolloServer } = require('apollo-server');
const { GraphQLUpload } = require('graphql-upload');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/graphql', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define your Mongoose model
const Entry = require('./entry');  // Assuming entry.js is set up as discussed

// Define GraphQL type definitions
const typeDefs = `
  scalar Upload

  type Entry {
    id: ID!
    title: String!
    description: String!
    file: String  # URL to the image file
    category: String!
    rating: Int!
  }

  type Query {
    entries: [Entry]
  }

  type Mutation {
    createEntry(
      title: String!,
      description: String,
      file: Upload!,
      category: String!,
      rating: Int
    ): Entry
  }
`;

// Define your resolvers
const resolvers = {
  Upload: GraphQLUpload,

  Query: {
    entries: async () => {
      return await Entry.find();
    }
  },
  
  Mutation: {
    createEntry: async (parent, { title, description, file, category, rating }) => {
      // Handle file upload
      const { createReadStream, filename, mimetype } = await file;
      const stream = createReadStream();
      const filePath = path.join(__dirname, 'uploads', `${Date.now()}-${filename}`);
      
      // Store the file in the server's filesystem
      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(filePath);
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      // Create the database entry
      const entry = new Entry({
        title,
        description: description || 'N/A',
        file: filePath,  // Save the file path to the database
        category,
        rating: rating || 0
      });
      
      return await entry.save();
    }
  }
};

// Start the Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  uploads: false  // Disable built-in uploads, use graphql-upload instead
});

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`);
});
