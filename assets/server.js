const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const { graphqlUploadExpress } = require('graphql-upload'); // Import graphql-upload
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


// Apply the graphql-upload middleware BEFORE graphql or express-graphql middlewares
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 })); // Adjust the file size and file limits as needed

// Enable CORS for all origins or restrict it to specific origins
const cors = require('cors');
app.use(cors({
  origin: 'https://skonkedonk.github.io', // Replace with your frontend origin
}));

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/fileuploads')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple file upload route for testing
app.post('/upload', upload.single('file'), (req, res) => {
    if (req.file) {
        res.json({ message: 'File uploaded successfully', file: req.file });
    } else {
        res.status(400).json({ message: 'No file uploaded' });
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
    uploadFile: async (parent, { title, description, category, rating, file }) => {
      let filePath = null;
      let fileType = null;
      let fileSize = null;

      if (file) {
        try {
          const resolvedFile = await file.promise;
          const { createReadStream, filename, mimetype } = resolvedFile;

          const uploadsDir = path.join(__dirname, 'assets', 'uploads');
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

          filePath = `/assets/uploads/${filename}`;
          fileType = mimetype;
          fileSize = fs.statSync(outputPath).size;
        } catch (error) {
          console.error("Error processing file upload:", error);
          throw new Error("File upload failed");
        }
      } else {
        // Use the default file when no file is uploaded
        console.log('No file uploaded. Using default file.');
        filePath = `/assets/uploads/placeholder_pika.jpg`;  // Path to the default file
        fileType = 'image/jpeg';  // Adjust based on your default file type
        fileSize = fs.statSync(path.join(__dirname, 'assets', 'uploads', 'default.jpg')).size;
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
        return await entry.save();
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
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

  // Start the server
  app.listen(4000, () => {
    console.log('Server running at http://127.0.0.1:4000');
  });
}

startServer();
