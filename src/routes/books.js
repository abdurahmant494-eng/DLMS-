const express = require('express');
const router = express.Router();
const { Book, Copy } = require('../config/database');
const { Op } = require('sequelize'); // Add this import

// Get all books with pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows: books } = await Book.findAndCountAll({
      limit,
      offset,
      order: [['created_at', 'DESC']]
    });

    res.json({
      books,
      total: count,
      page,
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get books error:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
});

// Search books
router.get('/search', async (req, res) => {
  try {
    const { q, author, subject, format } = req.query;
    const where = {};

    if (q) {
      where[Op.or] = [
        { title: { [Op.like]: `%${q}%` } },
        { author: { [Op.like]: `%${q}%` } },
        { subject: { [Op.like]: `%${q}%` } }
      ];
    }

    if (author) where.author = { [Op.like]: `%${author}%` };
    if (subject) where.subject = { [Op.like]: `%${subject}%` };
    if (format) where.format = format;

    const books = await Book.findAll({
      where,
      limit: 50
    });

    res.json({ books });
  } catch (error) {
    console.error('Search books error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get single book by ID
router.get('/:id', async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id, {
      include: [
        {
          model: Copy,
          as: 'copies',
          attributes: ['copy_id', 'barcode', 'status', 'acquisition_date']
        }
      ]
    });

    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    res.json({ book });
  } catch (error) {
    console.error('Get book error:', error);
    res.status(500).json({ error: 'Failed to fetch book' });
  }
});

// Create new book (admin/librarian only)
router.post('/', async (req, res) => {
  try {
    const bookData = req.body;
    const book = await Book.create(bookData);

    // If copies are specified, create them
    if (bookData.copies && bookData.copies.length > 0) {
      for (const copyData of bookData.copies) {
        await Copy.create({
          ...copyData,
          book_id: book.book_id
        });
      }
    }

    res.status(201).json({
      message: 'Book created successfully',
      book
    });
  } catch (error) {
    console.error('Create book error:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

// Update book
router.put('/:id', async (req, res) => {
  try {
    const book = await Book.findByPk(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }

    await book.update(req.body);

    res.json({
      message: 'Book updated successfully',
      book
    });
  } catch (error) {
    console.error('Update book error:', error);
    res.status(500).json({ error: 'Failed to update book' });
  }
});

module.exports = router;