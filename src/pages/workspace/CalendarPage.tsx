import { Calendar } from 'lucide-react'
import { WavePlaceholder } from './WavePlaceholder'
export function CalendarPage() {
  return <WavePlaceholder
    badge="G.2"
    title="Calendar"
    icon={Calendar}
    oneLiner="Your full schedule — meetings, inspections, court dates, training — in one timeline."
    whatItDoes={[
      'Month / week / day views with drag-to-create events',
      'Color-coded by category (case-related, internal, external)',
      'Invite teammates from the city employee directory',
      'Per-event meeting URL field that auto-launches a Jitsi room',
      'Two-way sync with Outlook 365 (Wave G.5 adds the auth)',
      'Click any case to schedule a follow-up against it',
    ]}
    whyItMatters="CSRs and inspectors juggle Outlook + Teams + paper calendars + sticky notes today. One workspace means scheduling a hood-cleaning inspection takes one click — not three apps."
    shipsWith="G.2"
  />
}
