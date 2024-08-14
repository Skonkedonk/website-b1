const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const formidable = require('formidable'); // Import formidable
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
const cors = require('cors');
app.use(cors({
  origin: 'https://skonkedonk.github.io', // Replace with your frontend origin
}));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/graphql')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple file upload route using formidable
app.post('/upload', (req, res) => {
  const form = new formidable.IncomingForm();

  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error('Error parsing form:', err);
      return res.status(400).json({ message: 'Form parsing error' });
    }

    const file = files.file;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const uploadsDir = path.join(__dirname, '/collection/uploads/');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Uploads directory created:', uploadsDir);
    }

    const oldPath = file.filepath;
    const newPath = path.join(uploadsDir, file.originalFilename);

    fs.rename(oldPath, newPath, (err) => {
      if (err) {
        console.error('Error moving file:', err);
        return res.status(500).json({ message: 'File upload error' });
      }

      res.json({ message: 'File uploaded successfully', filePath: newPath });
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
      let filePath = 'collection/images/placeholder_pika.jpg';
      let fileType = 'image/jpeg';
      let fileSize = fs.statSync(path.join(__dirname, filePath)).size;

      try {
        if (file) {
          const uploadsDir = path.join(__dirname, '/collection/uploads/');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const newFilename = `${Date.now()}-${file.filename}`;
          const newPath = path.join(uploadsDir, newFilename);

          const stream = file.createReadStream();
          await new Promise((resolve, reject) => {
            const out = fs.createWriteStream(newPath);
            stream.pipe(out);
            out.on('finish', resolve);
            out.on('error', reject);
          });

          filePath = `collection/uploads/${newFilename}`;
          fileType = file.mimetype;
          fileSize = fs.statSync(newPath).size;
        }
      } catch (error) {
        console.error('Error processing file upload:', error);
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
        console.log('Entry saved to MongoDB:', savedEntry);
        return savedEntry;
      } catch (error) {
        console.error('Error saving entry to MongoDB:', error);
        throw new Error('Failed to save entry');
      }
    },
  },
};

async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start();
  server.applyMiddleware({ app });

  // Serve uploaded files statically
  app.use('/collection/uploads', express.static(path.join(__dirname, '/collection/uploads')));

  app.listen(4000, () => {
    console.log('Server running at http://127.0.0.1:4000');
  });
}

startServer();
