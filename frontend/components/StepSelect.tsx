'use client'
import { useState, useMemo } from 'react'
import { Check, X, ArrowRight, ArrowLeft } from 'lucide-react'

const DISEASES = [
  { name:'Diabetes',                specialist:'Endocrinologist',    desc:'High blood sugar, frequent urination, excessive thirst' },
  { name:'Hypertension',            specialist:'Cardiologist',       desc:'High blood pressure, headaches, vision changes' },
  { name:'Heart Attack',            specialist:'Cardiologist',       desc:'Chest pain, left arm pain, shortness of breath' },
  { name:'Migraine',                specialist:'Neurologist',        desc:'Severe throbbing headache, light and sound sensitivity' },
  { name:'Asthma',                  specialist:'Pulmonologist',      desc:'Wheezing, shortness of breath, chest tightness' },
  { name:'Tuberculosis',            specialist:'Pulmonologist',      desc:'Persistent cough, night sweats, weight loss, fever' },
  { name:'Arthritis',               specialist:'Orthopedist',        desc:'Joint pain, stiffness, swelling in joints' },
  { name:'Depression / Anxiety',    specialist:'Psychiatrist',       desc:'Persistent sadness, worry, loss of interest' },
  { name:'Jaundice / Hepatitis',    specialist:'Gastroenterologist', desc:'Yellow skin or eyes, dark urine, fatigue' },
  { name:'Kidney Stones',           specialist:'Urologist',          desc:'Severe back or side pain, blood in urine, nausea' },
  { name:'Skin Rash / Eczema',      specialist:'Dermatologist',      desc:'Itchy red skin, rashes, dryness, inflammation' },
  { name:'Thyroid Disorder',        specialist:'Endocrinologist',    desc:'Weight changes, fatigue, temperature sensitivity' },
  { name:'Anemia',                  specialist:'Hematologist',       desc:'Fatigue, pale skin, shortness of breath, weakness' },
  { name:'Urinary Tract Infection', specialist:'Urologist',          desc:'Painful urination, frequent urge, cloudy urine' },
  { name:'Epilepsy / Seizures',     specialist:'Neurologist',        desc:'Sudden seizures, loss of consciousness, confusion' },
  { name:'GERD / Acidity',          specialist:'Gastroenterologist', desc:'Burning chest pain, acid reflux, sour taste' },
  { name:'Dengue / Typhoid',        specialist:'General Physician',  desc:'High fever, body ache, rash, weakness' },
  { name:'Osteoporosis',            specialist:'Orthopedist',        desc:'Weak brittle bones, back pain, stooped posture' },
  { name:'Bipolar / Schizophrenia', specialist:'Psychiatrist',       desc:'Mood swings, hallucinations, erratic behaviour' },
  { name:'Pneumonia',               specialist:'Pulmonologist',      desc:'High fever, chesty cough, difficulty breathing' },
]

const CATS = [
  { label:'General',         items:['fatigue','fever','chills','weakness','sweating','weight gain','recent weight loss','feeling ill','feeling cold','feeling hot'] },
  { label:'Head & Neuro',    items:['headache','frontal headache','dizziness','fainting','insomnia','sleepiness','disturbance of memory','seizures','anxiety and nervousness'] },
  { label:'Chest & Heart',   items:['sharp chest pain','burning chest pain','chest tightness','shortness of breath','difficulty breathing','palpitations','increased heart rate','decreased heart rate','irregular heartbeat'] },
  { label:'Stomach & Gut',   items:['nausea','vomiting','diarrhea','constipation','upper abdominal pain','lower abdominal pain','sharp abdominal pain','stomach bloating','flatulence','decreased appetite','excessive appetite'] },
  { label:'Skin',            items:['skin rash','itching of skin','jaundice','skin lesion','skin dryness peeling scaliness or roughness','acne or pimples','skin pain','skin swelling','pallor'] },
  { label:'Urinary',         items:['frequent urination','polyuria','painful urination','blood in urine','low urine output','retention of urine','involuntary urination','thirst'] },
  { label:'Joints & Muscles',items:['joint pain','joint swelling','joint stiffness or tightness','muscle pain','muscle weakness','back pain','low back pain','neck pain','knee pain','hip pain'] },
]

interface Props {
  onNext: (data: { mode:'disease'|'symptoms'; selDisease: typeof DISEASES[0]|null; symptoms: string[] }) => void
  onBack: () => void
  loading: boolean
  loadMsg: string
  error: string
}

export default function StepSelect({ onNext, onBack, loading, loadMsg, error }: Props) {
  const [mode,          setMode]         = useState<'disease'|'symptoms'>('disease')
  const [selDisease,    setSelDisease]   = useState<typeof DISEASES[0]|null>(null)
  const [symptoms,      setSymptoms]     = useState<string[]>([])
  const [activeCat,     setActiveCat]    = useState(0)
  const [search,        setSearch]       = useState('')
  const [localErr,      setLocalErr]     = useState('')

  const filtered = useMemo(() =>
    DISEASES.filter(d =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.specialist.toLowerCase().includes(search.toLowerCase())
    ), [search])

  const toggleSym = (s:string) =>
    setSymptoms(p => p.includes(s) ? p.filter(x=>x!==s) : [...p,s])

  const handleNext = () => {
    if (mode==='disease' && !selDisease) return setLocalErr('Please select a condition')
    if (mode==='symptoms' && !symptoms.length) return setLocalErr('Select at least one symptom')
    setLocalErr('')
    onNext({ mode, selDisease, symptoms })
  }

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <p style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#2D6A4F', marginBottom:'12px' }}>Step 02 of 04</p>
      <h1 style={{ fontFamily:'var(--serif)', fontSize:'clamp(28px,4vw,46px)', lineHeight:1.15, color:'#1A2E1A', marginBottom:'32px', fontWeight:400 }}>
        What brings<br/><em style={{ color:'#2D6A4F', fontStyle:'italic' }}>you in today?</em>
      </h1>

      {/* mode switcher — segmented control */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', background:'#EEF2ED', borderRadius:'14px', padding:'4px', marginBottom:'28px' }}>
        {([['disease','Browse Conditions'],['symptoms','Describe Symptoms']] as const).map(([m,label]) => (
          <button key={m} onClick={()=>{setMode(m); setLocalErr('')}} style={{
            padding:'11px', borderRadius:'10px', border:'none', fontFamily:'inherit',
            fontSize:'13px', fontWeight:600, cursor:'pointer', transition:'all .2s',
            background: mode===m ? '#fff' : 'transparent',
            color: mode===m ? '#1A2E1A' : '#6B8068',
            boxShadow: mode===m ? '0 2px 8px rgba(0,0,0,.08)' : 'none',
          }}>{label}</button>
        ))}
      </div>

      {/* DISEASE MODE */}
      {mode === 'disease' && (
        <div>
          <div style={{ position:'relative', marginBottom:'18px' }}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search conditions…"
              style={{ width:'100%', padding:'12px 40px 12px 16px', borderRadius:'12px', border:'1.5px solid #DDE5DB',
                background:'#FAFCF9', fontSize:'14px', fontFamily:'inherit', outline:'none', color:'#1A2E1A', boxSizing:'border-box' }}
            />
            {search && <button onClick={()=>setSearch('')} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#8FA888', display:'flex' }}><X size={16}/></button>}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'10px', maxHeight:'420px', overflowY:'auto', paddingRight:'2px' }}>
            {filtered.map((d,i) => (
              <button key={d.name} onClick={()=>{setSelDisease(d); setLocalErr('')}} style={{
                padding:'18px 16px', borderRadius:'14px', textAlign:'left', cursor:'pointer',
                border: `1.5px solid ${selDisease?.name===d.name ? '#2D6A4F' : '#DDE5DB'}`,
                background: selDisease?.name===d.name ? '#F0F7F2' : '#fff',
                transition:'all .2s', position:'relative', overflow:'hidden',
                fontFamily:'inherit',
              }}
                onMouseEnter={e=>{ if(selDisease?.name!==d.name) e.currentTarget.style.borderColor='#2D6A4F' }}
                onMouseLeave={e=>{ if(selDisease?.name!==d.name) e.currentTarget.style.borderColor='#DDE5DB' }}
              >
                {selDisease?.name===d.name && (
                  <div style={{ position:'absolute', top:'10px', right:'10px', width:'18px', height:'18px', borderRadius:'50%', background:'#2D6A4F', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Check size={11} color="#fff" strokeWidth={3}/>
                  </div>
                )}
                <span style={{ position:'absolute', bottom:'4px', right:'10px', fontFamily:'var(--serif)', fontSize:'48px', fontWeight:700, color:'rgba(45,106,79,0.05)', lineHeight:1, userSelect:'none' }}>
                  {String(i+1).padStart(2,'0')}
                </span>
                <p style={{ fontSize:'14px', fontWeight:700, color:'#1A2E1A', marginBottom:'3px', paddingRight:'20px', fontFamily:'var(--serif)' }}>{d.name}</p>
                <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'#2D6A4F', marginBottom:'6px' }}>{d.specialist}</p>
                <p style={{ fontSize:'12px', color:'#6B8068', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{d.desc}</p>
              </button>
            ))}
            {filtered.length===0 && (
              <div style={{ gridColumn:'1/-1', padding:'40px', textAlign:'center', color:'#8FA888' }}>No conditions found. Try symptoms tab.</div>
            )}
          </div>
        </div>
      )}

      {/* SYMPTOM MODE */}
      {mode === 'symptoms' && (
        <div>
          {symptoms.length > 0 && (
            <div style={{ background:'#F0F7F2', borderRadius:'12px', padding:'12px 14px', marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', flex:1 }}>
                {symptoms.map(s => (
                  <span key={s} style={{ display:'inline-flex', alignItems:'center', gap:'4px', padding:'3px 10px', borderRadius:'999px', background:'#2D6A4F', color:'#fff', fontSize:'12px', fontWeight:500 }}>
                    {s}
                    <button onClick={()=>toggleSym(s)} style={{ background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.75)', display:'flex', padding:0, lineHeight:1 }}><X size={10}/></button>
                  </span>
                ))}
              </div>
              <button onClick={()=>setSymptoms([])} style={{ fontSize:'11px', color:'#6B8068', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit', marginLeft:'8px', flexShrink:0 }}>Clear all</button>
            </div>
          )}

          <div style={{ display:'flex', gap:'6px', overflowX:'auto', paddingBottom:'12px', marginBottom:'14px', scrollbarWidth:'none' }}>
            {CATS.map((c,i) => (
              <button key={c.label} onClick={()=>setActiveCat(i)} style={{
                padding:'7px 14px', borderRadius:'999px', border:`1.5px solid ${activeCat===i?'#1A2E1A':'#DDE5DB'}`,
                background: activeCat===i ? '#1A2E1A' : '#fff', color: activeCat===i ? '#fff' : '#6B8068',
                fontSize:'11px', fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase',
                cursor:'pointer', whiteSpace:'nowrap', fontFamily:'inherit', transition:'all .15s',
              }}>{c.label}</button>
            ))}
          </div>

          <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
            {CATS[activeCat].items.map(s => (
              <button key={s} onClick={()=>toggleSym(s)} style={{
                padding:'8px 16px', borderRadius:'999px', border:`1.5px solid ${symptoms.includes(s)?'#2D6A4F':'#DDE5DB'}`,
                background: symptoms.includes(s) ? '#2D6A4F' : '#fff',
                color: symptoms.includes(s) ? '#fff' : '#4A5E4A',
                fontSize:'13px', fontWeight:500, cursor:'pointer', fontFamily:'inherit',
                transition:'all .18s', transform: symptoms.includes(s) ? 'scale(1)' : 'scale(1)',
              }}>{s}</button>
            ))}
          </div>
        </div>
      )}

      {(localErr || error) && <p style={{ fontSize:'13px', color:'#E53E3E', marginTop:'14px' }}>{localErr || error}</p>}

      <div style={{ display:'flex', gap:'10px', marginTop:'28px' }}>
        <button onClick={onBack} style={{ padding:'16px 20px', borderRadius:'14px', border:'1.5px solid #DDE5DB', background:'transparent', color:'#6B8068', fontSize:'15px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'8px', transition:'all .2s' }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='#2D6A4F'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='#DDE5DB'}
        ><ArrowLeft size={16}/></button>
        <button onClick={handleNext} disabled={loading} style={{
          flex:1, padding:'16px', borderRadius:'14px', border:'none',
          background: loading ? '#4A7C5B' : '#1A2E1A', color:'#fff',
          fontSize:'15px', fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
          transition:'background .2s',
        }}
          onMouseEnter={e=>{ if(!loading) e.currentTarget.style.background='#2D6A4F'}}
          onMouseLeave={e=>{ if(!loading) e.currentTarget.style.background='#1A2E1A'}}
        >
          {loading ? (
            <><span style={{ width:'16px', height:'16px', borderRadius:'50%', border:'2.5px solid rgba(255,255,255,.3)', borderTopColor:'#fff', display:'inline-block', animation:'spin .7s linear infinite' }}/> {loadMsg || 'Processing…'}</>
          ) : <><span>Find My Specialist</span><ArrowRight size={17}/></>}
        </button>
      </div>
    </div>
  )
}