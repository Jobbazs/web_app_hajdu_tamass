import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Login() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Hibás email vagy jelszó.')
    }
    setLoading(false)
  }

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-title">Admin</div>
        <div className="login-sub">Csak a tulajdonos számára</div>

        <form onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="admin@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Jelszó</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="form-error" style={{ marginBottom: '1rem' }}>{error}</div>}

          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
            style={{ width: '100%', textAlign: 'center' }}
          >
            <span>{loading ? 'Belépés...' : 'Belépés →'}</span>
          </button>
        </form>
      </div>
    </div>
  )
}
