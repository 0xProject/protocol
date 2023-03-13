import { test, expect } from '@playwright/test';

test.describe('login page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
    });
    test('should redirect to apps page after successful login', async ({ page }) => {
        await page.getByLabel('E-Mail address').fill('freshmeat@0xproject.com');
        await page.getByLabel('Password', { exact: true }).fill('test');
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
        await page.getByLabel('Password', { exact: true }).fill('invalid');
        await page.getByText('Continue').click();
        await expect(page.getByText('Invalid email or password')).toBeVisible();
    });
    test("should not show the typed password if the 'show password' button has not been clicked", async ({ page }) => {
        const password = 'KKLjlsdakifjeiow0(*79384890sdfjl';
        await page.getByLabel('Password', { exact: true }).fill(password);
        await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'password');
    });

    test('should show the typed password if the "show password" button has been clicked', async ({ page }) => {
        const password = 'KKLjlsdakifjeiow0(*79384890sdfjl';
        await page.getByLabel('Password', { exact: true }).fill(password);
        await page.getByLabel('Show password').click();
        await expect(page.getByLabel('Password', { exact: true })).toHaveAttribute('type', 'text');
    });

    test('should be able to switch to the create account page', async ({ page }) => {
        await page.getByLabel('Navigation').getByText('Sign up').click();
        await expect(page).toHaveURL(/create-account$/);
    });

    test.only('should be able to logout', async ({ page }) => {
        await page.getByLabel('E-Mail address').fill('freshmeat@0xproject.com');
        await page.getByLabel('Password').fill('test');
        await page.getByText('Continue').click();

        await page.getByRole('button', { name: 'Account Menu' }).click();
        await page.getByText('Log out').click();
        await expect(page).toHaveURL(/create-account/);
    });
});
