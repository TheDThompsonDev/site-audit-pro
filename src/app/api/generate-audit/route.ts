import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, ImageRun, TextRun } from 'docx';
import sharp from 'sharp';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const { url, reportName } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        let filename = 'audit-report.docx';
        if (reportName) {
            const safeName = reportName.replace(/[^a-z0-9\s-_]/gi, '').trim();
            if (safeName) {
                filename = `${safeName}.docx`;
            }
        }

        const screenshotApiKey = process.env.SCREENSHOT_API_KEY;
        if (!screenshotApiKey) {
            return NextResponse.json({ error: 'Screenshot API key not configured' }, { status: 500 });
        }

        console.log('Taking full-page screenshot with fullPage and doScroll...');

        // Use correct parameter names: fullPage and doScroll (camelCase!)
        const screenshotResponse = await fetch(`https://api.screenshotapi.com/take?apiKey=${screenshotApiKey}`, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                url: url,
                fullPage: true,
                doScroll: true,
                width: 1280,
                height: 720,
                output: 'json',
                fileType: 'jpeg',
                waitForEvent: 'load',
                timeout: 60000,
                delay: 3000,
            }),
        });

        if (!screenshotResponse.ok) {
            const errorText = await screenshotResponse.text();
            throw new Error(`Screenshot service error (${screenshotResponse.status}): ${errorText}`);
        }

        const screenshotData = await screenshotResponse.json();

        if (!screenshotData.outputUrl) {
            throw new Error(`Screenshot service did not return an image URL`);
        }

        const imageResponse = await fetch(screenshotData.outputUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to download screenshot image');
        }

        const screenshotBuffer = Buffer.from(await imageResponse.arrayBuffer());

        const metadata = await sharp(screenshotBuffer).metadata();
        const imageWidth = metadata.width || 1280;
        const imageHeight = metadata.height || 800;

        console.log('Full page screenshot dimensions:', imageWidth, 'x', imageHeight);

        // Split the full page screenshot into chunks
        const chunkHeight = 720;
        const imageChunks: Buffer[] = [];

        for (let y = 0; y < imageHeight; y += chunkHeight) {
            const heightToCapture = Math.min(chunkHeight, imageHeight - y);

            console.log(`Creating chunk at y=${y}, height=${heightToCapture}`);

            const chunk = await sharp(screenshotBuffer)
                .extract({
                    left: 0,
                    top: y,
                    width: imageWidth,
                    height: heightToCapture,
                })
                .toBuffer();

            imageChunks.push(chunk);
        }

        console.log(`Total chunks created: ${imageChunks.length}`);

        const maxWidth = 600;
        const scale = maxWidth / imageWidth;

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
                    new Paragraph({ text: "" }),
                    ...imageChunks.map((chunkBuffer, index) => {
                        const actualHeight = index === imageChunks.length - 1
                            ? Math.min(chunkHeight, imageHeight - (index * chunkHeight))
                            : chunkHeight;

                        return new Paragraph({
                            children: [
                                new ImageRun({
                                    data: chunkBuffer,
                                    transformation: {
                                        width: maxWidth,
                                        height: actualHeight * scale,
                                    },
                                } as any),
                            ],
                        });
                    })
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);

        console.log('Document generated successfully with', imageChunks.length, 'image chunks');

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
