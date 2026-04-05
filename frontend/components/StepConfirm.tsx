'use client'
import { ArrowLeft } from 'lucide-react'

interface Doctor { id:number; name:string; specialization:string; availability_slots:string; rating:number; experience_years:number }
interface Props {
  name:string; age:string; gender:string; contact:string; problem:string
  specialist:string; selDoctor:Doctor|null; conditionName:string
  loading:boolean; loadMsg:string; error:string
  onConfirm:()=>void; onBack:()=>void; onEditInfo:()=>void; onEditDoctor:()=>void
}

export default function StepConfirm({ name, age, gender, contact, problem, specialist, selDoctor, conditionName, loading, loadMsg, error, onConfirm, onBack, onEditInfo, onEditDoctor }: Props) {
  const rows = [
    { label:'Patient',    val:`${name}`,             edit: onEditInfo },
    { label:'Age',        val:`${age} yrs, ${gender}` },
    { label:'Phone',      val:contact },
    { label:'Condition',  val:conditionName },
    { label:'Specialist', val:specialist },
    { label:'Doctor',     val:selDoctor?.name ?? '—', edit: onEditDoctor },
    { label:'Experience', val: selDoctor ? `${selDoctor.experience_years} years` : '—' },
    { label:'Schedule',   val:selDoctor?.availability_slots ?? '—' },
  ]

  return (
    <div style={{ animation:'fadeUp .5s ease' }}>
      <p style={{ fontSize:'12px', fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'#2D6A4F', marginBottom:'12px' }}>Step 04 of 04</p>
      <h1 style={{ fontFamily:'var(--serif)', fontSize:'clamp(26px,4vw,42px)', lineHeight:1.15, color:'#1A2E1A', marginBottom:'8px', fontWeight:400 }}>
        Almost there —<br/><em style={{ fontStyle:'italic', color:'#2D6A4F' }}>confirm your booking</em>
      </h1>
      <p style={{ fontSize:'14px', color:'#6B8068', marginBottom:'28px', lineHeight:1.6 }}>Review all details carefully before we confirm your appointment.</p>

      {/* details table */}
      <div style={{ border:'1.5px solid #DDE5DB', borderRadius:'16px', overflow:'hidden', marginBottom:'20px' }}>
        {rows.map((row, i) => (
          <div key={row.label} style={{
            display:'flex', alignItems:'center', padding:'13px 20px',
            background: i%2===0 ? '#fff' : '#FAFCF9',
            borderBottom: i<rows.length-1 ? '1px solid #EEF2ED' : 'none',
          }}
            onMouseEnter={row.edit ? e=>{ const btn = e.currentTarget.querySelector('.edit-lnk') as HTMLElement; if(btn) btn.style.opacity='1' } : undefined}
            onMouseLeave={row.edit ? e=>{ const btn = e.currentTarget.querySelector('.edit-lnk') as HTMLElement; if(btn) btn.style.opacity='0' } : undefined}
          >
            <span style={{ width:'120px', fontSize:'12px', color:'#8FA888', fontWeight:500, flexShrink:0 }}>{row.label}</span>
            <span style={{ flex:1, fontSize:'14px', fontWeight:700, color:'#1A2E1A' }}>{row.val}</span>
            {row.edit && (
              <span className="edit-lnk" onClick={row.edit} style={{ fontSize:'11px', color:'#2D6A4F', cursor:'pointer', fontWeight:700, opacity:0, transition:'opacity .15s', letterSpacing:'.04em', textTransform:'uppercase' }}>Edit</span>
            )}
          </div>
        ))}
      </div>

      {/* advisory */}
      <div style={{ background:'#FFFBEB', border:'1.5px solid #FDE68A', borderRadius:'14px', padding:'14px 18px', marginBottom:'24px' }}>
        <p style={{ fontSize:'10px', fontWeight:700, letterSpacing:'.08em', textTransform:'uppercase', color:'#92400E', marginBottom:'5px' }}>Before your visit</p>
        <p style={{ fontSize:'13px', color:'#78350F', lineHeight:1.7 }}>
          Arrive <strong>15 minutes early</strong> &nbsp;·&nbsp; Bring a valid <strong>photo ID</strong> &nbsp;·&nbsp; Show your <strong>Appointment ID</strong> at reception
        </p>
      </div>

      {error && <p style={{ fontSize:'13px', color:'#E53E3E', marginBottom:'12px' }}>{error}</p>}

      {loading && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', padding:'10px', marginBottom:'12px', color:'#2D6A4F', fontSize:'13px' }}>
          <span style={{ width:'14px', height:'14px', borderRadius:'50%', border:'2px solid rgba(45,106,79,.3)', borderTopColor:'#2D6A4F', display:'inline-block', animation:'spin .7s linear infinite' }}/>
          {loadMsg}
        </div>
      )}

      <div style={{ display:'flex', gap:'10px' }}>
        <button onClick={onBack} style={{ padding:'16px 20px', borderRadius:'14px', border:'1.5px solid #DDE5DB', background:'transparent', color:'#6B8068', fontSize:'15px', fontWeight:600, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:'8px' }}><ArrowLeft size={16}/></button>
        <button onClick={onConfirm} disabled={loading} style={{
          flex:1, padding:'16px', borderRadius:'14px', border:'none',
          background:'linear-gradient(135deg,#2D6A4F,#1A2E1A)', color:'#fff',
          fontSize:'15px', fontWeight:700, cursor: loading?'not-allowed':'pointer',
          fontFamily:'inherit', opacity: loading?.7:1, transition:'opacity .2s',
        }}>
          {loading ? 'Confirming…' : 'Confirm Appointment'}
        </button>
      </div>
    </div>
  )
}