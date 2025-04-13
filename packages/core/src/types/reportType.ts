export interface Report {
    id: string;
    timestamp: string;
    inputValue: string;
    inputType: string;
    summary: {
      visibilityScore: number;  // 0-100
      visibilityAssessment: string;
      sentimentScore: number;  // -1 to 1
      sentimentAssessment: string;
      keywordCount: number;
      brandMentions: {
        average: number;
        max: number;
        min: number;
        byModel: {
          model: string;
          count: number;
        }[];
      };
    };
    aiVisibility: {
      overallScore: number;
      byModel: {
        model: string;
        score: number;
        assessment: string;
      }[];
      trend?: {
        direction: 'up' | 'down' | 'stable';
        change: number;
      };
    };
    brandMentions: {
      count: number;
      contexts: string[];
      byModel: {
        model: string;
        count: number;
        contexts: string[];
      }[];
    };
    sentiment: {
      score: number;
      assessment: string;
      byModel: {
        model: string;
        score: number;
        assessment: string;
      }[];
    };
    contentGaps: {
      gap: string;
      impact: number;  // 0-100
      recommendation: string;
    }[];
    keywords: {
      top: {
        keyword: string;
        frequency: number;
        models: string[];
      }[];
      aiGenerated: {
        keyword: string;
        frequency: number;
        models: string[];
      }[];
      contentBased: string[];
      missingKeywords: string[];
    };
    strengths: {
      item: string;
      frequency: number;
      models: string[];
    }[];
    weaknesses: {
      item: string;
      frequency: number;
      models: string[];
    }[];
    technicalIssues: {
      issue: string;
      frequency: number;
      models: string[];
      priority: 'high' | 'medium' | 'low';
    }[];
    recommendations: {
      priority: 'high' | 'medium' | 'low';
      category: 'content' | 'technical' | 'keywords' | 'branding';
      recommendation: string;
      impact: number;  // 0-100
      difficulty: number;  // 0-100
      models: string[];
    }[];
    competitiveInsights: {
      summary: string;
      byModel: {
        model: string;
        insight: string;
      }[];
    };
    modelComparison: {
      modelBreakdown: Record<string, {
        visibilityScore: number;
        sentimentScore: number;
        uniqueStrengths: string[];
        uniqueWeaknesses: string[];
        uniqueKeywords: string[];
      }>;
    };
  }
  