import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		command:
			'mise exec -- env BASE_PATH=/solarflow pnpm build && mise exec -- env BASE_PATH=/solarflow pnpm preview',
		port: 4173,
		reuseExistingServer: true
	},
	use: {
		baseURL: 'http://localhost:4173/solarflow'
	},
	testMatch: '**/*.e2e.{ts,js}'
});
