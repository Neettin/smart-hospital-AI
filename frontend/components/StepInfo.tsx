'use client'
import { useState, useRef, useEffect } from 'react'
import { ArrowRight } from 'lucide-react'

interface Props {
  onNext: (data: { name:string; age:string; gender:string; contact:string; problem:string }) => void
}

export default function StepInfo({ onNext }: Props) {
  const [name,    setName]    = useState('')
  const [age,     setAge]     = useState('')
  const [gender,  setGender]  = useState('')
  const [contact, setContact] = useState('')
  const [problem, setProblem] = useState('')
  const [errs,    setErrs]    = useState<Record<string,string>>({})
  const [focused, setFocused] = useState('')
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = textRef.current; if (!el) return
    el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'
  }, [problem])

  const validate = () => {
    const e: Record<string,string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = 'Min 2 characters required'
    if (!age || +age < 1 || +age > 120)          e.age  = 'Enter age between 1–120'
    if (!gender)                                   e.gender = 'Select your gender'
    if (!/^\d{7,15}$/.test(contact.trim()))        e.contact = '7–15 digits only'
    if (!problem.trim() || problem.trim().length < 10) e.problem = 'Min 10 characters'
    setErrs(e); return Object.keys(e).length === 0
  }

  const handleNext = () => { if (validate()) onNext({ name, age, gender, contact, problem }) }

  const FI = ({ id, label, type='text', value, onChange, err, max }:
    { id:string; label:string; type?:string; value:string; onChange:(v:string)=>void; err?:string; max?:number }) => (
    <div>
      <div style={{
        position:'relative', borderRadius:'14px', overflow:'hidden',
        border: `1.5px solid ${err ? '#E53E3E' : focused===id ? '#2D6A4F' : '#DDE5DB'}`,
        background: focused===id ? '#fff' : '#FAFCF9',
        transition:'all .2s',
      }}>
        <label htmlFor={id} style={{
          position:'absolute', left:'16px', fontSize:'10px', fontWeight:700,
          letterSpacing:'.08em', textTransform:'uppercase', color: focused===id||value ? '#2D6A4F' : '#8FA888',
          top:'10px', transition:'color .2s',
        }}>{label}</label>
        <input id={id} type={type} value={value} maxLength={max}
          onFocus={()=>setFocused(id)} onBlur={()=>setFocused('')}
          onChange={e=>{ onChange(type==='tel'?e.target.value.replace(/\D/g,''):e.target.value); setErrs(p=>({...p,[id]:''}))} }
          style={{ width:'100%', padding:'28px 16px 10px', border:'none', background:'transparent',
            fontSize:'16px', fontFamily:'inherit', color:'#1A2E1A', outline:'none' }}
        />
      </div>
      {err && <p style={{ fontSize:'12px', color:'#E53E3E', marginTop:'4px', paddingLeft:'4px' }}>{err}</p>}
    </div>
  )

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <p style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#2D6A4F', marginBottom:'12px' }}>
        Step 01 of 04
      </p>
      <h1 style={{ fontFamily:'var(--serif)', fontSize:'clamp(32px,5vw,52px)', lineHeight:1.1, color:'#1A2E1A', marginBottom:'10px', fontWeight:400 }}>
        Let&apos;s get to<br/><em style={{ color:'#2D6A4F', fontStyle:'italic' }}>know you</em>
      </h1>
      <p style={{ color:'#6B8068', fontSize:'15px', marginBottom:'36px', lineHeight:1.7 }}>
        Your details help us find the right specialist for your needs.
      </p>

      <div style={{ display:'flex', flexDirection:'column', gap:'14px', marginBottom:'20px' }}>
        <FI id="name" label="Full Name" value={name} onChange={setName} err={errs.name}/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.8fr', gap:'12px' }}>
          <FI id="age" label="Age" type="number" value={age} onChange={setAge} err={errs.age}/>
          <div>
            <div style={{ display:'flex', gap:'8px' }}>
              {['Male','Female','Other'].map(g => (
                <button key={g} onClick={()=>{setGender(g); setErrs(p=>({...p,gender:''}))}} style={{
                  flex:1, padding:'14px 8px', borderRadius:'14px', border:`1.5px solid ${gender===g?'#2D6A4F':'#DDE5DB'}`,
                  background: gender===g ? '#2D6A4F' : '#FAFCF9', color: gender===g ? '#fff' : '#6B8068',
                  fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
                }}>{g}</button>
              ))}
            </div>
            {errs.gender && <p style={{ fontSize:'12px', color:'#E53E3E', marginTop:'4px', paddingLeft:'4px' }}>{errs.gender}</p>}
          </div>
        </div>
        <FI id="contact" label="Phone Number" type="tel" value={contact} onChange={setContact} err={errs.contact} max={15}/>
        <div>
          <div style={{
            position:'relative', borderRadius:'14px', overflow:'hidden',
            border:`1.5px solid ${errs.problem ? '#E53E3E' : focused==='problem' ? '#2D6A4F' : '#DDE5DB'}`,
            background: focused==='problem' ? '#fff' : '#FAFCF9', transition:'all .2s',
          }}>
            <label htmlFor="problem" style={{ position:'absolute', left:'16px', top:'10px', fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color: focused==='problem'||problem ? '#2D6A4F' : '#8FA888', transition:'color .2s' }}>
              Describe Your Problem
            </label>
            <textarea ref={textRef} id="problem" value={problem}
              onFocus={()=>setFocused('problem')} onBlur={()=>setFocused('')}
              onChange={e=>{ setProblem(e.target.value); setErrs(p=>({...p,problem:''})) }}
              style={{ width:'100%', padding:'28px 16px 12px', border:'none', background:'transparent',
                fontSize:'15px', fontFamily:'inherit', color:'#1A2E1A', outline:'none',
                resize:'none', overflow:'hidden', minHeight:'80px', lineHeight:1.6 }}
            />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
            {errs.problem ? <p style={{ fontSize:'12px', color:'#E53E3E', paddingLeft:'4px' }}>{errs.problem}</p> : <span/>}
            <span style={{ fontSize:'11px', color:'#8FA888' }}>{problem.length}/500</span>
          </div>
        </div>
      </div>

      <button onClick={handleNext} style={{
        width:'100%', padding:'18px', borderRadius:'16px', border:'none',
        background:'#1A2E1A', color:'#fff', fontSize:'16px', fontWeight:700,
        fontFamily:'inherit', cursor:'pointer', display:'flex', alignItems:'center',
        justifyContent:'center', gap:'10px', transition:'all .2s',
        letterSpacing:'.01em',
      }}
        onMouseEnter={e=>(e.currentTarget.style.background='#2D6A4F')}
        onMouseLeave={e=>(e.currentTarget.style.background='#1A2E1A')}
      >
        Continue <ArrowRight size={18}/>
      </button>
    </div>
  )
}