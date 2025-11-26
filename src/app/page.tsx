'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [url, setUrl] = useState('');
  const [reportName, setReportName] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  // Simulated progress steps for better UX
  useEffect(() => {
    if (loading) {
      const steps = [
        'Initializing browser...',
        'Navigating to target URL...',
        'Scrolling and capturing content...',
        'Compiling audit document...',
        'Finalizing download...'
      ];
      let stepIndex = 0;
      setStatus(steps[0]);

      const interval = setInterval(() => {
        stepIndex = (stepIndex + 1) % steps.length;
        // Don't loop back to start if we are deep in time, just stay on compiling
        if (stepIndex === 0) stepIndex = 3; 
        setStatus(steps[stepIndex]);
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setStatus('Initializing...');

    try {
      const response = await fetch('/api/generate-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, reportName }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate audit');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      // Use the filename from the header if available, or fallback
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'audit-report.docx';
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setStatus('Complete!');
    } catch (err) {
      setError('An error occurred. Please check the URL and try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#050505] text-gray-100 flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans selection:bg-white selection:text-black">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#232323_1px,transparent_1px),linear-gradient(to_bottom,#232323_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />

      <div className="w-full max-w-2xl z-10">
        <div className="mb-12 text-center space-y-4">
          <div className="inline-flex items-center justify-center px-3 py-1 rounded-full border border-gray-800 bg-gray-900/50 backdrop-blur-sm text-xs font-medium text-gray-400 mb-4">
            v1.1.0 • Audit & Screenshot Tool
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
            Site Audit <span className="text-gray-500">Pro</span>
          </h1>
          <p className="text-lg text-gray-400 max-w-lg mx-auto leading-relaxed">
            This is what a loving husband does for his wife! <br />
            Generate full-page screenshot audits in seconds. <br /> 
            Enter a URL below to receive a formatted Word document.
          </p>
        </div>

        <div className="bg-[#0A0A0A] border border-gray-800 rounded-2xl p-6 shadow-2xl shadow-black/50 ring-1 ring-white/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <div className="md:col-span-2 relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-500 group-focus-within:text-white transition-colors" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </div>
                  <input
                    id="url-input"
                    name="url"
                    type="url"
                    required
                    placeholder="https://example.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-white/10 focus:border-gray-700 outline-none transition-all"
                  />
               </div>
               <div className="relative group">
                  <input
                    id="report-name-input"
                    name="reportName"
                    type="text"
                    placeholder="Report Name (Optional)"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-800 rounded-xl text-white placeholder-gray-600 focus:ring-2 focus:ring-white/10 focus:border-gray-700 outline-none transition-all"
                  />
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl font-medium text-sm transition-all duration-200 flex items-center justify-center ${
                loading
                  ? 'bg-gray-800 text-gray-400 cursor-not-allowed'
                  : 'bg-white text-black hover:bg-gray-200 active:scale-[0.99]'
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                   <div className="h-5 w-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-3" />
                   Generating Audit...
                </div>
              ) : (
                <>
                  Generate Audit Document
                  <svg className="ml-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Status / Feedback Area */}
        <div className="mt-8 h-12 flex items-center justify-center">
          {loading && (
            <div className="flex items-center space-x-3 animate-pulse">
              <div className="h-2 w-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-400 font-mono">{status}</span>
            </div>
          )}
          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-950/30 px-4 py-2 rounded-lg border border-red-900/50">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
