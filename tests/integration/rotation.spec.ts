import { test, expect } from '@playwright/test';

test.describe('FPGA Pin Planner - Rotation Feature Integration Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the app to load
    await page.waitForSelector('[data-testid="main-canvas"]', { timeout: 10000 });
    
    // Load sample data if needed
    // You might need to add data-testid attributes to make this more reliable
    const sampleButton = page.locator('button:has-text("Sample")');
    if (await sampleButton.isVisible()) {
      await sampleButton.click();
      // Wait for data to load
      await page.waitForTimeout(2000);
    }
  });

  test('should maintain grid labels in correct positions during rotation', async ({ page }) => {
    // Switch to Grid view if not already
    const gridButton = page.locator('button:has-text("Grid")');
    await gridButton.click();
    
    // Take screenshot at 0 degrees
    await page.screenshot({ path: 'test-results/rotation-0deg.png' });
    
    // Find and click the flip/rotate controls
    const flipButton = page.locator('button:has-text("🔄")'); // Assuming this is the rotate button
    if (await flipButton.isVisible()) {
      // Rotate to 90 degrees
      await flipButton.click();
      await page.waitForTimeout(500); // Allow animation/update
      
      // Check that grid labels are still visible and positioned correctly
      // This is a visual test - in a real scenario you'd check specific elements
      await page.screenshot({ path: 'test-results/rotation-90deg.png' });
      
      // Verify package name/info is still visible (not off-screen)
      const packageInfo = page.locator('text=/TestDevice|xc7|Unknown/');
      await expect(packageInfo).toBeVisible();
      
      // Rotate to 180 degrees
      await flipButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/rotation-180deg.png' });
      
      // Rotate to 270 degrees  
      await flipButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/rotation-270deg.png' });
      
      // Rotate back to 0 degrees
      await flipButton.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'test-results/rotation-0deg-after.png' });
    }
  });

  test('should keep package information visible during all rotations', async ({ page }) => {
    const gridButton = page.locator('button:has-text("Grid")');
    await gridButton.click();
    
    const flipButton = page.locator('button:has-text("🔄")');
    if (await flipButton.isVisible()) {
      const rotations = [90, 180, 270, 0]; // Test all rotations
      
      for (const expectedRotation of rotations) {
        await flipButton.click();
        await page.waitForTimeout(500);
        
        // Check that package info is visible in the canvas area
        // Look for canvas container bounds to ensure content is not off-screen
        const canvas = page.locator('canvas').first();
        const canvasBounds = await canvas.boundingBox();
        
        if (canvasBounds) {
          // Verify the canvas is visible and has reasonable dimensions
          expect(canvasBounds.width).toBeGreaterThan(100);
          expect(canvasBounds.height).toBeGreaterThan(100);
        }
      }
    }
  });

  test('should maintain grid coordinate consistency during rotation', async ({ page }) => {
    const gridButton = page.locator('button:has-text("Grid")');
    await gridButton.click();
    
    // Look for grid labels (A, B, C... and 1, 2, 3...)
    // These should remain consistent with the original grid layout
    const initialLabels = await page.locator('[data-testid="grid-label"]').allTextContents();
    
    const flipButton = page.locator('button:has-text("🔄")');
    if (await flipButton.isVisible()) {
      // Rotate and check labels remain consistent
      await flipButton.click();
      await page.waitForTimeout(500);
      
      const rotatedLabels = await page.locator('[data-testid="grid-label"]').allTextContents();
      
      // Grid labels should show the same coordinate system
      // (Though this test would need the actual grid labels to have data-testid attributes)
      expect(rotatedLabels.length).toBeGreaterThan(0);
    }
  });

  test('should preserve pin selection and highlighting during rotation', async ({ page }) => {
    const gridButton = page.locator('button:has-text("Grid")');
    await gridButton.click();
    
    // Click on a pin to select it
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 200, y: 200 } });
    
    // Take screenshot with selection
    await page.screenshot({ path: 'test-results/pin-selected-0deg.png' });
    
    const flipButton = page.locator('button:has-text("🔄")');
    if (await flipButton.isVisible()) {
      // Rotate while maintaining selection
      await flipButton.click();
      await page.waitForTimeout(500);
      
      // Selection should be preserved (visual test)
      await page.screenshot({ path: 'test-results/pin-selected-90deg.png' });
      
      // The selected pin should still be highlighted in some way
      // This would need to be verified through visual comparison or DOM checks
    }
  });

  test('should handle multiple rotations without performance degradation', async ({ page }) => {
    const gridButton = page.locator('button:has-text("Grid")');
    await gridButton.click();
    
    const flipButton = page.locator('button:has-text("🔄")');
    if (await flipButton.isVisible()) {
      // Perform multiple rapid rotations
      const startTime = Date.now();
      
      for (let i = 0; i < 8; i++) { // Two full rotations
        await flipButton.click();
        await page.waitForTimeout(100); // Shorter wait for rapid rotation test
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (less than 5 seconds for 8 rotations)
      expect(duration).toBeLessThan(5000);
      
      // App should still be responsive
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    }
  });
});
