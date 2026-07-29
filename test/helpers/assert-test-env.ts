export function assertTestEnv(): void {
  if (process.env['NODE_ENV'] !== 'test') {
    throw new Error('Destructive test helper blocked outside NODE_ENV=test');
  }
}
