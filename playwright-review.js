const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureWebsiteScreenshots() {
    // Create screenshots directory
    const screenshotsDir = path.join(__dirname, 'design-review-screenshots');
    if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir);
    }

    const browser = await chromium.launch();
    const context = await browser.newContext();

    // Test different viewport sizes
    const viewports = [
        { name: 'desktop', width: 1920, height: 1080 },
        { name: 'laptop', width: 1366, height: 768 },
        { name: 'tablet', width: 768, height: 1024 },
        { name: 'mobile', width: 375, height: 667 }
    ];

    const url = 'http://localhost:8080';

    for (const viewport of viewports) {
        console.log(`Capturing ${viewport.name} (${viewport.width}x${viewport.height})`);
        
        const page = await context.newPage();
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        try {
            await page.goto(url, { waitUntil: 'networkidle' });
            
            // Wait for any animations to complete
            await page.waitForTimeout(2000);
            
            // Full page screenshot
            await page.screenshot({
                path: path.join(screenshotsDir, `${viewport.name}-full-page.png`),
                fullPage: true
            });
            
            // Hero section
            await page.screenshot({
                path: path.join(screenshotsDir, `${viewport.name}-hero.png`),
                clip: { x: 0, y: 0, width: viewport.width, height: 600 }
            });
            
            // Screenshot section specifically
            const screenshotSection = await page.locator('#screenshots');
            if (await screenshotSection.isVisible()) {
                await screenshotSection.screenshot({
                    path: path.join(screenshotsDir, `${viewport.name}-screenshot-section.png`)
                });
            }
            
            // Features section
            const featuresSection = await page.locator('.features');
            if (await featuresSection.isVisible()) {
                await featuresSection.screenshot({
                    path: path.join(screenshotsDir, `${viewport.name}-features.png`)
                });
            }
            
            // Test hover states on screenshot items
            if (viewport.name === 'desktop') {
                const screenshotItems = await page.locator('.screenshot-item');
                const itemCount = await screenshotItems.count();
                
                for (let i = 0; i < itemCount; i++) {
                    await screenshotItems.nth(i).hover();
                    await page.waitForTimeout(500);
                    await screenshotItems.nth(i).screenshot({
                        path: path.join(screenshotsDir, `screenshot-item-${i}-hover.png`)
                    });
                }
            }
            
        } catch (error) {
            console.error(`Error capturing ${viewport.name}:`, error.message);
        }
        
        await page.close();
    }

    // Test modal functionality
    console.log('Testing modal functionality...');
    const page = await context.newPage();
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(url, { waitUntil: 'networkidle' });
    
    // Click first screenshot to open modal
    try {
        await page.locator('.screenshot-item').first().click();
        await page.waitForTimeout(1000);
        
        // Screenshot the modal
        await page.screenshot({
            path: path.join(screenshotsDir, 'modal-open.png'),
            fullPage: true
        });
        
        // Test navigation in modal
        const nextBtn = page.locator('.nav-next');
        if (await nextBtn.isVisible()) {
            await nextBtn.click();
            await page.waitForTimeout(500);
            await page.screenshot({
                path: path.join(screenshotsDir, 'modal-navigation.png'),
                fullPage: true
            });
        }
        
    } catch (error) {
        console.error('Error testing modal:', error.message);
    }
    
    await page.close();
    await browser.close();
    
    console.log(`Screenshots saved to: ${screenshotsDir}`);
    
    // Generate a summary report
    const report = {
        timestamp: new Date().toISOString(),
        viewports: viewports.map(v => `${v.name} (${v.width}x${v.height})`),
        screenshots_captured: fs.readdirSync(screenshotsDir).length,
        url_tested: url,
        notes: [
            'Full page screenshots captured for all viewport sizes',
            'Individual section screenshots for detailed analysis',
            'Hover states and modal functionality tested',
            'Ready for UI/UX designer review'
        ]
    };
    
    fs.writeFileSync(
        path.join(screenshotsDir, 'capture-report.json'),
        JSON.stringify(report, null, 2)
    );
    
    return screenshotsDir;
}

// Run the capture
captureWebsiteScreenshots()
    .then(dir => {
        console.log('✅ Screenshot capture complete!');
        console.log('📁 Screenshots saved to:', dir);
    })
    .catch(console.error);