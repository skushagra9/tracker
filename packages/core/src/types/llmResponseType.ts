
export interface LLMResponse {
    model: string;
    provider: string;
    parsed: {
      mentions: {
        count: number;
        contexts: string[];
      };
      sentiment: {
        score: number; // -1 to 1
        assessment: string;
      };
      strengths: string[];
      weaknesses: string[];
      keywords: string[];
      contentRecommendations: string[];
      technicalIssues: string[];
      competitiveInsights: string;
      visibility: {
        score: number; // 0-100
        assessment: string;
      };
    };
  }
  