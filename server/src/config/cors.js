/**
 * CORS configuration for the server.
 */


const clientAppUrl = (process.env.REACT_APP_URL || '').trim().replace(/\/+$/, '');
const allowedOrigins = [
  clientAppUrl,
  'http://localhost:3000',
  'http://localhost:1234',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:1234',
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  exposedHeaders: ['set-cookie'],
};

module.exports = { corsOptions };
