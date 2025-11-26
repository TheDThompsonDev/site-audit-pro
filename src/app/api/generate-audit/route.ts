import { NextRequest, NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import puppeteerCore from 'puppeteer-core';
import { Document, Packer, Paragraph, ImageRun, TextRun } from 'docx';

export const maxDuration = 60; // Set max duration to 60 seconds for long running tasks

export async function POST(req: NextRequest) {
    try {
        const { url, reportName } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        // Sanitize filename or use default
        let filename = 'audit-report.docx';
        if (reportName) {
            // Remove invalid characters for filenames
            const safeName = reportName.replace(/[^a-z0-9\s-_]/gi, '').trim();
            if (safeName) {
                filename = `${safeName}.docx`;
            }
        }

        let browser;
        if (process.env.NODE_ENV === 'production') {
            // Production: Use puppeteer-core with @sparticuz/chromium
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const chromiumAny = chromium as any;
            browser = await puppeteerCore.launch({
                args: chromiumAny.args,
                defaultViewport: chromiumAny.defaultViewport,
                executablePath: await chromiumAny.executablePath(),
                headless: chromiumAny.headless,
            });
        } else {
            // Development: Use full puppeteer
            const puppeteer = await import('puppeteer').then(mod => mod.default);
            browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
            });
        }

        const page = await browser.newPage();

        // Set viewport to a reasonable desktop size
        await page.setViewport({ width: 1280, height: 800 });

        // Navigate to the URL
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

        // 1. Scroll to bottom to trigger lazy loads
        await page.evaluate(async () => {
            await new Promise<void>((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        // 2. Wait a bit for any final animations/loads
        await new Promise(resolve => setTimeout(resolve, 1000));

        // 3. Get the full height of the page (robust calculation)
        const fullHeight = await page.evaluate(() => {
            const body = document.body;
            const html = document.documentElement;
            return Math.max(
                body.scrollHeight, body.offsetHeight,
                html.clientHeight, html.scrollHeight, html.offsetHeight
            );
        });

        // 4. Reset scroll to top
        await page.evaluate(() => window.scrollTo(0, 0));
        await new Promise(resolve => setTimeout(resolve, 500));

        // 5. Take screenshots in chunks
        const chunkHeight = 1200; // Slightly larger chunks
        const finalScreenshots: Buffer[] = [];

        for (let y = 0; y < fullHeight; y += chunkHeight) {
            // Scroll to the chunk position to ensure it's rendered
            await page.evaluate((scrollToY) => window.scrollTo(0, scrollToY), y);

            // Wait for paint
            await new Promise(resolve => setTimeout(resolve, 200));

            const heightToCapture = Math.min(chunkHeight, fullHeight - y);

            const buffer = await page.screenshot({
                encoding: 'binary',
                clip: {
                    x: 0,
                    y: y,
                    width: 1280,
                    height: heightToCapture
                },
                type: 'jpeg',
                quality: 80
            });
            finalScreenshots.push(buffer as Buffer);
        }

        await browser.close();

        // Create Document
        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: `Audit Report for ${url}`,
                                bold: true,
                                size: 32,
                            }),
                        ],
                    }),
                    new Paragraph({ text: "" }), // Spacer
                    ...finalScreenshots.map((buffer, index) =>
                        new Paragraph({
                            children: [
                                new ImageRun({
                                    data: buffer,
                                    transformation: {
                                        width: 600,
                                        height: (Math.min(chunkHeight, fullHeight - index * chunkHeight)) * (600 / 1280)
                                    },
                                } as any),
                            ],
                        })
                    )
                ],
            }],
        });

        // Generate buffer
        const buffer = await Packer.toBuffer(doc);

        // Return the file
        return new NextResponse(buffer as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error: any) {
        console.error('Error generating audit:', error);
        return NextResponse.json(
            { error: 'Failed to generate audit', details: error.message || String(error) },
            { status: 500 }
        );
    }
}
