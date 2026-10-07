import { publicSiteResponse } from '@/lib/public-site'
export const dynamic = 'force-dynamic'
export async function GET() { return publicSiteResponse() }
