// Runs before each integration test file: the app's db client reads DATABASE_URL at import.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.AUTH_SECRET ??= "integration-test-secret-0123456789abcdef0123";
process.env.CRON_SECRET ??= "integration-test-cron-secret-0123456789abcdef";
process.env.NEXT_PUBLIC_SITE_URL ??= "http://localhost:3000";
