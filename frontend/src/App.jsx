import { useState, useEffect, useRef } from 'react'
import Dashboard from './pages/Dashboard.jsx'
import ProblemSolver from './pages/ProblemSolver.jsx'
import MemoryProfile from './pages/MemoryProfile.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import AuthScreen from './pages/AuthScreen.jsx'
import { Icon } from './icons.jsx'

function ParticleCanvas() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas.getContext('2d')
    let w = canvas.width = window.innerWidth; let h = canvas.height = window.innerHeight
    window.addEventListener('resize', () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight })
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random()*w, y: Math.random()*h, vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3,
      r: Math.random()*1.4+0.3, color: ['rgba(0,229,255,','rgba(139,92,246,','rgba(170,255,0,'][Math.floor(Math.random()*3)],
      opacity: Math.random()*0.3+0.05,
    }))
    let raf
    const draw = () => {
      ctx.clearRect(0,0,w,h)
      particles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy
        if(p.x<0)p.x=w; if(p.x>w)p.x=0; if(p.y<0)p.y=h; if(p.y>h)p.y=0
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2)
        ctx.fillStyle=p.color+p.opacity+')'; ctx.fill()
      })
      for(let i=0;i<particles.length;i++) for(let j=i+1;j<particles.length;j++) {
        const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y, dist=Math.sqrt(dx*dx+dy*dy)
        if(dist<120) { ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y); ctx.lineTo(particles[j].x,particles[j].y); ctx.strokeStyle=`rgba(0,229,255,${0.06*(1-dist/120)})`; ctx.lineWidth=0.5; ctx.stroke() }
      }
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <canvas ref={canvasRef} style={{ position:'fixed',inset:0,pointerEvents:'none',zIndex:0,opacity:0.55 }} />
}

function CursorGlow() {
  const ref = useRef(null)
  useEffect(() => {
    const move = e => { if(ref.current){ ref.current.style.left=e.clientX+'px'; ref.current.style.top=e.clientY+'px' } }
    window.addEventListener('mousemove', move)
    return () => window.removeEventListener('mousemove', move)
  }, [])
  return <div ref={ref} style={{ position:'fixed',width:340,height:340,borderRadius:'50%',pointerEvents:'none',zIndex:1,transform:'translate(-50%,-50%)',background:'radial-gradient(circle,rgba(0,229,255,0.04) 0%,transparent 70%)',transition:'left 0.1s ease,top 0.1s ease' }} />
}

const NAV = [
  { id:'dashboard',  label:'Problems',  Icon: Icon.Code   },
  { id:'memory',     label:'Memory',    Icon: Icon.Memory  },
  { id:'leaderboard',label:'Leaders',   Icon: Icon.Trophy  },
]

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [selectedProblem, setSelectedProblem] = useState(null)
  const [authUser, setAuthUser] = useState(null)   // { user_id, display_name, token, is_guest }
  const [memoryMode, setMemoryMode] = useState(true)

  const navigate = (p, problem=null) => { setSelectedProblem(problem); setPage(p) }

  if (!authUser) {
    return (
      <div style={{ minHeight:'100vh',position:'relative',background:'var(--bg)' }}>
        <ParticleCanvas /><CursorGlow />
        <AuthScreen onAuth={setAuthUser} />
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh',position:'relative',background:'var(--bg)' }}>
      <ParticleCanvas />
      <CursorGlow />
      <div style={{ position:'fixed',top:-200,left:'15%',width:700,height:700,background:'radial-gradient(circle,rgba(0,229,255,0.04) 0%,transparent 65%)',pointerEvents:'none',zIndex:0 }} />
      <div style={{ position:'fixed',bottom:-200,right:'10%',width:600,height:600,background:'radial-gradient(circle,rgba(139,92,246,0.05) 0%,transparent 65%)',pointerEvents:'none',zIndex:0 }} />

      <nav className="animate-fadeIn" style={{ position:'sticky',top:0,zIndex:100,background:'rgba(3,3,10,0.85)',backdropFilter:'blur(24px)',borderBottom:'1px solid var(--border)' }}>
        <div style={{ maxWidth:1280,margin:'0 auto',padding:'0 28px',height:56,display:'flex',alignItems:'center',gap:24 }}>
          <button onClick={() => navigate('dashboard')} style={{ display:'flex',alignItems:'center',gap:10,background:'none',border:'none',cursor:'pointer',flexShrink:0 }}>
            <div style={{ width:34,height:34,borderRadius:9,background:'linear-gradient(135deg,var(--cyan),var(--violet))',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'var(--glow-cyan)',flexShrink:0 }} className="animate-float">
              <Icon.Brain size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-hero)',fontSize:20,letterSpacing:'0.06em',lineHeight:1 }} className="g-aurora">CODEMIND</div>
              <div style={{ fontFamily:'var(--font-mono)',fontSize:8,color:'var(--text3)',letterSpacing:'0.12em',marginTop:1 }}>AI CODING MENTOR</div>
            </div>
          </button>

          <div style={{ width:1,height:26,background:'var(--border2)',flexShrink:0 }} />

          <div style={{ display:'flex',gap:2 }}>
            {NAV.map(({ id, label, Icon: NavIcon }) => (
              <button key={id} onClick={() => navigate(id)} style={{
                padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',
                fontFamily:'var(--font-mono)',fontSize:11,fontWeight:500,letterSpacing:'0.03em',
                transition:'all 0.18s',display:'flex',alignItems:'center',gap:6,
                background:page===id?'rgba(0,229,255,0.1)':'transparent',
                color:page===id?'var(--cyan)':'var(--text3)',
                boxShadow:page===id?'inset 0 0 0 1px rgba(0,229,255,0.2)':'none',
              }}>
                <NavIcon size={13} color={page===id?'var(--cyan)':'var(--text3)'} />
                {label}
              </button>
            ))}
          </div>

          {/* Before/After Memory Toggle */}
          <div style={{ display:'flex',alignItems:'center',gap:8,background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:8,padding:'5px 10px' }}>
            <Icon.Memory size={12} color={memoryMode?'var(--cyan)':'var(--text3)'} />
            <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)' }}>MEM</span>
            <button onClick={() => setMemoryMode(!memoryMode)} style={{
              width:34,height:18,borderRadius:99,border:'none',cursor:'pointer',position:'relative',
              background:memoryMode?'linear-gradient(90deg,var(--cyan),var(--violet))':'var(--bg5)',transition:'all 0.3s'
            }}>
              <div style={{ position:'absolute',top:2,left:memoryMode?16:2,width:14,height:14,borderRadius:'50%',background:'#fff',transition:'left 0.3s',boxShadow:'0 1px 4px rgba(0,0,0,0.4)' }} />
            </button>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:9,color:memoryMode?'var(--cyan)':'var(--text3)',letterSpacing:'0.06em' }}>{memoryMode?'ON':'OFF'}</span>
          </div>

          <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:8 }}>
            {authUser.is_guest && (
              <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--amber)',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:6,padding:'3px 8px' }}>GUEST</span>
            )}
            <div style={{ display:'flex',alignItems:'center',gap:7,background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:8,padding:'5px 12px' }}>
              <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--lime)' }} className="animate-pulse-glow" />
              <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)' }}>{authUser.display_name}</span>
            </div>
            <button onClick={() => setAuthUser(null)} style={{ background:'none',border:'1px solid var(--border)',borderRadius:7,padding:'5px 10px',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)' }}>
              EXIT
            </button>
          </div>
        </div>
        <div className="neon-line" />
      </nav>

      <div style={{ position:'relative',zIndex:2 }}>
        {page==='dashboard'    && <Dashboard userId={authUser.user_id} onSelectProblem={p => navigate('solve',p)} memoryMode={memoryMode} />}
        {page==='solve'        && selectedProblem && <ProblemSolver userId={authUser.user_id} problem={selectedProblem} onBack={() => navigate('dashboard')} memoryMode={memoryMode} />}
        {page==='memory'       && <MemoryProfile userId={authUser.user_id} />}
        {page==='leaderboard'  && <Leaderboard userId={authUser.user_id} />}
      </div>
    </div>
  )
}
