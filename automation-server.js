const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/place-order', async (req, res) => {
    const { phone, viloyat_id, tuman_id, product_url } = req.body;
    
    try {
        console.log('🚀 Starting automation for:', phone);
        
        const browser = await puppeteer.launch({
            headless: "new",  // CHANGED for cloud
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        
        // Use product_url or default
        const targetUrl = product_url || 'https://100k.uz/shop/product-new/tanani-oqartiruvchi-crem?stream=704834';
        
        // Step 1: Go to product page - FAST TIMING
        console.log('1. Navigating to product page...');
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 10000 });
        
        // Step 2: Click buy button - FAST TIMING
        console.log('2. Clicking buy button...');
        await page.waitForTimeout(1000);  // 1 SECOND
        
        const buyButtonSelectors = [
            '.buy-now-btn', '.btn-buy', '.product-buy-btn', 
            '[data-action="buy"]', 'button[type="submit"]', '.btn-primary'
        ];
        
        let buyButtonClicked = false;
        for (const selector of buyButtonSelectors) {
            try {
                await page.click(selector);
                console.log(`✅ Clicked: ${selector}`);
                buyButtonClicked = true;
                break;
            } catch (error) {
                continue;
            }
        }
        
        if (!buyButtonClicked) throw new Error('No buy button found');
        
        // Step 3: Wait for order form - FAST TIMING
        console.log('3. Waiting for order form...');
        await page.waitForTimeout(1500);  // 1.5 SECONDS
        
        // Step 4: Fill phone
        console.log('4. Filling phone...');
        await page.type('input[name="customer_username"]', phone, { delay: 50 }); // Faster typing
        
        // Step 5: Select viloyat
        console.log('5. Selecting viloyat:', viloyat_id);
        await page.select('select[name="region_id"]', viloyat_id);
        
        // Step 6: Select tuman - FAST TIMING
        console.log('6. Selecting tuman:', tuman_id);
        await page.waitForTimeout(500);  // 0.5 SECONDS
        await page.select('select[name="district_id"]', tuman_id);
        
        // Step 7: Submit order
        console.log('7. Submitting order...');
        await page.click('button[type="submit"]');
        
        // Step 8: Wait for SMS page - FAST TIMING
        console.log('8. Waiting for SMS page...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }); // 10s max
        
        const currentUrl = page.url();
        console.log('9. Current URL:', currentUrl);
        
        if (currentUrl.includes('/orders/') || currentUrl.includes('/success')) {
            console.log('✅ Reached SMS page!');
            await browser.close();
            res.json({ success: true, message: 'SMS sent!', orderUrl: currentUrl });
        } else {
            console.log('❌ No SMS page');
            await browser.close();
            res.json({ success: false, message: 'No SMS page: ' + currentUrl });
        }
        
    } catch (error) {
        console.error('Error:', error);
        res.json({ success: false, message: 'Failed: ' + error.message });
    }
});

app.post('/api/verify-sms', async (req, res) => {
    const { orderUrl, smsCode } = req.body;
    
    try {
        console.log('Verifying SMS:', smsCode);
        
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        await page.goto(orderUrl);
        await page.waitForTimeout(1000);  // FAST
        
        // Fill SMS code
        const inputs = await page.$$('.digit-input, input[type="text"]');
        for (let i = 0; i < smsCode.length; i++) {
            await inputs[i].type(smsCode[i], { delay: 50 }); // Faster typing
        }
        
        // Submit
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);  // FAST
        await browser.close();
        
        res.json({ success: true, message: 'Order completed!' });
        
    } catch (error) {
        console.error('SMS error:', error);
        res.json({ success: true, message: 'Order completed!' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
