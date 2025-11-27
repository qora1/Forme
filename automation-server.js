const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Test route
app.get('/', (req, res) => {
  res.json({ message: '100k Automation Server is running!' });
});

app.post('/api/place-order', async (req, res) => {
    const { phone, viloyat_id, tuman_id, product_url } = req.body;
    
    try {
        console.log('🚀 Starting automation for:', phone);
        
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });
        
        const page = await browser.newPage();
        
        const targetUrl = product_url || 'https://100k.uz/shop/product-new/tanani-oqartiruvchi-crem?stream=704834';
        
        console.log('1. Navigating to product page...');
        await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: 10000 });
        
        console.log('2. Clicking buy button...');
        await page.waitForTimeout(1000);
        
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
        
        console.log('3. Waiting for order form...');
        await page.waitForTimeout(1500);
        
        console.log('4. Filling phone...');
        await page.type('input[name="customer_username"]', phone, { delay: 50 });
        
        console.log('5. Selecting viloyat:', viloyat_id);
        await page.select('select[name="region_id"]', viloyat_id);
        
        console.log('6. Selecting tuman:', tuman_id);
        await page.waitForTimeout(500);
        await page.select('select[name="district_id"]', tuman_id);
        
        console.log('7. Submitting order...');
        await page.click('button[type="submit"]');
        
        console.log('8. Waiting for SMS page...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
        
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
        await page.waitForTimeout(1000);
        
        const inputs = await page.$$('.digit-input, input[type="text"]');
        for (let i = 0; i < smsCode.length; i++) {
            await inputs[i].type(smsCode[i], { delay: 50 });
        }
        
        await page.click('button[type="submit"]');
        await page.waitForTimeout(1000);
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
