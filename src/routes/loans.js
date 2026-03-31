const express = require('express');
const router = express.Router();
const { Loan, Book, Copy, User, sequelize } = require('../config/database');
const { authMiddleware, requireRole } = require('../middleware/auth');
const emailService = require('../services/emailService');
const { Op } = require('sequelize');

// Get all loans (admin/librarian only)
router.get('/', authMiddleware, requireRole(['librarian', 'admin']), async (req, res) => {
  try {
    const { status, user_id, overdue, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (user_id) {
      where.user_id = user_id;
    }
    
    if (overdue === 'true') {
      where.status = 'active';
      where.due_date = {
        [Op.lt]: new Date()
      };
    }

    const { count, rows: loans } = await Loan.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Book,
          attributes: ['book_id', 'title', 'author', 'isbn']
        },
        {
          model: User,
          attributes: ['user_id', 'first_name', 'last_name', 'email', 'university_id']
        },
        {
          model: Copy,
          attributes: ['copy_id', 'barcode']
        }
      ],
      order: [['checkout_date', 'DESC']]
    });

    res.json({
      loans,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error('Get loans error:', error);
    res.status(500).json({ error: 'Failed to fetch loans' });
  }
});

// Checkout a book (student/librarian/admin)
router.post('/checkout', authMiddleware, requireRole(['student', 'librarian', 'admin']), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { book_id, user_id: requestedUserId, due_date } = req.body;
    const requestingUserId = req.user.user_id;
    const requestingUserRole = req.user.role;

    // Validate input
    if (!book_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Book ID is required' });
    }

    // Determine which user to check out for
    let checkoutUserId;
    if (requestingUserRole === 'librarian' || requestingUserRole === 'admin') {
      // Librarians/admins can check out for any user
      checkoutUserId = requestedUserId || requestingUserId;
    } else {
      // Students can only check out for themselves
      checkoutUserId = requestingUserId;
    }

    // Check if user exists and is active
    const user = await User.findByPk(checkoutUserId, { transaction });
    if (!user || !user.is_active) {
      await transaction.rollback();
      return res.status(400).json({ error: 'User not found or inactive' });
    }

    // Check if book exists and has available copies
    const book = await Book.findByPk(book_id, { transaction });
    if (!book) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Book not found' });
    }

    if (book.available_copies < 1) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No available copies of this book' });
    }

    // Check if user has reached loan limit (max 5 books for students)
    if (user.role === 'student') {
      const activeLoansCount = await Loan.count({
        where: {
          user_id: checkoutUserId,
          status: 'active'
        },
        transaction
      });

      if (activeLoansCount >= 5) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Maximum loan limit (5 books) reached' });
      }
    }

    // Find an available copy
    const copy = await Copy.findOne({
      where: {
        book_id,
        status: 'available'
      },
      transaction
    });

    if (!copy) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No available physical copies' });
    }

    // Calculate due date (default 14 days for students, 30 for staff)
    let calculatedDueDate;
    if (due_date) {
      calculatedDueDate = new Date(due_date);
    } else {
      const loanPeriod = user.role === 'student' ? 14 : 30;
      calculatedDueDate = new Date();
      calculatedDueDate.setDate(calculatedDueDate.getDate() + loanPeriod);
    }

    // Create loan record
    const loan = await Loan.create({
      book_id,
      user_id: checkoutUserId,
      copy_id: copy.copy_id,
      checkout_date: new Date(),
      due_date: calculatedDueDate,
      status: 'active',
      renew_count: 0,
      fine_amount: 0.00,
      fine_paid: false
    }, { transaction });

    // Update copy status
    await copy.update({
      status: 'checked_out'
    }, { transaction });

    // Update book available copies
    await book.update({
      available_copies: book.available_copies - 1
    }, { transaction });

    // Commit transaction
    await transaction.commit();

    // Send confirmation email to user
    try {
      await emailService.sendDueDateReminder(user.email, {
        userName: `${user.first_name} ${user.last_name}`,
        bookTitle: book.title,
        dueDate: calculatedDueDate.toLocaleDateString(),
        daysRemaining: Math.ceil((calculatedDueDate - new Date()) / (1000 * 60 * 60 * 24))
      });
    } catch (emailError) {
      console.error('Failed to send checkout email:', emailError);
      // Don't fail the checkout if email fails
    }

    // Get full loan details for response
    const loanWithDetails = await Loan.findByPk(loan.loan_id, {
      include: [
        {
          model: Book,
          attributes: ['title', 'author', 'isbn']
        },
        {
          model: User,
          attributes: ['first_name', 'last_name', 'email']
        },
        {
          model: Copy,
          attributes: ['barcode']
        }
      ]
    });

    res.status(201).json({
      message: 'Book checked out successfully',
      loan: loanWithDetails
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to checkout book', details: error.message });
  }
});

// Return a book (librarian/admin only)
router.post('/:id/return', authMiddleware, requireRole(['librarian', 'admin']), async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const loanId = req.params.id;
    const { condition } = req.body; // 'good', 'damaged', 'lost'

    // Find the loan
    const loan = await Loan.findByPk(loanId, {
      include: [
        {
          model: Book
        },
        {
          model: Copy
        },
        {
          model: User
        }
      ],
      transaction
    });

    if (!loan) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Loan not found' });
    }

    if (loan.status === 'returned') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Book already returned' });
    }

    const returnDate = new Date();
    let fineAmount = 0;
    let copyStatus = 'available';

    // Check if overdue
    if (returnDate > loan.due_date && loan.status === 'active') {
      // Calculate fine: $0.50 per day overdue
      const daysOverdue = Math.ceil((returnDate - loan.due_date) / (1000 * 60 * 60 * 24));
      fineAmount = daysOverdue * 0.50;
    }

    // Update copy status based on condition
    if (condition === 'damaged') {
      copyStatus = 'damaged';
      fineAmount += 10.00; // Damage fee
    } else if (condition === 'lost') {
      copyStatus = 'lost';
      fineAmount = 50.00; // Lost book fee
    }

    // Update loan record
    await loan.update({
      return_date: returnDate,
      status: 'returned',
      fine_amount: fineAmount,
      fine_paid: fineAmount === 0 // Auto-mark as paid if no fine
    }, { transaction });

    // Update copy
    if (loan.Copy) {
      await loan.Copy.update({
        status: copyStatus
      }, { transaction });
    }

    // Update book available copies (only if not lost/damaged beyond repair)
    if (loan.Book && copyStatus === 'available') {
      await loan.Book.update({
        available_copies: loan.Book.available_copies + 1
      }, { transaction });
    }

    await transaction.commit();

    res.json({
      message: 'Book returned successfully',
      loan: {
        loan_id: loan.loan_id,
        return_date: returnDate,
        fine_amount: fineAmount,
        condition: condition || 'good'
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Return book error:', error);
    res.status(500).json({ error: 'Failed to return book' });
  }
});

// Renew a loan (student/librarian/admin)
router.post('/:id/renew', authMiddleware, async (req, res) => {
  try {
    const loanId = req.params.id;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    // Find the loan
    const loan = await Loan.findByPk(loanId, {
      include: [
        {
          model: Book
        },
        {
          model: User
        }
      ]
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Check permissions
    if (userRole === 'student' && loan.user_id !== userId) {
      return res.status(403).json({ error: 'You can only renew your own loans' });
    }

    // Check if loan can be renewed
    if (loan.status !== 'active') {
      return res.status(400).json({ error: 'Only active loans can be renewed' });
    }

    if (loan.renew_count >= 2) {
      return res.status(400).json({ error: 'Maximum renewal limit (2 times) reached' });
    }

    // Check if book has reservations
    const reservationCount = await sequelize.models.Reservation.count({
      where: {
        book_id: loan.book_id,
        status: 'pending'
      }
    });

    if (reservationCount > 0) {
      return res.status(400).json({ error: 'Cannot renew - book has pending reservations' });
    }

    // Calculate new due date (extend by 14 days for students, 30 for staff)
    const userRoleForRenewal = loan.User.role;
    const extensionDays = userRoleForRenewal === 'student' ? 14 : 30;
    const newDueDate = new Date(loan.due_date);
    newDueDate.setDate(newDueDate.getDate() + extensionDays);

    // Update loan
    await loan.update({
      due_date: newDueDate,
      renew_count: loan.renew_count + 1
    });

    res.json({
      message: 'Loan renewed successfully',
      loan: {
        loan_id: loan.loan_id,
        new_due_date: newDueDate,
        renew_count: loan.renew_count
      }
    });

  } catch (error) {
    console.error('Renew loan error:', error);
    res.status(500).json({ error: 'Failed to renew loan' });
  }
});

// Get user's active loans
router.get('/my-loans', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.user_id;
    const { status } = req.query;

    const where = { user_id: userId };
    
    if (status) {
      where.status = status;
    } else {
      // Default to active and overdue
      where[Op.or] = [
        { status: 'active' },
        { status: 'overdue' }
      ];
    }

    const loans = await Loan.findAll({
      where,
      include: [
        {
          model: Book,
          attributes: ['book_id', 'title', 'author', 'isbn', 'cover_image']
        },
        {
          model: Copy,
          attributes: ['barcode']
        }
      ],
      order: [['due_date', 'ASC']]
    });

    // Calculate overdue status
    const loansWithStatus = loans.map(loan => {
      const loanData = loan.toJSON();
      const today = new Date();
      
      if (loan.status === 'active' && loan.due_date < today) {
        loanData.is_overdue = true;
        loanData.days_overdue = Math.ceil((today - loan.due_date) / (1000 * 60 * 60 * 24));
      } else {
        loanData.is_overdue = false;
        loanData.days_overdue = 0;
      }
      
      return loanData;
    });

    res.json({ loans: loansWithStatus });
  } catch (error) {
    console.error('Get my loans error:', error);
    res.status(500).json({ error: 'Failed to fetch your loans' });
  }
});

// Get loan by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const loanId = req.params.id;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    const loan = await Loan.findByPk(loanId, {
      include: [
        {
          model: Book,
          attributes: ['book_id', 'title', 'author', 'isbn', 'subject']
        },
        {
          model: User,
          attributes: ['user_id', 'first_name', 'last_name', 'email', 'university_id']
        },
        {
          model: Copy,
          attributes: ['copy_id', 'barcode', 'status']
        }
      ]
    });

    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Check permissions
    if (userRole === 'student' && loan.user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ loan });
  } catch (error) {
    console.error('Get loan error:', error);
    res.status(500).json({ error: 'Failed to fetch loan' });
  }
});

// Get loan statistics
router.get('/stats/summary', authMiddleware, requireRole(['librarian', 'admin']), async (req, res) => {
  try {
    const today = new Date();
    
    // Get counts
    const totalLoans = await Loan.count();
    const activeLoans = await Loan.count({ where: { status: 'active' } });
    const overdueLoans = await Loan.count({
      where: {
        status: 'active',
        due_date: {
          [Op.lt]: today
        }
      }
    });
    const returnedLoans = await Loan.count({ where: { status: 'returned' } });

    // Get loans by status
    const loansByStatus = await Loan.findAll({
      attributes: ['status', [sequelize.fn('COUNT', sequelize.col('status')), 'count']],
      group: ['status']
    });

    // Get loans by user role
    const loansByUserRole = await Loan.findAll({
      attributes: [[sequelize.literal('User.role'), 'role'], [sequelize.fn('COUNT', sequelize.col('Loan.loan_id')), 'count']],
      include: [{
        model: User,
        attributes: []
      }],
      group: ['User.role']
    });

    // Get recent loans (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentLoans = await Loan.count({
      where: {
        checkout_date: {
          [Op.gte]: thirtyDaysAgo
        }
      }
    });

    // Calculate total fines
    const totalFinesResult = await Loan.findOne({
      attributes: [[sequelize.fn('SUM', sequelize.col('fine_amount')), 'total']],
      where: {
        fine_paid: false
      }
    });

    const totalUnpaidFines = parseFloat(totalFinesResult?.dataValues?.total) || 0;

    res.json({
      summary: {
        totalLoans,
        activeLoans,
        overdueLoans,
        returnedLoans,
        recentLoans,
        totalUnpaidFines
      },
      byStatus: loansByStatus,
      byUserRole: loansByUserRole
    });
  } catch (error) {
    console.error('Get loan stats error:', error);
    res.status(500).json({ error: 'Failed to fetch loan statistics' });
  }
});

// Pay fine for a loan
router.post('/:id/pay-fine', authMiddleware, async (req, res) => {
  try {
    const loanId = req.params.id;
    const { amount } = req.body;
    const userId = req.user.user_id;
    const userRole = req.user.role;

    const loan = await Loan.findByPk(loanId);
    
    if (!loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Check permissions
    if (userRole === 'student' && loan.user_id !== userId) {
      return res.status(403).json({ error: 'You can only pay fines for your own loans' });
    }

    if (loan.fine_paid) {
      return res.status(400).json({ error: 'Fine already paid' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid payment amount required' });
    }

    // Update fine payment
    const newFineAmount = Math.max(0, loan.fine_amount - amount);
    
    await loan.update({
      fine_amount: newFineAmount,
      fine_paid: newFineAmount === 0
    });

    res.json({
      message: 'Payment processed successfully',
      loan: {
        loan_id: loan.loan_id,
        fine_amount: newFineAmount,
        fine_paid: newFineAmount === 0
      }
    });
  } catch (error) {
    console.error('Pay fine error:', error);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

module.exports = router;