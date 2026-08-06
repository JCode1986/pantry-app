import { expect, test } from "@playwright/test";

test.describe("public and unauthenticated flows", () => {
  test("home page exposes the primary marketing actions", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /stop buying things you already have/i })
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /organize my home/i })).toHaveAttribute(
      "href",
      "/signup"
    );
    await expect(page.getByRole("link", { name: /view features/i })).toHaveAttribute(
      "href",
      "#how-it-works"
    );
  });

  test("login form is reachable and exposes accessible fields", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("heading", { name: /log in to wherekeep/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /^password$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /^log in$/i })).toBeVisible();
  });

  test("invalid sign-in shows a user-facing error without leaving the page", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByLabel(/email/i).fill("invalid@example.test");
    await page.getByRole("textbox", { name: /^password$/i }).fill("wrong-password");
    await page.getByRole("button", { name: /^log in$/i }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByText(/invalid|failed|could not|error/i)).toBeVisible();
  });

  test("protected pages send unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole("heading", { name: /log in to wherekeep/i })).toBeVisible();
  });
});
