export interface AnalysisResult {
    brandName: string;
    overallVisibility: {
      score: number;  // 0-100
      assessment: string;
    };
    mentionStats: {
      averageCount: number;
      maxCount: number;
      minCount: number;
      byModel: {
        model: string;
        count: number;
      }[];
    };
    sentimentStats: {
      averageScore: number;  // -1 to 1
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
      common: {
        keyword: string;
        frequency: number;
        models: string[];
      }[];
      fromContent: string[];
      uniqueByModel: {
        model: string;
        keywords: string[];
      }[];
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
    contentRecommendations: {
      recommendation: string;
      frequency: number;
      models: string[];
    }[];
    competitiveInsights: {
      byModel: {
        model: string;
        insight: string;
      }[];
      summary: string;
    };
    modelComparison: Record<string, {
      strengths: string[];
      weaknesses: string[];
      keywords: string[];
      technicalIssues: string[];
      contentRecommendations: string[];
      competitiveInsights: string;
      visibilityScore: number;
      sentimentScore: number;
      visibilityAssessment: string;
      sentimentAssessment: string;
      mentionCount: number;
    }>;
  }

