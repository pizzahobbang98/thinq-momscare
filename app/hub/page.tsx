export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

export default function Page() {
  redirect('/simulation-3d/index.html')
}
