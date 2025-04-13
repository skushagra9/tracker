import { AnalysisResult, Report } from '@repo/core';
import { Logger } from '../utils/logger';

export function generateReport(
  insights: AnalysisResult, 
  inputValue: string,
  inputType: string
): Report {
  Logger.info(`Generating report for ${inputType}: ${inputValue}`);
  
  const reportId = generateReportId();
  const recommendations = generatePrioritizedRecommendations(insights);
  
  const missingKeywords = identifyMissingKeywords(
    insights.keywords.fromContent,
    insights.keywords.common.map(k => k.keyword)
  );
    
  const modelBreakdown = generateModelBreakdown(insights);
  
  const report: Report = {
    id: reportId,
    timestamp: new Date().toISOString(),
    inputValue,
    inputType,
    summary: {
      visibilityScore: Math.round(insights.overallVisibility.score),
      visibilityAssessment: insights.overallVisibility.assessment,
      sentimentScore: parseFloat(insights.sentimentStats.averageScore.toFixed(2)),
      sentimentAssessment: insights.modelComparison[0]?.sentimentAssessment || '',
      keywordCount: insights.keywords.common.length,
      brandMentions: {
        average: Math.round(insights.mentionStats.averageCount),
        max: insights.mentionStats.maxCount,
        min: insights.mentionStats.minCount,
        byModel: insights.mentionStats.byModel
      },
    },
    aiVisibility: {
      overallScore: Math.round(insights.overallVisibility.score),
      byModel: insights.sentimentStats.byModel.map(model => ({
        model: model.model,
        score: Math.round(insights.modelComparison[model.model]?.visibilityScore || 0),
        assessment: insights.modelComparison[model.model]?.visibilityAssessment || ''
      }))
    },
    brandMentions: {
      count: Math.round(insights.mentionStats.averageCount),
      contexts: Object.keys(insights.modelComparison).slice(0, 10),
      byModel: insights.mentionStats.byModel.map(m => ({
        model: m.model,
        count: m.count,
        contexts: Object.keys(insights.modelComparison).slice(0, 10)
      }))
    },
    sentiment: {
      score: parseFloat(insights.sentimentStats.averageScore.toFixed(2)),
      assessment: insights.modelComparison[0]?.sentimentAssessment || '',
      byModel: insights.sentimentStats.byModel
    },
    contentGaps: insights.contentGaps,
    keywords: {
      top: insights.keywords.common.slice(0, 10),
      aiGenerated: insights.keywords.common.slice(0, 20),
      contentBased: insights.keywords.fromContent,
      missingKeywords
    },
    strengths: insights.strengths.slice(0, 10),
    weaknesses: insights.weaknesses.slice(0, 10),
    technicalIssues: insights.technicalIssues.slice(0, 10),
    recommendations,
    competitiveInsights: insights.competitiveInsights,
    modelComparison: {
      modelBreakdown
    }
  };
  return report;
}

function generateReportId(): string {
  return `report_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function generatePrioritizedRecommendations(insights: AnalysisResult) {
  const recommendations: Report['recommendations'] = [];
  const modelCount = Object.keys(insights.modelComparison).length;
  
  insights.contentRecommendations.forEach((rec, index) => {
    const priority: 'high' | 'medium' | 'low' = 
      index < 3 ? 'high' : (index < 7 ? 'medium' : 'low');
    
    const impact = Math.min(100, Math.round((rec.frequency / modelCount) * 100));
    
    let difficulty = 50; // Default medium difficulty
    
    const easyTerms = ['update', 'add', 'improve', 'enhance', 'optimize'];
    const hardTerms = ['redesign', 'restructure', 'overhaul', 'rebuild', 'complex'];
    
    if (easyTerms.some(term => rec.recommendation.toLowerCase().includes(term))) {
      difficulty = Math.max(20, difficulty - 20);
    }
    
    if (hardTerms.some(term => rec.recommendation.toLowerCase().includes(term))) {
      difficulty = Math.min(90, difficulty + 20);
    }
    
    recommendations.push({
      priority,
      category: 'content',
      recommendation: rec.recommendation,
      impact,
      difficulty,
      models: rec.models
    });
  });
  
  // Technical recommendations from issues
  insights.technicalIssues.forEach(issue => {
    recommendations.push({
      priority: issue.priority,
      category: 'technical',
      recommendation: `Fix: ${issue.issue}`,
      impact: Math.min(100, Math.round((issue.frequency / modelCount) * 100)),
      difficulty: issue.priority === 'high' ? 70 : (issue.priority === 'medium' ? 50 : 30),
      models: issue.models
    });
  });
  
  const missingKeywords = identifyMissingKeywords(
    insights.keywords.fromContent,
    insights.keywords.common.map(k => k.keyword)
  );
  
  if (missingKeywords.length > 0) {
    recommendations.push({
      priority: 'high',
      category: 'keywords',
      recommendation: `Optimize content for these keywords: ${missingKeywords.slice(0, 5).join(', ')}`,
      impact: 80,
      difficulty: 40,
      models: Object.keys(insights.modelComparison)
    });
  }
  
  return recommendations
    .sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      
      if (priorityDiff !== 0) return priorityDiff;
      
      return b.impact - a.impact;
    })
    .slice(0, 15);
}

function identifyMissingKeywords(contentKeywords: string[], aiKeywords: string[]): string[] {
  const aiKeywordsLower = aiKeywords.map(k => k.toLowerCase());
  
  return contentKeywords
    .filter(keyword => !aiKeywordsLower.includes(keyword.toLowerCase()))
    .slice(0, 10);
}

function generateModelBreakdown(insights: AnalysisResult) {
  const modelBreakdown: Record<string, any> = {};
  
  Object.keys(insights.modelComparison).forEach(model => {
    const modelData = insights.modelComparison[model];
    
    const uniqueStrengths = modelData?.strengths.filter(strength => 
      !Object.keys(insights.modelComparison)
        .filter(m => m !== model)
        .some(otherModel => 
          insights.modelComparison[otherModel]?.strengths?.includes(strength)
        )
    );
    
    const uniqueWeaknesses = modelData?.weaknesses.filter(weakness => 
      !Object.keys(insights.modelComparison)
        .filter(m => m !== model)
        .some(otherModel => 
          insights.modelComparison[otherModel]?.weaknesses?.includes(weakness)
        )
    );
    
    const uniqueKeywords = modelData?.keywords.filter(keyword => 
      !Object.keys(insights.modelComparison)
        .filter(m => m !== model)
        .some(otherModel => 
          insights.modelComparison[otherModel]?.keywords?.includes(keyword)
        )
    );
    
    modelBreakdown[model] = {
      visibilityScore: modelData?.visibilityScore || 0,
      sentimentScore: modelData?.sentimentScore || 0,
      uniqueStrengths: uniqueStrengths?.slice(0, 5),
      uniqueWeaknesses: uniqueWeaknesses?.slice(0, 5),
      uniqueKeywords: uniqueKeywords?.slice(0, 5)
    };
  });
  
  return modelBreakdown;
}
