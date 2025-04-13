import { AnalysisResult, LLMResponse, ScrapedContent } from "@repo/core";
import { Logger } from "../utils/logger";

export async function analyzeResponses(
    llmResponses: LLMResponse[],
    content: ScrapedContent,
    brandName: string
): Promise<AnalysisResult> {
    Logger.info(`Analyzing responses from ${llmResponses.length} LLMs for ${brandName}`);

    const analysisResult: AnalysisResult = {
        brandName,
        overallVisibility: {
            score: 0,
            assessment: ''
        },
        sentimentStats: {
            averageScore: 0,
            byModel: []
        },
        mentionStats: {
            averageCount: 0,
            maxCount: 0,
            minCount: 0,
            byModel: []
        },
        keywords: {
            common: [],
            fromContent: [],
            uniqueByModel: []
        },
        strengths: [],
        weaknesses: [],
        contentGaps: [],
        contentRecommendations: [],
        technicalIssues: [],
        competitiveInsights: {
            byModel: [],
            summary: ''
        },
        modelComparison: {},
    };

    llmResponses.forEach(response => {
        analysisResult.modelComparison[response.model] = {
            visibilityScore: response.parsed.visibility.score,
            visibilityAssessment: response.parsed.visibility.assessment,
            sentimentScore: response.parsed.sentiment.score,
            sentimentAssessment: response.parsed.sentiment.assessment,
            strengths: response.parsed.strengths || [],
            weaknesses: response.parsed.weaknesses || [],
            keywords: response.parsed.keywords || [],
            technicalIssues: response.parsed.technicalIssues || [],
            contentRecommendations: response.parsed.contentRecommendations || [],
            competitiveInsights: response.parsed.competitiveInsights || '',
            mentionCount: response.parsed.mentions.count || 0,
        };

        analysisResult.strengths.push(...(response.parsed.strengths || []).map(s => ({
            item: s,
            models: [response.model],
            frequency: 1
        })));

        analysisResult.weaknesses.push(...(response.parsed.weaknesses || []).map(w => ({
            item: w,
            models: [response.model],
            frequency: 1
        })));

        analysisResult.technicalIssues.push(...(response.parsed.technicalIssues || []).map(i => ({
            issue: i,
            models: [response.model],
            frequency: 1,
            priority: determinePriority(i)
        })));

        analysisResult.contentRecommendations.push(...(response.parsed.contentRecommendations || []).map(r => ({
            recommendation: r,
            models: [response.model],
            frequency: 1
        })));

        if (response.parsed.competitiveInsights) {
            analysisResult.competitiveInsights.byModel.push({
                insight: response.parsed.competitiveInsights,
                model: response.model
            });
        }
    });

    analysisResult.strengths = consolidateItems(analysisResult.strengths, 'item');
    analysisResult.weaknesses = consolidateItems(analysisResult.weaknesses, 'item');
    analysisResult.technicalIssues = consolidateItems(analysisResult.technicalIssues, 'issue');
    analysisResult.contentRecommendations = consolidateItems(analysisResult.contentRecommendations, 'recommendation');

    analysisResult.keywords.fromContent = extractKeywordsFromContent(content);

    const allKeywords = llmResponses
        .flatMap(r => (r.parsed.keywords || []).map(k => ({
            keyword: k,
            models: [r.model],
            frequency: 1
        })));

    analysisResult.keywords.common = consolidateItems(allKeywords, 'keyword');

    const visibilityScores = Object.values(analysisResult.modelComparison)
        .map(m => m.visibilityScore);

    analysisResult.overallVisibility = {
        score: visibilityScores.length ?
            visibilityScores.reduce((a, b) => a + b, 0) / visibilityScores.length : 0,
        assessment: analysisResult.modelComparison[0]?.visibilityAssessment || ''
    };


    const sentimentScores = Object.values(analysisResult.modelComparison)
        .map(m => m.sentimentScore);

    analysisResult.sentimentStats = {
        averageScore: sentimentScores.length ?
            sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length : 0,
        byModel: Object.entries(analysisResult.modelComparison).map(([model, data]) => ({
            model,
            score: data.sentimentScore,
            assessment: data.sentimentAssessment
        }))
    };

    const mentionScores = Object.values(analysisResult.modelComparison)
        .map(m => m.mentionCount);

    analysisResult.mentionStats = {
        averageCount: mentionScores.length ?
            mentionScores.reduce((a, b) => a + b, 0) / mentionScores.length : 0,
        maxCount: Math.max(...mentionScores),
        minCount: Math.min(...mentionScores),
        byModel: Object.entries(analysisResult.modelComparison).map(([model, data]) => ({
            model,
            count: data.mentionCount
        }))
    };

    analysisResult.contentGaps = identifyContentGaps(analysisResult);

    return analysisResult;
}

function determinePriority(issue: string): 'high' | 'medium' | 'low' {
    const highPriorityTerms = ['critical', 'severe', 'urgent', 'broken', 'error', '404', 'security'];
    const mediumPriorityTerms = ['improve', 'enhance', 'missing', 'fix', 'update'];

    if (highPriorityTerms.some(term => issue.toLowerCase().includes(term))) {
        return 'high';
    }

    if (mediumPriorityTerms.some(term => issue.toLowerCase().includes(term))) {
        return 'medium';
    }
    return 'low';
}

function consolidateItems<T extends { [key: string]: any }>(
    items: T[],
    keyField: keyof T
): any[] {
    const consolidatedMap = new Map<string, T>();

    items.forEach(item => {
        const key = item[keyField].toString().toLowerCase();

        if (consolidatedMap.has(key)) {
            const existing = consolidatedMap.get(key)!;
            const updatedItem = {
                ...existing,
                frequency: (existing.frequency || 0) + 1,
                models: [...new Set([...(existing.models || []), ...(item.models || [])])]
            };
            consolidatedMap.set(key, updatedItem);
        } else {
            consolidatedMap.set(key, {
                ...item,
                frequency: item.frequency || 1,
                models: [...(item.models || [])]
            });
        }
    });

    return Array.from(consolidatedMap.values())
        .sort((a, b) => b.frequency - a.frequency);
}

function extractKeywordsFromContent(content: ScrapedContent): string[] {
    const text = `${content.title} ${content.description} ${content.fullText}`;

    const words = text.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !['and', 'the', 'that', 'this', 'with', 'for', 'from'].includes(word));

    const wordCounts = words.reduce((acc, word) => {
        acc[word] = (acc[word] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([word]) => word);
}


function identifyContentGaps(analysis: AnalysisResult): { gap: string; impact: number; recommendation: string; }[] {
    const contentGaps = new Set<string>();

    analysis.weaknesses
        .filter(w => w.frequency > 1)
        .forEach(w => {
            const weakness = w.item.toLowerCase();
            if (weakness.includes('missing') ||
                weakness.includes('lack of') ||
                weakness.includes('no ') ||
                weakness.includes('insufficient')) {
                contentGaps.add(w.item);
            }
        });

    analysis.contentRecommendations
        .filter(r => r.frequency > 1)
        .forEach(r => {
            const rec = r.recommendation.toLowerCase();
            if (rec.includes('add') ||
                rec.includes('include') ||
                rec.includes('create') ||
                rec.includes('develop')) {
                contentGaps.add(r.recommendation);
            }
        });

    return Array.from(contentGaps)
        .slice(0, 15)
        .map(gap => ({
            gap,
            impact: 3,
            recommendation: `Consider addressing: ${gap}`
        }));
}

