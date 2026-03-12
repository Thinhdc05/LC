import { useState, useCallback, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import problems from '../data/problems.json'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase/firebase'
import { doc, setDoc, getDoc } from 'firebase/firestore'

// ─── Language Config ───────────────────────────────────────────────────────────
const LANGUAGES = [
  { label: 'Python', value: 'python', pistonRuntime: 'python', pistonVersion: '3.10.0' },
  { label: 'JavaScript', value: 'javascript', pistonRuntime: 'javascript', pistonVersion: '18.15.0' },
  { label: 'Java', value: 'java', pistonRuntime: 'java', pistonVersion: '15.0.2' },
  { label: 'C', value: 'c', pistonRuntime: 'c', pistonVersion: '10.2.0' },
  { label: 'C++', value: 'cpp', pistonRuntime: 'cpp', pistonVersion: '10.2.0' },
]

const STARTER_CODE = {
  python: `# Write your Python solution here
def solution():
    pass

print(solution())
`,
  javascript: `// Write your JavaScript solution here
function solution() {
  // your code
}

console.log(solution());
`,
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your solution here
        System.out.println("Hello, World!");
    }
}
`,
  c: `#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your solution here
    printf("Hello, World!\\n");
    return 0;
}
`,
  cpp: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    // Write your solution here
    cout << "Hello, World!" << endl;
    return 0;
}
`,
}

// ─── Markdown Renderer (simple) ────────────────────────────────────────────────
function MarkdownContent({ content }) {
  const lines = content.split('\n')
  const elements = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-lg font-semibold mt-5 mb-2" style={{ color: '#e6edf3' }}>{line.slice(3)}</h2>)
    } else if (line.startsWith('# ')) {
      elements.push(<h1 key={i} className="text-xl font-bold mt-4 mb-2" style={{ color: '#e6edf3' }}>{line.slice(2)}</h1>)
    } else if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="rounded-lg p-4 overflow-x-auto text-xs my-3 font-mono"
          style={{ background: '#161b22', border: '1px solid #30363d', color: '#e6edf3', lineHeight: 1.6 }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
    } else if (line.trim() !== '') {
      // Inline processing: **bold**, `code`
      const parsed = parseInline(line)
      elements.push(<p key={i} className="mb-2 leading-relaxed text-sm" style={{ color: '#c9d1d9' }}>{parsed}</p>)
    }
    i++
  }
  return <div>{elements}</div>
}

function parseInline(text) {
  const parts = []
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0, match
  let idx = 0
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={idx++}>{text.slice(last, match.index)}</span>)
    const raw = match[0]
    if (raw.startsWith('**')) {
      parts.push(<strong key={idx++} style={{ color: '#e6edf3' }}>{raw.slice(2, -2)}</strong>)
    } else {
      parts.push(
        <code key={idx++} className="px-1.5 py-0.5 rounded text-xs font-mono"
          style={{ background: '#21262d', color: '#79c0ff', border: '1px solid #30363d' }}>
          {raw.slice(1, -1)}
        </code>
      )
    }
    last = match.index + raw.length
  }
  if (last < text.length) parts.push(<span key={idx++}>{text.slice(last)}</span>)
  return parts
}

// ─── Difficulty Badge ──────────────────────────────────────────────────────────
const DIFF_CFG = {
  Easy: { color: '#3fb950', bg: 'rgba(63,185,80,0.12)', border: 'rgba(63,185,80,0.3)' },
  Medium: { color: '#d29922', bg: 'rgba(210,153,34,0.12)', border: 'rgba(210,153,34,0.3)' },
  Hard: { color: '#f85149', bg: 'rgba(248,81,73,0.12)', border: 'rgba(248,81,73,0.3)' },
}

function DifficultyBadge({ difficulty }) {
  const cfg = DIFF_CFG[difficulty] || DIFF_CFG.Easy
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      {difficulty}
    </span>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function Problem() {
  const { id } = useParams()
  const navigate = useNavigate()
  const problem = problems.find(p => p.id === id)
  const { currentUser } = useAuth() || {}

  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState(STARTER_CODE['python'])
  const [showHints, setShowHints] = useState(false)
  const [hintIndex, setHintIndex] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [output, setOutput] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState(null)
  const [isSaved, setIsSaved] = useState(false)
  const [isSolved, setIsSolved] = useState(false)
  const [savingStatus, setSavingStatus] = useState('') // 'saving' | 'saved' | ''
  const editorRef = useRef(null)
  const autoSaveTimer = useRef(null)

  // Load saved draft from Firestore on open
  useEffect(() => {
    if (!currentUser || !id) return
    const docRef = doc(db, 'users', currentUser.uid, 'problems', id)
    getDoc(docRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data()
        if (data.code) setCode(data.code)
        if (data.language) setLanguage(data.language)
        if (data.solved) setIsSolved(data.solved)
      }
    }).catch(console.error)
  }, [currentUser, id])

  // Reset UI state when problem changes
  useEffect(() => {
    setShowHints(false)
    setHintIndex(0)
    setShowSolution(false)
    setOutput(null)
    setRunError(null)
    setSavingStatus('')
  }, [id])

  const handleMount = (editor, monaco) => {
    editorRef.current = editor
  }

  // Auto-save to Firestore (debounced 1.5s)
  const handleCodeChange = useCallback((value) => {
    setCode(value || '')
    if (!currentUser) return
    setSavingStatus('saving')
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(async () => {
      try {
        const docRef = doc(db, 'users', currentUser.uid, 'problems', id)
        await setDoc(docRef, { code: value, language, updatedAt: new Date().toISOString() }, { merge: true })
        setSavingStatus('saved')
        setTimeout(() => setSavingStatus(''), 2000)
      } catch (e) {
        console.error('Auto-save failed', e)
        setSavingStatus('')
      }
    }, 1500)
  }, [currentUser, id, language])

  const handleMarkSolved = useCallback(async () => {
    const newVal = !isSolved
    setIsSolved(newVal)
    if (!currentUser) return
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'problems', id)
      await setDoc(docRef, { solved: newVal, solvedAt: newVal ? new Date().toISOString() : null }, { merge: true })
    } catch (e) {
      console.error('Failed to update solved status', e)
    }
  }, [currentUser, id, isSolved])

  const handleLanguageChange = useCallback(async (e) => {
    const lang = e.target.value
    setLanguage(lang)
    setCode(STARTER_CODE[lang])
    if (!currentUser) return
    try {
      const docRef = doc(db, 'users', currentUser.uid, 'problems', id)
      await setDoc(docRef, { language: lang }, { merge: true })
    } catch (e) {
      console.error(e)
    }
  }, [currentUser, id])

  const handleRunCode = useCallback(async () => {
    const currentCode = editorRef.current?.getValue() || code
    const langConfig = LANGUAGES.find(l => l.value === language)
    if (!langConfig) return

    setIsRunning(true)
    setOutput(null)
    setRunError(null)

    try {
      const response = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: langConfig.pistonRuntime,
          version: langConfig.pistonVersion,
          files: [{ name: `solution.${language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : language}`, content: currentCode }],
        }),
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const data = await response.json()

      const stdout = data.run?.stdout || ''
      const stderr = data.run?.stderr || ''
      const compileError = data.compile?.stderr || ''

      setOutput({ stdout, stderr: stderr || compileError, exitCode: data.run?.code })
    } catch (err) {
      setRunError(err.message)
    } finally {
      setIsRunning(false)
    }
  }, [code, language])

  if (!problem) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-lg" style={{ color: '#8b949e' }}>Problem not found.</p>
        <button onClick={() => navigate('/')} className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: '#7c3aed', color: '#fff' }}>
          ← Back to Problems
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-53px)]" style={{ overflow: 'hidden' }}>
      {/* Mobile: stacked layout; Desktop: side-by-side */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">

        {/* ── Left Panel: Problem Description ── */}
        <div
          className="lg:w-[45%] flex flex-col overflow-hidden"
          style={{ borderRight: '1px solid #21262d' }}
        >
          {/* Problem header */}
          <div className="px-5 py-4 flex-shrink-0" style={{ borderBottom: '1px solid #21262d' }}>
            <div className="flex items-start gap-3 mb-3">
              <button
                onClick={() => navigate('/')}
                className="text-xs flex items-center gap-1 mt-1 transition-colors flex-shrink-0"
                style={{ color: '#8b949e' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#e6edf3')}
                onMouseLeave={e => (e.currentTarget.style.color = '#8b949e')}
              >
                ← Back
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h1 className="text-xl font-bold" style={{ color: '#e6edf3' }}>{problem.title}</h1>
                  <DifficultyBadge difficulty={problem.difficulty} />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {problem.tags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable description area */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Description */}
            <MarkdownContent content={problem.description} />

            {/* Hint section */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #30363d' }}>
              <button
                onClick={() => { setShowHints(!showHints); if (!showHints) setHintIndex(0) }}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
                style={{ background: '#161b22', color: showHints ? '#d29922' : '#8b949e' }}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Hints ({problem.hints.length} available)
                </span>
                <svg className={`w-4 h-4 transition-transform ${showHints ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showHints && (
                <div className="px-4 py-3" style={{ background: 'rgba(210,153,34,0.05)' }}>
                  {problem.hints.slice(0, hintIndex + 1).map((hint, idx) => (
                    <div key={idx} className="flex gap-2 mb-3">
                      <span className="text-xs font-bold flex-shrink-0 mt-0.5"
                        style={{ color: '#d29922' }}>Hint {idx + 1}</span>
                      <p className="text-sm leading-relaxed" style={{ color: '#c9d1d9' }}>{hint}</p>
                    </div>
                  ))}
                  {hintIndex < problem.hints.length - 1 && (
                    <button
                      onClick={() => setHintIndex(h => h + 1)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg mt-1 transition-all"
                      style={{ background: 'rgba(210,153,34,0.15)', color: '#d29922', border: '1px solid rgba(210,153,34,0.3)' }}
                    >
                      Show next hint →
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Solution section */}
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #30363d' }}>
              <button
                onClick={() => setShowSolution(!showSolution)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors"
                style={{ background: '#161b22', color: showSolution ? '#3fb950' : '#8b949e' }}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {showSolution ? 'Hide Solution' : 'Show Solution'}
                </span>
                <svg className={`w-4 h-4 transition-transform ${showSolution ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showSolution && (
                <div className="px-0 py-0">
                  <pre className="overflow-x-auto text-xs p-4 font-mono leading-relaxed"
                    style={{ background: '#0d1117', color: '#e6edf3', margin: 0 }}>
                    <code>{problem.solution}</code>
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right Panel: Editor + Output ── */}
        <div className="lg:w-[55%] flex flex-col overflow-hidden" style={{ background: '#0d1117' }}>
          {/* Editor toolbar */}
          <div
            className="flex items-center justify-between px-4 py-2 flex-shrink-0"
            style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}
          >
            <div className="flex items-center gap-3">
              <svg className="w-4 h-4" style={{ color: '#8b949e' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <select
                value={language}
                onChange={handleLanguageChange}
                className="text-sm rounded-lg px-2 py-1 outline-none cursor-pointer"
                style={{ background: '#0d1117', color: '#e6edf3', border: '1px solid #30363d' }}
              >
                {LANGUAGES.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>

              {/* Auto-save status */}
              {currentUser && savingStatus && (
                <span className="text-xs flex items-center gap-1" style={{ color: savingStatus === 'saved' ? '#3fb950' : '#6e7681' }}>
                  {savingStatus === 'saving' ? (
                    <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Saving...</>
                  ) : (
                    <><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Saved</>
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Mark as Solved */}
              <button
                onClick={handleMarkSolved}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: isSolved ? 'rgba(63,185,80,0.15)' : 'transparent',
                  color: isSolved ? '#3fb950' : '#8b949e',
                  border: `1px solid ${isSolved ? 'rgba(63,185,80,0.4)' : '#30363d'}`,
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {isSolved ? 'Solved ✓' : 'Mark Solved'}
              </button>

              <button
                onClick={handleRunCode}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={{
                  background: isRunning ? 'rgba(63,185,80,0.3)' : 'linear-gradient(135deg, #238636, #2ea043)',
                  color: '#fff',
                  boxShadow: isRunning ? 'none' : '0 0 12px rgba(46,160,67,0.3)',
                }}
              >
                {isRunning ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Running...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    Run Code
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={handleCodeChange}
              onMount={handleMount}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                minimap: { enabled: false },
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
                padding: { top: 12, bottom: 12 },
                scrollbar: {
                  verticalScrollbarSize: 6,
                  horizontalScrollbarSize: 6,
                },
              }}
            />
          </div>

          {/* Output Terminal */}
          {(output !== null || runError || isRunning) && (
            <div
              className="flex-shrink-0 border-t"
              style={{ borderColor: '#21262d', maxHeight: '200px', minHeight: '120px', overflowY: 'auto' }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{ background: '#161b22', borderBottom: '1px solid #21262d' }}
              >
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: '#f85149' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#d29922' }} />
                  <div className="w-3 h-3 rounded-full" style={{ background: '#3fb950' }} />
                </div>
                <span className="text-xs font-medium ml-1" style={{ color: '#6e7681' }}>Terminal Output</span>
                {output && (
                  <span className="ml-auto text-xs"
                    style={{ color: output.exitCode === 0 ? '#3fb950' : '#f85149' }}>
                    Exit code: {output.exitCode}
                  </span>
                )}
              </div>

              <div className="px-4 py-3 font-mono text-xs leading-relaxed" style={{ background: '#0d1117' }}>
                {isRunning && (
                  <span style={{ color: '#8b949e' }}>⠸ Executing code via Piston API...</span>
                )}
                {runError && (
                  <span style={{ color: '#f85149' }}>⚠ Network error: {runError}</span>
                )}
                {output?.stdout && (
                  <pre className="whitespace-pre-wrap m-0" style={{ color: '#3fb950' }}>{output.stdout}</pre>
                )}
                {output?.stderr && (
                  <pre className="whitespace-pre-wrap m-0 mt-1" style={{ color: '#f85149' }}>{output.stderr}</pre>
                )}
                {output && !output.stdout && !output.stderr && (
                  <span style={{ color: '#6e7681' }}>(No output)</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
