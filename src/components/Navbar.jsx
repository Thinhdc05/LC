import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const auth = useAuth()
  const currentUser = auth?.currentUser
  const signInWithGoogle = auth?.signInWithGoogle
  const logout = auth?.logout
  const isLoading = auth?.currentUser === undefined

  return (
    <nav
      className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b"
      style={{
        background: 'rgba(13,17,23,0.85)',
        borderColor: '#30363d',
        backdropFilter: 'blur(12px)',
      }}
    >
      <Link to="/" className="flex items-center gap-2 no-underline" style={{ textDecoration: 'none' }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff' }}
        >
          AT
        </div>
        <span className="text-lg font-bold" style={{ color: '#e6edf3' }}>
          AlgoTrail
        </span>
      </Link>

      <div className="flex items-center gap-3">
        <Link
          to="/"
          className="text-sm transition-colors hidden sm:block"
          style={{ color: '#8b949e', textDecoration: 'none' }}
          onMouseEnter={e => (e.target.style.color = '#e6edf3')}
          onMouseLeave={e => (e.target.style.color = '#8b949e')}
        >
          Problems
        </Link>

        {isLoading ? (
          <div className="w-8 h-8 rounded-full animate-pulse" style={{ background: '#21262d' }} />
        ) : currentUser ? (
          <div className="flex items-center gap-2">
            <img
              src={currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.displayName || 'U')}&background=7c3aed&color=fff`}
              alt={currentUser.displayName}
              className="w-8 h-8 rounded-full"
              style={{ border: '2px solid #30363d' }}
            />
            <span className="hidden sm:block text-sm" style={{ color: '#e6edf3' }}>
              {currentUser.displayName?.split(' ')[0]}
            </span>
            <button
              onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: 'transparent',
                color: '#8b949e',
                border: '1px solid #30363d',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#f85149'; e.currentTarget.style.color = '#f85149' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#30363d'; e.currentTarget.style.color = '#8b949e' }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg font-medium transition-all"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
              color: '#fff',
              border: 'none',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in
          </button>
        )}
      </div>
    </nav>
  )
}
