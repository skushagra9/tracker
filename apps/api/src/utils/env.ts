import dotenv from 'dotenv';

dotenv.config();

export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const PORT = process.env.PORT;

export const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
export const SCRAPER_TIMEOUT = parseInt(process.env.SCRAPER_TIMEOUT || '30000', 10);

export const NODE_ENV = process.env.NODE_ENV || 'development';