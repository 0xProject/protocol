import { test, expect } from '@playwright/test';

test.describe('login page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });
    test('should redirect to apps page after successful login', async ({ page }) => {
        await page.getByLabel('E-Mail address').fill('freshmeat@0xproject.com');
        await page.getByLabel('Password').fill('test');
        await page.getByText('Continue').click();
        await expect(page).toHaveURL(/apps$/);
    });

    test('should show an error if no email is provided', async ({ page }) => {
        await page.getByText('Continue').click();
        await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });
    test('should show an error if an invalid email is provided', async ({ page }) => {
        await page.getByLabel('E-Mail address').fill('email@invalid');
        await page.getByText('Continue').click();
        await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });

    test('should show an error if no password is provided', async ({ page }) => {
        await page.getByLabel('E-Mail address').fill('valid@email.com');
        await page.getByText('Continue').click();
        await expect(page.getByText('Password is required')).toBeVisible();
    });

    test('should show an error if wrong credentials are input', async ({ page }) => {
        await page.getByLabel('E-Mail address').fill('valid@email.com');
        await page.getByLabel('Password').fill('invalid');
        await page.getByText('Continue').click();
        await expect(page.getByText('Invalid email or password')).toBeVisible();
    });

    test('should be able to switch to the create account page', async ({ page }) => {
        await page.getByLabel('Navigation').getByText('Sign up').click();
        await expect(page).toHaveURL(/create-account$/);
    });
});
