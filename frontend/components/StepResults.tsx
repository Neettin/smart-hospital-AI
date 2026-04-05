'use client'
import { useState, useEffect } from 'react'
import { Check, ArrowRight, ArrowLeft } from 'lucide-react'

interface Doctor { id:number; name:string; specialization:string; availability_slots:string; rating:number; experience_years:number }

interface Props {
  specialist: string
  doctors: Doctor[]
  summary: string
  mode: 'disease' | 'symptoms'
  loading: boolean
  error: string
  onNext: (doc: Doctor) => void
  onBack: () => void
}

const initials = (n:string) => n.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()

export default function StepResults({ specialist, doctors, summary, mode, loading, error, onNext, onBack }: Props) {
  const [selDoctor, setSelDoctor] = useState<Doctor|null>(doctors[0] ?? null)
  const [typed, setTyped] = useState('')
  const [localErr, setLocalErr] = useState('')

  useEffect(() => { if (doctors.length) setSelDoctor(doctors[0]) }, [doctors])

  useEffect(() => {
    if (!specialist) return
    setTyped(''); let i = 0
    const t = setInterval(() => { i++; setTyped(specialist.slice(0,i)); if (i >= specialist.length) clearInterval(t) }, 40)
    return () => clearInterval(t)
  }, [specialist])

  const handleNext = () => {
    if (!selDoctor) return setLocalErr('Please select a doctor')
    onNext(selDoctor)
  }

  const Skeleton = () => (
    <div style={{ display:'flex', flexDirection:'column', gap:'1px', border:'1.5px solid #DDE5DB', borderRadius:'16px', overflow:'hidden' }}>
      {[1,2,3].map(i => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'18px 20px', background:'#fff', borderBottom:'1px solid #EEF2ED' }}>
          <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#EEF2ED', animation:'shimmer 1.5s infinite', backgroundSize:'200% 100%', backgroundImage:'linear-gradient(90deg,#EEF2ED 25%,#E0EAE0 50%,#EEF2ED 75%)' }}/>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'8px' }}>
            <div style={{ height:'14px', width:'140px', borderRadius:'4px', background:'#EEF2ED', animation:'shimmer 1.5s infinite', backgroundSize:'200% 100%', backgroundImage:'linear-gradient(90deg,#EEF2ED 25%,#E0EAE0 50%,#EEF2ED 75%)' }}/>
            <div style={{ height:'11px', width:'90px', borderRadius:'4px', background:'#EEF2ED', animation:'shimmer 1.5s .1s infinite', backgroundSize:'200% 100%', backgroundImage:'linear-gradient(90deg,#EEF2ED 25%,#E0EAE0 50%,#EEF2ED 75%)' }}/>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <p style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#2D6A4F', marginBottom:'12px' }}>Step 03 of 04</p>

      {/* specialist hero */}
      <div style={{ marginBottom:'28px' }}>
        <p style={{ fontSize:'13px', color:'#8FA888', marginBottom:'6px' }}>Your recommended specialist</p>
        <h1 style={{ fontFamily:'var(--serif)', fontSize:'clamp(28px,4vw,48px)', lineHeight:1.1, color:'#1A2E1A', fontWeight:400, marginBottom:'6px' }}>
          {typed || specialist || '…'}
        </h1>
        <div style={{ height:'2px', background:'#2D6A4F', borderRadius:'1px', width: typed===specialist ? '180px' : '0px', transition:'width .4s .1s ease' }}/>
        <p style={{ fontSize:'13px', color:'#8FA888', marginTop:'8px' }}>
          Based on your {mode==='disease' ? 'selected condition' : 'reported symptoms'}
        </p>
      </div>

      {/* clinical summary */}
      {summary && (
        <div style={{ background:'#F5FBF7', border:'1.5px solid #C6E2CC', borderRadius:'14px', padding:'16px 20px', marginBottom:'24px' }}>
          <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#2D6A4F', marginBottom:'6px' }}>Clinical Summary</p>
          <p style={{ fontSize:'13px', color:'#4A6E52', fontStyle:'italic', lineHeight:1.75 }}>&ldquo;{summary}&rdquo;</p>
        </div>
      )}

      {/* divider */}
      <div style={{ height:'1px', background:'#EEF2ED', marginBottom:'20px' }}/>

      <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'14px' }}>
        <h2 style={{ fontFamily:'var(--serif)', fontSize:'20px', fontWeight:400, color:'#1A2E1A' }}>Available Doctors</h2>
        {!loading && <span style={{ fontSize:'12px', color:'#8FA888' }}>{doctors.length} found</span>}
      </div>

      {loading ? <Skeleton/> : (
        <div style={{ border:'1.5px solid #DDE5DB', borderRadius:'16px', overflow:'hidden' }}>
          {doctors.length === 0 ? (
            <div style={{ padding:'36px', textAlign:'center', color:'#8FA888', fontSize:'14px' }}>No doctors found for this specialization.</div>
          ) : doctors.map((d,i) => (
            <div key={d.id} onClick={()=>{setSelDoctor(d); setLocalErr('')}} style={{
              display:'flex', alignItems:'center', gap:'16px', padding:'16px 20px',
              cursor:'pointer', borderBottom: i<doctors.length-1 ? '1px solid #EEF2ED' : 'none',
              borderLeft: `4px solid ${selDoctor?.id===d.id ? '#2D6A4F' : 'transparent'}`,
              background: selDoctor?.id===d.id ? '#F5FBF7' : '#fff',
              transition:'all .2s',
            }}>
              <div style={{ width:'44px', height:'44px', borderRadius:'50%', background: selDoctor?.id===d.id ? '#2D6A4F' : '#1A2E1A', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'background .2s' }}>
                <span style={{ fontSize:'14px', fontWeight:700, color:'#fff', fontFamily:'var(--serif)' }}>{initials(d.name)}</span>
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'2px' }}>
                  <p style={{ fontSize:'15px', fontWeight:700, color: selDoctor?.id===d.id ? '#2D6A4F' : '#1A2E1A', fontFamily:'var(--serif)' }}>{d.name}</p>
                  {selDoctor?.id===d.id && <Check size={14} color="#2D6A4F" strokeWidth={3}/>}
                </div>
                <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.07em', textTransform:'uppercase', color:'#2D6A4F', marginBottom:'2px' }}>{d.specialization}</p>
                <p style={{ fontSize:'12px', color:'#8FA888' }}>{d.experience_years} yrs experience</p>
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:'4px', justifyContent:'flex-end', marginBottom:'3px' }}>
                  <span style={{ color:'#D4A017', fontSize:'12px' }}>{'★'.repeat(Math.round(d.rating))}</span>
                  <span style={{ fontSize:'13px', fontWeight:700, color:'#1A2E1A' }}>{d.rating}</span>
                </div>
                <p style={{ fontSize:'11px', color:'#8FA888', display:'flex', alignItems:'center', gap:'4px', justifyContent:'flex-end' }}>
                  <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:'#22c55e', display:'inline-block' }}/>
                  {d.availability_slots}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {(localErr || error) && <p style={{ fontSize:'13px', color:'#E53E3E', marginTop:'12px' }}>{localErr || error}</p>}

      <div style={{ display:'flex', gap:'10px', marginTop:'24px' }}>
        <button onClick={onBack} style={{ padding:'16px 20px', borderRadius:'14px', border:'1.5px solid #DDE5DB', background:'transparent', color:'#6B8068', fontSize:'15px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'8px' }}><ArrowLeft size={16}/></button>
        <button onClick={handleNext} style={{
          flex:1, padding:'16px', borderRadius:'14px', border:'none', background:'#1A2E1A', color:'#fff',
          fontSize:'15px', fontWeight:700, cursor:'pointer', fontFamily:'inherit',
          display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', transition:'background .2s',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='#2D6A4F'}
          onMouseLeave={e=>e.currentTarget.style.background='#1A2E1A'}
        >Confirm Doctor <ArrowRight size={17}/></button>
      </div>
    </div>
  )
}