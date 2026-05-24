import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'mise exec -- pnpm build && mise exec -- pnpm preview',
		port: 4173,
		reuseExistingServer: true
	},
	testMatch: '**/*.e2e.{ts,js}'
});
