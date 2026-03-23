import { useState, useEffect } from 'react'
import { api } from '../api'
import { Icon } from '../icons.jsx'

const DIFF = { Easy:'b-easy', Medium:'b-medium', Hard:'b-hard' }
const TOPIC_ICONS = { Arrays: Icon.Code, Strings: Icon.Code, Loops: Icon.Refresh,
  'Linked Lists': Icon.Memory, 'Dynamic Programming': Icon.Chart, Stacks: Icon.Target }

function StatCard({ label, value, accent, IconComp, delay, suffix='' }) {
  const [display, setDisplay] = useState(0)
  const isNum = typeof value === 'number'
  useEffect(() => {
    if (!isNum) return
    let s = 0; const step = Math.ceil(value/28)
    const t = setInterval(() => { s = Math.min(s+step, value); setDisplay(s); if(s>=value) clearInterval(t) }, 30)
    return () => clearInterval(t)
  }, [value])
  return (
    <div className={`card animate-fadeUp d${delay}`} style={{ padding:'22px',cursor:'default',transition:'all 0.3s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=accent; e.currentTarget.style.boxShadow=`0 0 24px ${accent}18,0 4px 24px rgba(0,0,0,0.3)`; e.currentTarget.style.transform='translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}>
      <div style={{ marginBottom:10 }}><IconComp size={20} color={accent} /></div>
      <div style={{ fontFamily:'var(--font-hero)',fontSize:34,color:accent,letterSpacing:'0.02em',lineHeight:1,textShadow:`0 0 20px ${accent}55` }}>
        {isNum ? display : value}{suffix}
      </div>
      <div style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',marginTop:6,letterSpacing:'0.08em',textTransform:'uppercase' }}>{label}</div>
    </div>
  )
}

function InsightsPanel({ userId }) {
  const [insights, setInsights] = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    api.get(`/learning-insights/${userId}`).then(r => { setInsights(r); setLoading(false) }).catch(() => setLoading(false))
  }, [userId])

  if (loading) return <div className="shimmer" style={{ height:120,borderRadius:14 }} />
  if (!insights) return null

  return (
    <div className="animate-fadeUp card" style={{ padding:'22px 26px',marginBottom:32,borderColor:'rgba(139,92,246,0.2)',background:'linear-gradient(135deg,rgba(139,92,246,0.05),rgba(0,229,255,0.04))' }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
        <Icon.Brain size={18} color="var(--violet)" />
        <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--violet)',letterSpacing:'0.08em',textTransform:'uppercase',fontWeight:700 }}>Learning Insights</span>
        {insights.streak > 0 && (
          <span style={{ marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:11,color:'var(--amber)',display:'flex',alignItems:'center',gap:5 }}>
            <span className="flame">🔥</span> {insights.streak} day streak
          </span>
        )}
      </div>
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16 }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text3)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8 }}>Weak Areas</div>
          {insights.weak_areas?.length ? insights.weak_areas.map(w => (
            <span key={w} className="badge b-hard" style={{ marginRight:5,marginBottom:4,display:'inline-flex' }}>{w}</span>
          )) : <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)' }}>Solve problems to build profile</span>}
        </div>
        <div>
          <div style={{ fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text3)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:8 }}>Common Mistakes</div>
          {insights.common_mistakes?.length ? insights.common_mistakes.map(m => (
            <span key={m} className="badge b-medium" style={{ marginRight:5,marginBottom:4,display:'inline-flex' }}>{m.replace(/_/g,' ')}</span>
          )) : <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)' }}>No mistakes tracked yet</span>}
        </div>
      </div>
      {insights.recommendation && (
        <div style={{ padding:'10px 14px',background:'rgba(0,229,255,0.05)',border:'1px solid rgba(0,229,255,0.14)',borderRadius:9,fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text2)',lineHeight:1.6 }}>
          <span style={{ color:'var(--cyan)' }}>→ </span>{insights.recommendation}
        </div>
      )}
    </div>
  )
}

function AIGeneratorPanel({ userId, onProblemGenerated }) {
  const [open, setOpen]         = useState(false)
  const [topic, setTopic]       = useState('Arrays')
  const [diff, setDiff]         = useState('Easy')
  const [loading, setLoading]   = useState(false)
  const [result, setResult]     = useState(null)

  const TOPICS = ['Arrays','Strings','Loops','Linked Lists','Dynamic Programming','Stacks']
  const DIFFS  = ['Easy','Medium','Hard']

  const generate = async () => {
    setLoading(true); setResult(null)
    try {
      const r = await api.post('/generate-problem', { user_id: userId, topic, difficulty: diff })
      if (r?.problem) {
        setResult(r)
      } else {
        setResult({ error: r?.error || 'Failed to generate problem. Please try again.' })
      }
    } catch(e) {
      setResult({ error: 'Failed to reach backend. Check your connection.' })
    }
    setLoading(false)
  }

  return (
    <div className="animate-fadeUp card" style={{ marginBottom:32,overflow:'hidden' }}>
      <button onClick={() => setOpen(!open)} style={{ width:'100%',padding:'18px 22px',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left' }}>
        <Icon.Bolt size={18} color="var(--violet)" />
        <div>
          <div style={{ fontFamily:'var(--font-mono)',fontSize:12,fontWeight:700,color:'var(--text)',letterSpacing:'0.04em' }}>AI Problem Generator</div>
          <div style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',marginTop:2 }}>Generate problems tailored to your weak areas</div>
        </div>
        <div style={{ marginLeft:'auto',transform:open?'rotate(90deg)':'none',transition:'transform 0.2s' }}>
          <Icon.Arrow size={14} color="var(--text3)" />
        </div>
      </button>

      {open && (
        <div className="animate-fadeUp" style={{ padding:'0 22px 22px',borderTop:'1px solid var(--border)' }}>
          <div style={{ display:'flex',gap:12,marginTop:16,flexWrap:'wrap' }}>
            <div>
              <div style={{ fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text3)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6 }}>Topic</div>
              <select value={topic} onChange={e => setTopic(e.target.value)}
                style={{ background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:8,padding:'7px 12px',color:'var(--text)',fontFamily:'var(--font-mono)',fontSize:11,outline:'none',cursor:'pointer' }}>
                {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text3)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6 }}>Difficulty</div>
              <div style={{ display:'flex',gap:4 }}>
                {DIFFS.map(d => (
                  <button key={d} onClick={() => setDiff(d)} style={{
                    padding:'6px 14px',borderRadius:7,cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,fontWeight:600,transition:'all 0.15s',
                    border:diff===d?'none':'1px solid var(--border)',
                    background:diff===d?(d==='Easy'?'rgba(0,229,100,0.18)':d==='Medium'?'rgba(245,158,11,0.18)':'rgba(255,31,110,0.18)'):'var(--bg3)',
                    color:diff===d?(d==='Easy'?'#00e564':d==='Medium'?'var(--amber)':'var(--pink)'):'var(--text3)',
                  }}>{d}</button>
                ))}
              </div>
            </div>
            <div style={{ display:'flex',alignItems:'flex-end' }}>
              <button onClick={generate} disabled={loading} className="btn btn-primary" style={{ fontSize:11 }}>
                {loading ? <Icon.Spinner size={13} color="#fff" /> : <Icon.Bolt size={13} color="#fff" />}
                {loading ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>

          {result?.tailored_to?.length > 0 && (
            <div style={{ marginTop:12,fontFamily:'var(--font-mono)',fontSize:10,color:'var(--violet)' }}>
              ✦ Tailored to your weakness: {result.tailored_to.join(', ')}
            </div>
          )}

          {result?.problem && (
            <div style={{ marginTop:14,padding:'14px 16px',background:'rgba(0,229,255,0.05)',border:'1px solid rgba(0,229,255,0.15)',borderRadius:10 }}>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:8 }}>
                <span style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,color:'var(--text)' }}>{result.problem.title}</span>
                <span className={`badge ${DIFF[result.problem.difficulty]}`}>{result.problem.difficulty}</span>
              </div>
              <p style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text2)',lineHeight:1.6,marginBottom:12 }}>{result.problem.description?.substring(0,200)}...</p>
              <button onClick={() => onProblemGenerated(result.problem)} className="btn btn-lime" style={{ fontSize:10 }}>
                <Icon.Play size={12} color="var(--lime)" /> Solve This Problem
              </button>
            </div>
          )}
          {result?.error && <div style={{ marginTop:12,fontFamily:'var(--font-mono)',fontSize:11,color:'var(--pink)' }}>Error: {result.error}</div>}
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ userId, onSelectProblem, memoryMode }) {
  const [problems, setProblems] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('All')
  const [hovered, setHovered]   = useState(null)
  const [search, setSearch]     = useState('')

  useEffect(() => { api.get('/problems').then(r => { setProblems(r.problems); setLoading(false) }).catch(() => setLoading(false)) }, [])

  const filtered = problems.filter(p => filter==='All' || p.difficulty===filter).filter(p => !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.topic.toLowerCase().includes(search.toLowerCase()))

  return (
    <div style={{ minHeight:'calc(100vh - 56px)',position:'relative' }}>
      <div className="grid-bg" style={{ position:'absolute',inset:0,pointerEvents:'none',opacity:0.55 }} />
      <div style={{ maxWidth:1100,margin:'0 auto',padding:'56px 28px',position:'relative' }}>

        <div style={{ marginBottom:52 }}>
          <div className="animate-slide" style={{ display:'flex',alignItems:'center',gap:10,marginBottom:16 }}>
            <div style={{ height:2,width:40,background:'linear-gradient(90deg,var(--cyan),transparent)',borderRadius:2 }} />
            <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--cyan)',letterSpacing:'0.14em',textTransform:'uppercase' }}>
              AI-Powered · Memory-Enhanced · Hindsight
              {!memoryMode && <span style={{ color:'var(--amber)',marginLeft:10 }}>· MEMORY OFF (Generic Mode)</span>}
            </span>
          </div>
          <h1 className="animate-fadeUp" style={{ fontFamily:'var(--font-hero)',fontSize:68,lineHeight:0.95,letterSpacing:'0.02em',marginBottom:18 }}>
            <span className="g-aurora">TRAIN</span><br/><span style={{ color:'var(--text)',WebkitTextStroke:'1px rgba(255,255,255,0.12)' }}>SMARTER.</span>
          </h1>
          <p className="animate-fadeUp d2" style={{ color:'var(--text2)',fontSize:16,maxWidth:460,lineHeight:1.75 }}>
            CodeMind remembers every mistake and crafts personalized hints — powered by <span style={{ color:'var(--cyan)' }}>Hindsight memory</span>.
          </p>
        </div>

        <div style={{ display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:48 }}>
          <StatCard label="Problems" value={problems.length} accent="var(--cyan)" IconComp={Icon.Code} delay={1} />
          <StatCard label="Languages" value={3} accent="var(--lime)" IconComp={Icon.Bolt} delay={2} />
          <StatCard label="Memory" value={memoryMode?"ON":"OFF"} accent={memoryMode?"var(--pink)":"var(--amber)"} IconComp={Icon.Brain} delay={3} />
          <StatCard label="Accuracy" value={100} suffix="%" accent="var(--violet)" IconComp={Icon.Target} delay={4} />
        </div>

        {/* Learning Insights Panel */}
        {memoryMode && <InsightsPanel userId={userId} />}

        {/* AI Generator */}
        <AIGeneratorPanel userId={userId} onProblemGenerated={onSelectProblem} />

        {/* Filter + Search */}
        <div className="animate-fadeUp d3" style={{ display:'flex',gap:10,marginBottom:20,alignItems:'center',flexWrap:'wrap' }}>
          <div style={{ display:'flex',gap:6 }}>
            {['All','Easy','Medium','Hard'].map(d => (
              <button key={d} onClick={() => setFilter(d)} style={{
                padding:'7px 18px',borderRadius:8,cursor:'pointer',
                fontFamily:'var(--font-mono)',fontSize:11,fontWeight:600,letterSpacing:'0.05em',transition:'all 0.18s',
                border:filter===d?'none':'1px solid var(--border)',
                background:filter===d?(d==='Easy'?'rgba(0,229,100,0.18)':d==='Medium'?'rgba(245,158,11,0.18)':d==='Hard'?'rgba(255,31,110,0.18)':'linear-gradient(135deg,rgba(0,229,255,0.2),rgba(139,92,246,0.2))'):'var(--bg3)',
                color:filter===d?(d==='Easy'?'#00e564':d==='Medium'?'var(--amber)':d==='Hard'?'var(--pink)':'var(--cyan)'):'var(--text3)',
              }}>{d}</button>
            ))}
          </div>
          <div style={{ marginLeft:'auto',display:'flex',alignItems:'center',gap:8,background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:8,padding:'7px 12px' }}>
            <Icon.Search size={13} color="var(--text3)" />
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search problems..." style={{ background:'none',border:'none',outline:'none',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text)',width:180 }} />
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {[1,2,3,4].map(i => <div key={i} className="shimmer" style={{ height:76,borderRadius:14,opacity:0.6 }} />)}
          </div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {filtered.map((p, i) => {
              const TopicIcon = TOPIC_ICONS[p.topic] || Icon.Code
              return (
                <button key={p.id} className={`animate-fadeUp d${Math.min(i+2,8)}`}
                  onClick={() => onSelectProblem(p)} onMouseEnter={() => setHovered(p.id)} onMouseLeave={() => setHovered(null)}
                  style={{
                    background:hovered===p.id?'var(--bg3)':'var(--bg2)',
                    border:`1px solid ${hovered===p.id?'var(--border2)':'var(--border)'}`,
                    borderRadius:14,padding:'18px 24px',display:'flex',alignItems:'center',gap:20,
                    cursor:'pointer',textAlign:'left',transition:'all 0.22s',
                    transform:hovered===p.id?'translateY(-2px)':'none',
                    boxShadow:hovered===p.id?'0 8px 32px rgba(0,0,0,0.35)':'none',
                  }}>
                  <span style={{ fontFamily:'var(--font-mono)',fontSize:13,fontWeight:700,color:hovered===p.id?'var(--cyan)':'var(--text3)',width:28,flexShrink:0,transition:'all 0.2s',textShadow:hovered===p.id?'0 0 10px var(--cyan)':'none' }}>{String(i+1).padStart(2,'0')}</span>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:16,letterSpacing:'-0.01em',color:'var(--text)' }}>{p.title}</span>
                      <span className={`badge ${DIFF[p.difficulty]}`}>{p.difficulty}</span>
                      <span className="badge b-topic" style={{ display:'flex',alignItems:'center',gap:4 }}><TopicIcon size={10} color="var(--text3)" />{p.topic}</span>
                    </div>
                    <p style={{ fontFamily:'var(--font-display)',fontSize:13,color:'var(--text3)',lineHeight:1.5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:580 }}>
                      {p.description.substring(0,115)}...
                    </p>
                  </div>
                  <div style={{ width:34,height:34,borderRadius:9,flexShrink:0,background:hovered===p.id?'rgba(0,229,255,0.12)':'var(--bg4)',border:`1px solid ${hovered===p.id?'rgba(0,229,255,0.3)':'var(--border)'}`,display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',boxShadow:hovered===p.id?'0 0 12px rgba(0,229,255,0.25)':'none' }}>
                    <Icon.Arrow size={15} color={hovered===p.id?'var(--cyan)':'var(--text3)'} />
                  </div>
                </button>
              )
            })}
          </div>
        )}

        <div className="animate-fadeUp" style={{ marginTop:48,padding:'22px 28px',background:'linear-gradient(135deg,rgba(0,229,255,0.05),rgba(139,92,246,0.05))',border:'1px solid rgba(0,229,255,0.12)',borderRadius:16,display:'flex',alignItems:'center',gap:16 }}>
          <div className="animate-float"><Icon.Bolt size={28} color="var(--cyan)" /></div>
          <div>
            <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:15,marginBottom:4 }}>Memory gets smarter every session</div>
            <div style={{ fontSize:13,color:'var(--text2)',lineHeight:1.6 }}>
              Hindsight <code style={{ background:'var(--bg4)',padding:'1px 6px',borderRadius:4,color:'var(--cyan)',fontSize:11 }}>retain()</code> stores your patterns. Next hint, it <code style={{ background:'var(--bg4)',padding:'1px 6px',borderRadius:4,color:'var(--lime)',fontSize:11 }}>recall()</code>s them and warns you before you make the mistake.
            </div>
          </div>
          <a href="https://hindsight.vectorize.io" target="_blank" rel="noreferrer" style={{ marginLeft:'auto',flexShrink:0,fontFamily:'var(--font-mono)',fontSize:11,color:'var(--cyan)',textDecoration:'none',letterSpacing:'0.06em',whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:6 }}>
            HINDSIGHT DOCS <Icon.Arrow size={12} color="var(--cyan)" />
          </a>
        </div>
      </div>
    </div>
  )
}
