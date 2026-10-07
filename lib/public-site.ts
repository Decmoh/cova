import { readFile } from 'node:fs/promises'
import path from 'node:path'

export async function publicSiteResponse() {
  const html = await readFile(path.join(process.cwd(), 'content/landing.html'), 'utf8')
  // The root varies by authentication. Never cache its personalized response publicly.
  return new Response(html, { headers: {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'private, no-store',
    'Vary': 'Cookie',
  } })
}
