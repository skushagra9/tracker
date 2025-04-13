import axios from 'axios';
import { OPENROUTER_API_KEY } from '../utils/env';
import { modelMapping } from '../utils/consts';
import { ScrapedContent, LLMResponse } from '@repo/core';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function queryLLMs(
  content: ScrapedContent,
  selectedModels: string[]
): Promise<LLMResponse[]> {
  const currentDate = new Date().toLocaleDateString();

  const prompt = `
      Current Date: ${currentDate}

    You are an experienced SEO expert analyzing a website or brand. Your task is to perform an in-depth analysis based on the provided scraped content. 
    Consider the following components in your analysis:
      1. SEO strengths and weaknesses
      2. Overall content quality including title, description, header tags (H1s, H2s), and paragraphs
      3. Top keywords that should be targeted based on the content and meta tags
      4. Content strategy recommendations to improve SEO performance
      5. Identification of technical SEO issues
      6. Competitive positioning and insights
      7. Sentiment analysis (scale between -1 and 1) with a corresponding assessment
      8. Visibility assessment (score between 0 and 100) with a textual evaluation
      9. Brand mentions including count and context extraction

    Here is the website content provided as structured JSON:
    ${JSON.stringify(content, null, 2)}

    Please return your analysis formatted as JSON with the exact structure below:
    {
      "strengths": ["strength1", "strength2", ...],
      "weaknesses": ["weakness1", "weakness2", ...],
      "keywords": ["keyword1", "keyword2", ...],
      "contentRecommendations": ["recommendation1", "recommendation2", ...],
      "technicalIssues": ["issue1", "issue2", ...],
      "competitiveInsights": "detailed analysis here",
      "sentiment": {
         "score": number,      // value between -1 and 1
         "assessment": "textual assessment of sentiment"
      },
      "visibility": {
         "score": number,      // value between 0 and 100
         "assessment": "textual evaluation of visibility"
      },
      "mentions": {
         "count": number,
         "contexts": ["context1", "context2", ...]
      }
    }
    Also, please do not be overly harsh when evaluating: if some common elements such as H1 or H2 tags are missing due to imperfect scraping, simply ignore these omissions rather than flagging them as issues.

  `;

  function getDefaultLLMResponse(model: string, errorMsg: string): LLMResponse {
    console.error(`Returning default response for ${model}: ${errorMsg}`);
    return {
      model,
      provider: 'openrouter',
      parsed: {
        mentions: { count: 0, contexts: [] },
        sentiment: { score: 0, assessment: '' },
        strengths: [],
        weaknesses: [],
        keywords: [],
        contentRecommendations: [],
        technicalIssues: [],
        competitiveInsights: '',
        visibility: { score: 0, assessment: '' }
      }
    };
  }

  const responses = await Promise.all(
    selectedModels.map(async (model) => {
      try {
        const openRouterModel =
          modelMapping[model as keyof typeof modelMapping] || model;
        console.log('openRouterModel', openRouterModel);

        const response = await axios.post(
          OPENROUTER_URL,
          {
            model: openRouterModel,
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
          },
          {
            headers: {
              'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('response', response.status, response.data);
        const rawData = response.data;

        const responseContent = rawData.choices[0].message.content;
        let parsedContent: any;
        try {
          parsedContent = JSON.parse(responseContent);
        } catch (e) {
          console.error(
            `Failed to parse JSON from ${model}:`,
            e,
            rawData.choices
          );
          return getDefaultLLMResponse(model, 'JSON parsing failed');
        }

        const llmParsed = {
          mentions: {
            count: parsedContent.mentions?.count || 0,
            contexts: parsedContent.mentions?.contexts || []
          },
          sentiment: {
            score: parsedContent.sentiment?.score || 0,
            assessment: parsedContent.sentiment?.assessment || ''
          },
          strengths: parsedContent.strengths || [],
          weaknesses: parsedContent.weaknesses || [],
          keywords: parsedContent.keywords || [],
          contentRecommendations: parsedContent.contentRecommendations || [],
          technicalIssues: parsedContent.technicalIssues || [],
          competitiveInsights: parsedContent.competitiveInsights || '',
          visibility: {
            score: parsedContent.visibility?.score || 0,
            assessment: parsedContent.visibility?.assessment || ''
          }
        };

        return {
          model,
          provider: 'openrouter',
          parsed: llmParsed
        } as LLMResponse;
      } catch (error) {
        console.error(`Error querying ${model}:`, error);
        return getDefaultLLMResponse(model, 'Request failed');
      }
    })
  );

  return responses;
}
