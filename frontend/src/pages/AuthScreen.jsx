import { useState } from 'react'
import { api } from '../api'
import { Icon } from '../icons.jsx'

export default function AuthScreen({ onAuth }) {
  const [mode, setMode]       = useState('login') // 'login' | 'signup'
  const [userId, setUserId]   = useState('')
  const [password, setPass]   = useState('')
  const [displayName, setDN]  = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const submit = async () => {
    if (!userId.trim() || !password.trim()) { setError('Fill in all fields'); return }
    setLoading(true); setError('')
    try {
      const endpoint = mode === 'login' ? '/api/login' : '/api/signup'
      const body = mode === 'login' ? { user_id: userId, password } : { user_id: userId, password, display_name: displayName || userId }
      const path = endpoint.replace('/api', '')   // IMPORTANT
      const r = await api.post(path, body)
      onAuth({ ...r, is_guest: false })
    } catch(e) {
      setError(e?.detail || 'Something went wrong')
    }
    setLoading(false)
  }

  const continueGuest = async () => {
    setLoading(true)
    try {
      const r = await api.post('/guest', {})
      onAuth({ ...r, is_guest: true })
    } catch {
      onAuth({ user_id: 'guest_' + Math.random().toString(36).slice(2,8), display_name: 'Guest', token: null, is_guest: true })
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',position:'relative',zIndex:10,padding:24 }}>
      <div className="animate-scaleIn" style={{ width:'100%',maxWidth:420 }}>
        {/* Logo */}
        <div style={{ textAlign:'center',marginBottom:44 }}>
          <div style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:64,height:64,borderRadius:18,background:'linear-gradient(135deg,var(--cyan),var(--violet))',boxShadow:'var(--glow-cyan)',marginBottom:20 }} className="animate-float">
            <Icon.Brain size={32} color="#fff" />
          </div>
          <div style={{ fontFamily:'var(--font-hero)',fontSize:48,letterSpacing:'0.06em',lineHeight:1 }} className="g-aurora">CODEMIND</div>
          <div style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',letterSpacing:'0.14em',marginTop:6 }}>AI CODING MENTOR · MEMORY ENHANCED</div>
        </div>

        {/* Card */}
        <div className="card" style={{ padding:32,borderColor:'var(--border2)' }}>
          {/* Mode toggle */}
          <div style={{ display:'flex',background:'var(--bg3)',borderRadius:10,padding:3,marginBottom:28,gap:2 }}>
            {['login','signup'].map(m => (
              <button key={m} onClick={() => { setMode(m); setError('') }} style={{
                flex:1,padding:'8px 0',borderRadius:8,border:'none',cursor:'pointer',
                fontFamily:'var(--font-mono)',fontSize:11,fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',
                background:mode===m?'linear-gradient(135deg,rgba(0,229,255,0.2),rgba(139,92,246,0.2))':'transparent',
                color:mode===m?'var(--cyan)':'var(--text3)',
                boxShadow:mode===m?'inset 0 0 0 1px rgba(0,229,255,0.25)':'none',
                transition:'all 0.2s'
              }}>{m}</button>
            ))}
          </div>

          <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
            <div>
              <label style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',letterSpacing:'0.08em',textTransform:'uppercase',display:'block',marginBottom:6 }}>User ID</label>
              <input value={userId} onChange={e => setUserId(e.target.value)} onKeyDown={e => e.key==='Enter' && submit()}
                placeholder="your_handle"
                style={{ width:'100%',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:9,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-mono)',fontSize:13,outline:'none',transition:'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor='rgba(0,229,255,0.4)'}
                onBlur={e => e.target.style.borderColor='var(--border2)'} />
            </div>
            {mode === 'signup' && (
              <div>
                <label style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',letterSpacing:'0.08em',textTransform:'uppercase',display:'block',marginBottom:6 }}>Display Name (optional)</label>
                <input value={displayName} onChange={e => setDN(e.target.value)}
                  placeholder="Your Name"
                  style={{ width:'100%',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:9,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-mono)',fontSize:13,outline:'none',transition:'border-color 0.2s' }}
                  onFocus={e => e.target.style.borderColor='rgba(0,229,255,0.4)'}
                  onBlur={e => e.target.style.borderColor='var(--border2)'} />
              </div>
            )}
            <div>
              <label style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',letterSpacing:'0.08em',textTransform:'uppercase',display:'block',marginBottom:6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key==='Enter' && submit()}
                placeholder="••••••••"
                style={{ width:'100%',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:9,padding:'10px 14px',color:'var(--text)',fontFamily:'var(--font-mono)',fontSize:13,outline:'none',transition:'border-color 0.2s' }}
                onFocus={e => e.target.style.borderColor='rgba(0,229,255,0.4)'}
                onBlur={e => e.target.style.borderColor='var(--border2)'} />
            </div>
          </div>

          {error && (
            <div style={{ marginTop:12,padding:'8px 12px',background:'rgba(255,31,110,0.08)',border:'1px solid rgba(255,31,110,0.2)',borderRadius:8,fontFamily:'var(--font-mono)',fontSize:11,color:'var(--pink)' }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={loading} className="btn btn-primary" style={{ width:'100%',justifyContent:'center',marginTop:20,padding:'12px 0',fontSize:12 }}>
            {loading ? <Icon.Spinner size={14} color="#fff" /> : null}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <div style={{ display:'flex',alignItems:'center',gap:12,margin:'20px 0' }}>
            <div style={{ flex:1,height:1,background:'var(--border)' }} />
            <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)' }}>OR</span>
            <div style={{ flex:1,height:1,background:'var(--border)' }} />
          </div>

          <button onClick={continueGuest} disabled={loading} className="btn btn-ghost" style={{ width:'100%',justifyContent:'center',padding:'11px 0',fontSize:11 }}>
            <Icon.Bolt size={13} color="var(--amber)" />
            Continue as Guest
            <span style={{ fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text3)',marginLeft:4 }}>(no memory storage)</span>
          </button>
        </div>

        <p style={{ textAlign:'center',fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',marginTop:20,lineHeight:1.8 }}>
          Memory stays across sessions when logged in.<br/>
          Guests get limited features with no persistence.
        </p>
      </div>
    </div>
  )
}
