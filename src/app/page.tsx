'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

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
    <main className={styles.main}>
      {/* Subtle Grid Background */}
      <div className={styles.gridBackground} />

      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.badge}>
            v1.1.0 • Audit & Screenshot Tool
          </div>
          <h1 className={styles.title}>
            Site Audit <span className={styles.titleGray}>Pro</span>
          </h1>
          <p className={styles.description}>
            This is what a loving husband does for his wife! <br />
            Generate full-page screenshot audits in seconds. <br /> 
            Enter a URL below to receive a formatted Word document.
          </p>
        </div>

        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputRow}>
               <div className={styles.inputGroup}>
                  <div className={styles.inputIcon}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    className={`${styles.input} ${styles.inputWithIcon}`}
                  />
               </div>
               <div className={styles.inputGroup}>
                  <input
                    id="report-name-input"
                    name="reportName"
                    type="text"
                    placeholder="Report Name (Optional)"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className={styles.input}
                  />
               </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`${styles.button} ${loading ? styles.buttonDisabled : styles.buttonPrimary}`}
            >
              {loading ? (
                <div className={styles.buttonContent}>
                   <div className={styles.spinner} />
                   Generating Audit...
                </div>
              ) : (
                <>
                  Generate Audit Document
                  <svg className={styles.buttonIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Status / Feedback Area */}
        <div className={styles.statusArea}>
          {loading && (
            <div className={styles.statusContent}>
              <div className={styles.statusDot}></div>
              <span className={styles.statusText}>{status}</span>
            </div>
          )}
          {error && (
            <div className={styles.errorContainer}>
              <svg className={styles.errorIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={styles.errorText}>{error}</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
