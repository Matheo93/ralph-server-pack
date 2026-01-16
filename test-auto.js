const puppeteer = require('puppeteer');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_EMAIL = 'M_beuve@outlook.com';
const TEST_PASSWORD = 'Matheoau1';

async function runTests() {
  console.log('🚀 Starting automated tests...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  const errors = [];
  
  // Test 1: Landing page
  console.log('\n📋 Test 1: Landing page');
  try {
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    const title = await page.title();
    console.log('✅ Landing page loaded:', title);
  } catch (e) {
    console.log('❌ Landing page error:', e.message);
    errors.push('Landing page: ' + e.message);
  }
  
  // Test 2: Login
  console.log('\n📋 Test 2: Login');
  try {
    await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle2', timeout: 30000 });
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await page.click('button');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    console.log('✅ Login successful');
  } catch (e) {
    console.log('⚠️ Login navigation:', e.message);
  }
  
  // Test 3: Dashboard after login
  console.log('\n📋 Test 3: Dashboard');
  try {
    await page.goto(BASE_URL + '/dashboard', { waitUntil: 'networkidle2', timeout: 30000 });
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    if (bodyText.includes('Bonjour') || bodyText.includes('tâches')) {
      console.log('✅ Dashboard loaded');
    } else {
      console.log('❌ Dashboard not properly loaded');
      errors.push('Dashboard: Not properly loaded');
    }
    
    // Check for redundant buttons
    const allButtons = await page.evaluate(() => 
      Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim())
    );
    const redundantButtons = allButtons.filter(t => 
      t.includes('Nouvelle tâche') || t.includes('Vue semaine') || t.includes('Toutes les tâches')
    );
    console.log('Quick action buttons:', redundantButtons.length, redundantButtons);
    if (redundantButtons.length > 2) {
      errors.push('Dashboard: ' + redundantButtons.length + ' redundant buttons');
    }
    
  } catch (e) {
    console.log('❌ Dashboard error:', e.message);
    errors.push('Dashboard: ' + e.message);
  }
  
  // Test 4: Settings household (invite)
  console.log('\n📋 Test 4: Settings household (invite)');
  try {
    await page.goto(BASE_URL + '/settings/household', { waitUntil: 'networkidle2', timeout: 30000 });
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    if (bodyText.includes('invitation') || bodyText.includes('Inviter') || bodyText.includes('foyer')) {
      console.log('✅ Settings household loaded');
    } else {
      console.log('❌ Settings household issues');
      console.log('Page content preview:', bodyText.substring(0, 200));
      errors.push('Settings household: Content not found');
    }
  } catch (e) {
    console.log('❌ Settings household error:', e.message);
    errors.push('Settings household: ' + e.message);
  }
  
  // Test 5: Children page
  console.log('\n📋 Test 5: Children page');
  try {
    await page.goto(BASE_URL + '/children', { waitUntil: 'networkidle2', timeout: 30000 });
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    if (bodyText.includes('Enfant') || bodyText.includes('ans')) {
      console.log('✅ Children page loaded');
      // Check age calculation - look for negative ages like "-5 ans" or huge negative numbers
      const negativeAgeMatch = bodyText.match(/-\d+\s*ans?/g);
      const hugeNegative = bodyText.match(/-\d{4,}/g);
      if (negativeAgeMatch || hugeNegative) {
        console.log('❌ Age calculation bug detected!', negativeAgeMatch || hugeNegative);
        errors.push('Children: Age calculation bug');
      }
    }
  } catch (e) {
    console.log('❌ Children error:', e.message);
  }
  
  await browser.close();
  
  console.log('\n========================================');
  console.log('📊 TEST SUMMARY');
  console.log('========================================');
  console.log('Total errors:', errors.length);
  errors.forEach(e => console.log('  ❌', e));
  
  if (errors.length === 0) {
    console.log('✅ ALL TESTS PASSED!');
  }
  
  return errors;
}

runTests().catch(console.error);
