require('dotenv').config();
const express = require('express');
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
const { ObjectId } = require('mongodb');
const cors = require('cors');
const multer = require('multer');
const ImageKit = require('imagekit');
const jwt = require('jsonwebtoken');


// Initialize the Express application
const app = express();
const port = process.env.PORT || 3000;
const nodemailer = require('nodemailer');
// Use the CORS middleware
app.use(cors());

// Use body-parser to parse JSON bodies
app.use(bodyParser.json());

// Configure ImageKit
const imagekit = new ImageKit({
  publicKey: "public_X2K7BKMgxM/LIhO42Qhvx36Mn4U=",
  privateKey: "private_WHb7RyfZlZM+nnYxo919sk/CCgw=",     // Replace with your private API key
  urlEndpoint: "https://ik.imagekit.io/08x8jz0ll8" // Replace with your URL endpoint
});

// Set up multer for file handling
const storage = multer.memoryStorage();
const upload = multer({ storage });

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
    const wishlistCollection = database.collection('wishlist');

    // Define a route to get all books
    app.get('/books', async (req, res) => {
      try {
        const books = await bookCollection.find().toArray();
        res.status(200).json(books);
      } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve books' });
      }
    });


    app.get('/books-category-based-list', async (req, res) => {
      const { pageSize, genre, title, author } = req.query;
  
      try {
          // Construct the query object based on the provided filters
          const query = {};
          if (genre) {
              query.genre = genre;
          }
          if (title) {
              query.title = { $regex: title, $options: 'i' }; // Case-insensitive search
          }
          if (author) {
              query.author = { $regex: author, $options: 'i' }; // Case-insensitive search
          }
  
          const books = await bookCollection.find(query).limit(Number(pageSize)).toArray();
  
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
    if (typeof book_id !== 'string' || typeof title !== 'string' || typeof pageNumber !== 'string') {
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
      typeof totalPages !== 'string' ||
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
  
  
  
  // Route for file upload
app.post('/upload', upload.single('image'), (req, res) => {
  const file = req.file;

  if (!file) {
      return res.status(400).send('No file uploaded');
  }

  // Upload image to ImageKit
  imagekit.upload({
      file: file.buffer.toString('base64'), // Convert buffer to base64
      fileName: file.originalname,          // Original file name
      folder: '/uploads',                   // (Optional) Folder path in ImageKit
  }, function (error, result) {
      if (error) {
          return res.status(500).json({ error: 'Image upload failed', details: error.message });
      }

      // Send back the image URL
      return res.status(200).json({ url: result.url });
  });
});



// Route to add a book to the wishlist
app.post('/saveWishlist', async (req, res) => {
  const { userId, book } = req.body;

  // Validate request body
  if (!userId || !book || !book._id || !book.title) {
    return res.status(400).json({ error: 'Missing required fields: userId or book details' });
  }

  try {
    const wishlistItem = {
      userId,
      itemId: book._id, // Assuming you want to store the book ID
      itemType: 'book', // Indicating the type of item
      addedDate: new Date(),
      bookDetails: book // Storing the entire book object
    };

    const result = await wishlistCollection.insertOne(wishlistItem);
    res.status(201).json({ status:200, message: 'Item added to wishlist successfully', wishlistId: result.insertedId });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    res.status(500).json({ error: 'Failed to add item to wishlist' });
  }
});

// Route to get all wishlist items for a user
app.get('/getWishlist/:userId', async (req, res) => {
  const userId = req.params.userId;

  try {
    const wishlistItems = await wishlistCollection.find({ userId }).toArray();
    res.status(200).json(wishlistItems);
  } catch (error) {
    console.error("Error retrieving wishlist:", error);
    res.status(500).json({ error: 'Failed to retrieve wishlist' });
  }
});

// Route to delete an item from the wishlist
app.delete('/removeWishlist/:id', async (req, res) => {
  const wishlistId = req.params.id;

  try {
    const result = await wishlistCollection.deleteOne({ _id: new ObjectId(wishlistId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Wishlist item not found' });
    }

    res.status(200).json({ message: 'Wishlist item deleted successfully' });
  } catch (error) {
    console.error("Error deleting wishlist item:", error);
    res.status(500).json({ error: 'Failed to delete wishlist item' });
  }
});
  



// ************************Email Register With OTP ******************************
// Transporter for Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // Use your email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// User registration endpoint
app.post('/register', async (req, res) => {
  const { email, password, confirmPassword } = req.body;

  // Basic validation
  if (!email || !password || password !== confirmPassword) {
    return res.status(400).json({ message: 'Invalid input' });
  }

  // Generate a random OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP in MongoDB with an expiration time
  const otpCollection = client.db('aarsha').collection('otp');
  const expirationTime = new Date(Date.now() + 10 * 60 * 1000); // 1 minute from now

  await otpCollection.updateOne(
    { email },
    { $set: { otp, expiresAt: expirationTime } },
    { upsert: true }
  );

  // Send OTP to user's email
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your AARSHA OTP Code',
    text: `Your OTP code is ${otp}. It will expire in 1 minute.`,
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; border-radius: 8px;">
        <h2 style="color: #333;">Your OTP Code</h2>
        <p style="font-size: 18px; color: #555;">
          Your OTP code is <strong style="font-size: 24px; color: #007BFF;">${otp}</strong>.
        </p>
        <p style="color: #555;">It will expire in 1 minute.</p>
        <p style="font-size: 14px; color: #888;">If you did not request this, please ignore this email.</p>
      </div>
    `,
  };

  transporter.sendMail(mailOptions, (error) => {
    if (error) {
      return res.status(500).json({ message: 'Error sending OTP' });
    }
    res.status(200).json({ status: 200, message: 'OTP sent to your email' });
  });
});

// OTP verification endpoint
app.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  // Retrieve OTP from MongoDB
  const otpCollection = client.db('aarsha').collection('otp');
  const otpRecord = await otpCollection.findOne({ email });

  // Check if OTP exists and matches, and ensure it hasn't expired
  if (otpRecord && otpRecord.otp === otp && new Date() < otpRecord.expiresAt) {
    await otpCollection.deleteOne({ email }); // Clear OTP after verification

    // Create JWT token
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    return res.status(200).json({ status: 200, message: 'OTP verified successfully', token });
  }

  res.status(400).json({ status: 400, message: 'Invalid or expired OTP' });
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
