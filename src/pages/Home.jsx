import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import problems from '../data/problems.json'

const DIFFICULTY_CONFIG = {
  Easy: { color: '#3fb950', bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.3)' },
  Medium: { color: '#d29922', bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.3)' },
  Hard: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: 'rgba(248,81,73,0.3)' },
}

const ALL_TAGS = [...new Set(problems.flatMap(p => p.tags))].sort()

function DifficultyBadge({ difficulty }) {
  const cfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Easy
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {difficulty}
    </span>
  )
}

function TagBadge({ tag, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-all cursor-pointer border"
      style={{
        color: active ? '#e6edf3' : '#8b949e',
        background: active ? 'rgba(124,58,237,0.25)' : 'transparent',
        borderColor: active ? 'rgba(124,58,237,0.6)' : '#30363d',
      }}
    >
      {tag}
    </button>
  )
}

export default function Home() {
  const [search, setSearch] = useState('')
  const [difficultyFilter, setDifficultyFilter] = useState('All')
  const [selectedTags, setSelectedTags] = useState([])
  const navigate = useNavigate()

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const filtered = useMemo(() => {
    return problems.filter(p => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase())
      const matchDiff = difficultyFilter === 'All' || p.difficulty === difficultyFilter
      const matchTags = selectedTags.length === 0 || selectedTags.every(t => p.tags.includes(t))
      return matchSearch && matchDiff && matchTags
    })
  }, [search, difficultyFilter, selectedTags])

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold mb-3" style={{
          background: 'linear-gradient(135deg, #7c3aed, #2563eb, #0ea5e9)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Practice Algorithms
        </h1>
        <p className="text-base" style={{ color: '#8b949e' }}>
          Sharpen your coding skills with curated problems. Write, run, and master your solutions.
        </p>
      </div>

      {/* Filters */}
      <div
        className="rounded-xl p-5 mb-6 flex flex-col gap-4"
        style={{ background: '#161b22', border: '1px solid #30363d' }}
      >
        {/* Search + Difficulty row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              style={{ color: '#6e7681' }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search problems..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none transition-all"
              style={{
                background: '#0d1117',
                border: '1px solid #30363d',
                color: '#e6edf3',
              }}
              onFocus={e => (e.target.style.borderColor = '#7c3aed')}
              onBlur={e => (e.target.style.borderColor = '#30363d')}
            />
          </div>

          <select
            value={difficultyFilter}
            onChange={e => setDifficultyFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm outline-none cursor-pointer"
            style={{
              background: '#0d1117',
              border: '1px solid #30363d',
              color: '#e6edf3',
              minWidth: '140px',
            }}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>

        {/* Tag filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs font-medium" style={{ color: '#6e7681' }}>Tags:</span>
          {ALL_TAGS.map(tag => (
            <TagBadge
              key={tag}
              tag={tag}
              active={selectedTags.includes(tag)}
              onClick={() => toggleTag(tag)}
            />
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs underline transition-colors"
              style={{ color: '#f85149' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: '#8b949e' }}>
          Showing <span style={{ color: '#e6edf3', fontWeight: 600 }}>{filtered.length}</span> of {problems.length} problems
        </p>
        <div className="flex gap-4 text-xs" style={{ color: '#6e7681' }}>
          {['Easy', 'Medium', 'Hard'].map(d => {
            const count = problems.filter(p => p.difficulty === d).length
            const cfg = DIFFICULTY_CONFIG[d]
            return (
              <span key={d} style={{ color: cfg.color }}>
                {count} {d}
              </span>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #30363d' }}>
        {/* Table Header */}
        <div
          className="grid text-xs font-semibold uppercase tracking-wider px-4 py-3"
          style={{
            gridTemplateColumns: '3rem 1fr auto auto',
            background: '#161b22',
            color: '#6e7681',
            borderBottom: '1px solid #30363d',
          }}
        >
          <span>#</span>
          <span>Title</span>
          <span className="text-center pr-6">Tags</span>
          <span className="text-center">Difficulty</span>
        </div>

        {/* Table Rows */}
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            style={{ background: '#0d1117' }}
          >
            <svg className="w-12 h-12" style={{ color: '#30363d' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p style={{ color: '#6e7681' }}>No problems found matching your filters.</p>
            <button
              onClick={() => { setSearch(''); setDifficultyFilter('All'); setSelectedTags([]) }}
              className="text-sm underline"
              style={{ color: '#7c3aed' }}
            >
              Clear all filters
            </button>
          </div>
        ) : (
          filtered.map((problem, idx) => (
            <ProblemRow
              key={problem.id}
              problem={problem}
              index={idx}
              onClick={() => navigate(`/problem/${problem.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function ProblemRow({ problem, index, onClick }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="grid items-center px-4 py-3 cursor-pointer transition-all"
      style={{
        gridTemplateColumns: '3rem 1fr auto auto',
        background: hovered ? '#161b22' : index % 2 === 0 ? '#0d1117' : 'rgba(13,17,23,0.5)',
        borderBottom: '1px solid #21262d',
        gap: '0.5rem',
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Index */}
      <span className="text-sm font-mono" style={{ color: '#6e7681' }}>
        {problem.id.padStart(3, '0')}
      </span>

      {/* Title */}
      <span
        className="text-sm font-medium transition-colors"
        style={{ color: hovered ? '#7c3aed' : '#e6edf3' }}
      >
        {problem.title}
      </span>

      {/* Tags (hidden on very small screens) */}
      <div className="hidden sm:flex flex-wrap gap-1 justify-end pr-4">
        {problem.tags.slice(0, 3).map(tag => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded"
            style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Difficulty */}
      <div className="flex justify-end">
        <DifficultyBadge difficulty={problem.difficulty} />
      </div>
    </div>
  )
}
