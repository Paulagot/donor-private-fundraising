import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './lib/config';
import { arciumRouter } from './routes/arcium';

const app = express();

// Middleware
app.use(express.json());
app.use(
  cors({
    origin: config.publicWebsiteOrigin,
    credentials: false,
  })
);

// Rate limiter: limit /arcium/verify requests per IP per minute
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/arcium/verify', limiter);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Mount routes
app.use('/arcium', arciumRouter);

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Cypherpunk Tip Jar API listening on port ${PORT}`);
});