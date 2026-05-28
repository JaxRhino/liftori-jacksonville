import { CheckSquare } from 'lucide-react'
import { WavePlaceholder } from './WavePlaceholder'
export function TasksPage() {
  return <WavePlaceholder
    badge="G.4"
    title="Tasks"
    icon={CheckSquare}
    oneLiner="Your to-do list and the team's. Kanban or list view, your call."
    whatItDoes={[
      'Status pills: todo / doing / blocked / done / cancelled',
      'Priority + due date + assignee from the directory',
      'Subtasks for breaking large work down',
      'Link any task to a case so closing the case auto-suggests closing the tasks',
      'Drag between status columns in Kanban view',
      'My tasks today / overdue / blocked smart filters',
    ]}
    whyItMatters="Cases are the customer-facing unit of work. Tasks are the internal unit. Plenty of work — 'follow up with the contractor', 'draft Q2 ops report' — isn't a service request but still needs tracking."
    shipsWith="G.4"
  />
}
