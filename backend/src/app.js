// Створення та налаштування Express-застосунку (окремо від запуску сервера — для тестів).
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();

  app.use(helmet()); // захисні HTTP-заголовки
  app.use(cors({ origin: config.corsOrigins })); // дозволяємо запити лише з адреси frontend
  app.use(express.json({ limit: '100kb' })); // розбір JSON-тіла запиту
  if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev')); // журнал запитів

  app.use('/api', routes);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
