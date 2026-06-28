import React from 'react'
import { Search } from 'lucide-react'
import type { SnippetFilters } from '../../types'

interface SnippetFiltersBoxProps {
  filters: SnippetFilters
  tags: string[]
  languages: string[]
  onChange: (filters: SnippetFilters) => void
}

export default function SnippetFiltersBox({
  filters,
  tags,
  languages,
  onChange,
}: SnippetFiltersBoxProps) {
  return (
    <div className="filters compact">
      <label className="search-box">
        <Search size={16} />
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Пошук коду..."
        />
      </label>
      <select
        value={filters.language}
        onChange={(event) => onChange({ ...filters, language: event.target.value })}
      >
        <option value="all">Усі мови</option>
        {languages.map((language) => (
          <option value={language} key={language}>
            {language}
          </option>
        ))}
      </select>
      <select
        value={filters.tag}
        onChange={(event) => onChange({ ...filters, tag: event.target.value })}
      >
        <option value="all">Усі теги</option>
        {tags.map((tag) => (
          <option value={tag} key={tag}>
            {tag}
          </option>
        ))}
      </select>
    </div>
  )
}
