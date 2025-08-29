import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import routes from './routes/index.ts';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'WebArchive API is running!',
    version: '1.0.0',
    endpoints: {
      archive: '/api/archive'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 WebArchive API server running on http://localhost:${PORT}`);
  console.log(`📦 Archive URL: http://localhost:${PORT}/api/archive/url`);
  console.log(`📋 List archives: http://localhost:${PORT}/api/archive/list`);
});

export default app;