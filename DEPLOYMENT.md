# Deployment Instructions

## Deploying to Vercel

This project uses `@sparticuz/chromium@123.0.1` for serverless Chrome in production environments.

> **Important:** We use version 123.0.1 specifically because newer versions (141+) have breaking changes that cause the "brotli files" error on Vercel.

### Steps to Deploy:

1. **Verify the correct chromium version**
   ```bash
   # Should show @sparticuz/chromium@123.0.1
   npm list @sparticuz/chromium
   ```

2. **Push your code to GitHub** (if not already done)
   ```bash
   git add .
   git commit -m "Fix chromium version for Vercel deployment"
   git push
   ```

3. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Vercel will auto-detect Next.js

4. **Important Configuration**
   - The `vercel.json` file is already configured with:
     - **maxDuration**: 60 seconds (for screenshot generation)
     - **memory**: 3008 MB (required for Chrome)
   
4. **Environment Variables** (Optional)
   - No special environment variables are required
   - The code automatically detects production via `NODE_ENV`

5. **Known Limitations**
   - Screenshot generation may take 10-30 seconds depending on page size
   - Vercel's free tier has a 10-second timeout for Hobby plans
   - **You'll need a Pro plan ($20/month) for the 60-second timeout**

### Troubleshooting

If you still encounter the brotli error after deployment:
1. Make sure `@sparticuz/chromium` is in `dependencies` (not `devDependencies`)
2. Redeploy after confirming package.json is correct
3. Check Vercel function logs for specific errors

### Alternative: Vercel Pro Plan

If you're on the Hobby plan and can't upgrade, consider:
- Using a screenshot API service (like ScreenshotAPI, ApiFlash)
- Deploying to Railway, Render, or other platforms with longer timeouts
- Implementing a queue system with workers
