import { useState, useRef, useEffect, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import { api } from '../api'
import { Icon } from '../icons.jsx'

const LANGS = ['python','javascript','java']
const DIFF  = { Easy:'b-easy', Medium:'b-medium', Hard:'b-hard' }

function Toast({ msg, type, onDone }) {
  const [visible, setVisible] = useState(true)
  const colors = { success:'#00e564', error:'var(--pink)', info:'var(--cyan)', warn:'var(--amber)' }
  if (!visible) return null
  setTimeout(() => { setVisible(false); onDone() }, 3200)
  return (
    <div className="animate-scaleIn" style={{ position:'fixed',bottom:28,right:28,zIndex:1000,background:'var(--bg3)',border:`1px solid ${colors[type]}44`,borderRadius:12,padding:'12px 18px',display:'flex',alignItems:'center',gap:10,boxShadow:`0 0 24px ${colors[type]}22,0 8px 32px rgba(0,0,0,0.4)`,maxWidth:320 }}>
      <div style={{ width:8,height:8,borderRadius:'50%',background:colors[type],boxShadow:`0 0 8px ${colors[type]}`,flexShrink:0 }} />
      <span style={{ fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text2)' }}>{msg}</span>
    </div>
  )
}

function ProgressRing({ pct, size=56, stroke=4, color='var(--cyan)' }) {
  const r = (size-stroke*2)/2; const circ = 2*Math.PI*r
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg4)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ-(pct/100)*circ}
        style={{ transition:'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)' }}
        strokeLinecap="round"/>
    </svg>
  )
}

function CountdownTimer({ startTime, timeLimit=3600 }) {
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000)
    return () => clearInterval(t)
  }, [startTime])
  const remaining = Math.max(0, timeLimit - elapsed)
  const mm = String(Math.floor(remaining/60)).padStart(2,'0')
  const ss = String(remaining%60).padStart(2,'0')
  const pct = (elapsed / timeLimit) * 100
  const color = pct < 60 ? 'var(--lime)' : pct < 80 ? 'var(--amber)' : 'var(--pink)'
  return (
    <div style={{ display:'flex',alignItems:'center',gap:7,background:'var(--bg3)',border:`1px solid ${color}33`,borderRadius:8,padding:'5px 12px' }}>
      <Icon.Clock size={13} color={color} />
      <span style={{ fontFamily:'var(--font-mono)',fontSize:13,fontWeight:700,color,letterSpacing:'0.06em' }}>{mm}:{ss}</span>
    </div>
  )
}

export default function ProblemSolver({ userId, problem, onBack, memoryMode }) {
  const [lang, setLang]             = useState('python')
  const [code, setCode]             = useState(problem.starter_code?.python || '# Write your solution here\n')
  const [running, setRunning]       = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [hinting, setHinting]       = useState(false)
  const [testResults, setTestResults] = useState(null)
  const [feedback, setFeedback]     = useState(null)
  const [hint, setHint]             = useState(null)
  const [mistakeTypes, setMistakeTypes] = useState([])
  const [tab, setTab]               = useState('problem')
  const [toast, setToast]           = useState(null)
  const [aiScore, setAiScore]       = useState(null)
  const [startTime]                 = useState(Date.now())
  const [tabWarnings, setTabWarnings] = useState(0)
  const editorRef                   = useRef(null)

  const showToast = (msg, type='info') => setToast({ msg, type, id: Date.now() })

  // Anti-cheat: detect tab switches
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden) {
        setTabWarnings(w => {
          const next = w + 1
          showToast(`⚠️ Tab switch detected (${next})`, 'warn')
          return next
        })
      }
    }
    document.addEventListener('visibilitychange', onVisChange)
    return () => document.removeEventListener('visibilitychange', onVisChange)
  }, [])

  // Anti-cheat: disable paste in editor (Monaco handles its own paste but we block context menu)
  const handleContextMenu = e => { e.preventDefault(); showToast('Right-click disabled during practice', 'warn') }

  const handleLang = l => {
    setLang(l); setCode(problem.starter_code?.[l]||'')
    setTestResults(null); setFeedback(null); setHint(null); setAiScore(null)
  }

  const handleRun = async () => {
    setRunning(true); setTestResults(null)
    try {
      const r = await api.post('/run-code', { code, language:lang, test_cases:problem.test_cases })
setTestResults(r); setTab('results')
      const pct = Math.round((r.data.passed/r.data.total)*100)
      showToast(`${r.data.passed}/${r.data.total} tests passed`, pct===100?'success':pct>0?'warn':'error')
    } catch { showToast('Run failed — check backend is running', 'error') }
    finally { setRunning(false) }
  }

  const handleSubmit = async () => {
    setSubmitting(true); setFeedback(null); setAiScore(null)
    let results = testResults
    if (!results) {
      try { const r = await api.post('/run-code',{code,language:lang,test_cases:problem.test_cases})
results = r
setTestResults(r) }
      catch { setSubmitting(false); showToast('Could not run code first','error'); return }
    }
    const timeTaken = Math.floor((Date.now() - startTime) / 1000)
    try {
      const r = await api.post('/submit', {
        user_id:userId, problem_id:problem.id, problem_title:problem.title,
        problem_description:problem.description, code, language:lang,
        test_results:results, time_taken:timeTaken, memory_mode:memoryMode
      })
      setFeedback(r.feedback)
setMistakeTypes(r.mistake_types||[])
setAiScore(r.ai_score)
const memMsg = r.memory_stored ? ' · Saved to memory' : ''
      showToast('Analysis complete' + memMsg, 'success')
    } catch(e) {
      showToast('Submit failed: ' + (e.response?.data?.detail || e.message), 'error')
    }
    finally { setSubmitting(false) }
  }

  const handleHint = async () => {
    setHinting(true); setHint(null); setTab('hint')
    try {
      const r = await api.post('/hint',{
        user_id:userId, problem_id:problem.id, problem_title:problem.title,
        problem_description:problem.description, code, language:lang, memory_mode:memoryMode
      })
      setHint(r)
if(r.personalized) showToast('Personalized from your memory', 'info')
      else if(!memoryMode) showToast('Memory OFF — generic hint', 'warn')
    } catch(e) { setHint({ hint:'Failed to get hint: '+(e?.detail || e.message), personalized:false }) }
    finally { setHinting(false) }
  }

  const passed=testResults?.passed||0; const total=testResults?.total||0
  const allPassed=passed===total&&total>0; const passPct=total>0?Math.round((passed/total)*100):0

  const TABS = [
    { id:'problem', label:'PROBLEM', dot:null },
    { id:'hint',    label:'HINT',    dot:hint?'var(--lime)':null },
    { id:'results', label:'RESULTS', dot:testResults?(allPassed?'#00e564':'var(--pink)'):null },
    { id:'feedback',label:'FEEDBACK',dot:feedback?'var(--cyan)':null },
  ]

  return (
    <div style={{ height:'calc(100vh - 56px)',display:'flex',flexDirection:'column',overflow:'hidden' }} onContextMenu={handleContextMenu}>
      {toast && <Toast key={toast.id} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)} />}

      {/* Top bar */}
      <div style={{ background:'var(--bg2)',borderBottom:'1px solid var(--border)',padding:'0 20px',height:48,display:'flex',alignItems:'center',gap:14,flexShrink:0 }}>
        <button onClick={onBack} className="btn btn-ghost" style={{ padding:'4px 12px',fontSize:10,gap:5 }}>
          <Icon.Arrow size={12} color="var(--text2)" dir="left" /> BACK
        </button>
        <div style={{ width:1,height:20,background:'var(--border2)' }} />
        <span style={{ fontFamily:'var(--font-display)',fontWeight:700,fontSize:15 }}>{problem.title}</span>
        <span className={`badge ${DIFF[problem.difficulty]}`}>{problem.difficulty}</span>

        {/* Memory mode indicator */}
        <span className={`badge ${memoryMode?'b-ai':'b-topic'}`} style={{ display:'flex',alignItems:'center',gap:4 }}>
          <Icon.Memory size={9} color={memoryMode?'#c4b5fd':'var(--text3)'} />
          {memoryMode ? 'MEMORY ON' : 'MEMORY OFF'}
        </span>

        {tabWarnings > 0 && (
          <span className="badge b-hard" style={{ display:'flex',alignItems:'center',gap:4 }}>
            <Icon.Warning size={9} color="var(--pink)" /> {tabWarnings} WARNING{tabWarnings>1?'S':''}
          </span>
        )}

        <div style={{ marginLeft:'auto',display:'flex',gap:8,alignItems:'center' }}>
          <CountdownTimer startTime={startTime} />
          {LANGS.map(l => (
            <button key={l} onClick={() => handleLang(l)} style={{ padding:'4px 12px',borderRadius:7,cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:10,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',transition:'all 0.15s',border:lang===l?'none':'1px solid var(--border)',background:lang===l?'linear-gradient(135deg,rgba(0,229,255,0.2),rgba(139,92,246,0.2))':'var(--bg3)',color:lang===l?'var(--cyan)':'var(--text3)',boxShadow:lang===l?'0 0 10px rgba(0,229,255,0.15)':'none' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Split */}
      <div style={{ display:'flex',flex:1,overflow:'hidden' }}>
        {/* Left panel */}
        <div style={{ width:420,flexShrink:0,display:'flex',flexDirection:'column',borderRight:'1px solid var(--border)',background:'var(--bg)' }}>
          <div style={{ display:'flex',borderBottom:'1px solid var(--border)',flexShrink:0,background:'var(--bg2)' }}>
            {TABS.map(({ id, label, dot }) => (
              <button key={id} onClick={() => setTab(id)} style={{ flex:1,padding:'10px 0',background:'none',border:'none',cursor:'pointer',fontFamily:'var(--font-mono)',fontSize:9,fontWeight:700,letterSpacing:'0.1em',color:tab===id?'var(--cyan)':'var(--text3)',borderBottom:`2px solid ${tab===id?'var(--cyan)':'transparent'}`,transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center',gap:5 }}>
                {dot && <span style={{ width:5,height:5,borderRadius:'50%',background:dot,boxShadow:`0 0 5px ${dot}`,flexShrink:0 }} />}
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex:1,overflowY:'auto',padding:'20px' }}>
            {tab==='problem' && (
              <div className="animate-fadeUp">
                <p style={{ fontSize:14,color:'var(--text2)',lineHeight:1.8,whiteSpace:'pre-wrap',marginBottom:20 }}>{problem.description}</p>
                {problem.examples?.map((ex,i) => (
                  <div key={i} style={{ marginBottom:12 }}>
                    <div style={{ fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text3)',letterSpacing:'0.1em',textTransform:'uppercase',marginBottom:6 }}>Example {i+1}</div>
                    <div className="scan-container" style={{ background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px' }}>
                      <div style={{ fontFamily:'var(--font-mono)',fontSize:12,lineHeight:1.7 }}>
                        <div><span style={{ color:'var(--text3)' }}>Input  → </span><span style={{ color:'var(--text)' }}>{ex.input}</span></div>
                        <div><span style={{ color:'var(--text3)' }}>Output → </span><span style={{ color:'var(--lime)',textShadow:'0 0 8px var(--lime)' }}>{ex.output}</span></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab==='hint' && (
              <div className="animate-fadeUp">
                {/* Before/After comparison banner */}
                <div style={{ display:'flex',gap:6,marginBottom:16,padding:'8px 12px',background:'var(--bg3)',borderRadius:9,border:'1px solid var(--border)' }}>
                  <div style={{ flex:1,textAlign:'center',padding:'4px 0',borderRadius:6,background:!memoryMode?'rgba(245,158,11,0.12)':'transparent',border:!memoryMode?'1px solid rgba(245,158,11,0.25)':'1px solid transparent' }}>
                    <div style={{ fontFamily:'var(--font-mono)',fontSize:9,color:!memoryMode?'var(--amber)':'var(--text3)',letterSpacing:'0.08em' }}>WITHOUT MEMORY</div>
                    <div style={{ fontFamily:'var(--font-mono)',fontSize:8,color:'var(--text3)',marginTop:2 }}>Generic hints</div>
                  </div>
                  <div style={{ flex:1,textAlign:'center',padding:'4px 0',borderRadius:6,background:memoryMode?'rgba(0,229,255,0.08)':'transparent',border:memoryMode?'1px solid rgba(0,229,255,0.2)':'1px solid transparent' }}>
                    <div style={{ fontFamily:'var(--font-mono)',fontSize:9,color:memoryMode?'var(--cyan)':'var(--text3)',letterSpacing:'0.08em' }}>WITH MEMORY</div>
                    <div style={{ fontFamily:'var(--font-mono)',fontSize:8,color:'var(--text3)',marginTop:2 }}>Personalized hints</div>
                  </div>
                </div>

                {!hint && !hinting && (
                  <div style={{ textAlign:'center',padding:'44px 16px' }}>
                    <div className="animate-float" style={{ marginBottom:16,display:'flex',justifyContent:'center' }}><Icon.Bulb size={44} color="var(--lime)" /></div>
                    <p style={{ color:'var(--text2)',fontSize:14,lineHeight:1.7,marginBottom:24 }}>
                      {memoryMode ? 'CodeMind will recall your past mistakes and warn you about patterns you repeat.' : 'Memory is OFF — you\'ll get a generic hint without personalization.'}
                    </p>
                    <button onClick={handleHint} className={memoryMode?"btn btn-lime":"btn btn-ghost"} style={{ margin:'0 auto' }}>
                      {memoryMode ? 'Get memory-powered hint' : 'Get generic hint'}
                    </button>
                  </div>
                )}
                {hinting && (
                  <div style={{ textAlign:'center',padding:'44px 16px' }}>
                    <div style={{ display:'flex',justifyContent:'center',marginBottom:16 }}><Icon.Spinner size={36} color="var(--cyan)" /></div>
                    <div style={{ fontFamily:'var(--font-mono)',fontSize:12,color:'var(--text3)',marginBottom:8 }}>
                      {memoryMode ? 'Recalling your mistake patterns...' : 'Generating generic hint...'}
                    </div>
                    {memoryMode && <div style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--cyan)' }}>Hindsight memory active</div>}
                  </div>
                )}
                {hint && !hinting && (
                  <div className="animate-scaleIn">
                    {hint.personalized && (
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14,padding:'10px 14px',background:'rgba(0,229,255,0.06)',border:'1px solid rgba(0,229,255,0.18)',borderRadius:10 }}>
                        <div className="animate-pulse-glow"><Icon.Memory size={16} color="var(--cyan)" /></div>
                        <div>
                          <div style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--cyan)',letterSpacing:'0.08em',textTransform:'uppercase',fontWeight:700 }}>Personalized from your memory</div>
                          <div style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',marginTop:2 }}>Hindsight recalled your past patterns</div>
                        </div>
                      </div>
                    )}
                    {!hint.personalized && !memoryMode && (
                      <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14,padding:'10px 14px',background:'rgba(245,158,11,0.06)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10 }}>
                        <Icon.Warning size={14} color="var(--amber)" />
                        <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--amber)' }}>Generic mode — turn on Memory for personalized hints</span>
                      </div>
                    )}
                    <div style={{ background:'rgba(170,255,0,0.04)',border:'1px solid rgba(170,255,0,0.14)',borderRadius:12,padding:'16px' }}>
                      <div className="md" style={{ fontSize:14 }}><ReactMarkdown>{hint.hint}</ReactMarkdown></div>
                    </div>
                    <button onClick={handleHint} className="btn btn-lime" style={{ marginTop:14,fontSize:10 }}>
                      <Icon.Refresh size={12} color="var(--lime)" /> Another hint
                    </button>
                  </div>
                )}
              </div>
            )}

            {tab==='results' && (
              <div className="animate-fadeUp">
                {!testResults ? (
                  <div style={{ textAlign:'center',padding:'44px 16px',color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:12 }}>Run your code to see test results.</div>
                ) : (
                  <>
                    <div style={{ display:'flex',alignItems:'center',gap:16,marginBottom:20,padding:'16px 18px',background:allPassed?'rgba(0,229,100,0.06)':'rgba(255,31,110,0.06)',border:`1px solid ${allPassed?'rgba(0,229,100,0.22)':'rgba(255,31,110,0.22)'}`,borderRadius:12 }}>
                      <ProgressRing pct={passPct} color={allPassed?'#00e564':'var(--pink)'} />
                      <div>
                        <div style={{ fontFamily:'var(--font-hero)',fontSize:26,color:allPassed?'#00e564':'var(--pink)',letterSpacing:'0.02em' }}>{passed}/{total} PASSED</div>
                        <div style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',marginTop:3,letterSpacing:'0.06em' }}>{allPassed?'ALL TESTS PASSED':`${total-passed} FAILING`}</div>
                      </div>
                    </div>
                    <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                      {testResults.results?.map((r,i) => (
                        <div key={i} className={`animate-fadeUp d${i+1} ${r.passed?'t-pass':'t-fail'}`} style={{ padding:'12px 14px' }}>
                          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:r.passed?0:8 }}>
                            {r.passed ? <Icon.Check size={14} color="#00e564" /> : <Icon.X size={14} color="var(--pink)" />}
                            <span style={{ fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text2)' }}>Test {i+1}: <span style={{ color:r.passed?'#00e564':'var(--pink)' }}>{r.status}</span></span>
                          </div>
                          {!r.passed && (
                            <div style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--text3)',lineHeight:1.6 }}>
                              <div>Input: <span style={{ color:'var(--text2)' }}>{r.input}</span></div>
                              <div>Expected: <span style={{ color:'var(--lime)' }}>{r.expected}</span></div>
                              <div>Got: <span style={{ color:'var(--pink)' }}>{r.actual||r.error||'(no output)'}</span></div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {tab==='feedback' && (
              <div className="animate-fadeUp">
                {!feedback ? (
                  <div style={{ textAlign:'center',padding:'44px 16px',color:'var(--text3)',fontFamily:'var(--font-mono)',fontSize:12 }}>Submit your code to get AI feedback.</div>
                ) : (
                  <>
                    {memoryMode && <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:14,padding:'8px 12px',background:'rgba(0,229,255,0.05)',border:'1px solid rgba(0,229,255,0.15)',borderRadius:9 }}>
                      <div className="animate-pulse-glow"><Icon.Brain size={14} color="var(--cyan)" /></div>
                      <span style={{ fontFamily:'var(--font-mono)',fontSize:10,color:'var(--cyan)' }}>Feedback uses your memory history</span>
                    </div>}
                    {mistakeTypes.length > 0 && (
                      <div style={{ marginBottom:14,display:'flex',flexWrap:'wrap',gap:5 }}>
                        {mistakeTypes.map(m => <span key={m} className="badge b-hard">{m.replace(/_/g,' ')}</span>)}
                      </div>
                    )}
                    <div style={{ background:'rgba(0,229,255,0.04)',border:'1px solid rgba(0,229,255,0.14)',borderRadius:12,padding:'16px',marginBottom:14 }}>
                      <div className="md" style={{ fontSize:14 }}><ReactMarkdown>{feedback}</ReactMarkdown></div>
                    </div>
                    {aiScore && (
                      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8 }}>
                        {Object.entries(aiScore).map(([k,v]) => (
                          <div key={k} style={{ background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 12px',textAlign:'center' }}>
                            <div style={{ fontFamily:'var(--font-hero)',fontSize:20,color:'var(--cyan)' }}>{v}</div>
                            <div style={{ fontFamily:'var(--font-mono)',fontSize:9,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:4 }}>{k}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: editor */}
        <div style={{ flex:1,display:'flex',flexDirection:'column',background:'var(--bg)',minWidth:0 }}>
          <div style={{ flex:1,overflow:'hidden' }}>
            <Editor
              language={lang === 'javascript' ? 'javascript' : lang}
              value={code}
              onChange={v => setCode(v||'')}
              onMount={e => { editorRef.current = e }}
              theme="vs-dark"
              options={{
                fontSize:14, fontFamily:'DM Mono, monospace',
                minimap:{enabled:false}, scrollBeyondLastLine:false,
                lineNumbers:'on', renderLineHighlight:'gutter',
                padding:{top:20,bottom:20}, cursorBlinking:'smooth',
                contextmenu: false,   // disables right-click paste
              }}
            />
          </div>

          <div style={{ flexShrink:0,background:'var(--bg2)',borderTop:'1px solid var(--border)',padding:'12px 20px',display:'flex',gap:10,alignItems:'center' }}>
            <button onClick={handleRun} disabled={running||submitting} className="btn btn-run" style={{ gap:6 }}>
              {running ? <Icon.Spinner size={13} color="var(--text2)" /> : <Icon.Play size={13} color="var(--lime)" />}
              {running ? 'Running...' : 'Run'}
            </button>
            <button onClick={handleSubmit} disabled={running||submitting} className="btn btn-primary" style={{ gap:6 }}>
              {submitting ? <Icon.Spinner size={13} color="#fff" /> : <Icon.Check size={13} color="#fff" />}
              {submitting ? 'Analyzing...' : 'Submit'}
            </button>
            <button onClick={handleHint} disabled={hinting} className="btn btn-lime" style={{ gap:6 }}>
              {hinting ? <Icon.Spinner size={13} color="var(--lime)" /> : <Icon.Bulb size={13} color="var(--lime)" />}
              {memoryMode ? 'Smart Hint' : 'Hint'}
            </button>
            {testResults && (
              <div style={{ marginLeft:'auto',fontFamily:'var(--font-mono)',fontSize:11,color:allPassed?'#00e564':'var(--pink)' }}>
                {passed}/{total} tests · {passPct}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
