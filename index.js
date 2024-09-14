require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const { ObjectId } = require('mongodb');

// Initialize the Express application
const app = express();
const port = process.env.PORT || 3000;

// Use body-parser to parse JSON bodies
app.use(bodyParser.json());

// Get the MongoDB URI from the environment variables
const uri = process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const database = client.db('aarsha');

    // Define collections
    const bookCollection = database.collection('book_list');
    const chapterCollection = database.collection('chapter_list');
    const chapterDetailsCollection = database.collection('chapter_details');

    // Define a route to get all books
    app.get('/books', async (req, res) => {
      try {
        const books = await bookCollection.find().toArray();
        res.status(200).json(books);
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve books' });
      }
    });


    // Define a route to get chapters based on book ID
app.get('/chapters/:bookId', async (req, res) => {
  const bookId = req.params.bookId;

  // Validate the bookId
  if (!bookId) {
    return res.status(400).json({ error: 'Book ID is required' });
  }

  try {
    // Retrieve chapters based on bookId
    const chapters = await chapterCollection.find({ book_id: bookId }).toArray();

    if (chapters.length > 0) {
      res.status(200).json(chapters);
    } else {
      res.status(404).json({ error: 'No chapters found for this book ID' });
    }
  } catch (error) {
    console.error("Error retrieving chapters:", error);
    res.status(500).json({ error: 'Failed to retrieve chapters' });
  }
});

  


    // Define a route to get chapter details based on book ID and chapter 
    app.get('/chapter-details/:bookId/:chapterId', async (req, res) => {
      const { bookId, chapterId } = req.params;
      
      // Validate the IDs
      if (!bookId || !chapterId) {
          return res.status(400).json({ error: 'Invalid book ID or chapter ID' });
      }
      
      try {
          // Retrieve the document from the collection
          const chapterDetails = await chapterDetailsCollection.findOne({
              bookId: bookId,             // Book ID as string
              chapterId: chapterId        // Chapter ID as string
          });
  
          if (chapterDetails) {
              res.status(200).json(chapterDetails);
          } else {
              res.status(404).json({ error: 'Chapter details not found for this book ID and chapter ID' });
          }
      } catch (error) {
          console.error("Error retrieving chapter details:", error);
          res.status(500).json({ error: 'Failed to retrieve chapter details' });
      }
  });
  

    

  // Define a route to create a new book
app.post('/add-books', async (req, res) => {
    const newBook = req.body;

    console.log("newBook",newBook)
  
    // Validate the request body (ensure it has the required fields)
    if (!newBook.title || !newBook.author || !newBook.year) {
      return res.status(400).json({ error: 'Missing required fields: title, author, or year' });
    }
  
    try {
      const result = await bookCollection.insertOne(newBook);
      res.status(201).json({ message: 'Book created successfully', bookId: result.insertedId });
    } catch (error) {
      console.error("Error creating book:", error);
      res.status(500).json({ error: 'Failed to create book' });
    }
  });
  
  // Define a route to update an existing book
  app.put('/update-books/:id', async (req, res) => {
    const bookId = req.params.id;
    const updatedBook = req.body;
  
    // Validate ObjectId
    if (!ObjectId.isValid(bookId)) {
      return res.status(400).json({ error: 'Invalid book ID' });
    }
  
    // Exclude the _id field from the update
    const { _id, ...updateFields } = updatedBook;
  
    // Validate the updateFields (ensure it has at least one field to update)
    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ error: 'Request body is empty or contains only immutable fields' });
    }
  
    try {
      const result = await bookCollection.updateOne(
        { _id: new ObjectId(bookId) },  // Convert string ID to ObjectId
        { $set: updateFields }         // Update only the allowed fields
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Book not found' });
      }
  
      res.status(200).json({ message: 'Book updated successfully' });
    } catch (error) {
      console.error("Error updating book:", error);
      res.status(500).json({ error: 'Failed to update book' });
    }
  });



  // **********************ADD CHAPTERS ***************************
  app.post('/add-chapter', async (req, res) => {
    const { book_id, title, pageNumber } = req.body;
  
    // Validate request body
    if (typeof book_id !== 'string' || typeof title !== 'string' || typeof pageNumber !== 'number') {
      return res.status(400).json({ error: 'Invalid input data' });
    }
  
    try {
      // Insert the new chapter
      const result = await chapterCollection.insertOne({
        book_id,
        title,
        pageNumber
      });
  
      res.status(201).json({ message: 'Chapter added successfully', chapterId: result.insertedId });
    } catch (error) {
      console.error("Error adding chapter:", error);
      res.status(500).json({ error: 'Failed to add chapter' });
    }
  });

  

  // ****************************** UPDATE BOOK CHAPTERS **************************
  app.put('/update-chapter/:bookId/:pageNumber', async (req, res) => {
    const { bookId, pageNumber } = req.params;
    const { title } = req.body;
  
    // Validate request params and body
    if (typeof bookId !== 'string' || isNaN(parseInt(pageNumber)) || typeof title !== 'string') {
      return res.status(400).json({ error: 'Invalid input data' });
    }
  
    try {
      const result = await chapterCollection.updateOne(
        { book_id: bookId, pageNumber: parseInt(pageNumber) },  // Use bookId as string, pageNumber as number
        { $set: { title } }
      );
  
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Chapter not found' });
      }
  
      res.status(200).json({ message: 'Chapter updated successfully' });
    } catch (error) {
      console.error("Error updating chapter:", error);
      res.status(500).json({ error: 'Failed to update chapter' });
    }
  });

  



  // ****************** Add/Update Book Chapter Details *******************************
  app.post('/upsert-chapter-details', async (req, res) => {
    const {
      chapterId,
      bookId,
      title,
      totalPages,
      backgroundImage,
      chapterDetails
    } = req.body;
  
    // Validate request body
    if (
      typeof chapterId !== 'string' ||
      typeof bookId !== 'string' ||
      typeof title !== 'string' ||
      typeof totalPages !== 'number' ||
      typeof backgroundImage !== 'string' ||
      typeof chapterDetails !== 'string'
    ) {
      return res.status(400).json({ error: 'Invalid input data' });
    }
  
    try {
      const result = await chapterDetailsCollection.updateOne(
        { chapterId: chapterId, bookId: bookId }, // Query criteria
        { 
          $set: {
            title,
            totalPages,
            backgroundImage,
            chapterDetails
          }
        },
        { upsert: true } // Create a new document if no match is found
      );
  
      if (result.upsertedCount > 0) {
        res.status(201).json({ message: 'Chapter details created successfully' });
      } else if (result.matchedCount > 0) {
        res.status(200).json({ message: 'Chapter details updated successfully' });
      } else {
        res.status(404).json({ error: 'No chapter details found to update' });
      }
    } catch (error) {
      console.error("Error upserting chapter details:", error);
      res.status(500).json({ error: 'Failed to upsert chapter details' });
    }
  });
  
  
  
  
  

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}

main().catch(console.error);
