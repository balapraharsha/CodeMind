import { useState, useEffect } from 'react'
import axios from 'axios'
import { Icon } from '../icons.jsx'

function MemoryCard({ memory, index }) {
  const meta = memory.metadata || {}
  const isPassed = meta.passed === true || meta.passed === 'true'
  return (
    <div className={`animate-fadeUp d${Math.min(index+1,8)} card`} style={{ padding:'16px 18px',transition:'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.transform='translateY(-1px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none' }}>
      <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
        <div style={{ width:32,height:32,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:isPassed?'rgba(0,229,100,0.1)':'rgba(255,31,110,0.1)',border:`1px solid ${isPassed?'rgba(0,229,100,0.2)':'rgba(255,31,110,0.2)'}` }}>
          {isPassed ? <Icon.Check size={14} color="#00e564" /> : <Icon.X size={14} color="var(--pink)" />}
        </div>
        <div style={{ flex:1,minWidth:0 }}>
          <p style={{ fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text2)',lineHeight:1.6,marginBottom:8 }}>{memory.content}</p>
          <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
            {meta.language && <span className="badge b-ai">{meta.language}</span>}
            {meta.score && <span className="badge b-memory">{meta.score}</span>}
            {(meta.mistake_types||[]).map(m => <span key={m} className="badge b-hard">{m.replace(/_/g,' ')}</span>)}
            {meta.time_taken > 0 && <span className="badge b-topic"><Icon.Clock size={9} color="var(--text3)" /> {Math.floor(meta.time_taken/60)}m {meta.time_taken%60}s</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function InsightsSummary({ insights }) {
  if (!insights) return null
  const bars = [
    { label: 'Problems Solved', value: insights.total_solved || 0, max: Math.max(insights.total_solved||0, 10), color: 'var(--cyan)' },
    { label: 'Total Attempts',  value: insights.total_attempts || 0, max: Math.max(insights.total_attempts||0, 10), color: 'var(--violet)' },
    { label: 'Accuracy %',      value: insights.accuracy || 0, max: 100, color: 'var(--lime)' },
  ]
  return (
    <div className="card animate-fadeUp" style={{ padding:'24px',marginBottom:24 }}>
      <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:20 }}>
        <Icon.Chart size={18} color="var(--cyan)" />
        <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--cyan)',letterSpacing:'0.08em',textTransform:'uppercase',fontWeight:700 }}>Your Stats</span>
        {insights.streak > 0 && (
          <span style={{ marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:12,color:'var(--amber)',display:'flex',alignItems:'center',gap:5 }}>
            <span className="flame">🔥</span> {insights.streak}-day streak
          </span>
        )}
      </div>
      {bars.map(b => (
        <div key={b.label} style={{ marginBottom:16 }}>
          <div style={{ display:'flex',justifyContent:'space-between',marginBottom:6 }}>
            <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text2)' }}>{b.label}</span>
            <span style={{ fontFamily:'var(--font-hero)',fontSize:16,color:b.color }}>{b.value}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width:`${(b.value/b.max)*100}%`,background:b.color,boxShadow:`0 0 8px ${b.color}55` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function MemoryProfile({ userId }) {
  const [data, setData]         = useState(null)
  const [insights, setInsights] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState('insights')

  useEffect(() => {
    Promise.all([
      axios.get(`/api/memory/${userId}`).catch(() => ({ data: { memories: [], local_history: [] } })),
      axios.get(`/api/learning-insights/${userId}`).catch(() => ({ data: null }))
    ]).then(([memRes, insRes]) => {
      setData(memRes.data)
      setInsights(insRes.data)
      setLoading(false)
    })
  }, [userId])

  const memories = data?.memories || []
  const history  = data?.local_history || []

  const TABS = [
    { id:'insights', label:'INSIGHTS', icon: Icon.Chart },
    { id:'hindsight', label:'HINDSIGHT', icon: Icon.Brain },
    { id:'history',  label:'HISTORY',  icon: Icon.Clock },
  ]

  return (
    <div style={{ position:'relative',minHeight:'calc(100vh - 56px)' }}>
      <div className="grid-bg" style={{ position:'absolute',inset:0,pointerEvents:'none',opacity:0.5 }} />
      <div style={{ maxWidth:900,margin:'0 auto',padding:'56px 28px',position:'relative' }}>

        <div style={{ marginBottom:48 }}>
          <div className="animate-slide" style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
            <div style={{ height:2,width:40,background:'linear-gradient(90deg,var(--cyan),transparent)',borderRadius:2 }} />
            <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--cyan)',letterSpacing:'0.14em',textTransform:'uppercase' }}>Hindsight Memory Bank</span>
          </div>
          <h1 className="animate-fadeUp" style={{ fontFamily:'var(--font-hero)',fontSize:64,letterSpacing:'0.02em',lineHeight:0.95,marginBottom:14 }}>
            <span className="g-cyan">MEMORY</span>
          </h1>
          <p className="animate-fadeUp d2" style={{ color:'var(--text2)',fontSize:15,lineHeight:1.75 }}>
            Your learning patterns, mistakes, and progress — stored in Hindsight memory.
          </p>
        </div>

        {/* Tab selector */}
        <div style={{ display:'flex',gap:2,marginBottom:28,background:'var(--bg2)',borderRadius:12,padding:4,border:'1px solid var(--border)' }}>
          {TABS.map(({ id, label, icon: TabIcon }) => (
            <button key={id} onClick={() => setActiveTab(id)} style={{
              flex:1,padding:'9px 0',borderRadius:9,border:'none',cursor:'pointer',
              fontFamily:'var(--font-mono)',fontSize:10,fontWeight:700,letterSpacing:'0.08em',
              display:'flex',alignItems:'center',justifyContent:'center',gap:7,
              background:activeTab===id?'linear-gradient(135deg,rgba(0,229,255,0.15),rgba(139,92,246,0.15))':'transparent',
              color:activeTab===id?'var(--cyan)':'var(--text3)',
              boxShadow:activeTab===id?'inset 0 0 0 1px rgba(0,229,255,0.25)':'none',
              transition:'all 0.2s'
            }}>
              <TabIcon size={12} color={activeTab===id?'var(--cyan)':'var(--text3)'} />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {[1,2,3].map(i => <div key={i} className="shimmer" style={{ height:80,borderRadius:14 }} />)}
          </div>
        ) : (
          <>
            {activeTab === 'insights' && (
              <div className="animate-fadeUp">
                <InsightsSummary insights={insights} />
                {insights?.weak_areas?.length > 0 && (
                  <div className="card" style={{ padding:'22px',marginBottom:20 }}>
                    <div style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:14 }}>Weak Areas → Focus Here</div>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                      {insights.weak_areas.map(w => (
                        <div key={w} style={{ padding:'8px 14px',background:'rgba(255,31,110,0.08)',border:'1px solid rgba(255,31,110,0.2)',borderRadius:9,fontFamily:'var(--font-mono)',fontSize:12,color:'var(--pink)',display:'flex',alignItems:'center',gap:7 }}>
                          <Icon.Target size={12} color="var(--pink)" /> {w}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {insights?.common_mistakes?.length > 0 && (
                  <div className="card" style={{ padding:'22px',marginBottom:20 }}>
                    <div style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:14 }}>Common Mistakes</div>
                    <div style={{ display:'flex',flexWrap:'wrap',gap:8 }}>
                      {insights.common_mistakes.map(m => (
                        <div key={m} style={{ padding:'8px 14px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:9,fontFamily:'var(--font-mono)',fontSize:12,color:'var(--amber)' }}>
                          {m.replace(/_/g,' ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {insights?.recommendation && (
                  <div style={{ padding:'18px 22px',background:'linear-gradient(135deg,rgba(0,229,255,0.05),rgba(139,92,246,0.05))',border:'1px solid rgba(0,229,255,0.15)',borderRadius:14 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                      <Icon.Bolt size={16} color="var(--cyan)" />
                      <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--cyan)',letterSpacing:'0.08em',textTransform:'uppercase',fontWeight:700 }}>AI Recommendation</span>
                    </div>
                    <p style={{ fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text2)',lineHeight:1.7 }}>{insights.recommendation}</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'hindsight' && (
              <div>
                {!data?.has_hindsight && (
                  <div style={{ marginBottom:20,padding:'14px 18px',background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:12,fontFamily:'var(--font-mono)',fontSize:12,color:'var(--amber)',display:'flex',gap:10,alignItems:'center' }}>
                    <Icon.Warning size={15} color="var(--amber)" />
                    Hindsight API key not configured. Add HINDSIGHT_API_KEY to backend .env for cloud memory.
                  </div>
                )}
                {memories.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'60px 0' }}>
                    <div className="animate-float" style={{ display:'flex',justifyContent:'center',marginBottom:16 }}><Icon.Brain size={52} color="var(--cyan)" /></div>
                    <p style={{ color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:13 }}>No cloud memories yet. Solve problems to build your memory bank.</p>
                  </div>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                    {memories.map((m,i) => <MemoryCard key={i} memory={m} index={i} />)}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div>
                {history.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'60px 0' }}>
                    <div className="animate-float" style={{ display:'flex',justifyContent:'center',marginBottom:16 }}><Icon.Clock size={52} color="var(--violet)" /></div>
                    <p style={{ color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:13 }}>No attempts yet this session.</p>
                  </div>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                    {[...history].reverse().map((a,i) => (
                      <div key={i} className={`animate-fadeUp card`} style={{ padding:'14px 18px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                          <div style={{ width:30,height:30,borderRadius:8,flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:a.passed?'rgba(0,229,100,0.1)':'rgba(255,31,110,0.1)' }}>
                            {a.passed ? <Icon.Check size={13} color="#00e564" /> : <Icon.X size={13} color="var(--pink)" />}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:14,color:'var(--text)',marginBottom:4 }}>{a.problem_title}</div>
                            <div style={{ display:'flex',flexWrap:'wrap',gap:5 }}>
                              <span className="badge b-ai">{a.language}</span>
                              <span className={`badge ${a.passed?'b-easy':'b-hard'}`}>{a.score}</span>
                              {a.time_taken > 0 && <span className="badge b-topic">{Math.floor(a.time_taken/60)}m {a.time_taken%60}s</span>}
                              {a.mistake_types?.map(m => <span key={m} className="badge b-medium">{m.replace(/_/g,' ')}</span>)}
                            </div>
                          </div>
                          <div style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)' }}>
                            {new Date(a.timestamp * 1000).toLocaleTimeString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
