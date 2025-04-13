"use client";
import React, { useEffect, useState } from 'react';
import Dashboard from '../../components/Dashboard';

const DashboardPage = ({
  params
}: {
  params: Promise<{ jobId: string }>;
}) => {
  const resolvedParams = React.use(params);
  const { jobId } = resolvedParams;
    const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!jobId) return;
    const fetchReport = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/job-status/${jobId}`);
        const data = await res.json();
        if (data.status === 'completed' && data.result) {
          setReport(data.result.report);
        } else if (data.status === 'failed') {
          console.error('Job failed:', data.error);
        }
      } catch (error) {
        console.error('Error fetching job status:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-gray-600">
          Loading report...
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl font-semibold text-gray-600">
          No report found for job id: {jobId}
        </div>
      </div>
    );
  }

  return <Dashboard report={report} />;
};

export default DashboardPage;
