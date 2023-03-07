import { test, expect } from '@playwright/test';

test.describe('create account first page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/create-account');
    });

    test('should automatically redirect to the create-account route if the index route is accessed when not logged in', async ({
        page,
    }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/create-account/);
    });

    test('should show the create account form', async ({ page }) => {
        await expect(page.getByText('Create an account')).toBeVisible();
    });

    test('should show an error if no first name is provided', async ({ page }) => {
        await page.getByText('Continue').click();
        await expect(page.getByText('First name is required')).toBeVisible();
    });

    test('should show an error if no last name is provided', async ({ page }) => {
        await page.getByText('Continue').click();
        await expect(page.getByText('Last name is required')).toBeVisible();
    });

    test('should show an error if no email is provided', async ({ page }) => {
        await page.getByText('Continue').click();
        await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });

    test('should show an error if an invalid email is provided', async ({ page }) => {
        await page.getByLabel('First Name').fill('John');
        await page.getByLabel('Last Name').fill('Smith');
        await page.getByLabel('E-Mail address').fill('email@invalid');
        await page.getByText('Continue').click();
        await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });

    test('should redirect the user to the second page if all fields are valid', async ({ page }) => {
        await page.getByLabel('First Name').fill('John');
        await page.getByLabel('Last Name').fill('Smith');
        await page.getByLabel('E-Mail address').fill('valid@email.com');
        await page.getByText('Continue').click();
        await expect(page).toHaveURL(/create-account\/set-password/);
    });
});

test.describe('create account second page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByLabel('First Name').fill('John');
        await page.getByLabel('Last Name').fill('Smith');
        await page.getByLabel('E-Mail address').fill('valid@email.com');
        await page.getByText('Continue').click();
        await expect(page).toHaveURL(/create-account\/set-password/);
    });

    test('should show the create password form', async ({ page }) => {
        await expect(page.getByText('Create your password')).toBeVisible();
    });

    test('should show an error if no password is provided', async ({ page }) => {
        await page.getByText('Continue').click();
        await expect(page.getByText('Please enter a password')).toBeVisible();
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

    test('should show an error if the password is not strong enough', async ({ page }) => {
        await page.getByLabel('Password', { exact: true }).fill('123456');
        await page.getByText('Continue').click();
        expect(page.locator('[id=password-error]').innerText).toBeTruthy();
    });

    test('when navigating back, the first page should display previously filled in information', async ({ page }) => {
        await page.getByTitle('Go back').click();
        await expect(page).toHaveURL(/create-account/);
        await expect(page.getByLabel('First Name')).toHaveValue('John');
        await expect(page.getByLabel('Last Name')).toHaveValue('Smith');
        await expect(page.getByLabel('E-Mail address')).toHaveValue('valid@email.com');
    });

    test('should redirect the user to the verification-sent page when the password is valid', async ({ page }) => {
        await page.getByLabel('Password', { exact: true }).fill('KKLjlsdakifjeiow0(*79384890sdfjl');
        await page.getByText('Continue').click();
        await expect(page).toHaveURL(/create-account\/verification-sent/);
    });
});

test.describe('create account verification-sent page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.getByLabel('First Name').fill('John');
        await page.getByLabel('Last Name').fill('Smith');
        await page.getByLabel('E-Mail address').fill('valid@email.com');
        await page.getByText('Continue').click();
        await expect(page).toHaveURL(/create-account\/set-password/);
        await page.getByLabel('Password', { exact: true }).fill('KKLjlsdakifjeiow0(*79384890sdfjl');
        await page.getByText('Continue').click();
        await expect(page).toHaveURL(/create-account\/verification-sent/);
    });

    test('should show the verification-sent page', async ({ page }) => {
        await expect(page.getByText("First, let's verify your email")).toBeVisible();
    });

    test('should show the users email address', async ({ page }) => {
        await expect(page.getByText('valid@email.com')).toBeVisible();
    });

    test('navigating to the verification-sent page should have invalidated the create account session', async ({
        page,
    }) => {
        await page.goto('/create-account');
        await expect(page.getByLabel('First Name')).not.toHaveValue('John');
        await expect(page.getByLabel('Last Name')).not.toHaveValue('Smith');
        await expect(page.getByLabel('E-Mail address')).not.toHaveValue('valid@email.com');
        await page.goto('/create-account/set-password');
        await expect(page).toHaveURL(/create-account$/);
    });
});

test.describe('General tests', () => {
    test('should not allow a user to access the set-password page without first filling in the first page', async ({
        page,
    }) => {
        await page.goto('/create-account/set-password');
        await expect(page).toHaveURL(/create-account$/);
    });

    test('should not allow a user to access the verification-sent page without first filling in the first page', async ({
        page,
    }) => {
        await page.goto('/create-account/verification-sent');
        await expect(page).toHaveURL(/create-account$/);
    });

    test('should not allow a user to access the verification-sent page without first filling in the second page', async ({
        page,
    }) => {
        await page.goto('/create-account');

        await page.getByLabel('First Name').fill('John');
        await page.getByLabel('Last Name').fill('Smith');
        await page.getByLabel('E-Mail address').fill('valid@email.com');
        await page.getByText('Continue').click();
        await expect(page).toHaveURL(/create-account\/set-password/);

        await page.goto('/create-account/verification-sent');
        await expect(page).toHaveURL(/create-account$/);
    });
    test('Should be able to switch to the login page', async ({ page }) => {
        await page.goto('/create-account');
        await page.getByLabel('Navigation').getByText('Log in').click();
        await expect(page).toHaveURL(/login$/);
    });
});
