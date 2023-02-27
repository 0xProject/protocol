import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/login");
});

test("should redirect in case of entering protected route without login", async ({
  page,
}) => {
  await page.goto("/apps");
  // no pathname main route
  await expect(page).toHaveURL(/^(https?):\/\/[^\/]+\/?$/);
});

test.describe("correct credentials", () => {
  const email = "user@domain.tld";
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("test");

    await page.getByText("Log in").click();
  });
  test("should email be visible", async ({ page }) => {
    await expect(page.getByText("user@domain.tld")).toBeVisible();
  });
  test("should redirect from login to index route if already logged in.", async ({
    page,
  }) => {
    await page.waitForURL("**/apps");
    await page.goto("/login");

    await expect(page).toHaveURL(/apps/);
  });
});

test.describe("Incorrect credentials", () => {
  const email = "user@domain.tld";
  const password = "bad_password";

  test("password missing", async ({ page }) => {
    await page.getByLabel("Email").fill(email);
    await page.getByText("Log in").click();
    await expect(page.getByText("Password is required")).toBeVisible();
  });

  test.describe("Bad password", async () => {
    test.beforeEach(async ({ page }) => {
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByText("Log in").click();
    });
    test("should show error", async ({ page }) => {
      await expect(page.getByText("Invalid credentials")).toBeVisible();
    });
    test("should not redirect to protected route ", async ({ page }) => {
      await expect(page).not.toHaveURL(/apps/);
    });
  });
});
