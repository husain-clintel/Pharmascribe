import { test, expect } from '@playwright/test';

test('test cognito login', async ({ page }) => {
  const consoleLogs: string[] = [];

  // Capture all console logs
  page.on('console', msg => {
    consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    console.log(`[${msg.type()}] ${msg.text()}`);
  });

  // Navigate to login page
  await page.goto('https://ind-report-writer.vercel.app/login');
  await page.waitForLoadState('networkidle');

  // Take screenshot of initial state
  await page.screenshot({ path: 'login-initial.png' });

  // Fill in credentials
  await page.fill('input[type="email"]', 'admin@aria.local');
  await page.fill('input[type="password"]', 'Password1');

  // Take screenshot before submit
  await page.screenshot({ path: 'login-filled.png' });

  // Click sign in button
  await page.click('button[type="submit"]');

  // Wait for response
  await page.waitForTimeout(5000);

  // Take screenshot after submit
  await page.screenshot({ path: 'login-result.png' });

  // Print all console logs
  console.log('\n=== ALL CONSOLE LOGS ===');
  consoleLogs.forEach(log => console.log(log));
  console.log('========================\n');

  // Check current URL
  const currentUrl = page.url();
  console.log('Current URL:', currentUrl);

  // Check for any error messages on page
  const pageContent = await page.textContent('body');
  if (pageContent?.includes('Error') || pageContent?.includes('error')) {
    console.log('Page contains error text');
  }
});
