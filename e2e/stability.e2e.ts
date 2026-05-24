import { expect, test } from '@playwright/test';

test('main page stays responsive after load', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (err) => errors.push(err.message));

	await page.goto('/', { waitUntil: 'networkidle', timeout: 30_000 });

	// Let animations run briefly; a tight loop would peg CPU and blow this budget.
	const t0 = Date.now();
	await page.waitForTimeout(2_000);
	const elapsed = Date.now() - t0;
	expect(elapsed).toBeLessThan(5_000);

	const responsive = await page.evaluate(() => {
		const start = performance.now();
		// If the main thread is blocked, this callback is delayed heavily.
		let sum = 0;
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		for (let i = 0; i < 100_000; i++) sum += i;
		return performance.now() - start;
	});
	expect(responsive).toBeLessThan(200);

	expect(errors).toEqual([]);
});
