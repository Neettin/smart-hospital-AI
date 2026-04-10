'use client'
import { useState, useEffect } from 'react'
import {
  Activity, Lock, Eye, EyeOff, Users, Calendar, Clock,
  CheckCircle, XCircle, AlertCircle, Search, RefreshCw,
  TrendingUp, UserCheck, LogOut, Stethoscope, ChevronDown,
  Phone, FileText, BarChart2, X, Edit3, Trash2, Plus,
  Save, PlayCircle
} from 'lucide-react'

/* ── types ── */
interface Patient     { id:number; name:string; age:number; gender:string; contact:string; medical_history:string }
interface Doctor      { id:number; name:string; specialization:string; availability_slots:string; rating:number; experience_years:number }
interface Appointment {
  id:number; patient_id:number; doctor_id:number; reason_for_visit:string
  appointment_datetime:string; status:string; no_show_probability:number
  patient?: Patient; doctor?: Doctor
}
type ModalMode = 'view' | 'edit' | 'delete' | 'add'

const API = 'https://smart-hospital-backend-lhdt.onrender.comm'
const ADMIN_PASSWORD = 'admin@123'
const STATUSES       = ['scheduled','ongoing','completed','cancelled']

const fmtDate = (dt:string) => { try { return new Date(dt).toLocaleDateString('en-IN',{ day:'numeric', month:'short', year:'numeric' }) } catch { return dt } }
const fmtTime = (dt:string) => { try { return new Date(dt).toLocaleTimeString('en-IN',{ hour:'2-digit', minute:'2-digit', hour12:true }) } catch { return '' } }
const pad4    = (n:number)  => n.toString().padStart(4,'0')

const STATUS_STYLE: Record<string,{bg:string;color:string;border:string;icon:React.ReactNode}> = {
  scheduled: { bg:'rgba(29,78,216,.15)',  color:'#60a5fa', border:'rgba(29,78,216,.3)',  icon:<Clock size={12}/>       },
  ongoing:   { bg:'rgba(124,58,237,.15)', color:'#a78bfa', border:'rgba(124,58,237,.3)', icon:<PlayCircle size={12}/>  },
  completed: { bg:'rgba(21,128,61,.15)',  color:'#4ade80', border:'rgba(21,128,61,.3)',  icon:<CheckCircle size={12}/> },
  cancelled: { bg:'rgba(190,18,60,.15)',  color:'#f87171', border:'rgba(190,18,60,.3)',  icon:<XCircle size={12}/>     },
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  scheduled: ['ongoing','completed','cancelled'],
  ongoing:   ['completed','cancelled'],
  completed: [],
  cancelled: [],
}

/* ─── parse summary into structured data ────────────────────────────── */
function parseSummary(raw: string, original: string) {
  const text = original || raw

  const sentences = text
    .replace(/([.!?])/g, '$1|||')
    .split('|||')
    .map((s:string) => s.trim())
    .filter((s:string) => s.length > 6)

  // Skip sentences about family members / third parties
  const thirdPartyPhrases = [
    'my father','my mother','my brother','my sister','my husband',
    'my wife','my son','my daughter','my parents','my family',
    'family history','died','passed away','he had','she had','his ','her '
  ]
  const isAboutPatient = (s:string) =>
    !thirdPartyPhrases.some((p:string) => s.toLowerCase().includes(p))

  const patientSentences = sentences.filter(isAboutPatient)

  const symKeywords = [
    'pain','ache','fever','cough','nausea','vomit','fatigue','weak','tired',
    'dizzy','dizziness','blurry','itch','rash','swell','breath','urinat',
    'thirst','headache','insomnia','anxious','anxiety','sweat','bleed',
    'yellow','pale','burning','tightness','palpitat','stiffness','lump'
  ]
  const isSymptomatic = (s:string) =>
    symKeywords.some((k:string) => s.toLowerCase().includes(k))

  // Chief: first symptomatic patient sentence
  const chief =
    patientSentences.find(isSymptomatic) ||
    patientSentences[0] ||
    sentences[0] ||
    text.slice(0, 100)

  // Symptoms: other symptomatic patient sentences, max 3
  const symptoms = patientSentences
    .filter((s:string) => s !== chief && isSymptomatic(s))
    .slice(0, 3)

  // Duration: time phrase from patient sentences only
  const durPat = /(\d+\s*(days?|weeks?|months?|years?|hours?)[^.]*?(?:ago)?|past\s+[\w\s]+|since\s+[\w\s]+|for (the past|about|over)?\s*\d+\s*(days?|weeks?|months?)|recently|chronic|ongoing|last \w+)/i
  const durSentence = patientSentences.find((s:string) => durPat.test(s))
  const duration = durSentence ? (durSentence.match(durPat) || [])[0] : null

  // History: patient's OWN medical background only
  const ownHistKeywords = [
    'i have had','i was diagnosed','i have diabetes','i have hypertension',
    'i have asthma','i had surgery','i take medication','i am diabetic',
    'i have a history','my blood sugar','my blood pressure','my cholesterol',
    'chronic','i smoke','i drink','menopause','i take'
  ]
  const historyRaw = patientSentences.find((s:string) =>
    ownHistKeywords.some((k:string) => s.toLowerCase().includes(k)) && s !== chief
  )
  const history = historyRaw
    ? historyRaw.length > 100 ? historyRaw.slice(0, 97) + '…' : historyRaw
    : undefined

  return { chief, symptoms, duration, history }
}

/* ─── Admin Summary Box ─────────────────────────────────────────────── */
function AdminSummaryBox({ text }: { text: string }) {
  const [summary, setSummary] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  const generate = async () => {
    if (!text || text.trim().length < 5) return
    setLoading(true); setError(''); setSummary(''); setDone(false)
    try {
      const res = await fetch(`${API}/generate-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: text }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setSummary(data.summary); setDone(true)
    } catch { setError('Could not generate summary. Check backend is running.') }
    finally  { setLoading(false) }
  }

  // ✅ AUTO-GENERATE when modal opens (text changes = new appointment opened)
  useEffect(() => {
    setSummary(''); setError(''); setDone(false)
    if (text && text.trim().length >= 5) generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const d = summary ? parseSummary(summary, text) : null

  return (
    <div style={{ background:'#0f1117', border:'1px solid #2a2d3a', borderRadius:'12px', overflow:'hidden', marginBottom:'12px' }}>

      {/* ── header ── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', background:'rgba(12,148,136,0.06)', borderBottom:'1px solid #1f2937' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ width:'22px', height:'22px', borderRadius:'6px', background:'linear-gradient(135deg,#0c9488,#059669)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:'11px' }}>🩺</span>
          </div>
          <span style={{ fontSize:'11px', fontWeight:700, color:'#0c9488', textTransform:'uppercase', letterSpacing:'.06em' }}>
            Patient Problem Summary
          </span>
          <span style={{ fontSize:'10px', color:'#4b5563', fontStyle:'italic' }}>· for doctor</span>
        </div>
        {/* regenerate button */}
        <button
          onClick={generate}
          disabled={loading}
          style={{ padding:'4px 12px', borderRadius:'7px', border:'1px solid rgba(12,148,136,.4)', background:'transparent', color:'#0c9488', fontSize:'11px', fontWeight:700, cursor:loading?'not-allowed':'pointer', display:'flex', alignItems:'center', gap:'5px', fontFamily:'Outfit,sans-serif', transition:'all .2s' }}
          onMouseEnter={e=>{ if(!loading)(e.currentTarget as HTMLElement).style.background='rgba(12,148,136,.12)' }}
          onMouseLeave={e=>{ if(!loading)(e.currentTarget as HTMLElement).style.background='transparent' }}
        >
          {loading
            ? <><span style={{ width:'9px', height:'9px', borderRadius:'50%', border:'1.5px solid rgba(12,148,136,.3)', borderTopColor:'#0c9488', display:'inline-block', animation:'spin 0.7s linear infinite' }}/> Generating</>
            : '↻ Regenerate'
          }
        </button>
      </div>

      {/* ── shimmer skeleton while loading ── */}
      {loading && (
        <div style={{ padding:'16px' }}>
          <div style={{ display:'flex', gap:'10px', marginBottom:'14px' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'6px', background:'#1a2535', flexShrink:0 }}/>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'7px' }}>
              <div style={{ height:'10px', width:'30%', borderRadius:'4px', background:'linear-gradient(90deg,#1a2535 25%,#222d40 50%,#1a2535 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s infinite' }}/>
              <div style={{ height:'13px', width:'95%', borderRadius:'4px', background:'linear-gradient(90deg,#1a2535 25%,#222d40 50%,#1a2535 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s .08s infinite' }}/>
            </div>
          </div>
          <div style={{ display:'flex', gap:'10px', marginBottom:'14px' }}>
            <div style={{ width:'22px', height:'22px', borderRadius:'6px', background:'#1a2535', flexShrink:0 }}/>
            <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'7px' }}>
              <div style={{ height:'10px', width:'28%', borderRadius:'4px', background:'linear-gradient(90deg,#1a2535 25%,#222d40 50%,#1a2535 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s .04s infinite' }}/>
              <div style={{ height:'12px', width:'80%', borderRadius:'4px', background:'linear-gradient(90deg,#1a2535 25%,#222d40 50%,#1a2535 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s .12s infinite' }}/>
              <div style={{ height:'12px', width:'65%', borderRadius:'4px', background:'linear-gradient(90deg,#1a2535 25%,#222d40 50%,#1a2535 75%)', backgroundSize:'200% 100%', animation:'shimmer 1.4s .18s infinite' }}/>
            </div>
          </div>
          <p style={{ fontSize:'11px', color:'#374151', display:'flex', alignItems:'center', gap:'6px', marginTop:'4px' }}>
            <span style={{ width:'8px', height:'8px', borderRadius:'50%', border:'1.5px solid rgba(12,148,136,.3)', borderTopColor:'#0c9488', display:'inline-block', animation:'spin .7s linear infinite' }}/>
            Analysing patient description with AI…
          </p>
        </div>
      )}

      {/* ── structured summary ── */}
      {d && !loading && (
        <div style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:'12px' }}>

          {/* CC */}
          <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
            <span style={{ flexShrink:0, width:'24px', height:'24px', borderRadius:'7px', background:'#0c9488', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'1px' }}>
              <span style={{ fontSize:'9px', color:'#fff', fontWeight:700, letterSpacing:'.03em' }}>CC</span>
            </span>
            <div style={{ flex:1 }}>
              <p style={{ fontSize:'9px', fontWeight:700, color:'#0c9488', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'3px' }}>Chief Complaint</p>
              <p style={{ fontSize:'13px', color:'#f3f4f6', lineHeight:1.65 }}>{d.chief}</p>
            </div>
          </div>

          {/* Symptoms */}
          {d.symptoms.length > 0 && (
            <>
              <div style={{ height:'1px', background:'#1f2937' }}/>
              <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                <span style={{ flexShrink:0, width:'24px', height:'24px', borderRadius:'7px', background:'#059669', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'1px' }}>
                  <span style={{ fontSize:'9px', color:'#fff', fontWeight:700, letterSpacing:'.03em' }}>Sx</span>
                </span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:'9px', fontWeight:700, color:'#0c9488', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'6px' }}>Presenting Symptoms</p>
                  <div style={{ display:'flex', flexDirection:'column', gap:'5px' }}>
                    {d.symptoms.map((s:string, i:number) => (
                      <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                        <span style={{ marginTop:'6px', width:'4px', height:'4px', borderRadius:'50%', background:'#0c9488', flexShrink:0, display:'inline-block' }}/>
                        <p style={{ fontSize:'13px', color:'#d1fae5', lineHeight:1.55 }}>{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Duration */}
          {d.duration && (
            <>
              <div style={{ height:'1px', background:'#1f2937' }}/>
              <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                <span style={{ flexShrink:0, width:'24px', height:'24px', borderRadius:'7px', background:'#047857', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'1px' }}>
                  <span style={{ fontSize:'8px', color:'#fff', fontWeight:700 }}>Dur</span>
                </span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:'9px', fontWeight:700, color:'#0c9488', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'3px' }}>Duration</p>
                  <p style={{ fontSize:'13px', color:'#e5e7eb', lineHeight:1.55, textTransform:'capitalize' }}>{d.duration}</p>
                </div>
              </div>
            </>
          )}

          {/* History */}
          {d.history && (
            <>
              <div style={{ height:'1px', background:'#1f2937' }}/>
              <div style={{ display:'flex', gap:'10px', alignItems:'flex-start' }}>
                <span style={{ flexShrink:0, width:'24px', height:'24px', borderRadius:'7px', background:'#065f46', display:'flex', alignItems:'center', justifyContent:'center', marginTop:'1px' }}>
                  <span style={{ fontSize:'9px', color:'#fff', fontWeight:700, letterSpacing:'.03em' }}>Hx</span>
                </span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:'9px', fontWeight:700, color:'#0c9488', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'3px' }}>Medical History</p>
                  <p style={{ fontSize:'13px', color:'#e5e7eb', lineHeight:1.55 }}>{d.history}</p>
                </div>
              </div>
            </>
          )}

          {/* footer */}
          <div style={{ display:'flex', alignItems:'center', gap:'6px', paddingTop:'8px', borderTop:'1px solid #1f2937' }}>
            <span style={{ width:'4px', height:'4px', borderRadius:'50%', background:'#0c9488', display:'inline-block' }}/>
            <p style={{ fontSize:'10px', color:'#374151' }}>T5 clinical summarizer · for doctor reference only</p>
          </div>
        </div>
      )}

      {/* error */}
      {error && !loading && (
        <div style={{ padding:'12px 16px', display:'flex', alignItems:'center', gap:'7px' }}>
          <AlertCircle size={13} color="#ef4444"/>
          <p style={{ fontSize:'12px', color:'#ef4444' }}>{error}</p>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════ */
export default function AdminDashboard() {
  /* auth */
  const [authed,    setAuthed]    = useState(false)
  const [password,  setPassword]  = useState('')
  const [showPwd,   setShowPwd]   = useState(false)
  const [loginErr,  setLoginErr]  = useState('')
  const [loginAnim, setLoginAnim] = useState(false)

  /* data */
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients,     setPatients]     = useState<Patient[]>([])
  const [doctors,      setDoctors]      = useState<Doctor[]>([])
  const [loading,      setLoading]      = useState(false)
  const [lastRefresh,  setLastRefresh]  = useState('')
  const [error,        setError]        = useState('')

  /* filters */
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [specFilter,   setSpecFilter]   = useState('all')

  /* modal */
  const [selAppt,     setSelAppt]     = useState<Appointment|null>(null)
  const [modalMode,   setModalMode]   = useState<ModalMode>('view')
  const [crudLoading, setCrudLoading] = useState(false)
  const [crudError,   setCrudError]   = useState('')
  const [crudSuccess, setCrudSuccess] = useState('')

  /* edit form */
  const [editStatus,   setEditStatus]   = useState('')
  const [editDoctor,   setEditDoctor]   = useState('')
  const [editReason,   setEditReason]   = useState('')
  const [editDatetime, setEditDatetime] = useState('')

  /* add form */
  const [addPatient,  setAddPatient]  = useState('')
  const [addDoctor,   setAddDoctor]   = useState('')
  const [addReason,   setAddReason]   = useState('')
  const [addDatetime, setAddDatetime] = useState('')

  /* ── auth ── */
  const login = () => {
    if (password === ADMIN_PASSWORD) {
      setLoginAnim(true)
      setTimeout(() => { setAuthed(true); loadAll() }, 600)
    } else {
      setLoginErr('Incorrect password. Access denied.')
      setTimeout(() => setLoginErr(''), 3000)
    }
  }

  /* ── load data ── */
  const loadAll = async () => {
    setLoading(true); setError('')
    try {
      const [apRes, ptRes, drRes] = await Promise.all([
        fetch(`${API}/appointments/`),
        fetch(`${API}/patients/`),
        fetch(`${API}/doctors/`),
      ])
      const appts: Appointment[] = await apRes.json()
      const pts:   Patient[]     = await ptRes.json()
      const drs:   Doctor[]      = await drRes.json()
      const enriched = appts.map(a => ({
        ...a,
        patient: pts.find(p => p.id === a.patient_id),
        doctor:  drs.find(d => d.id === a.doctor_id),
      }))
      setAppointments(enriched); setPatients(pts); setDoctors(drs)
      setLastRefresh(new Date().toLocaleTimeString('en-IN',{ hour:'2-digit', minute:'2-digit', hour12:true }))
    } catch { setError('Cannot reach backend. Make sure uvicorn is running on :8000.') }
    finally  { setLoading(false) }
  }

  /* ── modal helpers ── */
  const openView = (a: Appointment) => {
    setSelAppt(a); setModalMode('view'); setCrudError(''); setCrudSuccess('')
  }
  const openEdit = (a: Appointment) => {
    setSelAppt(a); setModalMode('edit'); setCrudError(''); setCrudSuccess('')
    setEditStatus(a.status); setEditDoctor(String(a.doctor_id))
    setEditReason(a.reason_for_visit); setEditDatetime(a.appointment_datetime.slice(0,16))
  }
  const openDelete = (a: Appointment) => {
    setSelAppt(a); setModalMode('delete'); setCrudError(''); setCrudSuccess('')
  }
  const openAdd = () => {
    setSelAppt(null); setModalMode('add'); setCrudError(''); setCrudSuccess('')
    setAddPatient(''); setAddDoctor(''); setAddReason('')
    const now = new Date(); now.setMinutes(0,0,0)
    setAddDatetime(new Date(now.getTime() + 3600000).toISOString().slice(0,16))
  }
  const closeModal = () => { setSelAppt(null); setCrudError(''); setCrudSuccess('') }

  /* ── CRUD ── */
  const quickStatus = async (appt: Appointment, newStatus: string) => {
    try {
      await fetch(`${API}/appointments/${appt.id}`, {
        method:'PATCH', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      setAppointments(prev => prev.map(a => a.id===appt.id ? { ...a, status:newStatus } : a))
    } catch { setError('Failed to update status.') }
  }

  const saveEdit = async () => {
    if (!selAppt) return
    setCrudLoading(true); setCrudError('')
    try {
      const res = await fetch(`${API}/appointments/${selAppt.id}`, {
        method:'PATCH', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ status:editStatus, doctor_id:parseInt(editDoctor), reason_for_visit:editReason, appointment_datetime:editDatetime+':00' }),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      const doc = doctors.find(d => d.id===parseInt(editDoctor))
      setAppointments(prev => prev.map(a => a.id===selAppt.id ? { ...updated, patient:a.patient, doctor:doc } : a))
      setCrudSuccess('Appointment updated successfully!')
      setTimeout(() => closeModal(), 1200)
    } catch { setCrudError('Update failed. Check backend is running.') }
    finally  { setCrudLoading(false) }
  }

  const deleteAppt = async () => {
    if (!selAppt) return
    setCrudLoading(true); setCrudError('')
    try {
      const res = await fetch(`${API}/appointments/${selAppt.id}`, { method:'DELETE' })
      if (!res.ok) throw new Error()
      setAppointments(prev => prev.filter(a => a.id!==selAppt.id))
      setCrudSuccess('Appointment deleted.')
      setTimeout(() => closeModal(), 1000)
    } catch { setCrudError('Delete failed. Check backend is running.') }
    finally  { setCrudLoading(false) }
  }

  const createAppt = async () => {
    if (!addPatient || !addDoctor || !addReason || !addDatetime) return setCrudError('All fields are required.')
    setCrudLoading(true); setCrudError('')
    try {
      const res = await fetch(`${API}/appointments/`, {
        method:'POST', headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({ patient_id:parseInt(addPatient), doctor_id:parseInt(addDoctor), reason_for_visit:addReason, appointment_datetime:addDatetime+':00' }),
      })
      if (!res.ok) throw new Error()
      setCrudSuccess('Appointment created!')
      setTimeout(() => { closeModal(); loadAll() }, 1000)
    } catch { setCrudError('Create failed. Check patient/doctor IDs exist.') }
    finally  { setCrudLoading(false) }
  }

  /* ── derived ── */
  const total     = appointments.length
  const scheduled = appointments.filter(a=>a.status==='scheduled').length
  const ongoing   = appointments.filter(a=>a.status==='ongoing').length
  const completed = appointments.filter(a=>a.status==='completed').length
  const cancelled = appointments.filter(a=>a.status==='cancelled').length
  const highRisk  = appointments.filter(a=>a.no_show_probability>0.5).length

  /* ✅ FIX: Array.from instead of spread on Set — avoids downlevelIteration error */
  const specializations = Array.from(new Set(doctors.map(d => d.specialization))).sort()

  const filtered = appointments.filter(a => {
    const q = search.toLowerCase()
    const matchSearch = !q || (a.patient?.name ?? '').toLowerCase().includes(q) || (a.doctor?.name ?? '').toLowerCase().includes(q) || (a.doctor?.specialization ?? '').toLowerCase().includes(q) || pad4(a.id).includes(q)
    const matchStatus = statusFilter==='all' || a.status===statusFilter
    const matchSpec   = specFilter==='all'   || a.doctor?.specialization===specFilter
    return matchSearch && matchStatus && matchSpec
  }).sort((a,b) => new Date(b.appointment_datetime).getTime() - new Date(a.appointment_datetime).getTime())

  /* ── sub-components ── */
  const StatusBadge = ({ status }: { status:string }) => {
    const s = STATUS_STYLE[status] ?? STATUS_STYLE.scheduled
    return (
      <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 10px', borderRadius:'999px', fontSize:'11px', fontWeight:700, background:s.bg, color:s.color, border:`1px solid ${s.border}`, textTransform:'capitalize' }}>
        {s.icon} {status}
      </span>
    )
  }

  /* ═══════════════════════════════ LOGIN ═══════════════════════════════ */
  if (!authed) return (
    <div style={{ minHeight:'100vh', background:'#0f1117', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', inset:0, backgroundImage:'linear-gradient(rgba(12,148,136,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(12,148,136,.07) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', top:'35%', left:'50%', transform:'translate(-50%,-50%)', width:'500px', height:'500px', background:'radial-gradient(circle,rgba(12,148,136,.15) 0%,transparent 70%)', pointerEvents:'none' }}/>

      <div style={{ position:'relative', width:'100%', maxWidth:'420px', padding:'0 20px' }}>
        <div style={{ textAlign:'center', marginBottom:'36px' }}>
          <div style={{ width:'64px', height:'64px', borderRadius:'18px', background:'linear-gradient(135deg,#0c9488,#059669)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 8px 32px rgba(12,148,136,.4)' }}>
            <Activity size={30} color="#fff" strokeWidth={2.5}/>
          </div>
          <h1 style={{ fontFamily:'Fraunces,serif', fontWeight:700, fontSize:'28px', color:'#fff', marginBottom:'6px' }}>SmartHospital</h1>
          <p style={{ fontSize:'14px', color:'#6b7280' }}>Admin Dashboard · Restricted Access</p>
        </div>

        <div style={{ background:'#1a1d27', border:'1px solid #2a2d3a', borderRadius:'20px', padding:'36px', boxShadow:'0 24px 64px rgba(0,0,0,.5)' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'26px' }}>
            <div style={{ width:'36px', height:'36px', borderRadius:'10px', background:'rgba(12,148,136,.15)', border:'1px solid rgba(12,148,136,.3)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Lock size={16} color="#0c9488"/>
            </div>
            <div>
              <p style={{ fontSize:'15px', fontWeight:700, color:'#f9fafb' }}>Secure Login</p>
              <p style={{ fontSize:'12px', color:'#6b7280' }}>Hospital staff only</p>
            </div>
          </div>

          <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#9ca3af', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.06em' }}>Admin Password</label>
          <div style={{ position:'relative', marginBottom:'18px' }}>
            <input type={showPwd?'text':'password'} value={password}
              onChange={e=>setPassword(e.target.value)}
              onKeyDown={e=>e.key==='Enter'&&login()}
              placeholder="Enter admin password"
              style={{ width:'100%', padding:'13px 46px 13px 16px', borderRadius:'12px', border:`1.5px solid ${loginErr?'#ef4444':'#2a2d3a'}`, background:'#0f1117', color:'#f9fafb', fontSize:'14px', fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box' }}/>
            <button onClick={()=>setShowPwd(s=>!s)} style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#6b7280', padding:0 }}>
              {showPwd?<EyeOff size={16}/>:<Eye size={16}/>}
            </button>
          </div>

          {loginErr && (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 14px', borderRadius:'10px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#f87171', fontSize:'13px', marginBottom:'14px' }}>
              <AlertCircle size={14}/> {loginErr}
            </div>
          )}

          <button onClick={login} style={{ width:'100%', padding:'14px', borderRadius:'12px', background:'linear-gradient(135deg,#0c9488,#059669)', border:'none', color:'#fff', fontWeight:700, fontSize:'15px', cursor:'pointer', fontFamily:'Outfit,sans-serif', boxShadow:'0 4px 16px rgba(12,148,136,.3)', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
            {loginAnim?<><CheckCircle size={16}/> Access Granted</>:<><Lock size={16}/> Enter Dashboard</>}
          </button>
          <p style={{ textAlign:'center', fontSize:'12px', color:'#374151', marginTop:'18px' }}>🔒 Not linked anywhere in the main app</p>
        </div>
      </div>
    </div>
  )

  /* ═══════════════════════════════ DASHBOARD ═══════════════════════════ */
  return (
    <div style={{ minHeight:'100vh', background:'#0f1117', fontFamily:'Outfit,sans-serif', color:'#f9fafb' }}>
      <style>{`
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes shimmer { to{background-position:-200% 0} }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ background:'#1a1d27', borderBottom:'1px solid #2a2d3a', padding:'0 28px', height:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ width:'32px', height:'32px', borderRadius:'9px', background:'linear-gradient(135deg,#0c9488,#059669)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Activity size={15} color="#fff" strokeWidth={2.5}/>
          </div>
          <span style={{ fontFamily:'Fraunces,serif', fontWeight:700, fontSize:'17px', color:'#f9fafb' }}>
            Smart<span style={{ color:'#0c9488' }}>Hospital</span>
            <span style={{ fontSize:'11px', fontWeight:500, color:'#4b5563', marginLeft:'8px', fontFamily:'Outfit,sans-serif' }}>Admin</span>
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          {lastRefresh && <span style={{ fontSize:'12px', color:'#4b5563' }}>Refreshed: {lastRefresh}</span>}
          <button onClick={openAdd} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', borderRadius:'9px', background:'rgba(12,148,136,.2)', border:'1px solid rgba(12,148,136,.4)', color:'#0c9488', fontWeight:700, fontSize:'13px', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>
            <Plus size={13}/> New Appointment
          </button>
          <button onClick={loadAll} disabled={loading} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', borderRadius:'9px', background:'rgba(255,255,255,.05)', border:'1px solid #2a2d3a', color:'#9ca3af', fontWeight:600, fontSize:'13px', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>
            <RefreshCw size={13} style={{ animation:loading?'spin 1s linear infinite':undefined }}/> Refresh
          </button>
          <button onClick={()=>setAuthed(false)} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'7px 14px', borderRadius:'9px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.2)', color:'#f87171', fontWeight:600, fontSize:'13px', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>
            <LogOut size={13}/> Logout
          </button>
        </div>
      </nav>

      <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'24px' }}>

        {error && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'12px 16px', borderRadius:'12px', marginBottom:'20px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#f87171', fontSize:'14px' }}>
            <AlertCircle size={15}/> {error}
            <button onClick={()=>setError('')} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#f87171' }}><X size={14}/></button>
          </div>
        )}

        {/* ── STAT CARDS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(6,1fr)', gap:'12px', marginBottom:'20px' }}>
          {[
            { label:'Total',     val:total,     bg:'rgba(99,102,241,.15)',  border:'rgba(99,102,241,.3)',  color:'#818cf8', icon:<Calendar size={16}/> },
            { label:'Scheduled', val:scheduled, bg:'rgba(29,78,216,.15)',   border:'rgba(29,78,216,.3)',   color:'#60a5fa', icon:<Clock size={16}/> },
            { label:'Ongoing',   val:ongoing,   bg:'rgba(124,58,237,.15)',  border:'rgba(124,58,237,.3)',  color:'#a78bfa', icon:<PlayCircle size={16}/> },
            { label:'Completed', val:completed, bg:'rgba(21,128,61,.15)',   border:'rgba(21,128,61,.3)',   color:'#4ade80', icon:<CheckCircle size={16}/> },
            { label:'Cancelled', val:cancelled, bg:'rgba(190,18,60,.15)',   border:'rgba(190,18,60,.3)',   color:'#f87171', icon:<XCircle size={16}/> },
            { label:'High Risk', val:highRisk,  bg:'rgba(180,83,9,.15)',    border:'rgba(180,83,9,.3)',    color:'#fb923c', icon:<AlertCircle size={16}/> },
          ].map(s => (
            <div key={s.label}
              onClick={()=>setStatusFilter(s.label.toLowerCase()==='total'?'all':s.label.toLowerCase()==='high risk'?statusFilter:s.label.toLowerCase())}
              style={{ background:s.bg, border:`1px solid ${s.border}`, borderRadius:'13px', padding:'16px 14px', cursor:'pointer', transition:'transform .15s' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}}
              onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.transform='translateY(0)'}}
            >
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                <span style={{ fontSize:'10px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'.06em' }}>{s.label}</span>
                <span style={{ color:s.color }}>{s.icon}</span>
              </div>
              <p style={{ fontFamily:'Fraunces,serif', fontWeight:700, fontSize:'28px', color:s.color, lineHeight:1 }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* ── QUICK STATS ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'20px' }}>
          {[
            { icon:<Users size={14}/>,       label:'Total Patients',  val:patients.length,  sub:'Registered in system' },
            { icon:<Stethoscope size={14}/>, label:'Total Doctors',   val:doctors.length,   sub:`Across ${specializations.length} specializations` },
            { icon:<BarChart2 size={14}/>,   label:'Completion Rate', val:`${total?Math.round((completed/total)*100):0}%`, sub:`${completed} of ${total} completed` },
          ].map(s => (
            <div key={s.label} style={{ background:'#1a1d27', border:'1px solid #2a2d3a', borderRadius:'13px', padding:'16px 18px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'10px' }}>
                <span style={{ color:'#0c9488' }}>{s.icon}</span>
                <span style={{ fontSize:'12px', fontWeight:600, color:'#6b7280' }}>{s.label}</span>
              </div>
              <p style={{ fontFamily:'Fraunces,serif', fontWeight:700, fontSize:'26px', color:'#f9fafb', marginBottom:'4px' }}>{s.val}</p>
              <p style={{ fontSize:'12px', color:'#374151' }}>{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── FILTERS ── */}
        <div style={{ background:'#1a1d27', border:'1px solid #2a2d3a', borderRadius:'13px', padding:'14px 18px', marginBottom:'14px', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <div style={{ flex:1, minWidth:'200px', position:'relative' }}>
            <Search size={13} color="#4b5563" style={{ position:'absolute', left:'11px', top:'50%', transform:'translateY(-50%)' }}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient, doctor, specialization, ID…"
              style={{ width:'100%', padding:'9px 12px 9px 32px', borderRadius:'9px', border:'1px solid #2a2d3a', background:'#0f1117', color:'#f9fafb', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box' }}/>
          </div>
          <div style={{ position:'relative' }}>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{ padding:'9px 30px 9px 12px', borderRadius:'9px', border:'1px solid #2a2d3a', background:'#0f1117', color:'#f9fafb', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', cursor:'pointer', appearance:'none' }}>
              <option value="all">All Status</option>
              {STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
            <ChevronDown size={12} color="#4b5563" style={{ position:'absolute', right:'9px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
          </div>
          <div style={{ position:'relative' }}>
            <select value={specFilter} onChange={e=>setSpecFilter(e.target.value)} style={{ padding:'9px 30px 9px 12px', borderRadius:'9px', border:'1px solid #2a2d3a', background:'#0f1117', color:'#f9fafb', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', cursor:'pointer', appearance:'none', maxWidth:'190px' }}>
              <option value="all">All Specializations</option>
              {specializations.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown size={12} color="#4b5563" style={{ position:'absolute', right:'9px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
          </div>
          <span style={{ fontSize:'12px', color:'#374151', marginLeft:'auto' }}>{filtered.length} appointment{filtered.length!==1?'s':''}</span>
        </div>

        {/* ── TABLE ── */}
        <div style={{ background:'#1a1d27', border:'1px solid #2a2d3a', borderRadius:'13px', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'70px 1fr 1fr 150px 160px 110px 90px 120px', padding:'11px 18px', borderBottom:'1px solid #2a2d3a', background:'#141720' }}>
            {['ID','Patient','Doctor','Specialization','Date & Time','Status','Risk','Actions'].map(h=>(
              <span key={h} style={{ fontSize:'10px', fontWeight:700, color:'#374151', textTransform:'uppercase', letterSpacing:'.06em' }}>{h}</span>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign:'center', padding:'48px', color:'#4b5563' }}>
              <RefreshCw size={28} style={{ margin:'0 auto 12px', animation:'spin 1s linear infinite', display:'block' }}/>
              <p>Loading…</p>
            </div>
          ) : filtered.length===0 ? (
            <div style={{ textAlign:'center', padding:'48px', color:'#4b5563' }}>
              <Calendar size={34} style={{ margin:'0 auto 12px', opacity:.3, display:'block' }}/>
              <p style={{ fontWeight:600 }}>No appointments found</p>
              <p style={{ fontSize:'13px', marginTop:'4px' }}>Try adjusting filters or add a new appointment</p>
            </div>
          ) : filtered.map((appt, idx) => {
            const risk = appt.no_show_probability
            const riskColor = risk>0.7?'#f87171':risk>0.4?'#fb923c':'#4ade80'
            const transitions = STATUS_TRANSITIONS[appt.status] ?? []
            return (
              <div key={appt.id} style={{ display:'grid', gridTemplateColumns:'70px 1fr 1fr 150px 160px 110px 90px 120px', padding:'13px 18px', borderBottom:idx<filtered.length-1?'1px solid #1f2230':'none', transition:'background .15s', alignItems:'center' }}
                onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#1f2230'}
                onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}
              >
                <span style={{ fontSize:'13px', fontWeight:700, color:'#0c9488', fontFamily:'Fraunces,serif', cursor:'pointer' }} onClick={()=>openView(appt)}>#{pad4(appt.id)}</span>
                <div onClick={()=>openView(appt)} style={{ cursor:'pointer' }}>
                  <p style={{ fontSize:'13px', fontWeight:600, color:'#f9fafb', marginBottom:'2px' }}>{appt.patient?.name ?? `#${appt.patient_id}`}</p>
                  <p style={{ fontSize:'11px', color:'#4b5563' }}>{appt.patient?.age}y · {appt.patient?.gender}</p>
                </div>
                <div onClick={()=>openView(appt)} style={{ cursor:'pointer' }}>
                  <p style={{ fontSize:'13px', fontWeight:600, color:'#f9fafb', marginBottom:'2px' }}>{appt.doctor?.name ?? `#${appt.doctor_id}`}</p>
                  <p style={{ fontSize:'11px', color:'#4b5563' }}>{appt.doctor?.experience_years}yr exp</p>
                </div>
                <span style={{ fontSize:'12px', color:'#9ca3af' }}>{appt.doctor?.specialization ?? '—'}</span>
                <div>
                  <p style={{ fontSize:'12px', fontWeight:600, color:'#f9fafb' }}>{fmtDate(appt.appointment_datetime)}</p>
                  <p style={{ fontSize:'11px', color:'#4b5563' }}>{fmtTime(appt.appointment_datetime)}</p>
                </div>
                <div style={{ position:'relative' }}>
                  {transitions.length > 0 ? (
                    <div style={{ position:'relative' }}>
                      <select value={appt.status} onChange={e=>quickStatus(appt, e.target.value)}
                        style={{ padding:'4px 22px 4px 8px', borderRadius:'999px', fontSize:'11px', fontWeight:700, background:(STATUS_STYLE[appt.status]??STATUS_STYLE.scheduled).bg, color:(STATUS_STYLE[appt.status]??STATUS_STYLE.scheduled).color, border:`1px solid ${(STATUS_STYLE[appt.status]??STATUS_STYLE.scheduled).border}`, outline:'none', cursor:'pointer', appearance:'none', fontFamily:'Outfit,sans-serif', textTransform:'capitalize' }}>
                        <option value={appt.status}>{appt.status}</option>
                        {transitions.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      <ChevronDown size={10} color={(STATUS_STYLE[appt.status]??STATUS_STYLE.scheduled).color} style={{ position:'absolute', right:'6px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                    </div>
                  ) : <StatusBadge status={appt.status}/>}
                </div>
                <span style={{ fontSize:'12px', fontWeight:700, color:riskColor }}>{Math.round(risk*100)}%</span>
                <div style={{ display:'flex', gap:'6px' }}>
                  <button onClick={()=>openEdit(appt)} title="Edit" style={{ width:'28px', height:'28px', borderRadius:'7px', background:'rgba(12,148,136,.15)', border:'1px solid rgba(12,148,136,.3)', color:'#0c9488', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Edit3 size={12}/>
                  </button>
                  <button onClick={()=>openDelete(appt)} title="Delete" style={{ width:'28px', height:'28px', borderRadius:'7px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', color:'#f87171', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Trash2 size={12}/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <p style={{ textAlign:'center', fontSize:'11px', color:'#1f2230', marginTop:'16px' }}>SmartHospital Admin · Restricted · /admin</p>
      </div>

      {/* ════════════════════ MODALS ════════════════════════════════════ */}
      {(selAppt || modalMode==='add') && (
        <div onClick={closeModal} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.75)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', backdropFilter:'blur(4px)' }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:'#1a1d27', border:'1px solid #2a2d3a', borderRadius:'20px', width:'100%', maxWidth:'520px', overflow:'hidden', boxShadow:'0 24px 64px rgba(0,0,0,.7)', maxHeight:'90vh', overflowY:'auto' }}>

            {/* ── VIEW ── */}
            {modalMode==='view' && selAppt && (
              <>
                <div style={{ background:'linear-gradient(135deg,#0c9488,#059669)', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ fontSize:'11px', color:'rgba(255,255,255,.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'3px' }}>Appointment Details</p>
                    <p style={{ fontFamily:'Fraunces,serif', fontWeight:700, fontSize:'22px', color:'#fff' }}>#{pad4(selAppt.id)}</p>
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <button onClick={()=>openEdit(selAppt)} style={{ padding:'7px 14px', borderRadius:'9px', background:'rgba(255,255,255,.15)', border:'none', color:'#fff', fontWeight:600, fontSize:'12px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                      <Edit3 size={12}/> Edit
                    </button>
                    <button onClick={closeModal} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:'9px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><X size={16}/></button>
                  </div>
                </div>
                <div style={{ padding:'24px' }}>
                  {/* date/time/status */}
                  <div style={{ display:'flex', gap:'10px', marginBottom:'18px' }}>
                    {[
                      { label:'Date',   val:fmtDate(selAppt.appointment_datetime) },
                      { label:'Time',   val:fmtTime(selAppt.appointment_datetime) },
                    ].map(item=>(
                      <div key={item.label} style={{ flex:1, background:'#0f1117', border:'1px solid #2a2d3a', borderRadius:'11px', padding:'12px' }}>
                        <p style={{ fontSize:'10px', color:'#4b5563', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'4px' }}>{item.label}</p>
                        <p style={{ fontSize:'13px', fontWeight:600, color:'#f9fafb' }}>{item.val}</p>
                      </div>
                    ))}
                    <div style={{ flex:1, background:'#0f1117', border:'1px solid #2a2d3a', borderRadius:'11px', padding:'12px' }}>
                      <p style={{ fontSize:'10px', color:'#4b5563', fontWeight:600, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:'4px' }}>Status</p>
                      <StatusBadge status={selAppt.status}/>
                    </div>
                  </div>

                  {/* patient */}
                  <div style={{ background:'#0f1117', border:'1px solid #2a2d3a', borderRadius:'12px', padding:'16px', marginBottom:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'10px' }}>
                      <UserCheck size={13} color="#0c9488"/>
                      <span style={{ fontSize:'11px', fontWeight:700, color:'#0c9488', textTransform:'uppercase', letterSpacing:'.05em' }}>Patient</span>
                    </div>
                    <p style={{ fontSize:'15px', fontWeight:700, color:'#f9fafb', marginBottom:'6px' }}>{selAppt.patient?.name}</p>
                    <div style={{ display:'flex', gap:'14px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'12px', color:'#6b7280' }}>Age: {selAppt.patient?.age}y</span>
                      <span style={{ fontSize:'12px', color:'#6b7280' }}>Gender: {selAppt.patient?.gender}</span>
                      <span style={{ fontSize:'12px', color:'#6b7280', display:'flex', alignItems:'center', gap:'4px' }}><Phone size={11}/> {selAppt.patient?.contact}</span>
                    </div>
                  </div>

                  {/* doctor */}
                  <div style={{ background:'#0f1117', border:'1px solid #2a2d3a', borderRadius:'12px', padding:'16px', marginBottom:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'10px' }}>
                      <Stethoscope size={13} color="#0c9488"/>
                      <span style={{ fontSize:'11px', fontWeight:700, color:'#0c9488', textTransform:'uppercase', letterSpacing:'.05em' }}>Doctor</span>
                    </div>
                    <p style={{ fontSize:'15px', fontWeight:700, color:'#f9fafb', marginBottom:'6px' }}>{selAppt.doctor?.name}</p>
                    <div style={{ display:'flex', gap:'14px', flexWrap:'wrap' }}>
                      <span style={{ fontSize:'12px', color:'#6b7280' }}>{selAppt.doctor?.specialization}</span>
                      <span style={{ fontSize:'12px', color:'#6b7280' }}>{selAppt.doctor?.experience_years}yr exp</span>
                    </div>
                  </div>

                  {/* reason */}
                  <div style={{ background:'#0f1117', border:'1px solid #2a2d3a', borderRadius:'12px', padding:'16px', marginBottom:'12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'8px' }}>
                      <FileText size={13} color="#0c9488"/>
                      <span style={{ fontSize:'11px', fontWeight:700, color:'#0c9488', textTransform:'uppercase', letterSpacing:'.05em' }}>Reason for Visit</span>
                    </div>
                    <p style={{ fontSize:'13px', color:'#9ca3af', lineHeight:1.7 }}>{selAppt.reason_for_visit}</p>
                  </div>

                  {/* ✅ AI SUMMARY BOX */}
                  <AdminSummaryBox text={selAppt.reason_for_visit}/>

                  {/* no-show risk */}
                  <div style={{ background:selAppt.no_show_probability>0.5?'rgba(180,83,9,.1)':'rgba(21,128,61,.1)', border:`1px solid ${selAppt.no_show_probability>0.5?'rgba(180,83,9,.3)':'rgba(21,128,61,.3)'}`, borderRadius:'12px', padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <TrendingUp size={14} color={selAppt.no_show_probability>0.5?'#fb923c':'#4ade80'}/>
                      <span style={{ fontSize:'12px', fontWeight:700, color:selAppt.no_show_probability>0.5?'#fb923c':'#4ade80', textTransform:'uppercase', letterSpacing:'.05em' }}>No-Show Risk</span>
                    </div>
                    <span style={{ fontFamily:'Fraunces,serif', fontWeight:700, fontSize:'22px', color:selAppt.no_show_probability>0.5?'#fb923c':'#4ade80' }}>{Math.round(selAppt.no_show_probability*100)}%</span>
                  </div>
                </div>
              </>
            )}

            {/* ── EDIT ── */}
            {modalMode==='edit' && selAppt && (
              <>
                <div style={{ background:'linear-gradient(135deg,#1d4ed8,#1e40af)', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ fontSize:'11px', color:'rgba(255,255,255,.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'3px' }}>Edit Appointment</p>
                    <p style={{ fontFamily:'Fraunces,serif', fontWeight:700, fontSize:'22px', color:'#fff' }}>#{pad4(selAppt.id)}</p>
                  </div>
                  <button onClick={closeModal} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:'9px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><X size={16}/></button>
                </div>
                <div style={{ padding:'24px' }}>
                  <div style={{ marginBottom:'16px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#9ca3af', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.05em' }}>Status</label>
                    <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                      {STATUSES.map(s=>(
                        <button key={s} onClick={()=>setEditStatus(s)} style={{ padding:'8px 16px', borderRadius:'999px', fontSize:'12px', fontWeight:700, cursor:'pointer', fontFamily:'Outfit,sans-serif', textTransform:'capitalize', border:`1.5px solid ${editStatus===s?(STATUS_STYLE[s]??STATUS_STYLE.scheduled).border:'#2a2d3a'}`, background:editStatus===s?(STATUS_STYLE[s]??STATUS_STYLE.scheduled).bg:'transparent', color:editStatus===s?(STATUS_STYLE[s]??STATUS_STYLE.scheduled).color:'#6b7280', transition:'all .15s' }}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ marginBottom:'16px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#9ca3af', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.05em' }}>Doctor</label>
                    <div style={{ position:'relative' }}>
                      <select value={editDoctor} onChange={e=>setEditDoctor(e.target.value)} style={{ width:'100%', padding:'11px 32px 11px 14px', borderRadius:'10px', border:'1px solid #2a2d3a', background:'#0f1117', color:'#f9fafb', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', cursor:'pointer', appearance:'none', boxSizing:'border-box' }}>
                        {doctors.map(d=><option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}
                      </select>
                      <ChevronDown size={13} color="#4b5563" style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                    </div>
                  </div>
                  <div style={{ marginBottom:'16px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#9ca3af', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.05em' }}>Date &amp; Time</label>
                    <input type="datetime-local" value={editDatetime} onChange={e=>setEditDatetime(e.target.value)} style={{ width:'100%', padding:'11px 14px', borderRadius:'10px', border:'1px solid #2a2d3a', background:'#0f1117', color:'#f9fafb', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div style={{ marginBottom:'20px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#9ca3af', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.05em' }}>Reason for Visit</label>
                    <textarea value={editReason} onChange={e=>setEditReason(e.target.value)} rows={3} style={{ width:'100%', padding:'11px 14px', borderRadius:'10px', border:'1px solid #2a2d3a', background:'#0f1117', color:'#f9fafb', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }}/>
                  </div>
                  {crudError   && <div style={{ padding:'10px 14px', borderRadius:'10px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#f87171', fontSize:'13px', marginBottom:'14px' }}>{crudError}</div>}
                  {crudSuccess && <div style={{ padding:'10px 14px', borderRadius:'10px', background:'rgba(21,128,61,.1)', border:'1px solid rgba(21,128,61,.3)', color:'#4ade80', fontSize:'13px', marginBottom:'14px' }}>{crudSuccess}</div>}
                  <div style={{ display:'flex', gap:'10px' }}>
                    <button onClick={closeModal} style={{ flex:1, padding:'12px', borderRadius:'11px', background:'transparent', border:'1px solid #2a2d3a', color:'#9ca3af', fontWeight:600, fontSize:'14px', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>Cancel</button>
                    <button onClick={saveEdit} disabled={crudLoading} style={{ flex:2, padding:'12px', borderRadius:'11px', background:'linear-gradient(135deg,#1d4ed8,#1e40af)', border:'none', color:'#fff', fontWeight:700, fontSize:'14px', cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                      {crudLoading?<><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Saving…</>:<><Save size={14}/> Save Changes</>}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── DELETE ── */}
            {modalMode==='delete' && selAppt && (
              <>
                <div style={{ background:'linear-gradient(135deg,#be123c,#9f1239)', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ fontSize:'11px', color:'rgba(255,255,255,.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'3px' }}>Delete Appointment</p>
                    <p style={{ fontFamily:'Fraunces,serif', fontWeight:700, fontSize:'22px', color:'#fff' }}>#{pad4(selAppt.id)}</p>
                  </div>
                  <button onClick={closeModal} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:'9px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><X size={16}/></button>
                </div>
                <div style={{ padding:'24px' }}>
                  <div style={{ textAlign:'center', marginBottom:'24px' }}>
                    <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:'rgba(239,68,68,.1)', border:'2px solid rgba(239,68,68,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                      <Trash2 size={26} color="#f87171"/>
                    </div>
                    <p style={{ fontSize:'16px', fontWeight:700, color:'#f9fafb', marginBottom:'8px' }}>Are you sure?</p>
                    <p style={{ fontSize:'13px', color:'#6b7280', lineHeight:1.6 }}>
                      Deleting appointment <strong style={{ color:'#f9fafb' }}>#{pad4(selAppt.id)}</strong> for <strong style={{ color:'#f9fafb' }}>{selAppt.patient?.name}</strong>.<br/>This cannot be undone.
                    </p>
                  </div>
                  {crudError   && <div style={{ padding:'10px 14px', borderRadius:'10px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#f87171', fontSize:'13px', marginBottom:'14px' }}>{crudError}</div>}
                  {crudSuccess && <div style={{ padding:'10px 14px', borderRadius:'10px', background:'rgba(21,128,61,.1)', border:'1px solid rgba(21,128,61,.3)', color:'#4ade80', fontSize:'13px', marginBottom:'14px' }}>{crudSuccess}</div>}
                  <div style={{ display:'flex', gap:'10px' }}>
                    <button onClick={closeModal} style={{ flex:1, padding:'12px', borderRadius:'11px', background:'transparent', border:'1px solid #2a2d3a', color:'#9ca3af', fontWeight:600, fontSize:'14px', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>Cancel</button>
                    <button onClick={deleteAppt} disabled={crudLoading} style={{ flex:1, padding:'12px', borderRadius:'11px', background:'linear-gradient(135deg,#be123c,#9f1239)', border:'none', color:'#fff', fontWeight:700, fontSize:'14px', cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                      {crudLoading?<><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Deleting…</>:<><Trash2 size={14}/> Yes, Delete</>}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* ── ADD ── */}
            {modalMode==='add' && (
              <>
                <div style={{ background:'linear-gradient(135deg,#059669,#047857)', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                  <div>
                    <p style={{ fontSize:'11px', color:'rgba(255,255,255,.65)', fontWeight:600, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'3px' }}>New Appointment</p>
                    <p style={{ fontFamily:'Fraunces,serif', fontWeight:700, fontSize:'22px', color:'#fff' }}>Create Manually</p>
                  </div>
                  <button onClick={closeModal} style={{ background:'rgba(255,255,255,.15)', border:'none', borderRadius:'9px', width:'32px', height:'32px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#fff' }}><X size={16}/></button>
                </div>
                <div style={{ padding:'24px' }}>
                  <div style={{ marginBottom:'14px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#9ca3af', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.05em' }}>Patient</label>
                    <div style={{ position:'relative' }}>
                      <select value={addPatient} onChange={e=>setAddPatient(e.target.value)} style={{ width:'100%', padding:'11px 32px 11px 14px', borderRadius:'10px', border:'1px solid #2a2d3a', background:'#0f1117', color:addPatient?'#f9fafb':'#4b5563', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', cursor:'pointer', appearance:'none', boxSizing:'border-box' }}>
                        <option value="">Select patient…</option>
                        {patients.map(p=><option key={p.id} value={p.id}>{p.name} (ID: {p.id}) — {p.age}y, {p.gender}</option>)}
                      </select>
                      <ChevronDown size={13} color="#4b5563" style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                    </div>
                  </div>
                  <div style={{ marginBottom:'14px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#9ca3af', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.05em' }}>Doctor</label>
                    <div style={{ position:'relative' }}>
                      <select value={addDoctor} onChange={e=>setAddDoctor(e.target.value)} style={{ width:'100%', padding:'11px 32px 11px 14px', borderRadius:'10px', border:'1px solid #2a2d3a', background:'#0f1117', color:addDoctor?'#f9fafb':'#4b5563', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', cursor:'pointer', appearance:'none', boxSizing:'border-box' }}>
                        <option value="">Select doctor…</option>
                        {doctors.map(d=><option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}
                      </select>
                      <ChevronDown size={13} color="#4b5563" style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
                    </div>
                  </div>
                  <div style={{ marginBottom:'14px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#9ca3af', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.05em' }}>Date &amp; Time</label>
                    <input type="datetime-local" value={addDatetime} onChange={e=>setAddDatetime(e.target.value)} style={{ width:'100%', padding:'11px 14px', borderRadius:'10px', border:'1px solid #2a2d3a', background:'#0f1117', color:'#f9fafb', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div style={{ marginBottom:'20px' }}>
                    <label style={{ display:'block', fontSize:'12px', fontWeight:600, color:'#9ca3af', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'.05em' }}>Reason for Visit</label>
                    <textarea value={addReason} onChange={e=>setAddReason(e.target.value)} rows={3} placeholder="e.g. Follow-up consultation for diabetes management…" style={{ width:'100%', padding:'11px 14px', borderRadius:'10px', border:'1px solid #2a2d3a', background:'#0f1117', color:'#f9fafb', fontSize:'13px', fontFamily:'Outfit,sans-serif', outline:'none', resize:'vertical', boxSizing:'border-box', lineHeight:1.6 }}/>
                  </div>
                  {crudError   && <div style={{ padding:'10px 14px', borderRadius:'10px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.3)', color:'#f87171', fontSize:'13px', marginBottom:'14px' }}>{crudError}</div>}
                  {crudSuccess && <div style={{ padding:'10px 14px', borderRadius:'10px', background:'rgba(21,128,61,.1)', border:'1px solid rgba(21,128,61,.3)', color:'#4ade80', fontSize:'13px', marginBottom:'14px' }}>{crudSuccess}</div>}
                  <div style={{ display:'flex', gap:'10px' }}>
                    <button onClick={closeModal} style={{ flex:1, padding:'12px', borderRadius:'11px', background:'transparent', border:'1px solid #2a2d3a', color:'#9ca3af', fontWeight:600, fontSize:'14px', cursor:'pointer', fontFamily:'Outfit,sans-serif' }}>Cancel</button>
                    <button onClick={createAppt} disabled={crudLoading} style={{ flex:2, padding:'12px', borderRadius:'11px', background:'linear-gradient(135deg,#059669,#047857)', border:'none', color:'#fff', fontWeight:700, fontSize:'14px', cursor:'pointer', fontFamily:'Outfit,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', gap:'8px' }}>
                      {crudLoading?<><RefreshCw size={14} style={{ animation:'spin 1s linear infinite' }}/> Creating…</>:<><Plus size={14}/> Create Appointment</>}
                    </button>
                  </div>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}