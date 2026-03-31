const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create sequelize instance
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Define models directly in database.js
const User = sequelize.define('User', {
  user_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  university_id: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  first_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  last_name: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('student', 'librarian', 'admin'),
    allowNull: false,
    defaultValue: 'student'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  department: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

const Book = sequelize.define('Book', {
  book_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  isbn: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  author: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  publisher: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  publication_year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  edition: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  subject: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  language: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'English'
  },
  format: {
    type: DataTypes.ENUM('physical', 'digital', 'both'),
    allowNull: false,
    defaultValue: 'physical'
  },
  cover_image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  total_copies: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  available_copies: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  shelf_location: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  digital_file_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'books',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Copy = sequelize.define('Copy', {
  copy_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  barcode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM('available', 'checked_out', 'reserved', 'damaged', 'lost'),
    allowNull: false,
    defaultValue: 'available'
  },
  acquisition_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  purchase_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'copies',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Loan = sequelize.define('Loan', {
  loan_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  checkout_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  return_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  fine_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00
  },
  fine_paid: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('active', 'returned', 'overdue', 'lost'),
    defaultValue: 'active'
  },
  renew_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
}, {
  tableName: 'loans',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Reservation = sequelize.define('Reservation', {
  reservation_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  reservation_date: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expiry_date: {
    type: DataTypes.DATE,
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'fulfilled', 'expired', 'cancelled'),
    defaultValue: 'pending'
  },
  pickup_date: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'reservations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const Incident = sequelize.define('Incident', {
  incident_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {
    type: DataTypes.ENUM('noise', 'lighting', 'furniture', 'disruption', 'cleanliness', 'temperature', 'other'),
    allowNull: false,
    defaultValue: 'other'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'assigned', 'in_progress', 'resolved', 'closed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    allowNull: false,
    defaultValue: 'medium'
  },
  reporter_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  staff_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  image_url: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  resolved_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'incidents',
  timestamps: true,
  createdAt: 'reported_at',
  updatedAt: 'updated_at'
});

// Define associations
Book.hasMany(Copy, { foreignKey: 'book_id', as: 'copies' });
Copy.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

User.hasMany(Loan, { foreignKey: 'user_id', as: 'loans' });
Loan.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Copy.hasMany(Loan, { foreignKey: 'copy_id', as: 'loanHistory' });
Loan.belongsTo(Copy, { foreignKey: 'copy_id', as: 'copy' });

User.hasMany(Reservation, { foreignKey: 'user_id', as: 'reservations' });
Reservation.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Book.hasMany(Reservation, { foreignKey: 'book_id', as: 'reservations' });
Reservation.belongsTo(Book, { foreignKey: 'book_id', as: 'book' });

User.hasMany(Incident, { foreignKey: 'reporter_id', as: 'reportedIncidents' });
Incident.belongsTo(User, { foreignKey: 'reporter_id', as: 'reporter' });

User.hasMany(Incident, { foreignKey: 'assigned_staff_id', as: 'assignedIncidents' });
Incident.belongsTo(User, { foreignKey: 'assigned_staff_id', as: 'assignedStaff' });

User.belongsToMany(Book, { through: Reservation, foreignKey: 'user_id', otherKey: 'book_id', as: 'reservedBooks' });
Book.belongsToMany(User, { through: Reservation, foreignKey: 'book_id', otherKey: 'user_id', as: 'reservedByUsers' });

// Test database connection and sync
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✓ Database connection has been established successfully.');
    
    // Sync all models (create tables if they don't exist)
    console.log('🔄 Starting database synchronization...');

    // Try to align existing schema with models without dropping tables.
    // `alter: true` will attempt to add/remove columns to match models.
    // NOTE: Use with caution in production — prefer migrations for schema changes.
    await sequelize.sync({ alter: true });

    console.log('✅ Database tables synchronized successfully (alter applied).');
  } catch (error) {
    console.error('❌ Error during database operation:');
    console.error('Error message:', error.message);
    if (error.parent) {
      console.error('SQL Error:', error.parent.sqlMessage);
      console.error('SQL Code:', error.parent.code);
    }
  }
};

module.exports = {
  sequelize,
  testConnection,
  User,
  Book,
  Copy,
  Loan,
  Reservation,
  Incident
};