import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ScrapedContent } from '@repo/core';
import { scrapeWebsite } from '../services/scraper';
import { queryLLMs } from '../services/llmService';
import { generateReport } from '../services/reportGenerator';
import { analyzeBrand } from '../services/analysisService';
import { analyzeResponses } from '../services/responseAnalysis';
import { Logger } from '../utils/logger';
import getPrismaInstance from '@repo/database';

const router: express.Router = express.Router();
const prisma = getPrismaInstance();

router.post('/analyze-async', async (req: Request, res: Response) => {
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
      
      await prisma.request.update({
        where: { jobId },
        data: { progress: 30 }
      });
      
      const llmResponses = await queryLLMs(
        content,
        selectedLLMs,
      );
      
      await prisma.request.update({
        where: { jobId },
        data: { progress: 60 }
      });
      
      const insights = await analyzeResponses(
        llmResponses, 
        content, 
        inputType === 'brand' ? input : content.title
      );

      
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

router.get('/job-status/:jobId', async (req: Request, res: Response) => {
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

router.get('/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Server is running' });
});

export default router; 