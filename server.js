const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { GraphQLScalarType } = require('graphql');
const { Kind } = require('graphql/language');
const { graphqlUploadExpress } = require('graphql-upload'); // Import graphql-upload
const Entry = require('./assets/models/Entry');
const cors = require('cors');


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
const upload = multer({ dest: 'collection/uploads/' });

// Set up Express app
const app = express();

const allowedOrigins = [
  'https://skonkedonk.github.io'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (allowedOrigins.indexOf(origin?.trim()) !== -1 || !origin) {
      callback(null, true); // Allow request
    } else {
      callback(new Error('Not allowed by CORS')); // Reject request
    }
  },
  credentials: true, // Allow credentials (cookies, headers)
};

app.use(cors(corsOptions));



// Apply the graphql-upload middleware BEFORE graphql or express-graphql middlewares
app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 100 })); // Adjust the file size and file limits as needed


// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/graphql')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Simple file upload route for testing
app.post('collection/uploads', upload.single('file'), (req, res) => {
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
    rating: String!
  }

  type Query {
    entries: [Entry]
  }

  type Mutation {
    uploadFile(
      title: String!,
      description: String!,
      category: String!,
      rating: String!,
      file: Upload
    ): Entry!

    deleteEntry(id: ID!): Entry

    updateEntry(
      id: ID!,
      title: String,
      description: String,
      category: String,
      rating: String,
      file: Upload
    ): Entry
  }
`;

const resolvers = {
  Upload,
  Query: {
    entries: async () => await Entry.find(),
  },
  Mutation: {
    // Refactored deleteEntry mutation
    deleteEntry: async (parent, { id }) => {
      try {
        const entry = await Entry.findById(id);
        if (!entry) {
          throw new Error(`Entry with ID ${id} not found.`);
        }

        await Entry.deleteOne({ _id: id });
        return entry; // Return the deleted entry for confirmation
      } catch (error) {
        console.error('Error during deletion:', error);
        throw new Error('Failed to delete entry');
      }
    },
    updateEntry: async (parent, { id, title, description, category, rating, file }) => {
      try {
        const updates = {};
        if (title) updates.title = title;
        if (description) updates.description = description;
        if (category) updates.category = category;
        if (rating) updates.rating = rating;

        // If a new file is uploaded, handle it
        if (file) {
          const { createReadStream, filename, mimetype } = await file.promise;
          const uploadsDir = path.join(__dirname, '/collection/uploads/');
          const outputPath = path.join(uploadsDir, filename);

          const stream = createReadStream();
          await new Promise((resolve, reject) => {
            const out = fs.createWriteStream(outputPath);
            stream.pipe(out);
            out.on('finish', resolve);
            out.on('error', reject);
          });

          updates.filePath = `collection/uploads/${filename}`;
          updates.fileType = mimetype;
          updates.fileSize = fs.statSync(outputPath).size;
        }

        const updatedEntry = await Entry.findByIdAndUpdate(id, updates, { new: true });
        if (!updatedEntry) throw new Error('Entry not found');
        return updatedEntry;
      } catch (error) {
        console.error('Error updating entry:', error);
        throw new Error('Failed to update entry');
      }
    },
    uploadFile: async (parent, { title, description, category, rating, file }) => {
      const defaultFilePath = path.join(__dirname, '/collection/images', 'placeholder_pika.jpg');
      let filePath = 'collection/images/placeholder_pika.jpg';
      let fileType = 'image/jpeg';
      let fileSize = fs.statSync(defaultFilePath).size;
  
      try {
          // Apply defaults if the input is missing or invalid
          title = title || "Entry";
          description = description || "An incredible description!";
          category = category || "Default";
          rating = rating || "?"; // Adjust as needed for valid rating defaults
  
          if (file) {
              const resolvedFile = await file.promise;
              if (resolvedFile && resolvedFile.createReadStream && resolvedFile.filename && resolvedFile.mimetype) {
                  const { createReadStream, filename, mimetype } = resolvedFile;
  
                  const uploadsDir = path.join(__dirname, '/collection/uploads/');
                  if (!fs.existsSync(uploadsDir)) {
                      fs.mkdirSync(uploadsDir, { recursive: true });
                      console.log('Uploads directory created:', uploadsDir);
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
                  console.log('File saved successfully:', { filePath, fileType, fileSize });
              } else {
                  console.log('File is present but missing necessary properties, using default file.');
              }
          } else {
              console.log('No file uploaded. Using default file.');
          }
      } catch (error) {
          console.error("Error processing file upload:", error);
          throw new Error("Failed to process file upload");
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
          console.error("Error saving entry to MongoDB:", error);
          throw new Error("Failed to save entry");
      }
  }
  
  },
};

module.exports = resolvers;



async function startServer() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
  });

  await server.start(); // Await the server start before applying middleware
  server.applyMiddleware({ app });

  // Serve uploaded files statically
  app.use('/collection/uploads', express.static(path.join(__dirname, '/collection/uploads')));

  /*
  app.get('/run-script', (req, res) => {
    exec('..\\scripts\\update.bat', (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            res.status(500).send('Script execution failed');
            return;
        }
        if (stderr) {
            console.error(`Stderr: ${stderr}`);
            res.status(500).send('Script execution had errors');
            return;
        }
        console.log(`Stdout: ${stdout}`);
        res.send('Script executed successfully');
    });
});*/

  // Start the server
  app.listen(4000, () => {
    console.log('Server running at http://127.0.0.1:4000');
  });
}

startServer();
