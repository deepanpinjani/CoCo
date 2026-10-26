import mysql from 'mysql2/promise';

// Hosted MySQL (Aiven, Railway...) needs SSL. Paste the provider's CA certificate
// into DB_SSL_CA to verify the connection; without it the link is encrypted only.
function sslConfig() {
  if (process.env.DB_SSL !== 'true') return undefined;
  const ca = process.env.DB_SSL_CA?.replace(/\\n/g, '\n');
  return ca ? { ca } : { rejectUnauthorized: false };
}

// Reuse one pool across hot reloads / warm serverless invocations
const g = globalThis;

export const pool =
  g._cocoPool ??
  mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: sslConfig(),
    waitForConnections: true,
    connectionLimit: 5,
    decimalNumbers: true, // return DECIMAL as numbers, not strings
  });

g._cocoPool = pool;
