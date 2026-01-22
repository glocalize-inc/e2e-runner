import path from 'path'
import fs from 'fs'

// Use /tmp for writable paths in Vercel environment (read-only filesystem)
export const isVercel = !!process.env.VERCEL || !!process.env.VERCEL_ENV

export const AUTH_DIR = isVercel ? '/tmp/e2e/.auth' : path.join(__dirname, '.auth')
export const AUTH_FILE = path.join(AUTH_DIR, 'user.json')

// Ensure auth directory exists
export function ensureAuthDir(): void {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true })
  }
}
