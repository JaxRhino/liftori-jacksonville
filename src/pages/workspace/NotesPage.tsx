import { StickyNote } from 'lucide-react'
import { WavePlaceholder } from './WavePlaceholder'
export function NotesPage() {
  return <WavePlaceholder
    badge="G.3"
    title="Notes"
    icon={StickyNote}
    oneLiner="Your scratchpad and your knowledge base. Searchable across every note you've ever taken."
    whatItDoes={[
      'Rich-text editor with markdown shortcuts',
      'Tag, pin, archive, share with specific teammates',
      'Fuzzy search across title + body (pg_trgm)',
      'Link any note to a case for one-click recall later',
      'AI suggested tags + summary on save (when Claude is keyed)',
    ]}
    whyItMatters="The institutional knowledge that lives in agents' heads should live somewhere searchable. When Holli retires, her playbook for working a stubborn code-compliance case shouldn't retire with her."
    shipsWith="G.3"
  />
}
