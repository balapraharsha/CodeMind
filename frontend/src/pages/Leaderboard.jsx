import { useState, useEffect } from 'react'
import { api } from '../api'
import { Icon } from '../icons.jsx'

export default function Leaderboard({ userId }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/leaderboard')
  .then(r => { setData(r.leaderboard); setLoading(false) })
  }, [userId])

  const RANK_COLORS = ['var(--amber)','#94a3b8','#cd7f32']
  const RANK_LABELS = ['1ST','2ND','3RD']

  return (
    <div style={{ position:'relative', minHeight:'calc(100vh - 56px)' }}>
      <div className="grid-bg" style={{ position:'absolute',inset:0,pointerEvents:'none',opacity:0.5 }} />
      <div style={{ position:'absolute',top:-100,right:'20%',width:500,height:500,background:'radial-gradient(circle,rgba(255,31,110,0.04) 0%,transparent 65%)',pointerEvents:'none' }} />

      <div style={{ maxWidth:800,margin:'0 auto',padding:'56px 28px',position:'relative' }}>
        <div style={{ marginBottom:48 }}>
          <div className="animate-slide" style={{ display:'flex',alignItems:'center',gap:10,marginBottom:14 }}>
            <div style={{ height:2,width:40,background:'linear-gradient(90deg,var(--amber),transparent)',borderRadius:2 }} />
            <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--amber)',letterSpacing:'0.14em',textTransform:'uppercase' }}>Global Rankings</span>
          </div>
          <h1 className="animate-fadeUp" style={{ fontFamily:'var(--font-hero)',fontSize:64,letterSpacing:'0.02em',lineHeight:0.95,marginBottom:14 }}>
            <span className="g-fire">LEADERS</span>
          </h1>
          <p className="animate-fadeUp d2" style={{ color:'var(--text2)',fontSize:15,lineHeight:1.75 }}>Top performers ranked by problems solved and accuracy.</p>
        </div>

        {loading ? (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {[1,2,3,4,5].map(i=><div key={i} className="shimmer" style={{ height:72,borderRadius:14 }}/>)}
          </div>
        ) : data.length === 0 ? (
          <div style={{ textAlign:'center',padding:'60px 0' }}>
            <div className="animate-float" style={{ display:'flex',justifyContent:'center',marginBottom:16 }}>
              <Icon.Trophy size={52} color="var(--amber)" />
            </div>
            <p style={{ color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:13 }}>No entries yet. Be the first!</p>
          </div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {data.map((entry, i) => {
              const isMe = entry.user_id === userId
              const rankColor = RANK_COLORS[i] || 'var(--text3)'
              return (
                <div key={entry.user_id} className={`animate-fadeUp d${Math.min(i+1,8)}`} style={{
                  background:isMe?'rgba(0,229,255,0.06)':'var(--bg2)',
                  border:`1px solid ${isMe?'rgba(0,229,255,0.3)':'var(--border)'}`,
                  borderRadius:14,padding:'18px 24px',
                  display:'flex',alignItems:'center',gap:18,
                  boxShadow:isMe?'0 0 24px rgba(0,229,255,0.1)':'none',
                  transition:'all 0.2s',
                }}
                  onMouseEnter={e=>{ if(!isMe){ e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.transform='translateY(-2px)' }}}
                  onMouseLeave={e=>{ if(!isMe){ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none' }}}
                >
                  <div style={{ width:42,flexShrink:0,textAlign:'center' }}>
                    {i < 3 ? (
                      <div>
                        <Icon.Trophy size={20} color={rankColor} />
                        <div style={{ fontFamily:'var(--font-mono)',fontSize:9,color:rankColor,letterSpacing:'0.08em',marginTop:2 }}>{RANK_LABELS[i]}</div>
                      </div>
                    ) : (
                      <span style={{ fontFamily:'var(--font-hero)',fontSize:22,color:'var(--text3)' }}>#{i+1}</span>
                    )}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                      <span style={{ fontFamily:'var(--font-mono)',fontSize:14,fontWeight:700,color:isMe?'var(--cyan)':'var(--text)' }}>{entry.user_id}</span>
                      {isMe && <span className="badge b-memory" style={{ display:'flex',alignItems:'center',gap:4 }}><Icon.Target size={9} color="var(--cyan)" /> YOU</span>}
                    </div>
                    <div style={{ display:'flex',gap:16 }}>
                      <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)' }}><span style={{ color:'#00e564' }}>{entry.solved}</span> solved</span>
                      <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)' }}><span style={{ color:'var(--lime)' }}>{entry.accuracy}%</span> accuracy</span>
                      <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text3)' }}><span style={{ color:'var(--violet)' }}>{entry.sessions}</span> sessions</span>
                    </div>
                  </div>
                  <div style={{ fontFamily:'var(--font-hero)',fontSize:28,color:rankColor,letterSpacing:'0.02em',textShadow:i===0?`0 0 16px ${rankColor}60`:'none' }}>
                    {entry.score}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
