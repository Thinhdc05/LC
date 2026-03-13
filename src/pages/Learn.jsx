import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { db } from '../firebase/firebase'
import { collection, doc, setDoc, getDocs, deleteDoc, serverTimestamp } from 'firebase/firestore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import guidesData from '../data/guides.json'
import problemsData from '../data/problems.json'

export default function Learn() {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  const [activeItem, setActiveItem] = useState(guidesData[0]) // can be a guide or a note
  const [notes, setNotes] = useState([])
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Fetch user notes
  const fetchNotes = async () => {
    if (!currentUser?.uid) {
      setNotes([])
      return
    }
    try {
      const notesRef = collection(db, 'users', currentUser.uid, 'notes')
      const snapshot = await getDocs(notesRef)
      const fetchedNotes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isNote: true
      })).sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0))
      
      setNotes(fetchedNotes)
    } catch (error) {
      console.error("Error fetching notes:", error)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [currentUser])

  // Select item (guide or note)
  const selectItem = (item) => {
    setActiveItem(item)
    if (item.isNote) {
      setIsEditingNote(true)
      setNoteTitle(item.title)
      setNoteContent(item.content)
    } else {
      setIsEditingNote(false)
    }
  }

  // Create new blank note
  const createNewNote = () => {
    if (!currentUser) return alert("Please sign in to create notes.")
    const newNote = {
      id: `note-${Date.now()}`,
      title: 'New Note',
      content: '# My New Note\n\nWrite something here...',
      isNote: true
    }
    setActiveItem(newNote)
    setIsEditingNote(true)
    setNoteTitle(newNote.title)
    setNoteContent(newNote.content)
  }

  // Save current note to Firestore
  const saveNote = async () => {
    if (!currentUser?.uid) return
    setIsSaving(true)
    try {
      const noteRef = doc(db, 'users', currentUser.uid, 'notes', activeItem.id)
      await setDoc(noteRef, {
        title: noteTitle || 'Untitled Note',
        content: noteContent,
        updatedAt: serverTimestamp()
      }, { merge: true })
      
      // Update local state
      setActiveItem(prev => ({ ...prev, title: noteTitle, content: noteContent }))
      await fetchNotes()
    } catch (error) {
      console.error("Error saving note:", error)
      alert("Failed to save note.")
    } finally {
      setIsSaving(false)
    }
  }

  // Delete current note from Firestore
  const deleteNote = async (noteId) => {
    if (!currentUser?.uid) return
    if (!confirm("Are you sure you want to delete this note?")) return
    
    try {
      const noteRef = doc(db, 'users', currentUser.uid, 'notes', noteId)
      await deleteDoc(noteRef)
      await fetchNotes()
      // If deleted active note, switch to first guide
      if (activeItem?.id === noteId) {
        selectItem(guidesData[0])
      }
    } catch (error) {
      console.error("Error deleting note:", error)
      alert("Failed to delete note.")
    }
  }

  return (
    <div className="flex h-full w-full max-w-[1400px] mx-auto text-[#e6edf3]" style={{ overflow: 'hidden', height: 'calc(100vh - 58px)' }}>
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col" style={{ borderColor: '#30363d', background: '#010409', overflowY: 'auto' }}>
        
        {/* System Guides Section */}
        <div className="p-4 border-b" style={{ borderColor: '#30363d' }}>
          <h2 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#8b949e' }}>📚 System Guides</h2>
          <div className="flex flex-col gap-1">
            {guidesData.map(guide => (
              <button
                key={guide.id}
                onClick={() => selectItem(guide)}
                className={`text-left px-3 py-2 rounded-md text-sm transition-colors ${activeItem?.id === guide.id ? 'bg-[#21262d] font-semibold text-white' : 'hover:bg-[#161b22] text-[#c9d1d9]'}`}
              >
                {guide.title}
              </button>
            ))}
          </div>
        </div>

        {/* My Notes Section */}
        <div className="p-4 flex-1">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: '#8b949e' }}>📝 My Notes</h2>
            <button 
              onClick={createNewNote}
              className="text-xs px-2 py-1 rounded bg-[#2ea043] text-white hover:bg-[#2c974b] transition-colors font-medium border border-[#3fb950] border-opacity-20 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              New
            </button>
          </div>
          
          {!currentUser ? (
            <div className="text-sm p-3 rounded-md bg-[#161b22] border border-[#30363d] text-center" style={{ color: '#8b949e' }}>
              Sign in to use personal notes.
            </div>
          ) : notes.length === 0 ? (
            <div className="text-sm italic text-center p-3" style={{ color: '#8b949e' }}>
              No notes yet. Click 'New' to create one!
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {notes.map(note => (
                <div key={note.id} className={`flex items-center justify-between group rounded-md transition-colors ${activeItem?.id === note.id ? 'bg-[#21262d]' : 'hover:bg-[#161b22]'}`}>
                  <button
                    onClick={() => selectItem(note)}
                    className={`flex-1 text-left px-3 py-2 text-sm truncate ${activeItem?.id === note.id ? 'font-semibold text-white' : 'text-[#c9d1d9]'}`}
                  >
                    {note.title || 'Untitled Note'}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteNote(note.id); }}
                    className="p-1 mr-1 text-[#f85149] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#f85149] hover:bg-opacity-20 rounded"
                    title="Delete Note"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col" style={{ background: '#0d1117', overflowY: 'auto' }}>
        {activeItem ? (
          <div className="max-w-4xl w-full mx-auto p-8 relative">
            
            {/* Header / Editor Controls */}
            {isEditingNote ? (
              <div className="mb-6 flex items-center justify-between border-b pb-4" style={{ borderColor: '#30363d' }}>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note Title"
                  className="text-3xl font-bold bg-transparent border-none outline-none flex-1 truncate text-white placeholder-gray-500"
                />
                <button
                  onClick={saveNote}
                  disabled={isSaving}
                  className={`ml-4 px-4 py-2 rounded-md font-medium text-sm text-white bg-[#2ea043] hover:bg-[#2c974b] transition-colors flex items-center gap-2 ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
                >
                  {isSaving ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                  )}
                  {isSaving ? 'Saving...' : 'Save Note'}
                </button>
              </div>
            ) : (
              <div className="mb-8 border-b pb-4" style={{ borderColor: '#30363d' }}>
                <div className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#7c3aed' }}>
                  {activeItem.category || 'Guide'}
                </div>
                <h1 className="text-3xl font-bold" style={{ color: '#e6edf3' }}>{activeItem.title}</h1>
              </div>
            )}

            {/* Content / Editor Area */}
            {isEditingNote ? (
              <div className="grid grid-cols-2 gap-6 min-h-[500px]">
                {/* Editor (Textarea) */}
                <div className="flex flex-col">
                  <div className="text-xs font-semibold mb-2 uppercase text-[#8b949e]">Markdown Editor</div>
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Write your note in Markdown here..."
                    className="flex-1 w-full p-4 rounded-lg bg-[#010409] text-[#e6edf3] border border-[#30363d] focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] outline-none transition-colors font-mono text-sm resize-none"
                    spellCheck="false"
                  />
                </div>
                {/* Live Preview */}
                <div className="flex flex-col">
                  <div className="text-xs font-semibold mb-2 uppercase text-[#8b949e]">Live Preview</div>
                  <div className="flex-1 w-full p-6 rounded-lg bg-[#0d1117] border border-[#30363d] overflow-y-auto prose prose-invert prose-headings:text-[#e6edf3] prose-p:text-[#c9d1d9] prose-a:text-[#58a6ff] prose-code:text-[#ff7b72] prose-code:bg-[#161b22] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded max-w-none">
                    <ReactMarkdown 
                      remarkPlugins={[remarkGfm, remarkMath]} 
                      rehypePlugins={[rehypeKatex]}
                    >
                      {noteContent || '*Preview will appear here...*'}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ) : (
              // Guide Viewer
              <div className="flex flex-col gap-8 pb-12">
                <div className="prose prose-invert prose-lg prose-headings:text-[#e6edf3] prose-p:text-[#c9d1d9] prose-a:text-[#58a6ff] prose-code:text-[#ff7b72] prose-code:bg-[#161b22] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-[#161b22] prose-pre:border prose-pre:border-[#30363d] max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm, remarkMath]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {activeItem.content}
                  </ReactMarkdown>
                </div>

                {/* Related Problems Section */}
                {activeItem.relatedProblems && activeItem.relatedProblems.length > 0 && (
                  <div className="border-t pt-6" style={{ borderColor: '#30363d' }}>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: '#e6edf3' }}>
                      <span className="text-xl">🧩</span> Related Problems to Practice
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeItem.relatedProblems.map(probId => {
                        const p = problemsData.find(x => x.id === probId)
                        if (!p) return null
                        return (
                          <button
                            key={probId}
                            onClick={() => navigate(`/problem/${p.id}`)}
                            className="flex items-center justify-between text-left px-4 py-3 rounded-xl border transition-all hover:-translate-y-0.5"
                            style={{ background: '#161b22', borderColor: '#30363d' }}
                            onMouseEnter={e => {
                              e.currentTarget.style.borderColor = '#7c3aed'
                              e.currentTarget.style.background = 'rgba(124,58,237,0.05)'
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.borderColor = '#30363d'
                              e.currentTarget.style.background = '#161b22'
                            }}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-semibold" style={{ color: '#e6edf3' }}>{p.title}</span>
                              <div className="flex gap-2 text-xs">
                                <span style={{ color: p.difficulty === 'Easy' ? '#3fb950' : p.difficulty === 'Medium' ? '#d29922' : '#f85149', fontWeight: '600' }}>
                                  {p.difficulty}
                                </span>
                                <span style={{ color: '#8b949e' }}>•</span>
                                <span style={{ color: '#8b949e' }}>{p.tags[0]}</span>
                              </div>
                            </div>
                            <svg className="w-5 h-5 text-[#8b949e]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-[#8b949e]">
            Select a guide or note from the sidebar.
          </div>
        )}
      </div>
    </div>
  )
}
