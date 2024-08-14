const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const formidable = require('formidable'); // Import formidable
const path = require('path');
const fs = require('fs');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const cors = require('cors');
const Entry = require('./assets/models/Entry');

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

// Set up Express app
const app = express();

// Enable CORS for all origins or restrict it to specific origins
app.use(cors({
  origin: 'https://skonkedonk.github.io', // Replace with your frontend origin
}));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/graphql')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple file upload route using formidable
app.post('/collection/uploads', (req, res) => {
  const form = formidable({
    multiples: false,
    uploadDir: path.join(__dirname, 'collection/uploads'),
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10 MB limit
    filter: ({ name, originalFilename, mimetype }) => {
      // Only accept image files with .jpg, .jpeg, or .png extensions
      const validMimeTypes = ['image/jpeg', 'image/png'];
      if (!validMimeTypes.includes(mimetype)) {
        const err = new Error('Invalid file type');
        err.httpCode = 400;
        throw err;
      }
      return true;
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      res.status(err.httpCode || 500).json({ message: err.message });
      return;
    }
    
    if (!files.file) {
      res.status(400).json({ message: 'No file uploaded' });
      return;
    }

    const uploadedFile = files.file;
    res.json({
      message: 'File uploaded successfully',
      file: {
        filename: uploadedFile.newFilename,
        path: uploadedFile.filepath,
        type: uploadedFile.mimetype,
        size: uploadedFile.size,
      },
    });
  });
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
    uploadFile: async (parent, { title, description, category, rating, file }) => {
      const defaultFilePath = path.join(__dirname, '/collection/images', 'placeholder_pika.jpg');

      let filePath = 'collection/images/placeholder_pika.jpg';
      let fileType = 'image/jpeg';
      let fileSize = fs.statSync(defaultFilePath).size;

      try {
        if (file) {
          const { createReadStream, filename, mimetype } = await file.promise;
          const uploadsDir = path.join(__dirname, 'collection/uploads');

          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const outputPath = path.join(uploadsDir, filename);
          const stream = createReadStream();

          await new Promise((resolve, reject) => {
            const out = fs.createWriteStream(outputPath);
            stream.pipe(out);
            out.on('finish', resolve);
            out.on('error', reject);
          });

          filePath = `collection/uploads/${filename}`;
          fileType = mimetype;
          fileSize = fs.statSync(outputPath).size;
        }
      } catch (error) {
        console.error("Error processing file upload:", error);
      }

      const entry = new Entry({
        title,
        description,
        category,
        filePath,
        fileType,
        fileSize,
        rating,
      });

      try {
        const savedEntry = await entry.save();
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
  });

  await server.start(); // Await the server start before applying middleware
  server.applyMiddleware({ app });

  // Serve uploaded files statically
  app.use('/collection/uploads', express.static(path.join(__dirname, 'collection/uploads')));

  app.listen(4000, () => {
    console.log('Server running at http://127.0.0.1:4000');
  });
}

startServer();
