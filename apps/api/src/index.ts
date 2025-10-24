import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './lib/config';
import { arciumRouter } from './routes/arcium';


const app = express();

// JSON first
app.use(express.json());

// Build the cors options once
const allowAll = config.allowedOrigins.includes('*');
const corsOptions = {
  origin: (origin: string | undefined, callback: any) => {
    if (!origin) return callback(null, true);                    // same-origin / curl
    if (allowAll) return callback(null, true);                   // wildcard
    if (config.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: false,
};

// ✅ Apply CORS globally
app.use(cors(corsOptions));

// ✅ Explicitly handle preflight for /arcium/* BEFORE any limiter
app.options('/arcium/*', cors(corsOptions));

// Optional: tiny logger to confirm OPTIONS/POST hit
app.use((req, _res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// ✅ Rate limiter: DO NOT throttle OPTIONS
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, _res) => req.method === 'OPTIONS',  // <- important
});

// Apply limiter to the POST
app.use('/arcium/verify', limiter);

// Health
app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });

// Routes
app.use('/arcium', arciumRouter);

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Cypherpunk Tip Jar API listening on port ${PORT}`);
});