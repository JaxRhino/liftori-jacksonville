import { Mail } from 'lucide-react'
import { WavePlaceholder } from './WavePlaceholder'
export function EmailPage() {
  return <WavePlaceholder
    badge="G.5"
    title="Email"
    icon={Mail}
    oneLiner="Your work inbox, read and sent from inside Liftori. Stop tab-switching."
    whatItDoes={[
      'Connect your @coj.net Outlook 365 account via Microsoft Graph OAuth',
      'Inbox, threads, send, draft, attach',
      'One-click attach an email to a case or note',
      "Drag an inbound citizen email into the cases queue to create a new ticket",
      'Future: Gmail support for any agency outside the M365 stack',
    ]}
    whyItMatters="Email is still where 30% of citizen interactions happen. If your agents leave Liftori to read email, they stop being in flow. The fastest way to consolidate the city's tooling is to absorb the inbox."
    shipsWith="G.5 (requires Azure App Registration from Liftori)"
  />
}
