const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Import the Entry model
const Entry = require('./models/Entry'); // Adjust the path as necessary

const app = express();

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/graphql')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err)); 

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// GraphQL type definitions
const typeDefs = gql`
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
      file: String
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
      const entry = new Entry({
        title,
        description,
        file,
        category,
        rating: parseInt(rating), // Ensure rating is stored as an integer
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
  });

  await server.start();
  server.applyMiddleware({ app });

  app.listen({ port: 4000 }, () =>
    console.log(`Server ready at http://localhost:4000${server.graphqlPath}`)
  );
}

startServer();

// Serve the upload form
app.get('/', (req, res) => {
  res.send(`
    <h2>Upload File</h2>
    <form action="/upload" enctype="multipart/form-data" method="POST">
      <input type="text" name="title" placeholder="Title" required/><br/>
      <input type="text" name="description" placeholder="Description" /><br/>
      <input type="text" name="category" placeholder="Category" required/><br/>
      <input type="number" name="rating" placeholder="Rating" required/><br/>
      <input type="file" name="file" required/><br/><br/>
      <input type="submit" value="Upload File"/>
    </form>
  `);
});

// Handle file uploads
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { title, description, category, rating } = req.body;
    const file = path.join('/uploads/', req.file.filename); // Store the file path as a string

    const entry = new Entry({
      title,
      description,
      file, // Save the URL or path in the database
      category,
      rating: parseInt(rating), // Ensure rating is stored as an integer
    });

    await entry.save();
    res.send('File uploaded and metadata saved.');
  } catch (error) {
    console.error(error);
    res.status(500).send('An error occurred while uploading the file.');
  }
});

// Serve static files
app.use('/uploads', express.static('uploads'));
