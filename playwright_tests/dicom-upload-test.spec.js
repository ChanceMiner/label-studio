const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Reproduce DICOM upload TypeError', async ({ page }) => {
  // Enable detailed logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('ERROR:', msg.text());
    } else {
      console.log(msg.type(), msg.text());
    }
  });
  
  page.on('pageerror', exception => {
    console.log('PAGE ERROR:', exception.message);
  });

  // First, login with the test user
  console.log('Logging in with test user');
  await page.goto('http://localhost:8081/user/login/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000); // Wait longer for page to load
  
  // Try to find and fill email input
  console.log('Looking for email input');
  try {
    await page.waitForSelector('input[type="email"], input[name="email"], #email', { timeout: 10000 });
    const emailInput = await page.$('input[type="email"], input[name="email"], #email');
    if (emailInput) {
      console.log('Found email input, filling');
      await emailInput.fill('test@example.com');
    } else {
      console.log('Email input not found');
    }
  } catch (error) {
    console.log('Error finding email input:', error.message);
  }
  
  // Try to find and fill password input
  console.log('Looking for password input');
  try {
    await page.waitForSelector('input[type="password"], input[name="password"], #password', { timeout: 10000 });
    const passwordInput = await page.$('input[type="password"], input[name="password"], #password');
    if (passwordInput) {
      console.log('Found password input, filling');
      await passwordInput.fill('testpassword123');
    } else {
      console.log('Password input not found');
    }
  } catch (error) {
    console.log('Error finding password input:', error.message);
  }
  
  // Try to find and click submit button
  console.log('Looking for submit button');
  try {
    await page.waitForSelector('button[type="submit"], input[type="submit"], #submit, .login-button', { timeout: 10000 });
    const submitButton = await page.$('button[type="submit"], input[type="submit"], #submit, .login-button');
    if (submitButton) {
      console.log('Found submit button, clicking');
      await submitButton.click();
    } else {
      console.log('Submit button not found');
    }
  } catch (error) {
    console.log('Error finding submit button:', error.message);
  }
  
  // Wait for login to complete
  await page.waitForTimeout(5000);
  console.log('Login completed, current URL:', page.url());
  
  // Navigate to the projects page to see if we need to create a project
  console.log('Navigating to http://localhost:8081/projects/');
  await page.goto('http://localhost:8081/projects/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(5000);
  console.log('Projects page loaded, URL:', page.url());
  
  // Check if we need to create a project
  const createProjectButton = await page.$('button:has-text("Create Project"), a:has-text("Create Project")');
  if (createProjectButton) {
    console.log('Found create project button, clicking');
    await createProjectButton.click();
    
    // Wait for the create project page to load
    await page.waitForTimeout(3000);
    console.log('Create project page URL:', page.url());
    
    // Try to find project creation form elements
    const projectNameInput = await page.$('input[name="title"], input[name="name"], #title, #name');
    if (projectNameInput) {
      console.log('Found project name input');
      
      // Fill in project name
      await projectNameInput.fill('Test DICOM Project');
      
      // Look for submit button
      const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Create"), button:has-text("Save")');
      if (submitButton) {
        console.log('Found create project submit button, clicking');
        await submitButton.click();
        
        // Wait for navigation to complete
        await page.waitForTimeout(5000);
        console.log('After project creation URL:', page.url());
      } else {
        console.log('Create project submit button not found');
      }
    }
  } else {
    console.log('Create project button not found, assuming project exists');
  }
  
  // Navigate to the import page
  console.log('Navigating to http://localhost:8081/projects/1/data/import');
  await page.goto('http://localhost:8081/projects/1/data/import', { waitUntil: 'domcontentloaded' });
  
  // Wait for the page to load
  await page.waitForTimeout(5000);
  console.log('Page loaded, URL:', page.url());
  
  // Take a screenshot of the page as it appears
  await page.screenshot({ path: 'import-page-before-upload.png' });
  
  // Check for any immediate errors
  const errorMessages = await page.$$('.error, .danger, .alert, [class*="error"]');
  console.log('Found', errorMessages.length, 'error elements on page');
  
  for (const errorElement of errorMessages) {
    const errorText = await errorElement.textContent();
    if (errorText && errorText.trim()) {
      console.log('Page error message:', errorText.trim());
    }
  }
  
  // Look for file upload elements
  const fileInputs = await page.$$('input[type="file"]');
  console.log('Found', fileInputs.length, 'file input elements');
  
  if (fileInputs.length > 0) {
    const fileInput = fileInputs[0];
    console.log('Using first file input element');
    
    // Create a sample DICOM-like file for testing
    const testFilePath = path.join(__dirname, 'test.dcm');
    // Create a file with DICOM header
    const dicomContent = Buffer.concat([
      Buffer.from('DICM'), // DICOM prefix
      Buffer.alloc(124),   // Reserved bytes
      Buffer.from('TEST_DICOM_FILE_CONTENT')
    ]);
    fs.writeFileSync(testFilePath, dicomContent);
    
    // Listen for any errors that occur during upload
    let errorOccurred = false;
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('TypeError')) {
        console.log('CAUGHT TYPEERROR:', msg.text());
        errorOccurred = true;
      }
    });
    
    page.on('pageerror', exception => {
      console.log('CAUGHT PAGE ERROR:', exception.message);
      errorOccurred = true;
    });
    
    // Upload the file
    console.log('Uploading file:', testFilePath);
    await fileInput.setInputFiles(testFilePath);
    console.log('File upload initiated');
    
    // Wait for any response or error
    await page.waitForTimeout(5000);
    
    if (errorOccurred) {
      console.log('ERROR DETECTED DURING UPLOAD');
    } else {
      console.log('No immediate errors detected during upload');
    }
    
    // Take a screenshot after upload attempt
    await page.screenshot({ path: 'import-page-after-upload.png' });
  } else {
    console.log('No file input elements found');
    
    // Take a screenshot to see what the page looks like
    await page.screenshot({ path: 'import-page-no-file-input.png' });
    
    // Log the page content structure
    const buttons = await page.$$('button');
    console.log('Found', buttons.length, 'buttons');
    
    for (const button of buttons) {
      const text = await button.textContent();
      const className = await button.getAttribute('class');
      console.log('Button:', text?.trim(), 'Class:', className);
    }
    
    // Try to find any elements that might be related to file upload
    const allInputs = await page.$$('input');
    console.log('Found', allInputs.length, 'input elements');
    
    for (const input of allInputs) {
      const type = await input.getAttribute('type');
      const name = await input.getAttribute('name');
      const className = await input.getAttribute('class');
      console.log('Input - Type:', type, 'Name:', name, 'Class:', className);
    }
  }
  
  // Wait a bit more to see if any delayed errors appear
  await page.waitForTimeout(3000);
});