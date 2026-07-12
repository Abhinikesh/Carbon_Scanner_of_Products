const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiters');
const hpp = require('hpp');
const sanitize = require('./src/middleware/sanitize');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Trust proxy for rate limit and secure cookies
app.set('trust proxy', 1);

// Security & Parsing Middleware
app.use(
  cors({
    origin: ['http://localhost:5173', 'https://carbonscanner.vercel.app'],
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet());
app.use(sanitize);
app.use(hpp());
app.use(morgan('dev'));
app.use('/api', apiLimiter);

// Mount original routes
app.use('/api/auth', require('./src/routes/authRoutes'));
app.use('/api/scans', require('./src/routes/scanRoutes'));
app.use('/api/user', require('./src/routes/userRoutes'));
app.use('/api/users', require('./src/routes/userRoutes'));
app.use('/api/carbon', require('./src/routes/carbonRoutes'));
app.use('/api/recycle', require('./src/routes/recycleRoutes'));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date()
  });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend working' });
});

app.get('/', (req, res) => {
  res.status(200).send('Climate Lens server is running');
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Centralized Error Handler Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Startup Secret Check
const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const isPlaceholder = 
  accessSecret === 'replace_with_random_long_string' || 
  refreshSecret === 'replace_with_different_random_long_string';

if (!accessSecret || !refreshSecret || isPlaceholder) {
  console.warn(
    '\x1b[31m%s\x1b[0m', // red text formatting
    'WARNING: You are using a default/placeholder JWT secret. Generate real random secrets before deploying this anywhere public.'
  );
}

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Process terminated.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});
