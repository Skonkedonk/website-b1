const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const cors = require('cors');
const Entry = require('./assets/models/Entry');
const formidableMiddleware = require('express-formidable');

const app = express();

// Enable CORS for all origins or restrict it to specific origins
app.use(cors({
  origin: 'https://skonkedonk.github.io', // Replace with your frontend origin
}));

// Use formidable middleware to parse multipart/form-data
app.use(formidableMiddleware());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/graphql')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

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
  Upload,

  Query: {
    entries: async () => await Entry.find(),
  },

  Mutation: {
    uploadFile: async (parent, args, context) => {
      const { req } = context;

      // Extract fields and files from the formidable-parsed request
      const { fields, files } = req;

      const { title, description, category, rating } = fields;
      const file = files.file; // Assuming the file field is named 'file'

      let filePath = 'collection/images/placeholder_pika.jpg';
      let fileType = 'image/jpeg';
      let fileSize = fs.statSync(path.join(__dirname, filePath)).size;

      if (file) {
        const uploadsDir = path.join(__dirname, '/collection/uploads/');

        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
          console.log('Uploads directory created:', uploadsDir);
        }

        const outputPath = path.join(uploadsDir, file.name);

        // Move the uploaded file to the uploads directory
        fs.renameSync(file.path, outputPath);

        filePath = `collection/uploads/${file.name}`;
        fileType = file.type;
        fileSize = file.size;

        console.log('File saved successfully:', { filePath, fileType, fileSize });
      } else {
        console.log('No file uploaded. Using default file.');
      }

      const entry = new Entry({
        title,
        description,
        category,
        filePath,
        fileType,
        fileSize,
        rating: parseInt(rating, 10),
      });

      try {
        const savedEntry = await entry.save();
        console.log('Entry saved to MongoDB:', savedEntry);
        return savedEntry;
      } catch (error) {
        console.error("Error saving entry to MongoDB:", error);
        throw new Error("Failed to save entry");
      }
    },
  },
};

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }), // Pass the request to context
  });

  await server.start();
  server.applyMiddleware({ app });

  // Serve uploaded files statically
  app.use('/collection/uploads', express.static(path.join(__dirname, '/collection/uploads')));

  // Start the server
  app.listen(4000, () => {
    console.log('Server running at http://127.0.0.1:4000');
  });
}

startServer();
