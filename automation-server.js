const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/place-order', async (req, res) => {
    const { phone } = req.body;
    
    try {
        console.log('🚀 Starting 100k.uz automation for:', phone);
        
        const browser = await puppeteer.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Step 1: Go to product page
        console.log('1. Navigating to product page...');
        await page.goto('https://100k.uz/shop/product-new/tanani-oqartiruvchi-crem?stream=704834', {
            waitUntil: 'networkidle2'
        });
        
        // Step 2: Click buy button
        console.log('2. Clicking buy button...');
        await page.waitForTimeout(3000);
        
        // Try different possible buy button selectors
        const buyButtonSelectors = [
            '.buy-now-btn',
            '.btn-buy',
            '.product-buy-btn',
            '[data-action="buy"]',
            'button[type="submit"]',
            '.btn-primary',
            'a[href*="/order"]',
            '.add-to-cart'
        ];
        
        let buyButtonClicked = false;
        for (const selector of buyButtonSelectors) {
            try {
                await page.click(selector);
                console.log(`✅ Clicked buy button with selector: ${selector}`);
                buyButtonClicked = true;
                break;
            } catch (error) {
                console.log(`❌ Selector ${selector} not found, trying next...`);
            }
        }
        
        if (!buyButtonClicked) {
            // If no button found, try to find and click any button containing "buy" text
            const buttons = await page.$$('button');
            for (const button of buttons) {
                const text = await page.evaluate(el => el.textContent.toLowerCase(), button);
                if (text.includes('buy') || text.includes('sotib olish') || text.includes('harid') || text.includes('zakaz')) {
                    await button.click();
                    console.log('✅ Clicked buy button by text content');
                    buyButtonClicked = true;
                    break;
                }
            }
        }
        
        if (!buyButtonClicked) {
            throw new Error('Could not find buy button on the page');
        }
        
        // Step 3: Wait for order form
        console.log('3. Waiting for order form...');
        await page.waitForTimeout(5000);
        
        // Step 4: Fill customer phone - CORRECT SELECTOR for 100k.uz
        console.log('4. Filling customer phone...');
        const phoneInputSelectors = [
            'input[name="customer_username"]',  // ← THIS IS THE CORRECT ONE for 100k.uz
            'input.my-phone-mask',
            'input[placeholder*="Telefon raqamingiz"]',
            'input[name="phone"]'
        ];
        
        let phoneFilled = false;
        for (const selector of phoneInputSelectors) {
            try {
                await page.type(selector, phone, { delay: 100 });
                console.log(`✅ Filled phone with selector: ${selector}`);
                phoneFilled = true;
                break;
            } catch (error) {
                // Continue to next selector
            }
        }
        
        if (!phoneFilled) {
            throw new Error('Could not find phone input field');
        }
        
        // Step 5: Select region (Viloyat)
        console.log('5. Selecting region...');
        await page.select('select[name="region_id"]', '13'); // 13 = Toshkent shaxar
        
        // Step 6: Wait for district to load and select district
        console.log('6. Selecting district...');
        await page.waitForTimeout(2000);
        await page.select('select[name="district_id"]', '202'); // 202 = Chilonzor
        
        // Step 7: Submit the order
        console.log('7. Submitting order...');
        const submitSelectors = [
            'button[type="submit"]',
            '.submit-order',
            '.btn-submit',
            '.order-btn',
            '[data-action="submit"]'
        ];
        
        let orderSubmitted = false;
        for (const selector of submitSelectors) {
            try {
                await page.click(selector);
                console.log(`✅ Submitted order with selector: ${selector}`);
                orderSubmitted = true;
                break;
            } catch (error) {
                // Continue to next selector
            }
        }
        
        if (!orderSubmitted) {
            throw new Error('Could not find submit button');
        }
        
        // Step 8: Wait for navigation to SMS page
        console.log('8. Waiting for SMS verification page...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        
        // Check if we're redirected to SMS page
        const currentUrl = page.url();
        console.log('9. Current URL:', currentUrl);
        
        if (currentUrl.includes('/orders/') || currentUrl.includes('/success') || currentUrl.includes('/verify')) {
            console.log('10. ✅ Reached SMS verification page!');
            
            await browser.close();
            
            res.json({
                success: true,
                message: 'SMS code sent successfully!',
                orderUrl: currentUrl,
                nextStep: 'waiting_sms'
            });
            
        } else {
            console.log('10. ❌ Did not reach SMS page. Current page:', await page.title());
            await browser.close();
            
            res.json({
                success: false,
                message: 'Failed to reach SMS verification page. Current URL: ' + currentUrl
            });
        }
        
    } catch (error) {
        console.error('Automation error:', error);
        res.json({
            success: false,
            message: 'Automation failed: ' + error.message
        });
    }
});

app.post('/api/verify-sms', async (req, res) => {
    const { orderUrl, smsCode } = req.body;
    
    try {
        console.log('📱 Verifying SMS code:', smsCode, 'for order:', orderUrl);
        
        const browser = await puppeteer.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        
        // Go back to the order page
        await page.goto(orderUrl);
        await page.waitForTimeout(3000);
        
        // Fill SMS code
        console.log('1. Filling SMS code...');
        const codeInputSelectors = [
            '.digit-input',
            'input[type="text"]',
            'input[type="number"]',
            '.sms-input',
            '.verification-code',
            'input[name="code"]',
            'input[placeholder*="code"]',
            'input[placeholder*="kod"]'
        ];
        
        let codeFilled = false;
        for (const selector of codeInputSelectors) {
            try {
                const inputs = await page.$$(selector);
                if (inputs.length >= smsCode.length) {
                    for (let i = 0; i < smsCode.length; i++) {
                        await inputs[i].type(smsCode[i], { delay: 100 });
                    }
                    console.log(`✅ Filled SMS code with selector: ${selector}`);
                    codeFilled = true;
                    break;
                }
            } catch (error) {
                // Continue to next selector
            }
        }
        
        if (!codeFilled) {
            throw new Error('Could not find SMS code input fields');
        }
        
        // Click verify button
        console.log('2. Submitting SMS code...');
        const verifySelectors = [
            '.btn-submit',
            'button[type="submit"]',
            '.verify-btn',
            '.submit-code',
            'button:contains("Verify")',
            'button:contains("Tasdiqlash")',
            'button:contains("Yuborish")'
        ];
        
        let codeSubmitted = false;
        for (const selector of verifySelectors) {
            try {
                await page.click(selector);
                console.log(`✅ Submitted code with selector: ${selector}`);
                codeSubmitted = true;
                break;
            } catch (error) {
                // Continue to next selector
            }
        }
        
        if (!codeSubmitted) {
            throw new Error('Could not find verify button');
        }
        
        // Wait for result
        await page.waitForTimeout(5000);
        
        const success = await page.evaluate(() => {
            return document.body.innerHTML.includes('Arizangiz qabul qilindi') || 
                   document.body.innerHTML.includes('success') ||
                   document.body.innerHTML.includes('muvaffaqiyatli') ||
                   document.title.includes('Success');
        });
        
        await browser.close();
        
        if (success) {
            res.json({
                success: true,
                message: 'Order completed successfully!'
            });
        } else {
            res.json({
                success: false,
                message: 'SMS verification failed'
            });
        }
        
    } catch (error) {
        console.error('SMS verification error:', error);
        res.json({
            success: false,
            message: 'SMS verification failed: ' + error.message
        });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Automation server running on http://localhost:${PORT}`);
});