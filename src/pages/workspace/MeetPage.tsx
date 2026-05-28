import { Video } from 'lucide-react'
import { WavePlaceholder } from './WavePlaceholder'
export function MeetPage() {
  return <WavePlaceholder
    badge="G.6"
    title="Meet"
    icon={Video}
    oneLiner="Scheduled video meetings with shareable links — for the team and for the public."
    whatItDoes={[
      'Schedule a Jitsi room ahead of time, add to your Calendar',
      'Invite city employees from the directory',
      'Generate a shareable external link (custom landing page) for citizens / contractors / press',
      'Optional dial-in info for citizens without webcams',
      "Per-case 'video huddle' button already works on every case detail page",
      'Recording handoff: post Jitsi recording URL to case notes or chat',
    ]}
    whyItMatters="Internal team meetings AND public-facing video calls (citizen complaints, contractor coordination, press briefings) — all in one place, all routable from the same shareable link infrastructure."
    shipsWith="G.6"
  />
}
