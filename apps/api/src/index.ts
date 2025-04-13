import express, { Request, Response, Application } from 'express';
import cors from 'cors';
import { scrapeWebsite } from './services/scraper';
import { queryLLMs } from './services/llmService';
import { generateReport } from './services/reportGenerator';
import { Logger } from './utils/logger';
import { 
  PORT, 
} from './utils/env';
import { v4 as uuidv4 } from 'uuid';
import { ScrapedContent } from '@repo/core';
import { analyzeBrand } from './services/analysisService';
import { analyzeResponses } from './services/responseAnalysis';
import { modelMapping } from './utils/consts';
import getPrismaInstance from '@repo/database';

const prisma = getPrismaInstance();
const app: Application = express();

app.use(express.json());
app.use(cors());

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/available-llms', (req: Request, res: Response) => {
  
  const availableModels = [
    { id: modelMapping.nvidia, name: 'Nvidia', provider: 'OpenRouter' },
    { id: modelMapping['gemini-2.5'], name: 'Gemini 2.5 Pro', provider: 'OpenRouter' },
   
  ];
  
  res.json({ success: true, models: availableModels });
});

app.post('/api/analyze-async', async (req: Request, res: Response) => {
  const jobId = uuidv4();
  
  await prisma.request.create({
    data: {
      jobId,
      status: 'pending',
      progress: 0
    }
  });
  
  res.json({ success: true, jobId });
  
  setTimeout(async () => {
    try {
      console.log(req.body)
      const { 
        input, 
        inputType, 
        selectedLLMs,
      } = req.body;
      
      await prisma.request.update({
        where: { jobId },
        data: {
          status: 'processing',
          progress: 10
        }
      });
      
      let content: ScrapedContent;
      
      if (inputType === 'url') {
        content = await scrapeWebsite(input);
      } else {
        content = await analyzeBrand(input);
      }

      Logger.info(`Scraped content: ${JSON.stringify(content)}`);
      
      await prisma.request.update({
        where: { jobId },
        data: { progress: 30 }
      });
      
      const llmResponses = await queryLLMs(
        content,
        selectedLLMs,
      );

      Logger.info(`LLM responses: ${JSON.stringify(llmResponses)}`);
      
      await prisma.request.update({
        where: { jobId },
        data: { progress: 60 }
      });
      
      const insights = await analyzeResponses(
        llmResponses, 
        content, 
        inputType === 'brand' ? input : content.title
      );

      Logger.info(`Insights: ${JSON.stringify(insights)}`);
      
      await prisma.request.update({
        where: { jobId },
        data: { progress: 80 }
      });
      
      const report = generateReport(insights, input, inputType);
      
      await prisma.report.create({
        data: {
          requestId: jobId,
          content: JSON.stringify(report)
        }
      });
      
      await prisma.request.update({
        where: { jobId },
        data: { 
          status: 'completed',
          progress: 100
        }
      });
      
    } catch (error: any) {
      Logger.error(`Analysis job ${jobId} failed: ${error.message}`);
      await prisma.request.update({
        where: { jobId },
        data: { 
          status: 'failed',
          progress: 100
        }
      });
    }
  }, 0);
});

app.get('/api/job-status/:jobId', async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  if (!jobId) {
    res.status(400).json({ success: false, error: 'Job ID is required' });
    return;
  }

  try {
    const job = await prisma.request.findUnique({
      where: { jobId },
      include: { report: true }
    });
    
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    
    if (job.status === 'completed') {
      res.json({ 
        success: true, 
        status: job.status, 
        progress: job.progress,
        result: { 
          success: true, 
          report: JSON.parse(job.report?.content as string),
          metadata: {
            analysisDate: job.createdAt.toISOString(),
          }
        }
      });
      return;
    }
    
    if (job.status === 'failed') {
      res.json({ 
        success: false, 
        status: job.status, 
        progress: job.progress,
        error: 'Analysis failed'
      });
      return;
    }
    
    res.json({ 
      success: true, 
      status: job.status, 
      progress: job.progress
    });
  } catch (error: any) {
    Logger.error(`Error fetching job status: ${error.message}`);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  Logger.info(`Server running on port ${PORT}`);
});

process.on('SIGTERM', async () => {
  Logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

export default app;