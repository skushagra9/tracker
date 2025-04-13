import express, { Application } from 'express';
import cors from 'cors';

import { Logger } from './utils/logger';
import { 
  PORT, 
} from './utils/env';
import trackerRouter from './router/trackerRoutes';
const app: Application = express();

app.use(express.json());
app.use(cors());

app.use("/tracker", trackerRouter);

app.listen(PORT, () => {
  Logger.info(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

export default app;