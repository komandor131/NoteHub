import { Paperclip, X } from 'lucide-react'
import type { Attachment } from '../../types'

interface AttachmentListProps {
  attachments: Attachment[]
  onDelete?: (attachment: Attachment) => void
}

const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export default function AttachmentList({ attachments, onDelete }: AttachmentListProps) {
  if (!attachments.length) {
    return null
  }
  return (
    <div className="attachment-list">
      {attachments.map((attachment) => (
        <span className="attachment-pill" key={attachment.id}>
          <a href={`${API_BASE}/uploads/${encodeURIComponent(attachment.storedName)}`} target="_blank" rel="noreferrer">
            <Paperclip size={14} />
            {attachment.originalName}
          </a>
          {onDelete ? (
            <button type="button" onClick={() => onDelete(attachment)} aria-label="Delete attachment">
              <X size={13} />
            </button>
          ) : null}
        </span>
      ))}
    </div>
  )
}
