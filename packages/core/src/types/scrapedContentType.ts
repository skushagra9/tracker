export interface ScrapedContent {
    url: string;
    title: string;
    description: string;
    paragraphs: string[];
    keywords: string[];
    metaTags: Record<string, string>;
    links: string[];
    fullText: string;
  }
  