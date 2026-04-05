'use client'
import { useEffect, useRef, useState } from 'react'
import { Copy, Printer, Check } from 'lucide-react'

interface Doctor { id:number; name:string; specialization:string; availability_slots:string; rating:number; experience_years:number }
interface ApptInfo { id:number; appointment_datetime:string; status:string }
interface Props {
  apptInfo: ApptInfo; name:string; age:string; gender:string; contact:string
  specialist:string; selDoctor:Doctor|null; conditionName:string
  onReset:()=>void
}

const fmtDate = (dt:string) => { try { return new Date(dt).toLocaleDateString('en-IN',{weekday:'long',year:'numeric',month:'long',day:'numeric'}) } catch { return dt } }
const fmtTime = (dt:string) => { try { return new Date(dt).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true}) } catch { return '' } }
const pad6 = (n:number) => n.toString().padStart(6,'0')

export default function StepDone({ apptInfo, name, age, gender, contact, specialist, selDoctor, conditionName, onReset }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width = window.innerWidth; canvas.height = window.innerHeight
    const particles: any[] = []
    const colors = ['#2D6A4F','#1A2E1A','#D4A017','#ffffff','#74C69D','#40916C']
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width/2 + (Math.random()-0.5)*200, y:-10,
        vx:(Math.random()-0.5)*14, vy:Math.random()*8+2,
        color:colors[Math.floor(Math.random()*colors.length)],
        size:Math.random()*8+3, alpha:1,
        rot:Math.random()*360, rotV:(Math.random()-0.5)*10,
      })
    }
    let frame: number
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      particles.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.vy+=0.28; p.alpha-=0.011; p.rot+=p.rotV
        if(p.alpha<=0) return
        ctx.save(); ctx.globalAlpha=p.alpha
        ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180)
        ctx.fillStyle=p.color
        ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.5)
        ctx.restore()
      })
      if(particles.some(p=>p.alpha>0)) frame=requestAnimationFrame(draw)
    }
    frame=requestAnimationFrame(draw)
    return ()=>cancelAnimationFrame(frame)
  }, [])

  const copyText = () => {
    const txt = [
      'SmartHospital — Appointment Confirmation',
      '─'.repeat(42),
      `ID         : #${pad6(apptInfo.id)}`,
      `Patient    : ${name} (${age}y, ${gender})`,
      `Phone      : ${contact}`,
      `Condition  : ${conditionName}`,
      `Specialist : ${specialist}`,
      `Doctor     : ${selDoctor?.name}`,
      `Date       : ${fmtDate(apptInfo.appointment_datetime)}`,
      `Time       : ${fmtTime(apptInfo.appointment_datetime)}`,
      `Status     : ${apptInfo.status?.toUpperCase()}`,
      '─'.repeat(42),
      'Arrive 15 min early. Bring your last medical report if you have any history.',
    ].join('\n')
    navigator.clipboard.writeText(txt)
    setCopied(true); setTimeout(()=>setCopied(false), 2500)
  }

  return (
    <>
      <canvas ref={canvasRef} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:999 }}/>

      <div style={{ animation:'ticketIn .65s cubic-bezier(0.22,1,0.36,1) both', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'linear-gradient(135deg,#2D6A4F,#40916C)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px', boxShadow:'0 8px 24px rgba(45,106,79,.3)' }}>
            <Check size={26} color="#fff" strokeWidth={2.5}/>
          </div>
          <h1 style={{ fontFamily:'var(--serif)', fontSize:'clamp(28px,4vw,44px)', color:'#1A2E1A', fontWeight:400, marginBottom:'6px', fontStyle:'italic' }}>
            You&apos;re all set.
          </h1>
          <p style={{ color:'#6B8068', fontSize:'14px' }}>Your appointment is confirmed. Save the details below.</p>
        </div>

        {/* ticket */}
        <div style={{ width:'100%', maxWidth:'440px', borderRadius:'20px', overflow:'visible', boxShadow:'0 20px 64px rgba(26,46,26,0.15)', position:'relative', border:'1px solid #DDE5DB' }}>
          {/* navy header */}
          <div style={{ background:'#1A2E1A', padding:'28px 28px 24px', borderRadius:'20px 20px 0 0' }}>
            <p style={{ fontSize:'10px', color:'rgba(255,255,255,0.4)', letterSpacing:'.15em', textTransform:'uppercase', marginBottom:'8px' }}>Appointment Confirmed</p>
            <p style={{ fontFamily:'var(--serif)', fontSize:'44px', color:'#fff', letterSpacing:'.02em', lineHeight:1 }}>#{pad6(apptInfo.id)}</p>
            <p style={{ fontSize:'13px', color:'rgba(255,255,255,0.45)', marginTop:'6px' }}>{fmtDate(apptInfo.appointment_datetime)}</p>
          </div>

          {/* perforated line */}
          <div style={{ position:'relative', borderTop:'2px dashed #DDE5DB', background:'#F8FAF7' }}>
            <div style={{ position:'absolute', top:'-11px', left:'-11px', width:'20px', height:'20px', borderRadius:'50%', background:'#F0F4EF', border:'1px solid #DDE5DB' }}/>
            <div style={{ position:'absolute', top:'-11px', right:'-11px', width:'20px', height:'20px', borderRadius:'50%', background:'#F0F4EF', border:'1px solid #DDE5DB' }}/>
          </div>

          {/* body */}
          <div style={{ background:'#FAFCF9', padding:'22px 28px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'18px 20px', marginBottom:'18px' }}>
              {[
                { label:'Doctor',     val:selDoctor?.name ?? '—' },
                { label:'Specialist', val:specialist },
                { label:'Date',       val:fmtDate(apptInfo.appointment_datetime).split(',').slice(0,2).join(',') },
                { label:'Time',       val:fmtTime(apptInfo.appointment_datetime) },
              ].map(item => (
                <div key={item.label}>
                  <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#2D6A4F', marginBottom:'3px' }}>{item.label}</p>
                  <p style={{ fontSize:'14px', fontWeight:700, color:'#1A2E1A', fontFamily:'var(--serif)' }}>{item.val}</p>
                </div>
              ))}
            </div>
            <div style={{ paddingTop:'16px', borderTop:'1px solid #EEF2ED' }}>
              <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#2D6A4F', marginBottom:'3px' }}>Location</p>
              <p style={{ fontSize:'14px', fontWeight:700, color:'#1A2E1A', fontFamily:'var(--serif)' }}>SmartHospital Main Campus, OPD Block</p>
            </div>
          </div>

          {/* green footer */}
          <div style={{ background:'#2D6A4F', padding:'14px 28px', borderRadius:'0 0 20px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <p style={{ fontSize:'12px', color:'#fff', fontWeight:500 }}>Show this at reception</p>
            <div style={{ width:'28px', height:'28px', background:'rgba(255,255,255,.15)', borderRadius:'4px', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ fontSize:'8px', fontWeight:700, color:'#fff' }}>QR</span>
            </div>
          </div>
        </div>

        {/* action buttons */}
        <div style={{ display:'flex', gap:'10px', marginTop:'18px', width:'100%', maxWidth:'440px' }}>
          <button onClick={copyText} style={{ flex:1, padding:'13px', borderRadius:'12px', border:'1.5px solid #DDE5DB', background:'transparent', color:'#1A2E1A', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', transition:'all .2s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#2D6A4F'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#DDE5DB'}
          >
            {copied ? <><Check size={14} color="#2D6A4F"/> Copied!</> : <><Copy size={14}/> Copy</>}
          </button>
          <button onClick={()=>window.print()} style={{ flex:1, padding:'13px', borderRadius:'12px', border:'1.5px solid #DDE5DB', background:'transparent', color:'#1A2E1A', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:'6px', transition:'all .2s' }}
            onMouseEnter={e=>e.currentTarget.style.borderColor='#2D6A4F'}
            onMouseLeave={e=>e.currentTarget.style.borderColor='#DDE5DB'}
          >
            <Printer size={14}/> Print
          </button>
        </div>
        <button onClick={onReset} style={{ marginTop:'10px', width:'100%', maxWidth:'440px', padding:'15px', borderRadius:'14px', border:'none', background:'#1A2E1A', color:'#fff', fontSize:'14px', fontWeight:700, cursor:'pointer', fontFamily:'inherit', transition:'background .2s' }}
          onMouseEnter={e=>e.currentTarget.style.background='#2D6A4F'}
          onMouseLeave={e=>e.currentTarget.style.background='#1A2E1A'}
        >
          Book Another Appointment
        </button>
      </div>
    </>
  )
}