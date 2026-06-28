import React, { type ReactNode } from 'react'

interface EmptyStateProps {
  icon: ReactNode
  title: string
  text: string
}

export default function EmptyState({ icon, title, text }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  )
}
