/**
 * Test data constants for E2E tests.
 *
 * IMPORTANT: For actual testing, you need to obtain valid test credentials
 * from your backend. These placeholder values should be replaced with
 * real test tokens.
 */
export const TEST_CREDENTIALS = {
  // These should be set via environment variables
  token: process.env.E2E_TEST_TOKEN || 'test-token-placeholder',
  userId: process.env.E2E_TEST_USER_ID || 'test-user-id',
}

export const ROUTES = {
  home: '/home',
  login: '/login',
  dashboards: '/dashboards',
  authError: '/auth/error',
}

export const TIMEOUTS = {
  navigation: 30000,
  animation: 1000,
  api: 10000,
}
