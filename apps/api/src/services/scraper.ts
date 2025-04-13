import axios from 'axios';
import * as cheerio from 'cheerio';
import { ScrapedContent } from '@repo/core';
import { USER_AGENT } from '../utils/consts';
import { Logger } from '../utils/logger';

export async function scrapeWebsite(url: string): Promise<ScrapedContent> {
  if (!url) {
    throw new Error('URL is required');
  }
  
  try {
    if (!url.startsWith('http')) {
      url = 'https://' + url;
    }

    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
      },
      timeout: 15000
    });
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    const title = $('title').text().trim() || url;
    const description = $('meta[name="description"]').attr('content') || '';
    
    const paragraphs = $('p').map((_, el) => $(el).text().trim()).get().filter(Boolean);
    const fullText = $('body').text().replace(/\s+/g, ' ').trim();
    
    const links = $('a').map((_, el) => {
      const href = $(el).attr('href');
      if (!href) return null;
      try {
        return new URL(href, url).toString();
      } catch {
        return href;
      }
    }).get().filter(Boolean);
    
    const metaTags: Record<string, string> = {};
    $('meta').each((_, el) => {
      const name = $(el).attr('name') || $(el).attr('property');
      const content = $(el).attr('content');
      if (name && content) {
        metaTags[name] = content;
      }
    });
    
    const keywordsMeta = $('meta[name="keywords"]').attr('content') || '';
    const keywords = keywordsMeta ? 
      keywordsMeta.split(',').map(k => k.trim()).filter(Boolean) : 
      extractKeywordsFromContent(fullText);

    Logger.info(`Successfully scraped website: ${url}`);
    
    return {
      url,
      title,
      description,
      paragraphs,
      keywords,
      metaTags,
      links,
      fullText: fullText.substring(0, 10000),   
    };
  } catch (error: any) {
    Logger.error(`Error scraping website: ${error.message}`);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

function extractKeywordsFromContent(text: string): string[] {
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
    .filter(word => !['and', 'the', 'that', 'this', 'with', 'for', 'from', 'have', 'what'].includes(word));
  
  const wordCounts = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}