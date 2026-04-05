'use client'
import { useState, useCallback, useRef, useEffect, useMemo, memo } from 'react'
import {
  predictSpecialization, getDoctorsBySpecialization, createPatient,
  createAppointment, generateSummary,
  TriageResult, Doctor, Patient
} from '@/lib/api'

/* ─── types ── */
interface ApptInfo { id: number; appointment_datetime: string; status: string; no_show_probability: number }
interface SummaryData { chief: string; symptoms: string[]; duration: string | null; history: string | undefined }
type Step = 'info' | 'select' | 'results' | 'confirm' | 'done'

/* ─── static data ── */
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

const STEP_LABELS = ['Patient Info', 'Select Issue', 'Specialists', 'Confirm']
const HERO_TAGLINES = [
  { main: 'The right specialist,', em: 'found instantly.' },
  { main: 'AI-powered triage,',    em: 'in seconds.'      },
  { main: 'Your health journey,',  em: 'simplified.'      },
  { main: 'Connect with the best,',em: 'without the wait.'},
  { main: 'Smart diagnosis,',      em: 'smarter care.'    },
]

const fmtDate = (dt:string) => { try { return new Date(dt).toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) } catch { return dt } }
const fmtTime = (dt:string) => { try { return new Date(dt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) } catch { return '' } }
const pad6    = (n:number)  => n.toString().padStart(6,'0')
const initials= (n:string)  => n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()

/* ─── parse doctor availability_slots → nearest valid datetime ─────────── */
function parseSlotToDatetime(slotStr: string): string {
  // slotStr examples: "Mon-Fri 9am-1pm" | "Tue-Sat 2pm-6pm" | "Wed-Sun 1pm-5pm"
  const DAY_MAP: Record<string,number> = {
    sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6
  }

  // parse day range
  const dayMatch = slotStr.match(/([a-z]+)-([a-z]+)/i)
  const startDay = dayMatch ? (DAY_MAP[dayMatch[1].toLowerCase()] ?? 1) : 1
  const endDay   = dayMatch ? (DAY_MAP[dayMatch[2].toLowerCase()] ?? 5) : 5

  // parse time range — e.g. "9am-1pm" or "10am-2pm"
  const timeMatch = slotStr.match(/(\d+)(am|pm)-(\d+)(am|pm)/i)
  let startHour = timeMatch ? parseInt(timeMatch[1]) : 9
  const startMer = timeMatch ? timeMatch[2].toLowerCase() : 'am'
  let endHour   = timeMatch ? parseInt(timeMatch[3]) : 13
  const endMer  = timeMatch ? timeMatch[4].toLowerCase() : 'pm'

  if (startMer === 'pm' && startHour !== 12) startHour += 12
  if (startMer === 'am' && startHour === 12) startHour = 0
  if (endMer   === 'pm' && endHour   !== 12) endHour   += 12
  if (endMer   === 'am' && endHour   === 12) endHour   = 0

  // find next valid day starting from tomorrow
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(0,0,0,0)

  // build list of valid upcoming days in next 14 days
  const candidates: Date[] = []
  for (let offset = 1; offset <= 14; offset++) {
    const d = new Date(now)
    d.setDate(d.getDate() + offset)
    const dow = d.getDay()
    // handle wrap-around like Wed-Sun (3-6) or Mon-Fri (1-5)
    const inRange = startDay <= endDay
      ? dow >= startDay && dow <= endDay
      : dow >= startDay || dow <= endDay
    if (inRange) candidates.push(d)
  }

  // pick a random candidate from first 3 valid days
  const pool = candidates.slice(0, 3)
  const chosen = pool[Math.floor(Math.random() * pool.length)] || candidates[0] || tomorrow

  // pick random time within slot range (on the hour or half hour)
  const availableHours: number[] = []
  for (let h = startHour; h < endHour; h++) {
    availableHours.push(h)       // e.g. 9:00
    if (h + 0.5 < endHour) availableHours.push(h + 0.5)  // e.g. 9:30
  }
  const pickedHour = availableHours.length
    ? availableHours[Math.floor(Math.random() * availableHours.length)]
    : startHour

  const hh  = Math.floor(pickedHour)
  const mm  = pickedHour % 1 === 0.5 ? 30 : 0

  chosen.setHours(hh, mm, 0, 0)

  // return ISO string for backend
  return chosen.toISOString()
}

/* ─── parseSummary — works with flan-t5-base SOAP output OR raw patient text ── */
function parseSummary(raw:string, original:string): SummaryData {
  // Try to extract from model output (raw) first if it has clinical content
  // Fall back to parsing original patient text directly (more reliable)
  const modelText = raw || ''
  const patientText = original || ''

  // ── SOAP label extraction from model output ──────────────────────────────
  // flan-t5-base sometimes outputs "Subjective: ... Objective: ... Assessment: ... Plan: ..."
  const soapMatch = (label:string) => {
    const pat = new RegExp(label+'[:\s]+([^\n]+)', 'i')
    const m = modelText.match(pat)
    return m ? m[1].trim() : null
  }
  const subjective  = soapMatch('Subjective')
  const objective   = soapMatch('Objective')
  const assessment  = soapMatch('Assessment')

  // If SOAP labels found in model output → use them directly
  if (subjective || assessment) {
    return {
      chief:    subjective || assessment || modelText.slice(0, 120),
      symptoms: objective ? [objective] : [],
      duration: null,
      history:  assessment && assessment !== subjective ? assessment : undefined,
    }
  }

  // ── Fallback: parse original patient text directly ───────────────────────
  const text = patientText || modelText
  const sentences = text
    .replace(/([.!?])/g,'$1|||')
    .split('|||')
    .map((s:string)=>s.trim())
    .filter((s:string)=>s.length>6)

  // skip third-party sentences
  const thirdParty = [
    'my father','my mother','my brother','my sister','my husband',
    'my wife','my son','my daughter','my parents','my family',
    'family history','died','passed away','he had','she had','his ','her '
  ]
  const isPatient = (s:string) => !thirdParty.some((p:string)=>s.toLowerCase().includes(p))
  const ps = sentences.filter(isPatient)

  const symKw = [
    'pain','ache','fever','cough','nausea','vomit','fatigue','weak','tired',
    'dizzy','dizziness','blurry','itch','rash','swell','breath','urinat',
    'thirst','headache','insomnia','anxious','anxiety','sweat','bleed',
    'yellow','pale','burning','tightness','palpitat','stiffness','cramp','lump'
  ]
  const isSym = (s:string) => symKw.some((k:string)=>s.toLowerCase().includes(k))

  const chief = ps.find(isSym) || ps[0] || sentences[0] || text.slice(0,100)
  const symptoms = ps.filter((s:string)=>s!==chief && isSym(s)).slice(0,3)

  const durPat = /(\d+\s*(days?|weeks?|months?|years?|hours?)[^.]*?(?:ago)?|past\s+[\w\s]+|since\s+[\w\s]+|for (the past|about|over)?\s*\d+\s*(days?|weeks?|months?)|recently|chronic|ongoing|last \w+)/i
  const durS = ps.find((s:string)=>durPat.test(s))
  const duration = durS ? (durS.match(durPat)||[])[0]?.trim()||null : null

  const ownHist = [
    'i have had','i was diagnosed','i have diabetes','i have hypertension',
    'i have asthma','i had surgery','i take medication','i am diabetic',
    'i have a history','my blood sugar','my blood pressure','my cholesterol',
    'chronic','i smoke','i drink','menopause','i take'
  ]
  const histRaw = ps.find((s:string)=>ownHist.some((k:string)=>s.toLowerCase().includes(k)) && s!==chief)
  const history = histRaw ? (histRaw.length>100 ? histRaw.slice(0,97)+'…' : histRaw) : undefined

  return { chief, symptoms, duration, history }
}

/* ─── Field component ── */
const FI = memo(({ id,label,type='text',value,onChange,err,max,rows,focused,setFocused,setErrs,textRef }:
  { id:string;label:string;type?:string;value:string;onChange:(v:string)=>void;err?:string;max?:number;rows?:number;focused:string;setFocused:(id:string)=>void;setErrs:any;textRef?:any }) => {
  const active = focused===id||!!value
  const isFoc  = focused===id
  return (
    <div>
      <div style={{position:'relative',borderRadius:'14px',overflow:'hidden',border:`1.5px solid ${err?'var(--error)':isFoc?'var(--green)':'var(--border)'}`,background:isFoc?'#fff':'var(--surface)',transition:'all .2s'}}>
        <label htmlFor={id} style={{position:'absolute',left:'16px',fontSize:active?'10px':'15px',fontWeight:active?700:400,letterSpacing:active?'.08em':'0',textTransform:active?'uppercase':'none',color:active?(err?'var(--error)':'var(--green)'):'var(--muted)',top:active?'9px':'50%',transform:active?'none':'translateY(-50%)',transition:'all .2s',pointerEvents:'none',zIndex:1}}>
          {label}
        </label>
        {rows ? (
          <textarea ref={textRef} id={id} value={value} maxLength={max}
            onFocus={()=>setFocused(id)} onBlur={()=>setFocused('')}
            onChange={e=>{onChange(e.target.value);setErrs((p:any)=>({...p,[id]:''}))} }
            style={{width:'100%',padding:'28px 16px 12px',border:'none',background:'transparent',fontSize:'15px',fontFamily:'inherit',color:'var(--ink)',outline:'none',resize:'none',overflow:'hidden',minHeight:'80px',lineHeight:1.65}}
          />
        ) : (
          <input id={id} type={type} value={value} maxLength={max}
            onFocus={()=>setFocused(id)} onBlur={()=>setFocused('')}
            onChange={e=>{onChange(type==='tel'?e.target.value.replace(/\D/g,''):e.target.value);setErrs((p:any)=>({...p,[id]:''}))} }
            style={{width:'100%',padding:'28px 16px 10px',border:'none',background:'transparent',fontSize:'15px',fontFamily:'inherit',color:'var(--ink)',outline:'none'}}
          />
        )}
      </div>
      {err && <p style={{fontSize:'12px',color:'var(--error)',marginTop:'4px',paddingLeft:'2px'}}>{err}</p>}
    </div>
  )
})
FI.displayName='FieldInput'

/* ══════════════════════════════════════════════════════════════════ */
export default function Page() {
  const [name,    setName]    = useState('')
  const [age,     setAge]     = useState('')
  const [gender,  setGender]  = useState('')
  const [contact, setContact] = useState('')
  const [problem, setProblem] = useState('')

  const [mode,       setMode]       = useState<'disease'|'symptoms'>('disease')
  const [condName,   setCondName]   = useState('')
  const [specialist, setSpecialist] = useState('')
  const [doctors,    setDoctors]    = useState<Doctor[]>([])
  const [summary,    setSummary]    = useState('')
  const [selDoctor,  setSelDoctor]  = useState<Doctor|null>(null)
  const [apptInfo,   setApptInfo]   = useState<ApptInfo|null>(null)

  const [selDisease, setSelDisease] = useState<typeof DISEASES[0]|null>(null)
  const [symptoms,   setSymptoms]   = useState<string[]>([])
  const [activeCat,  setActiveCat]  = useState(0)
  const [dsearch,    setDsearch]    = useState('')
  /* ── NEW: search for disease select step ── */
  const [selectSearch, setSelectSearch] = useState('')
  /* symptom search */
  const [symSearch, setSymSearch] = useState('')
  /* computed appointment datetime shown on confirm step */
  const [computedDatetime, setComputedDatetime] = useState('')

  const [step,           setStep]          = useState<Step>('info')
  const [loading,        setLoading]       = useState(false)
  const [loadMsg,        setLoadMsg]       = useState('')
  const [error,          setError]         = useState('')
  const [errs,           setErrs]          = useState<Record<string,string>>({})
  const [animKey,        setAnimKey]       = useState(0)
  const [typedSp,        setTypedSp]       = useState('')
  const [copied,         setCopied]        = useState(false)
  const [focused,        setFocused]       = useState('')
  const [heroIndex,      setHeroIndex]     = useState(0)
  /* summary state — auto generated on confirm, not manual */
  const [summaryLoading, setSummaryLoading]= useState(false)
  const [summaryData,    setSummaryData]   = useState<SummaryData|null>(null)

  const textRef   = useRef<HTMLTextAreaElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const topRef    = useRef<HTMLDivElement>(null)

  const STEPS: Step[] = ['info','select','results','confirm','done']
  const stepIdx = STEPS.indexOf(step)
  const pct     = step==='done' ? 100 : [25,50,75,100][stepIdx]??25

  useEffect(()=>{
    const el=textRef.current; if(!el) return
    el.style.height='auto'; el.style.height=el.scrollHeight+'px'
  },[problem])

  useEffect(()=>{
    if(!specialist) return
    setTypedSp(''); let i=0
    const t=setInterval(()=>{i++;setTypedSp(specialist.slice(0,i));if(i>=specialist.length)clearInterval(t)},42)
    return ()=>clearInterval(t)
  },[specialist])

  useEffect(()=>{
    if(step!=='info') return
    const t=setInterval(()=>setHeroIndex(p=>(p+1)%HERO_TAGLINES.length),3000)
    return ()=>clearInterval(t)
  },[step])

  useEffect(()=>{
    if(step!=='done'||!canvasRef.current) return
    const canvas=canvasRef.current
    const ctx=canvas.getContext('2d')!
    canvas.width=window.innerWidth; canvas.height=window.innerHeight
    const colors=['#2D6A4F','#1A2E1A','#D4A017','#fff','#74C69D']
    const ps:any[]=Array.from({length:120},()=>({
      x:canvas.width/2+(Math.random()-.5)*200,y:-10,
      vx:(Math.random()-.5)*14,vy:Math.random()*8+2,
      color:colors[Math.floor(Math.random()*colors.length)],
      size:Math.random()*8+3,alpha:1,rot:Math.random()*360,rotV:(Math.random()-.5)*10,
    }))
    let raf:number
    const draw=()=>{
      ctx.clearRect(0,0,canvas.width,canvas.height)
      ps.forEach(p=>{
        p.x+=p.vx;p.y+=p.vy;p.vy+=.28;p.alpha-=.011;p.rot+=p.rotV
        if(p.alpha<=0) return
        ctx.save();ctx.globalAlpha=p.alpha
        ctx.translate(p.x,p.y);ctx.rotate(p.rot*Math.PI/180)
        ctx.fillStyle=p.color;ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*.5)
        ctx.restore()
      })
      if(ps.some(p=>p.alpha>0)) raf=requestAnimationFrame(draw)
    }
    raf=requestAnimationFrame(draw)
    return ()=>cancelAnimationFrame(raf)
  },[step])

  const goStep = useCallback((s:Step)=>{
    setStep(s);setError('');setErrs({});setAnimKey(k=>k+1)
    setTimeout(()=>topRef.current?.scrollIntoView({behavior:'smooth'}),30)
  },[])

  const validateInfo = ()=>{
    const e:Record<string,string>={}
    if(!name.trim()||name.trim().length<2)       e.name   ='Min 2 characters required'
    if(!age||+age<1||+age>120)                    e.age    ='Enter age 1–120'
    if(!gender)                                   e.gender ='Select gender'
    if(!/^\d{7,15}$/.test(contact.trim()))        e.contact='7–15 digits only'
    if(!problem.trim()||problem.trim().length<10) e.problem='Min 10 characters'
    setErrs(e); return Object.keys(e).length===0
  }

  const goToSelect = ()=>{ if(validateInfo()) goStep('select') }

  const runTriage = async ()=>{
    if(mode==='disease'&&!selDisease)       return setError('Please select a condition.')
    if(mode==='symptoms'&&!symptoms.length) return setError('Select at least one symptom.')
    setError(''); setLoading(true)
    try {
      let spec=''
      if(mode==='disease'&&selDisease){
        spec=selDisease.specialist; setCondName(selDisease.name); setLoadMsg('Finding specialists…')
      } else {
        setLoadMsg('Analysing symptoms with AI…')
        const tr:TriageResult=await predictSpecialization(symptoms)
        spec=tr.specialization; setCondName('AI Symptom Analysis')
      }
      setSpecialist(spec); setLoadMsg('Loading available doctors…')
      let docs:Doctor[]=[]
      try { docs=await getDoctorsBySpecialization(spec) } catch {}
      setDoctors(docs); if(docs.length) setSelDoctor(docs[0])
      goStep('results')
    } catch { setError('Cannot reach backend. Make sure uvicorn is running on port 8000.') }
    finally { setLoading(false); setLoadMsg('') }
  }

  /* ── auto-generate summary + compute datetime when user lands on confirm ── */
  const goToConfirm = async ()=>{
    if(!selDoctor) return setError('Please select a doctor.')
    setError('')
    // compute appointment datetime from doctor's availability slot
    const dt = parseSlotToDatetime(selDoctor.availability_slots || 'Mon-Fri 9am-5pm')
    setComputedDatetime(dt)
    goStep('confirm')
    // generate summary in background — don't block navigation
    setSummaryData(null); setSummaryLoading(true)
    try {
      const r = await generateSummary(problem)
      setSummaryData(parseSummary(r.summary, problem))
    } catch { /* silent — summary is optional */ }
    finally { setSummaryLoading(false) }
  }

  const book = async ()=>{
    if(!selDoctor) return setError('Please select a doctor.')
    setError(''); setLoading(true); setLoadMsg('Booking your appointment…')
    try {
      const p:Patient=await createPatient({name,age:+age,gender,contact,chronic_conditions:'',medical_history:problem})
      // use the already-computed datetime (set when user clicked Confirm Doctor)
      const apptDatetime = computedDatetime || parseSlotToDatetime(selDoctor.availability_slots || 'Mon-Fri 9am-5pm')
      const appt=await createAppointment({
        patient_id:p.id,
        doctor_id:selDoctor.id,
        reason_for_visit:problem,
        appointment_datetime: apptDatetime,
      })
      setApptInfo(appt); goStep('done')
    } catch { setError('Booking failed. Please try again.') }
    finally { setLoading(false); setLoadMsg('') }
  }

  const reset = ()=>{
    setName('');setAge('');setGender('');setContact('');setProblem('')
    setMode('disease');setCondName('');setSpecialist('');setDoctors([])
    setSummary('');setSummaryData(null);setSelDoctor(null);setApptInfo(null)
    setSelDisease(null);setSymptoms([]);setDsearch('');setSelectSearch('');setSymSearch('')
    setCopied(false); goStep('info')
  }

  const copyTicket = ()=>{
    const d=summaryData
    const lines=[
      'SmartHospital — Appointment Confirmation','─'.repeat(42),
      `ID         : #${pad6(apptInfo?.id??0)}`,
      `Patient    : ${name} (${age}y, ${gender})`,
      `Phone      : ${contact}`,
      `Condition  : ${condName}`,
      `Specialist : ${specialist}`,
      `Doctor     : ${selDoctor?.name}`,
      `Date       : ${apptInfo?fmtDate(apptInfo.appointment_datetime):''}`,
      `Time       : ${apptInfo?fmtTime(apptInfo.appointment_datetime):''}`,
      `Status     : ${apptInfo?.status?.toUpperCase()}`,
      '─'.repeat(42),'Arrive 15 min early. Bring previous reports/prescriptions if any.',
    ]
    if(d){
      lines.push('','─── Doctor Summary ───')
      lines.push(`CC       : ${d.chief}`)
      d.symptoms.forEach(s=>lines.push(`Symptom  : ${s}`))
      if(d.duration) lines.push(`Duration : ${d.duration}`)
      if(d.history)  lines.push(`History  : ${d.history}`)
    }
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true); setTimeout(()=>setCopied(false),2500)
  }

  const filtered = useMemo(()=>
    DISEASES.filter(d=>
      d.name.toLowerCase().includes(dsearch.toLowerCase())||
      d.specialist.toLowerCase().includes(dsearch.toLowerCase())
    ),[dsearch])

  /* filtered diseases for select step with its own search */
  const selectFiltered = useMemo(()=>
    DISEASES.filter(d=>
      d.name.toLowerCase().includes(selectSearch.toLowerCase())||
      d.specialist.toLowerCase().includes(selectSearch.toLowerCase())
    ),[selectSearch])

  /* ── Doctor Summary Card — shown in confirm + done ── */
  const DoctorSummaryCard = ({ data, loading: ld }: { data: SummaryData|null; loading: boolean })=>(
    <div style={{border:'1.5px solid var(--border)',borderRadius:'14px',overflow:'hidden',marginBottom:'18px'}}>
      {/* header */}
      <div style={{background:'var(--forest)',padding:'12px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span style={{fontSize:'14px'}}>🩺</span>
          <span style={{fontSize:'11px',fontWeight:700,color:'#fff',letterSpacing:'.08em',textTransform:'uppercase'}}>Doctor&apos;s Summary</span>
        </div>
        <span style={{fontSize:'10px',color:'rgba(255,255,255,.45)',fontStyle:'italic'}}>Auto-generated · AI</span>
      </div>

      {/* loading skeleton */}
      {ld && (
        <div style={{padding:'16px 18px',background:'var(--surface)',display:'flex',flexDirection:'column',gap:'10px'}}>
          {[100,75,55].map((w,i)=>(
            <div key={i} style={{height:'12px',width:`${w}%`,borderRadius:'6px',background:'linear-gradient(90deg,#EEF2ED 25%,#E0EAE0 50%,#EEF2ED 75%)',backgroundSize:'200% 100%',animation:`shimmer 1.4s ${i*.12}s infinite`}}/>
          ))}
          <p style={{fontSize:'11px',color:'var(--muted)',marginTop:'4px',display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{width:'10px',height:'10px',borderRadius:'50%',border:'2px solid rgba(45,106,79,.3)',borderTopColor:'var(--green)',display:'inline-block',animation:'spin .7s linear infinite'}}/>
            Analysing patient description…
          </p>
        </div>
      )}

      {/* content */}
      {!ld && data && (
        <div style={{background:'var(--surface)',padding:'16px 18px',display:'flex',flexDirection:'column',gap:'12px'}}>

          {/* Chief Complaint */}
          <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
            <div style={{flexShrink:0,width:'36px',height:'36px',borderRadius:'10px',background:'#1A2E1A',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <span style={{fontSize:'10px',fontWeight:700,color:'#fff',letterSpacing:'.04em'}}>CC</span>
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:'10px',fontWeight:700,color:'var(--green)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'3px'}}>Chief Complaint</p>
              <p style={{fontSize:'14px',color:'var(--forest)',lineHeight:1.6,fontWeight:500}}>{data.chief}</p>
            </div>
          </div>

          {/* Divider */}
          {(data.symptoms.length>0||data.duration||data.history) && <div style={{height:'1px',background:'var(--border)'}}/>}

          {/* Symptoms */}
          {data.symptoms.length>0 && (
            <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
              <div style={{flexShrink:0,width:'36px',height:'36px',borderRadius:'10px',background:'#2D6A4F',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:'10px',fontWeight:700,color:'#fff',letterSpacing:'.04em'}}>Sx</span>
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:'10px',fontWeight:700,color:'var(--green)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'6px'}}>Presenting Symptoms</p>
                <div style={{display:'flex',flexDirection:'column',gap:'5px'}}>
                  {data.symptoms.map((s,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'8px'}}>
                      <span style={{marginTop:'6px',width:'5px',height:'5px',borderRadius:'50%',background:'var(--green)',flexShrink:0,display:'inline-block'}}/>
                      <p style={{fontSize:'13px',color:'var(--forest)',lineHeight:1.55}}>{s}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Duration */}
          {data.duration && (
            <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
              <div style={{flexShrink:0,width:'36px',height:'36px',borderRadius:'10px',background:'#40916C',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:'9px',fontWeight:700,color:'#fff',letterSpacing:'.03em'}}>Dur</span>
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:'10px',fontWeight:700,color:'var(--green)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'3px'}}>Duration</p>
                <p style={{fontSize:'13px',color:'var(--forest)',lineHeight:1.55,textTransform:'capitalize'}}>{data.duration}</p>
              </div>
            </div>
          )}

          {/* History */}
          {data.history && (
            <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
              <div style={{flexShrink:0,width:'36px',height:'36px',borderRadius:'10px',background:'#52796F',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <span style={{fontSize:'9px',fontWeight:700,color:'#fff',letterSpacing:'.03em'}}>Hx</span>
              </div>
              <div style={{flex:1}}>
                <p style={{fontSize:'10px',fontWeight:700,color:'var(--green)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'3px'}}>Medical History</p>
                <p style={{fontSize:'13px',color:'var(--forest)',lineHeight:1.55}}>{data.history}</p>
              </div>
            </div>
          )}

          {/* footer note */}
          <div style={{paddingTop:'8px',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',gap:'6px'}}>
            <span style={{width:'5px',height:'5px',borderRadius:'50%',background:'var(--green)',display:'inline-block'}}/>
            <p style={{fontSize:'10px',color:'var(--muted)'}}>Generated by T5 clinical summarizer · for doctor reference only</p>
          </div>
        </div>
      )}

      {/* no summary fallback */}
      {!ld && !data && (
        <div style={{padding:'16px 18px',background:'var(--surface)'}}>
          <p style={{fontSize:'13px',color:'var(--muted)',fontStyle:'italic'}}>Summary unavailable. Doctor will review patient notes directly.</p>
        </div>
      )}
    </div>
  )

  const Spin = ({color='#fff'}:{color?:string})=>(
    <span style={{width:'15px',height:'15px',borderRadius:'50%',border:`2.5px solid ${color==='#fff'?'rgba(255,255,255,.3)':'rgba(45,106,79,.3)'}`,borderTopColor:color,display:'inline-block',animation:'spin .7s linear infinite',flexShrink:0}}/>
  )

  /* ══════════════════ RENDER ══════════════════ */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400;1,600&family=DM+Sans:wght@300;400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        :root{
          --forest:#1A2E1A;--green:#2D6A4F;--green2:#40916C;
          --soft:#F0F7F2;--bg:#F0F4EF;--surface:#FAFCF9;
          --border:#DDE5DB;--muted:#6B8068;--ink:#1A2E1A;
          --error:#E53E3E;--amber:#D4A017;
          --serif:'Cormorant Garamond',Georgia,serif;
          --sans:'DM Sans',system-ui,sans-serif;
        }
        html,body{background:var(--bg);font-family:var(--sans);color:var(--ink);-webkit-font-smoothing:antialiased;min-height:100%}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#C6D4C4;border-radius:2px}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes shimmer {to{background-position:-200% 0}}
        @keyframes spin    {to{transform:rotate(360deg)}}
        @keyframes pageBar {0%{width:0;opacity:1}80%{width:85%;opacity:1}100%{width:100%;opacity:0}}
        @keyframes ticketIn{from{opacity:0;transform:perspective(900px) rotateX(-6deg) scale(.96)}to{opacity:1;transform:none}}
        @keyframes dotPulse{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-2px)}}
        @keyframes slideUp {from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes summaryIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        .pgbar{position:fixed;top:0;left:0;height:3px;background:var(--green2);z-index:9999;animation:pageBar .9s ease forwards}
        .btn-dark{width:100%;padding:17px;border-radius:14px;border:none;background:var(--forest);color:#fff;font-size:15px;font-weight:700;font-family:var(--sans);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;transition:background .2s;letter-spacing:.01em}
        .btn-dark:hover{background:var(--green)}
        .btn-dark:disabled{opacity:.6;cursor:not-allowed}
        .btn-ghost{padding:16px 20px;border-radius:14px;border:1.5px solid var(--border);background:transparent;color:var(--muted);font-size:15px;font-weight:600;font-family:var(--sans);cursor:pointer;display:flex;align-items:center;gap:7px;transition:all .2s;white-space:nowrap}
        .btn-ghost:hover{border-color:var(--green);color:var(--green)}
        .btn-sm{flex:1;padding:12px;border-radius:12px;border:1.5px solid var(--border);background:transparent;color:var(--ink);font-size:13px;font-weight:600;font-family:var(--sans);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s}
        .btn-sm:hover{border-color:var(--green);color:var(--green)}
        .skel{border-radius:8px;background:linear-gradient(90deg,#EEF2ED 25%,#E0EAE0 50%,#EEF2ED 75%);background-size:200% 100%;animation:shimmer 1.5s infinite}
        .card-enter{animation:fadeUp .4s cubic-bezier(0.22,1,0.36,1) both}
        .sym-pill{padding:8px 16px;border-radius:999px;border:1.5px solid var(--border);font-size:13px;font-weight:500;cursor:pointer;background:#fff;color:var(--ink);transition:all .18s;font-family:var(--sans);white-space:nowrap}
        .sym-pill:hover{border-color:var(--green);color:var(--green)}
        .sym-pill.on{background:var(--green);color:#fff;border-color:var(--green)}
        .seg{flex:1;padding:11px;border-radius:10px;border:none;font-family:var(--sans);font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
        .search-input{width:100%;padding:10px 36px 10px 14px;borderRadius:12px;border:1.5px solid var(--border);background:var(--surface);fontSize:14px;fontFamily:inherit;outline:none;color:var(--ink);box-sizing:border-box;transition:border .2s}
        .search-input:focus{border-color:var(--green)}
      `}</style>

      {step==='done'&&<canvas ref={canvasRef} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:999}}/>}
      <div className="pgbar"/>
      <div ref={topRef}/>

      {/* NAV */}
      <nav style={{position:'sticky',top:0,zIndex:50,background:'rgba(240,244,239,0.93)',backdropFilter:'blur(20px)',borderBottom:'1px solid var(--border)',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 clamp(16px,4vw,48px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:'9px'}}>
          <div style={{width:'30px',height:'30px',borderRadius:'8px',background:'var(--forest)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.5 1.5 3.5 3.5 3.5 6c0 3.5 4.5 8.5 4.5 8.5S12.5 9.5 12.5 6c0-2.5-2-4.5-4.5-4.5zm0 6a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" fill="white"/></svg>
          </div>
          <span style={{fontFamily:'var(--serif)',fontSize:'19px',fontWeight:600,color:'var(--forest)'}}>
            Smart<span style={{color:'var(--green)'}}>Hospital</span>
          </span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
          {step!=='done'&&step!=='info'&&<span style={{fontSize:'12px',color:'var(--muted)',fontWeight:500}}>Step {stepIdx} of 4</span>}
          {/* <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
            <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/>
            <span style={{fontSize:'12px',color:'var(--muted)'}}>32 doctors online</span>
          </div> */}
        </div>
      </nav>

      {/* PROGRESS */}
      {step!=='done'&&(
        <div style={{background:'var(--border)',height:'3px'}}>
          <div style={{height:'100%',background:'linear-gradient(90deg,var(--green),var(--green2))',width:`${pct}%`,transition:'width .5s cubic-bezier(0.22,1,0.36,1)',borderRadius:'0 2px 2px 0'}}/>
        </div>
      )}

      {/* BREADCRUMB */}
      {step!=='info'&&step!=='done'&&(
        <div style={{display:'flex',justifyContent:'center',padding:'14px 16px 0'}}>
          <div style={{display:'flex',alignItems:'center',background:'var(--surface)',borderRadius:'999px',border:'1px solid var(--border)',padding:'4px 5px',boxShadow:'0 1px 6px rgba(0,0,0,.05)'}}>
            {STEP_LABELS.map((label,i)=>{
              const done=i<stepIdx,active=i===stepIdx
              return(
                <div key={label} style={{display:'flex',alignItems:'center'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'5px',padding:'5px 11px',borderRadius:'999px',background:active?'var(--forest)':'transparent',transition:'all .2s'}}>
                    <div style={{width:'17px',height:'17px',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:700,flexShrink:0,background:done?'var(--green)':active?'rgba(255,255,255,.2)':'var(--border)',color:done?'#fff':active?'#fff':'var(--muted)'}}>
                      {done?'✓':i+1}
                    </div>
                    <span style={{fontSize:'12px',fontWeight:600,whiteSpace:'nowrap',color:active?'#fff':done?'var(--green)':'var(--muted)'}}>{label}</span>
                  </div>
                  {i<STEP_LABELS.length-1&&<div style={{width:'10px',height:'1px',background:'var(--border)',margin:'0 1px'}}/>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* HERO */}
      {step==='info'&&(
        <div style={{textAlign:'center',padding:'clamp(28px,5vh,52px) 20px 0',animation:'fadeUp .5s ease'}}>
          <div style={{position:'relative',minHeight:'clamp(100px,15vw,170px)',display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'10px'}}>
            {HERO_TAGLINES.map((tag,idx)=>(
              <h1 key={idx} style={{fontFamily:'var(--serif)',fontSize:'clamp(34px,6vw,64px)',lineHeight:1.05,color:'var(--forest)',fontWeight:400,letterSpacing:'-.02em',position:'absolute',width:'100%',left:0,top:0,opacity:heroIndex===idx?1:0,transform:`translateY(${heroIndex===idx?'0':'20px'}) scale(${heroIndex===idx?1:0.95})`,transition:'opacity .6s cubic-bezier(0.4,0,0.2,1),transform .8s cubic-bezier(0.34,1.56,0.64,1)',pointerEvents:heroIndex===idx?'auto':'none',willChange:'opacity,transform'}}>
                {tag.main}<br/><em style={{fontStyle:'italic',color:'var(--green)'}}>{tag.em}</em>
              </h1>
            ))}
          </div>
          <p style={{fontSize:'clamp(14px,1.5vw,16px)',color:'var(--muted)',maxWidth:'420px',margin:'0 auto 24px',lineHeight:1.75}}>
            Select your condition or describe symptoms — AI finds your specialist and books in seconds.
            <span style={{display:'inline-flex',gap:'3px',marginLeft:'4px'}}>
              {[0,.2,.4].map(d=><span key={d} style={{animation:`dotPulse 1.5s ease-in-out ${d}s infinite`}}>.</span>)}
            </span>
          </p>
          <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap',marginBottom:'32px'}}>
            {[{n:'32',l:'Doctors'},{n:'14',l:'Specializations'},{n:'20',l:'Conditions'},{n:'<60s',l:'Booking'}].map((s,i)=>(
              <div key={s.l} style={{padding:'10px 18px',background:'var(--surface)',border:'1.5px solid var(--border)',borderRadius:'12px',textAlign:'center',boxShadow:'0 1px 4px rgba(0,0,0,.04)',transition:'all .3s ease',animation:`slideUp .5s ease ${i*.1}s both`,cursor:'default'}}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.borderColor='var(--green)';e.currentTarget.style.boxShadow='0 8px 20px rgba(45,106,79,.15)'}}
                onMouseLeave={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.04)'}}
              >
                <div style={{fontFamily:'var(--serif)',fontSize:'20px',fontWeight:600,color:'var(--forest)',lineHeight:1}}>{s.n}</div>
                <div style={{fontSize:'11px',color:'var(--muted)',fontWeight:500,marginTop:'2px'}}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MAIN */}
      <main style={{maxWidth:'620px',margin:'0 auto',padding:'clamp(20px,4vh,36px) clamp(16px,4vw,24px) 80px'}}>
        <div key={animKey} className="card-enter">

          {/* ═══ INFO ═══════════════════════════════════════════════ */}
          {step==='info'&&(
            <div>
              <p style={{fontSize:'12px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--green)',marginBottom:'10px'}}>Step 01 of 04</p>
              <h2 style={{fontFamily:'var(--serif)',fontSize:'clamp(28px,4vw,44px)',fontWeight:400,color:'var(--forest)',marginBottom:'8px',lineHeight:1.15}}>
                Let&apos;s get to <em style={{fontStyle:'italic',color:'var(--green)'}}>know you</em>
              </h2>
              <p style={{fontSize:'14px',color:'var(--muted)',marginBottom:'28px',lineHeight:1.7}}>Your details help us find the right specialist.</p>

              <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
                <FI id="name" label="Full Name" value={name} onChange={setName} err={errs.name} focused={focused} setFocused={setFocused} setErrs={setErrs}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1.8fr',gap:'12px'}}>
                  <FI id="age" label="Age" type="number" value={age} onChange={setAge} err={errs.age} focused={focused} setFocused={setFocused} setErrs={setErrs}/>
                  <div>
                    <div style={{display:'flex',gap:'8px'}}>
                      {['Male','Female','Other'].map(g=>(
                        <button key={g} onClick={()=>{setGender(g);setErrs(p=>({...p,gender:''}))}} style={{flex:1,padding:'14px 8px',borderRadius:'14px',border:`1.5px solid ${gender===g?'var(--green)':'var(--border)'}`,background:gender===g?'var(--green)':'var(--surface)',color:gender===g?'#fff':'var(--muted)',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>
                          {g}
                        </button>
                      ))}
                    </div>
                    {errs.gender&&<p style={{fontSize:'12px',color:'var(--error)',marginTop:'4px',paddingLeft:'2px'}}>{errs.gender}</p>}
                  </div>
                </div>
                <FI id="contact" label="Phone Number" type="tel" value={contact} onChange={setContact} err={errs.contact} max={15} focused={focused} setFocused={setFocused} setErrs={setErrs}/>
                <div>
                  <FI id="problem" label="Describe your health concern" value={problem} onChange={setProblem} err={errs.problem} rows={3} focused={focused} setFocused={setFocused} setErrs={setErrs} textRef={textRef}/>
                  <div style={{display:'flex',justifyContent:'flex-end',marginTop:'4px'}}>
                    <span style={{fontSize:'11px',color:'var(--muted)'}}>{problem.length}/500</span>
                  </div>
                </div>
              </div>

              <div style={{marginTop:'24px'}}>
                <button className="btn-dark" onClick={goToSelect}>
                  Continue <span style={{fontSize:'18px',lineHeight:1}}>→</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══ SELECT ═════════════════════════════════════════════ */}
          {step==='select'&&(
            <div>
              <p style={{fontSize:'12px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--green)',marginBottom:'10px'}}>Step 02 of 04</p>
              <h2 style={{fontFamily:'var(--serif)',fontSize:'clamp(26px,4vw,42px)',fontWeight:400,color:'var(--forest)',marginBottom:'20px',lineHeight:1.15}}>
                What brings <em style={{fontStyle:'italic',color:'var(--green)'}}>you in today?</em>
              </h2>

              {/* segmented control */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',background:'#EEF2ED',borderRadius:'14px',padding:'4px',marginBottom:'20px'}}>
                {(['disease','symptoms'] as const).map((m,i)=>(
                  <button key={m} className="seg" onClick={()=>{setMode(m);setError('')}} style={{background:mode===m?'#fff':'transparent',color:mode===m?'var(--forest)':'var(--muted)',boxShadow:mode===m?'0 2px 8px rgba(0,0,0,.08)':'none'}}>
                    {i===0?'Browse Conditions':'Describe Symptoms'}
                  </button>
                ))}
              </div>

              {/* ── DISEASE MODE ── */}
              {mode==='disease'&&(
                <div>
                  {/* search */}
                  <div style={{position:'relative',marginBottom:'16px'}}>
                    <input
                      value={selectSearch}
                      onChange={e=>setSelectSearch(e.target.value)}
                      placeholder="Search conditions or specialists…"
                      style={{width:'100%',padding:'11px 36px 11px 14px',borderRadius:'12px',border:'1.5px solid var(--border)',background:'var(--surface)',fontSize:'14px',fontFamily:'inherit',outline:'none',color:'var(--ink)',boxSizing:'border-box',transition:'border .2s'}}
                      onFocus={e=>e.currentTarget.style.borderColor='var(--green)'}
                      onBlur={e=>e.currentTarget.style.borderColor='var(--border)'}
                    />
                    {selectSearch&&(
                      <button onClick={()=>setSelectSearch('')} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:'16px',lineHeight:1,padding:0}}>×</button>
                    )}
                  </div>

                  {/* 2-column card grid — original design */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:'10px',maxHeight:'440px',overflowY:'auto',paddingRight:'2px'}}>
                    {(selectSearch
                      ? DISEASES.filter(d=>
                          d.name.toLowerCase().includes(selectSearch.toLowerCase())||
                          d.specialist.toLowerCase().includes(selectSearch.toLowerCase())
                        )
                      : DISEASES
                    ).map((d,i)=>(
                      <button
                        key={d.name}
                        type="button"
                        onClick={()=>{setSelDisease(d);setError('')}}
                        style={{
                          padding:'18px 16px',borderRadius:'14px',textAlign:'left',
                          cursor:'pointer',fontFamily:'inherit',
                          border:`1.5px solid ${selDisease?.name===d.name?'var(--green)':'var(--border)'}`,
                          background:selDisease?.name===d.name?'var(--soft)':'#fff',
                          transition:'all .2s',position:'relative',overflow:'hidden',
                          outline:'none',
                        }}
                        onMouseEnter={e=>{if(selDisease?.name!==d.name)(e.currentTarget as HTMLElement).style.borderColor='var(--green)'}}
                        onMouseLeave={e=>{if(selDisease?.name!==d.name)(e.currentTarget as HTMLElement).style.borderColor='var(--border)'}}
                      >
                        {selDisease?.name===d.name&&(
                          <span style={{position:'absolute',top:'10px',right:'10px',width:'18px',height:'18px',borderRadius:'50%',background:'var(--green)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',color:'#fff',fontWeight:700}}>✓</span>
                        )}
                        <span style={{position:'absolute',bottom:'2px',right:'8px',fontFamily:'var(--serif)',fontSize:'46px',fontWeight:700,color:'rgba(45,106,79,0.05)',lineHeight:1,userSelect:'none'}}>{String(i+1).padStart(2,'0')}</span>
                        <p style={{fontFamily:'var(--serif)',fontSize:'14px',fontWeight:400,color:'var(--forest)',marginBottom:'3px',paddingRight:'22px'}}>{d.name}</p>
                        <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--green)',marginBottom:'5px'}}>{d.specialist}</p>
                        <p style={{fontSize:'12px',color:'var(--muted)',lineHeight:1.5,overflow:'hidden',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'}}>{d.desc}</p>
                      </button>
                    ))}
                    {(selectSearch && DISEASES.filter(d=>d.name.toLowerCase().includes(selectSearch.toLowerCase())||d.specialist.toLowerCase().includes(selectSearch.toLowerCase())).length===0)&&(
                      <div style={{gridColumn:'1/-1',padding:'36px',textAlign:'center',color:'var(--muted)'}}>
                        <p style={{fontSize:'14px',marginBottom:'6px'}}>No conditions found for &ldquo;{selectSearch}&rdquo;</p>
                        <p style={{fontSize:'12px'}}>Try the Symptoms tab for AI analysis</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {/* ── SYMPTOM MODE ── */}
              {mode==='symptoms'&&(
                <div>
                  {/* selected symptoms bar */}
                  {symptoms.length>0&&(
                    <div style={{background:'var(--soft)',borderRadius:'12px',padding:'10px 14px',marginBottom:'14px',display:'flex',alignItems:'flex-start',gap:'8px',justifyContent:'space-between'}}>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'5px',flex:1}}>
                        {symptoms.map(s=>(
                          <span key={s} style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'3px 10px',borderRadius:'999px',background:'var(--green)',color:'#fff',fontSize:'12px',fontWeight:500}}>
                            {s}<button onClick={()=>setSymptoms(p=>p.filter(x=>x!==s))} style={{background:'none',border:'none',cursor:'pointer',color:'rgba(255,255,255,.7)',padding:0,display:'flex',lineHeight:1,fontSize:'13px'}}>×</button>
                          </span>
                        ))}
                      </div>
                      <button onClick={()=>setSymptoms([])} style={{fontSize:'11px',color:'var(--muted)',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',flexShrink:0}}>Clear all</button>
                    </div>
                  )}

                  {/* symptom search bar */}
                  <div style={{position:'relative',marginBottom:'14px'}}>
                    
                    <input
                      value={symSearch}
                      onChange={e=>{setSymSearch(e.target.value); setActiveCat(-1)}}
                      placeholder="Search symptoms… e.g. headache, fever"
                      style={{width:'100%',padding:'10px 36px 10px 40px',borderRadius:'12px',border:'1.5px solid var(--border)',background:'var(--surface)',fontSize:'14px',fontFamily:'inherit',outline:'none',color:'var(--ink)',boxSizing:'border-box',transition:'border .2s'}}
                      onFocus={e=>e.currentTarget.style.borderColor='var(--green)'}
                      onBlur={e=>e.currentTarget.style.borderColor='var(--border)'}
                    />
                    {symSearch&&(
                      <button onClick={()=>{setSymSearch('');setActiveCat(0)}} style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:'18px',lineHeight:1}}>×</button>
                    )}
                  </div>

                  {/* search results mode */}
                  {symSearch ? (
                    <div>
                      {(() => {
                        const allSyms = CATS.flatMap(c=>c.items)
                        const matched = allSyms.filter(s=>s.toLowerCase().includes(symSearch.toLowerCase()))
                        return matched.length > 0 ? (
                          <>
                            <p style={{fontSize:'12px',color:'var(--muted)',marginBottom:'10px'}}>{matched.length} symptom{matched.length!==1?'s':''} found</p>
                            <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                              {matched.map(s=>(
                                <button key={s} className={`sym-pill${symptoms.includes(s)?' on':''}`}
                                  onClick={()=>setSymptoms(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])}>
                                  {s}
                                </button>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div style={{textAlign:'center',padding:'24px',color:'var(--muted)'}}>
                            <p style={{fontSize:'14px',marginBottom:'4px'}}>No symptoms found for &ldquo;{symSearch}&rdquo;</p>
                            <p style={{fontSize:'12px'}}>Try browsing by category below</p>
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    /* category browse mode */
                    <div>
                      <div style={{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'10px',marginBottom:'12px',scrollbarWidth:'none'}}>
                        {CATS.map((c,i)=>(
                          <button key={c.label} onClick={()=>setActiveCat(i)} style={{padding:'6px 14px',borderRadius:'999px',border:`1.5px solid ${activeCat===i?'var(--forest)':'var(--border)'}`,background:activeCat===i?'var(--forest)':'#fff',color:activeCat===i?'#fff':'var(--muted)',fontSize:'11px',fontWeight:700,letterSpacing:'.06em',textTransform:'uppercase',cursor:'pointer',whiteSpace:'nowrap',fontFamily:'inherit',transition:'all .15s'}}>
                            {c.label}
                          </button>
                        ))}
                      </div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
                        {CATS[activeCat >= 0 ? activeCat : 0].items.map(s=>(
                          <button key={s} className={`sym-pill${symptoms.includes(s)?' on':''}`}
                            onClick={()=>setSymptoms(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {error&&<p style={{fontSize:'13px',color:'var(--error)',marginTop:'12px'}}>{error}</p>}
              <div style={{display:'flex',gap:'10px',marginTop:'24px'}}>
                <button className="btn-ghost" onClick={()=>goStep('info')}>← Back</button>
                <button className="btn-dark" style={{flex:1}} onClick={runTriage} disabled={loading}>
                  {loading?<><Spin/>{loadMsg||'Processing…'}</>:<>Find My Specialist <span style={{fontSize:'18px'}}>→</span></>}
                </button>
              </div>
            </div>
          )}

          {/* ═══ RESULTS ════════════════════════════════════════════ */}
          {step==='results'&&(
            <div>
              <p style={{fontSize:'12px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--green)',marginBottom:'10px'}}>Step 03 of 04</p>
              <p style={{fontSize:'13px',color:'var(--muted)',marginBottom:'4px'}}>Your recommended specialist</p>
              <h2 style={{fontFamily:'var(--serif)',fontSize:'clamp(30px,5vw,52px)',fontWeight:400,color:'var(--forest)',lineHeight:1.1,marginBottom:'4px'}}>
                {typedSp||specialist||'…'}
              </h2>
              <div style={{height:'2px',background:'var(--green)',borderRadius:'1px',width:typedSp===specialist?'180px':'0',transition:'width .4s .1s ease',marginBottom:'8px'}}/>
              <p style={{fontSize:'13px',color:'var(--muted)',marginBottom:'24px'}}>Based on your {mode==='disease'?'selected condition':'reported symptoms'}</p>

              <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',marginBottom:'12px'}}>
                <h3 style={{fontFamily:'var(--serif)',fontSize:'20px',fontWeight:400,color:'var(--forest)'}}>Available Doctors</h3>
                {!loading&&<span style={{fontSize:'12px',color:'var(--muted)'}}>{doctors.length} found</span>}
              </div>

              {loading?(
                <div style={{border:'1.5px solid var(--border)',borderRadius:'16px',overflow:'hidden'}}>
                  {[1,2,3].map(i=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'14px',padding:'16px 20px',borderBottom:'1px solid var(--border)'}}>
                      <div className="skel" style={{width:'44px',height:'44px',borderRadius:'50%',flexShrink:0}}/>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:'8px'}}>
                        <div className="skel" style={{height:'13px',width:'140px'}}/>
                        <div className="skel" style={{height:'11px',width:'90px'}}/>
                      </div>
                    </div>
                  ))}
                </div>
              ):(
                doctors.length===0 ? (
                  <div style={{border:'1.5px solid var(--border)',borderRadius:'16px',padding:'32px',textAlign:'center',color:'var(--muted)',fontSize:'14px'}}>
                    No doctors found for this specialization.
                  </div>
                ) : (() => {
                  // group doctors by specialization
                  const groups: Record<string, Doctor[]> = {}
                  doctors.forEach(d => {
                    if (!groups[d.specialization]) groups[d.specialization] = []
                    groups[d.specialization].push(d)
                  })
                  const specs = Object.keys(groups)
                  return (
                    <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
                      {specs.map(spec => (
                        <div key={spec} style={{border:'1.5px solid var(--border)',borderRadius:'16px',overflow:'hidden'}}>
                          {/* specialization group header */}
                          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 18px',background:'var(--forest)',borderBottom:'1px solid rgba(255,255,255,.08)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <span style={{fontSize:'12px'}}>🩺</span>
                              <span style={{fontSize:'12px',fontWeight:700,color:'#fff',letterSpacing:'.04em'}}>{spec}</span>
                            </div>
                            <span style={{fontSize:'11px',color:'rgba(255,255,255,.45)',fontWeight:500}}>
                              {groups[spec].length} doctor{groups[spec].length>1?'s':''} available
                            </span>
                          </div>
                          {/* doctors in this group */}
                          {groups[spec].map((d, i) => (
                            <div key={d.id} onClick={()=>{setSelDoctor(d);setError('')}}
                              style={{display:'flex',alignItems:'center',gap:'14px',padding:'15px 20px',cursor:'pointer',
                                borderBottom:i<groups[spec].length-1?'1px solid var(--border)':'none',
                                borderLeft:`4px solid ${selDoctor?.id===d.id?'var(--green)':'transparent'}`,
                                background:selDoctor?.id===d.id?'var(--soft)':'#fff',transition:'all .2s'
                              }}
                              onMouseEnter={e=>{ if(selDoctor?.id!==d.id)(e.currentTarget as HTMLElement).style.background='#F9FBF9' }}
                              onMouseLeave={e=>{ if(selDoctor?.id!==d.id)(e.currentTarget as HTMLElement).style.background='#fff' }}
                            >
                              {/* avatar */}
                              <div style={{width:'44px',height:'44px',borderRadius:'50%',background:selDoctor?.id===d.id?'var(--green)':'var(--forest)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'background .2s'}}>
                                <span style={{fontSize:'14px',fontWeight:700,color:'#fff',fontFamily:'var(--serif)'}}>{initials(d.name)}</span>
                              </div>
                              {/* info */}
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'2px'}}>
                                  <p style={{fontSize:'15px',fontWeight:700,color:selDoctor?.id===d.id?'var(--green)':'var(--forest)',fontFamily:'var(--serif)'}}>{d.name}</p>
                                  {selDoctor?.id===d.id&&<span style={{color:'var(--green)',fontSize:'13px',fontWeight:700}}>✓</span>}
                                </div>
                                <p style={{fontSize:'12px',color:'var(--muted)'}}>{d.experience_years} yrs experience</p>
                                <p style={{fontSize:'11px',color:'var(--muted)',marginTop:'2px',display:'flex',alignItems:'center',gap:'4px'}}>
                                  <span style={{width:'5px',height:'5px',borderRadius:'50%',background:'#22c55e',display:'inline-block'}}/>
                                  {d.availability_slots}
                                </p>
                              </div>
                              {/* rating */}
                              <div style={{textAlign:'right',flexShrink:0}}>
                                <div style={{display:'flex',alignItems:'center',gap:'3px',justifyContent:'flex-end',marginBottom:'4px'}}>
                                  <span style={{color:'var(--amber)',fontSize:'13px'}}>{'★'.repeat(Math.round(d.rating))}</span>
                                  <span style={{fontSize:'13px',fontWeight:700,color:'var(--forest)'}}>{d.rating}</span>
                                </div>
                                {selDoctor?.id===d.id && (
                                  <span style={{fontSize:'10px',fontWeight:700,color:'var(--green)',letterSpacing:'.04em',textTransform:'uppercase'}}>Selected</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )
                })()
              )}

              {error&&<p style={{fontSize:'13px',color:'var(--error)',marginTop:'12px'}}>{error}</p>}
              <div style={{display:'flex',gap:'10px',marginTop:'22px'}}>
                <button className="btn-ghost" onClick={()=>goStep('select')}>← Back</button>
                {/* clicking Confirm Doctor triggers goToConfirm which auto-generates summary */}
                <button className="btn-dark" style={{flex:1}} onClick={goToConfirm}>
                  Confirm Doctor <span style={{fontSize:'18px'}}>→</span>
                </button>
              </div>
            </div>
          )}

          {/* ═══ CONFIRM ════════════════════════════════════════════ */}
          {step==='confirm'&&(
            <div>
              <p style={{fontSize:'12px',fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--green)',marginBottom:'10px'}}>Step 04 of 04</p>
              <h2 style={{fontFamily:'var(--serif)',fontSize:'clamp(24px,4vw,40px)',fontWeight:400,color:'var(--forest)',marginBottom:'8px',lineHeight:1.15}}>
                Almost there — <em style={{fontStyle:'italic',color:'var(--green)'}}>confirm your booking</em>
              </h2>
              <p style={{fontSize:'14px',color:'var(--muted)',marginBottom:'24px',lineHeight:1.6}}>Review all details before confirming.</p>

              {/* booking details table */}
              <div style={{border:'1.5px solid var(--border)',borderRadius:'14px',overflow:'hidden',marginBottom:'20px'}}>
                {[
                  {label:'Patient',    val:name,                                                 edit:()=>goStep('info')},
                  {label:'Age',        val:`${age} yrs, ${gender}`,                             edit:null},
                  {label:'Phone',      val:contact,                                              edit:null},
                  {label:'Condition',  val:condName,                                             edit:null},
                  {label:'Specialist', val:specialist,                                           edit:null},
                  {label:'Doctor',     val:selDoctor?.name??'—',                                edit:()=>goStep('results')},
                  {label:'Date',       val:computedDatetime ? fmtDate(computedDatetime) : '—',  edit:null},
                  {label:'Time',       val:computedDatetime ? fmtTime(computedDatetime) : '—',  edit:null},
                  {label:'Schedule',   val:selDoctor?.availability_slots??'—',                  edit:null},
                ].map((row,i)=>(
                  <div key={row.label} style={{display:'flex',alignItems:'center',padding:'12px 20px',background:i%2===0?'#fff':'var(--surface)',borderBottom:i<7?'1px solid var(--border)':'none'}}
                    onMouseEnter={row.edit?e=>{const b=e.currentTarget.querySelector('.elabel') as HTMLElement;if(b)b.style.opacity='1'}:undefined}
                    onMouseLeave={row.edit?e=>{const b=e.currentTarget.querySelector('.elabel') as HTMLElement;if(b)b.style.opacity='0'}:undefined}
                  >
                    <span style={{width:'110px',fontSize:'12px',color:'var(--muted)',fontWeight:500,flexShrink:0}}>{row.label}</span>
                    <span style={{flex:1,fontSize:'14px',fontWeight:700,color:'var(--forest)'}}>{row.val}</span>
                    {row.edit&&<span className="elabel" onClick={row.edit} style={{fontSize:'11px',color:'var(--green)',cursor:'pointer',fontWeight:700,opacity:0,transition:'opacity .15s',letterSpacing:'.04em',textTransform:'uppercase'}}>Edit</span>}
                  </div>
                ))}
              </div>

              {/* ── DOCTOR SUMMARY — auto generated ── */}
              <DoctorSummaryCard data={summaryData} loading={summaryLoading}/>

              <div style={{background:'#FFFBEB',border:'1.5px solid #FDE68A',borderRadius:'12px',padding:'12px 16px',marginBottom:'20px'}}>
                <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'#92400E',marginBottom:'4px'}}>Before your visit</p>
                <p style={{fontSize:'13px',color:'#78350F',lineHeight:1.85}}>Arrive <strong>15 min early</strong> · Carry your <strong>Appointment ID</strong> to show at reception · If you have any <strong>previous reports, prescriptions or test results</strong>, please bring them along — it helps your doctor</p>
              </div>

              {error&&<p style={{fontSize:'13px',color:'var(--error)',marginBottom:'12px'}}>{error}</p>}
              {loading&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',marginBottom:'12px',color:'var(--green)',fontSize:'13px'}}><Spin color="var(--green)"/>{loadMsg}</div>}

              <div style={{display:'flex',gap:'10px'}}>
                <button className="btn-ghost" onClick={()=>goStep('results')}>← Back</button>
                <button className="btn-dark" style={{flex:1,background:'linear-gradient(135deg,var(--green),var(--forest))'}} onClick={book} disabled={loading}>
                  {loading?'Confirming…':'Confirm Appointment'}
                </button>
              </div>
            </div>
          )}

          {/* ═══ DONE ═══════════════════════════════════════════════ */}
          {step==='done'&&apptInfo&&(
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',animation:'ticketIn .6s cubic-bezier(0.22,1,0.36,1)'}}>
              <div style={{textAlign:'center',marginBottom:'28px'}}>
                <div style={{width:'54px',height:'54px',borderRadius:'50%',background:'linear-gradient(135deg,var(--green),var(--green2))',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 8px 24px rgba(45,106,79,.3)'}}>
                  <span style={{color:'#fff',fontSize:'22px',fontWeight:700}}>✓</span>
                </div>
                <h2 style={{fontFamily:'var(--serif)',fontSize:'clamp(28px,4vw,44px)',color:'var(--forest)',fontWeight:400,marginBottom:'6px',fontStyle:'italic'}}>You&apos;re all set.</h2>
                <p style={{color:'var(--muted)',fontSize:'14px'}}>Your appointment is confirmed. Save the details below.</p>
              </div>

              {/* ticket */}
              <div style={{width:'100%',maxWidth:'460px',borderRadius:'18px',overflow:'visible',boxShadow:'0 20px 60px rgba(26,46,26,.14)',border:'1px solid var(--border)'}}>
                <div style={{background:'var(--forest)',padding:'26px 28px 22px',borderRadius:'18px 18px 0 0'}}>
                  <p style={{fontSize:'10px',color:'rgba(255,255,255,.4)',letterSpacing:'.15em',textTransform:'uppercase',marginBottom:'7px'}}>Appointment Confirmed</p>
                  <p style={{fontFamily:'var(--serif)',fontSize:'44px',color:'#fff',letterSpacing:'.02em',lineHeight:1}}>#{pad6(apptInfo.id)}</p>
                  <p style={{fontSize:'13px',color:'rgba(255,255,255,.45)',marginTop:'5px'}}>{fmtDate(apptInfo.appointment_datetime)}</p>
                </div>
                {/* perforated line */}
                <div style={{position:'relative',borderTop:'2px dashed var(--border)',background:'var(--surface)'}}>
                  <div style={{position:'absolute',top:'-11px',left:'-11px',width:'20px',height:'20px',borderRadius:'50%',background:'var(--bg)',border:'1px solid var(--border)'}}/>
                  <div style={{position:'absolute',top:'-11px',right:'-11px',width:'20px',height:'20px',borderRadius:'50%',background:'var(--bg)',border:'1px solid var(--border)'}}/>
                </div>
                {/* body */}
                <div style={{background:'var(--surface)',padding:'20px 28px'}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px 20px',marginBottom:'16px'}}>
                    {[
                      {label:'Doctor',     val:selDoctor?.name??'—'},
                      {label:'Specialist', val:specialist},
                      {label:'Date',       val:fmtDate(apptInfo.appointment_datetime).split(',').slice(0,2).join(',')},
                      {label:'Time',       val:fmtTime(apptInfo.appointment_datetime)},
                    ].map(item=>(
                      <div key={item.label}>
                        <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--green)',marginBottom:'3px'}}>{item.label}</p>
                        <p style={{fontSize:'14px',fontWeight:700,color:'var(--forest)',fontFamily:'var(--serif)'}}>{item.val}</p>
                      </div>
                    ))}
                  </div>
                  <div style={{paddingTop:'14px',borderTop:'1px solid var(--border)'}}>
                    <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--green)',marginBottom:'3px'}}>Location</p>
                    <p style={{fontSize:'14px',fontWeight:700,color:'var(--forest)',fontFamily:'var(--serif)'}}>SmartHospital Main Campus, OPD Block</p>
                  </div>
                  {/* compact doctor summary in ticket */}
                  {summaryData&&(
                    <div style={{marginTop:'16px',paddingTop:'16px',borderTop:'1px solid var(--border)'}}>
                      <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'10px'}}>
                        <span style={{fontSize:'12px'}}>🩺</span>
                        <p style={{fontSize:'10px',fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--green)'}}>Patient Problems</p>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                        <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
                          <span style={{flexShrink:0,width:'28px',height:'20px',borderRadius:'5px',background:'var(--forest)',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'1px'}}>
                            <span style={{fontSize:'8px',fontWeight:700,color:'#fff'}}>CC</span>
                          </span>
                          <p style={{fontSize:'12px',color:'var(--forest)',lineHeight:1.5}}>{summaryData.chief}</p>
                        </div>
                        {summaryData.symptoms.slice(0,2).map((s,i)=>(
                          <div key={i} style={{display:'flex',gap:'8px',alignItems:'flex-start',paddingLeft:'36px'}}>
                            <span style={{marginTop:'5px',width:'4px',height:'4px',borderRadius:'50%',background:'var(--green)',flexShrink:0,display:'inline-block'}}/>
                            <p style={{fontSize:'12px',color:'var(--forest)',lineHeight:1.5}}>{s}</p>
                          </div>
                        ))}
                        {summaryData.duration&&(
                          <div style={{display:'flex',gap:'8px',alignItems:'flex-start'}}>
                            <span style={{flexShrink:0,width:'28px',height:'20px',borderRadius:'5px',background:'#40916C',display:'flex',alignItems:'center',justifyContent:'center',marginTop:'1px'}}>
                              <span style={{fontSize:'7px',fontWeight:700,color:'#fff'}}>Dur</span>
                            </span>
                            <p style={{fontSize:'12px',color:'var(--forest)',lineHeight:1.5,textTransform:'capitalize'}}>{summaryData.duration}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{background:'var(--green)',padding:'13px 28px',borderRadius:'0 0 18px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <p style={{fontSize:'12px',color:'#fff',fontWeight:500}}>Show this at reception</p>
                  <div style={{width:'26px',height:'26px',background:'rgba(255,255,255,.15)',borderRadius:'4px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:'7px',fontWeight:700,color:'#fff'}}>QR</span>
                  </div>
                </div>
              </div>

              <div style={{display:'flex',gap:'10px',marginTop:'16px',width:'100%',maxWidth:'460px'}}>
                <button className="btn-sm" onClick={copyTicket}>{copied?'✓ Copied':'⎘ Copy'}</button>
                <button className="btn-sm" onClick={()=>window.print()}>⎙ Print</button>
              </div>
              <button className="btn-dark" style={{marginTop:'10px',width:'100%',maxWidth:'460px'}} onClick={reset}>Book Another Appointment</button>
            </div>
          )}

        </div>
      </main>

      <footer style={{borderTop:'1px solid var(--border)',padding:'16px clamp(16px,4vw,48px)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'var(--surface)'}}>
        <span style={{fontFamily:'var(--serif)',fontSize:'15px',color:'var(--forest)',fontWeight:600}}>Smart<span style={{color:'var(--green)'}}>Hospital</span></span>
        <span style={{fontSize:'12px',color:'var(--muted)'}}>For demonstration purposes only</span>
      </footer>
    </>
  )
}