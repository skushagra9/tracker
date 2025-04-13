"use client";
import React from 'react';
import { FaInfoCircle, FaDownload, FaExclamationTriangle, FaCheckCircle, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Report } from '@repo/core';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Mapping for platform display names
const MODEL_PLATFORMS = {
  'deepseek-v3': 'DeepSeek',
  'gemini-2.5': 'Gemini',
  'nvidia': 'NVIDIA',
};

interface TooltipProps {
  text: string;
}

const InfoTooltip: React.FC<TooltipProps> = ({ text }) => (
  <div className="group relative inline-block ml-1">
    <FaInfoCircle className="text-gray-400 hover:text-gray-600 cursor-help" size={14} />
    <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible absolute z-10 w-64 p-3 bg-white text-gray-700 text-xs rounded-md shadow-lg transition-opacity duration-200 -left-28 top-6 border border-gray-100">
      {text}
    </div>
  </div>
);

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  tooltip?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, tooltip, color = "text-gray-800" }) => (
  <div className="bg-white rounded-lg p-5 border border-gray-100 shadow-sm">
    <div className="flex items-center mb-1">
      <h3 className="text-sm font-medium text-gray-500">
        {title} {tooltip && <InfoTooltip text={tooltip} />}
      </h3>
    </div>
    <p className={`text-3xl font-bold ${color}`}>{value}</p>
    <p className="text-sm text-gray-500 mt-1">{description}</p>
  </div>
);

const SectionHeader: React.FC<{ title: string, subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-4">
    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
    {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
  </div>
);

interface DashboardProps {
  report: Report;
}

const Dashboard: React.FC<DashboardProps> = ({ report }) => {
  const { inputValue, inputType, timestamp, summary, aiVisibility, sentiment, keywords, strengths, weaknesses, technicalIssues, recommendations, competitiveInsights, modelComparison } = report;

  const modelsMonitored = Object.keys(modelComparison.modelBreakdown).length;
  const getVisibilityColor = (score: number) => {
    if (score < 30) return "text-red-600";
    if (score < 70) return "text-yellow-600";
    return "text-green-600";
  };
  const getSentimentColor = (score: number) => {
    if (score < 0) return "text-red-600";
    if (score === 0) return "text-gray-600";
    return "text-green-600";
  };
  const strengthsList = strengths.map(strength =>
    typeof strength === 'string' ? strength : strength.item
  );

  const weaknessesList = weaknesses.map(weakness =>
    typeof weakness === 'string' ? weakness : weakness.item
  );
  const highPriorityRecs = recommendations.filter(rec => rec.priority === "high").map(rec => rec.recommendation);
  const mediumPriorityRecs = recommendations.filter(rec => rec.priority === "medium").map(rec => rec.recommendation);
  const lowPriorityRecs = recommendations.filter(rec => rec.priority === "low").map(rec => rec.recommendation);

  const competitiveInsightText = competitiveInsights.byModel?.[0]?.insight || "No competitive insights available";
  const keywordItems = keywords.top.map(keyword => {
    const models = Array.isArray(keyword.models) ? keyword.models : [];
    return {
      keyword: keyword.keyword,
      platform: models.map(model => {
        const platformKey = Object.keys(MODEL_PLATFORMS).find(key =>
          model.toLowerCase().includes(key.toLowerCase())
        ) || model;
        return MODEL_PLATFORMS[platformKey as keyof typeof MODEL_PLATFORMS] || model;
      }).join(', '),
      platformKey: models[0] || '',
      visibility: 'Yes',
      mentions: keyword.frequency,
      position: keyword.frequency ? getPosition(keyword.frequency) : 'N/A',
      lastScanned: formatTimestamp(timestamp)
    };
  });
  const technicalIssuesList = technicalIssues?.map(issue => typeof issue === 'string' ? issue : issue.issue) || [];

  return (
    <div className="space-y-8">
      {/* Report Header */}
      <div className="border-b border-gray-200 p-5">
        <h2 className="text-2xl font-semibold text-gray-800">AI Visibility Report</h2>
        <p className="text-sm text-gray-500">
          Analyzed on {new Date(timestamp).toLocaleString()} for <strong>{inputValue}</strong> ({inputType})
        </p>
      </div>

      {/* Executive Summary */}
      <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
        <SectionHeader title="Executive Summary" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Visibility Score"
            value={summary.visibilityScore}
            description={summary.visibilityAssessment}
            tooltip="Overall visibility score across all models"
            color={getVisibilityColor(summary.visibilityScore)}
          />
          <StatCard
            title="Sentiment Score"
            value={summary.sentimentScore}
            description={summary.sentimentAssessment}
            tooltip="How positive or negative your brand perception appears"
            color={getSentimentColor(summary.sentimentScore)}
          />
          <StatCard
            title="Brand Mentions"
            value={summary.brandMentions.average}
            description={`Across ${modelsMonitored} model${modelsMonitored !== 1 ? 's' : ''}`}
            tooltip="Average number of brand mentions detected"
          />
          <StatCard
            title="Keywords Found"
            value={summary.keywordCount}
            description="Unique keywords detected"
            tooltip="Total number of unique keywords found"
          />
        </div>
      </div>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="flex items-center mb-4">
            <FaCheckCircle className="text-green-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">Strengths</h3>
          </div>
          {strengthsList.length > 0 ? (
            <ul className="space-y-2">
              {strengthsList.map((strength, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex">
                  <span className="text-green-500 mr-2">+</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No strengths detected</p>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <div className="flex items-center mb-4">
            <FaExclamationTriangle className="text-yellow-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-800">Weaknesses</h3>
          </div>
          {weaknessesList.length > 0 ? (
            <ul className="space-y-2">
              {weaknessesList.map((weakness, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex">
                  <span className="text-red-500 mr-2">-</span>
                  <span>{weakness}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No weaknesses detected</p>
          )}
        </div>
      </div>

      {/* Technical Issues */}
      {technicalIssuesList.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Technical Issues" subtitle="Issues that may affect your online visibility" />
          <ul className="space-y-2">
            {technicalIssuesList.map((issue, idx) => (
              <li key={idx} className="text-sm text-gray-700 bg-red-50 p-3 rounded border-l-4 border-red-400">
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <SectionHeader title="Recommendations" subtitle="Actionable steps to improve your visibility" />

        {highPriorityRecs.length > 0 && (
          <div className="mb-4">
            <h4 className="text-md font-medium text-red-600 mb-2">High Priority</h4>
            <ul className="space-y-2">
              {highPriorityRecs.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-700 bg-red-50 p-3 rounded">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {mediumPriorityRecs.length > 0 && (
          <div className="mb-4">
            <h4 className="text-md font-medium text-yellow-600 mb-2">Medium Priority</h4>
            <ul className="space-y-2">
              {mediumPriorityRecs.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-700 bg-yellow-50 p-3 rounded">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {lowPriorityRecs.length > 0 && (
          <div>
            <h4 className="text-md font-medium text-blue-600 mb-2">Low Priority</h4>
            <ul className="space-y-2">
              {lowPriorityRecs.map((rec, idx) => (
                <li key={idx} className="text-sm text-gray-700 bg-blue-50 p-3 rounded">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Competitive Insights */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
        <SectionHeader title="Competitive Insights" subtitle="Market positioning analysis" />
        <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded italic">
          "{competitiveInsightText}"
        </div>
      </div>

      {/* Keyword Performance Table */}
      <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">Keyword Performance</h3>

        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keyword</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Visibility</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {keywordItems.length > 0 ? (
                keywordItems.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">{item.keyword}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center">
                        <svg className="w-4 h-4 mr-2 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                        </svg>
                        {item.platform}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {item.visibility}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No keywords found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Missing Keywords */}
      {keywords.missingKeywords && keywords.missingKeywords.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5">
          <SectionHeader title="Missing Keywords" subtitle="Keywords found in your content but not recognized by AI models" />
          <div className="flex flex-wrap gap-2">
            {keywords.missingKeywords.slice(0, 20).map((keyword, idx) => (
              <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                {keyword}
              </span>
            ))}
            {keywords.missingKeywords.length > 20 && (
              <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                +{keywords.missingKeywords.length - 20} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 pt-2 border-t border-gray-200 mt-8">
        <p>Report generated on {new Date(timestamp).toLocaleString()}</p>
      </div>
    </div>
  );
};

function getPosition(count: number): string {
  if (count > 1000) return '1st';
  if (count > 750) return '2nd';
  if (count > 500) return '3rd';
  if (count > 0) return `${Math.ceil(1000 / (count || 1))}th`;
  return 'N/A';
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffHours = Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60));
  return diffHours <= 24 ? `${diffHours}h ago` : date.toLocaleDateString();
}

export default Dashboard;