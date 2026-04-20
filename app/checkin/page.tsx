'use client'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

// @ts-nocheck
const START = new Date('2026-04-20')
function dayNum(): number { return Math.max(1, Math.floor((new Date().getTime() - START.getTime()) / 864e5) + 1) }
function dayDate(d: number): string { const x = new Date(START); x.setDate(x.getDate() + d - 1); return x.toISOString().split('T')[0] }
function fmtDate(d: string): string { const x = new Date(d + 'T00:00:00'); return x.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) }

const calcColor = (d: any) => {
  const nn = [d.omad, d.steps >= 10000, d.meditate, d.sleep_hours >= 6, d.zero_content]
  const missed = nn.filter((v: boolean) => !v).length
  const be = [d.manifest, d.water_liters >= 3, d.yoga_sutras, d.zero_inbox, d.workout]
  const bonus = be.filter(Boolean).length
  if (missed === 0 && bonus === 5) return { color: 'Dark Green', score: 10 }
  if (missed === 0) return { color: 'Green', score: 5 + bonus }
  if (missed === 1) return { color: 'Orange', score: 4 + bonus }
  return { color: 'Red', score: nn.filter(Boolean).length + bonus }
}

const DF: any = { day:'', date:new Date().toISOString().split('T')[0], weight:'', omad:false, meal_description:'',
  steps:'', meditate:false, meditate_start:'', meditate_end:'', meditate_mins:'',
  sleep_hours:'', sleep_time:'', wake_time:'', zero_content:false, manifest:false,
  water_liters:'', yoga_sutras:false, zero_inbox:false, workout:false, workout_type:'', notes:'' }

export default function AddPage() {
  const [form, setForm] = useState({ ...DF, day: String(dayNum()), date: dayDate(dayNum()) })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [sectionSaved, setSectionSaved] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadedDay, setLoadedDay] = useState<number | null>(null)
  const [existingDays, setExistingDays] = useState<number[]>([])
  const [photos, setPhotos] = useState<Record<string, File | null>>({ scale: null, food: null, selfie: null })
  const [previews, setPreviews] = useState<Record<string, string>>({ scale: '', food: '', selfie: '' })
  const [existing, setExisting] = useState<Record<string, string>>({ scale: '', food: '', selfie: '' })
  const [uploading, setUploading] = useState(false)
  const [whoopOk, setWhoopOk] = useState<boolean | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [synced, setSynced] = useState(false)
  const [syncFields, setSyncFields] = useState<string[]>([])

  useEffect(() => {
    supabase.from('daily_logs').select('day').order('day').then(({ data }) => { if (data) setExistingDays(data.map(d => d.day)) })
    fetch('/api/whoop/sync?date=2026-01-01').then(r => r.json()).then(d => setWhoopOk(d.connected !== false)).catch(() => setWhoopOk(false))
  }, [saved])

  const syncWhoop = async () => {
    if (!form.date) return; setSyncing(true); setSynced(false); setSyncFields([])
    try {
      const d = await (await fetch(`/api/whoop/sync?date=${form.date}`)).json()
      if (!d.connected) { setWhoopOk(false); setSyncing(false); return }
      const fl: string[] = []
      if (d.sleep) {
        if (d.sleep.sleep_hours) { setForm((p:any) => ({...p, sleep_hours: String(d.sleep.sleep_hours)})); fl.push('Sleep') }
        if (d.sleep.sleep_time) { setForm((p:any) => ({...p, sleep_time: d.sleep.sleep_time})); fl.push('Bedtime') }
        if (d.sleep.wake_time) { setForm((p:any) => ({...p, wake_time: d.sleep.wake_time})); fl.push('Wake') }
      }
      if (d.steps != null) { setForm((p:any) => ({...p, steps: String(d.steps)})); fl.push('Steps') }
      if (d.meditation) {
        setForm((p:any) => ({...p, meditate: true})); fl.push('Meditation')
        if (d.meditation.meditate_mins) setForm((p:any) => ({...p, meditate_mins: String(d.meditation.meditate_mins)}))
        if (d.meditation.meditate_start) setForm((p:any) => ({...p, meditate_start: d.meditation.meditate_start}))
        if (d.meditation.meditate_end) setForm((p:any) => ({...p, meditate_end: d.meditation.meditate_end}))
      }
      if (d.workout) {
        setForm((p:any) => ({...p, workout: true})); fl.push('Workout')
        if (d.workout.workout_type) setForm((p:any) => ({...p, workout_type: d.workout.workout_type}))
      }
      setSyncFields(fl); setSynced(true)
    } catch(e) { console.error(e) }
    setSyncing(false)
  }

  const loadPhotos = async (d: number) => {
    const { data } = await supabase.from('photos').select('*').eq('day', d)
    const ep: Record<string,string> = { scale:'', food:'', selfie:'' }
    if (data) data.forEach((p:any) => { if (ep.hasOwnProperty(p.type)) ep[p.type] = p.photo_url })
    setExisting(ep)
  }

  const loadDay = async (d: number) => {
    if (!d || d < 1 || d > 100) return; setLoading(true); setSynced(false); setSyncFields([])
    const { data: h } = await supabase.from('habits').select('*').eq('day', d).single()
    const { data: l } = await supabase.from('daily_logs').select('*').eq('day', d).single()
    if (h || l) {
      setForm({ day:String(d), date:l?.date||dayDate(d), weight:l?.weight?String(l.weight):'', omad:h?.omad??false,
        meal_description:h?.meal_description||'', steps:h?.steps?String(h.steps):'', meditate:h?.meditate??false,
        meditate_start:h?.meditate_start||'', meditate_end:h?.meditate_end||'', meditate_mins:h?.meditate_mins?String(h.meditate_mins):'',
        sleep_hours:h?.sleep_hours?String(h.sleep_hours):'', sleep_time:h?.sleep_time||'', wake_time:h?.wake_time||'',
        zero_content:h?.zero_content??false, manifest:h?.manifest??false, water_liters:h?.water_liters?String(h.water_liters):'',
        yoga_sutras:h?.yoga_sutras??false, zero_inbox:h?.zero_inbox??false, workout:h?.workout??false,
        workout_type:h?.workout_type||'', notes:l?.notes||'' })
      setLoadedDay(d)
    } else { setForm({...DF, day:String(d), date:dayDate(d)}); setLoadedDay(null) }
    await loadPhotos(d); setPhotos({scale:null,food:null,selfie:null}); setPreviews({scale:'',food:'',selfie:''}); setLoading(false)
  }

  const f = (k:string, v:any) => setForm((p:any) => ({...p, [k]:v}))
  const goDay = (v:string) => { f('day',v); const n=parseInt(v); if(n>=1&&n<=100){f('date',dayDate(n));loadDay(n)} }

  const pickPhoto = (type:string, file:File|null) => {
    setPhotos(p => ({...p, [type]: file}))
    setPreviews(p => ({...p, [type]: file ? URL.createObjectURL(file) : ''}))
  }

  const doUpload = async (dayN: number) => {
    const pts = Object.entries(photos).filter(([_,f]) => f !== null); if (!pts.length) return; setUploading(true)
    for (const [type, file] of pts) {
      if (!file) continue; const ext = file.name.split('.').pop()||'jpg'; const fp = `day-${dayN}/${type}.${ext}`
      await supabase.storage.from('photos').upload(fp, file, { upsert: true })
      const { data: u } = supabase.storage.from('photos').getPublicUrl(fp)
      const { data: ex } = await supabase.from('photos').select('id').eq('day', dayN).eq('type', type).single()
      if (ex) await supabase.from('photos').update({ photo_url: u.publicUrl, caption: type }).eq('id', ex.id)
      else await supabase.from('photos').insert({ day: dayN, type, photo_url: u.publicUrl, caption: type })
    }
    setUploading(false)
  }

  const saveAll = async () => {
    if (!form.day) return alert('Enter day number!'); setSaving(true); const d = +form.day
    const { color, score } = calcColor({...form, steps:+form.steps, sleep_hours:+form.sleep_hours, water_liters:+form.water_liters})
    await supabase.from('daily_logs').upsert({ day:d, date:form.date, weight:+form.weight||0, color, score, notes:form.notes }, { onConflict:'day' })
    await supabase.from('habits').upsert({ day:d, omad:form.omad, meal_description:form.meal_description, steps:+form.steps,
      meditate:form.meditate, meditate_start:form.meditate_start||null, meditate_end:form.meditate_end||null,
      meditate_mins:+form.meditate_mins||null, sleep_hours:+form.sleep_hours, sleep_time:form.sleep_time||null,
      wake_time:form.wake_time||null, zero_content:form.zero_content, manifest:form.manifest, water_liters:+form.water_liters,
      yoga_sutras:form.yoga_sutras, zero_inbox:form.zero_inbox, workout:form.workout, workout_type:form.workout_type||null
    }, { onConflict:'day' })
    await doUpload(d); setSaving(false); setSaved(true); setLoadedDay(d)
    await loadPhotos(d); setPhotos({scale:null,food:null,selfie:null}); setPreviews({scale:'',food:'',selfie:''})
    setTimeout(() => setSaved(false), 3000)
  }

  const saveSection = async (section: string) => {
    if (!form.day) return; const d = +form.day
    const { color, score } = calcColor({...form, steps:+form.steps, sleep_hours:+form.sleep_hours, water_liters:+form.water_liters})
    await supabase.from('daily_logs').upsert({ day:d, date:form.date, weight:+form.weight||0, color, score, notes:form.notes||'' }, { onConflict:'day' })
    if (section === 'photos') {
      await doUpload(d); await loadPhotos(d)
      setPhotos({scale:null,food:null,selfie:null}); setPreviews({scale:'',food:'',selfie:''})
    } else {
      await supabase.from('habits').upsert({ day:d, omad:form.omad, meal_description:form.meal_description, steps:+form.steps,
        meditate:form.meditate, meditate_start:form.meditate_start||null, meditate_end:form.meditate_end||null,
        meditate_mins:+form.meditate_mins||null, sleep_hours:+form.sleep_hours, sleep_time:form.sleep_time||null,
        wake_time:form.wake_time||null, zero_content:form.zero_content, manifest:form.manifest, water_liters:+form.water_liters,
        yoga_sutras:form.yoga_sutras, zero_inbox:form.zero_inbox, workout:form.workout, workout_type:form.workout_type||null
      }, { onConflict:'day' })
    }
    setSectionSaved(section); setTimeout(() => setSectionSaved(''), 2000)
  }

  const Toggle = ({ k, green }: { k:string, green?:boolean }) => (
    <button className={`tg ${(form as any)[k] ? 'on' : 'off'} ${green ? 'tg-green' : ''}`}
      onClick={() => f(k, !(form as any)[k])}><div className="k" /></button>
  )

  const Row = ({ icon, iconBg, label, children, sub }: any) => (
    <div className="row">
      <div className="row-icon" style={{ background: iconBg }}>{icon}</div>
      <div className="row-body">
        <span className={sub ? 'row-sub' : 'row-label'}>{label}</span>
        {children}
      </div>
    </div>
  )

  const ValRow = ({ icon, iconBg, label, value, color, sub, k, placeholder, type }: any) => (
    <div className="row">
      <div className="row-icon" style={{ background: iconBg }}>{icon}</div>
      <div className="row-body">
        <span className={sub ? 'row-sub' : 'row-label'}>{label}</span>
        <input className="row-input" type={type||'text'} value={value} onChange={(e:any) => f(k, e.target.value)}
          placeholder={placeholder||''} style={{ color: color || '#000' }} />
      </div>
    </div>
  )

  const SH = ({ title, section, color }: { title:string, section:string, color?:string }) => (
    <div className="sh">
      <span className="st" style={{ color: color || '#FF2D55' }}>{title}</span>
      <button className="sec-save" onClick={() => saveSection(section)}>
        {sectionSaved === section ? '✓ Saved' : 'Save'}
      </button>
    </div>
  )

  const pk = 'rgba(255,45,85,0.12)'
  const gk = 'rgba(52,199,89,0.12)'
  const pp = 'rgba(88,86,214,0.12)'
  const ok = 'rgba(255,149,0,0.12)'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <h1 style={{ fontSize:34, fontWeight:700, letterSpacing:'-0.03em' }}>Add</h1>

      {/* Whoop */}
      <div className="card">
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div className="row-icon" style={{ background:pk, fontSize:16 }}>⌚</div>
            <div>
              <p style={{ fontSize:15, fontWeight:500 }}>WHOOP</p>
              <p style={{ fontSize:11, color:'#8E8E93' }}>{synced && syncFields.length > 0 ? `✓ ${syncFields.join(' · ')}` : 'Auto-fill from your band'}</p>
            </div>
          </div>
          {whoopOk === false ? (
            <a href="/api/whoop/login" className="sync-btn" style={{ textDecoration:'none' }}>Connect</a>
          ) : (
            <button onClick={syncWhoop} disabled={syncing} className="sync-btn">{syncing ? '...' : 'Sync'}</button>
          )}
        </div>
      </div>

      {/* Day */}
      <div className="card">
        <div className="day-sel">
          <button className="day-btn" onClick={() => goDay(String(Math.max(1,(+form.day||1)-1)))}>‹</button>
          <div style={{ flex:1, textAlign:'center' }}>
            <input type="number" value={form.day} onChange={e => goDay(e.target.value)}
              style={{ width:80, textAlign:'center', fontSize:22, fontWeight:700, border:'none', background:'transparent', fontFamily:'inherit', color:'#000', outline:'none', padding:0 }} min={1} max={100} />
            <p style={{ fontSize:12, color:'#8E8E93', marginTop:2 }}>
              {loading ? 'Loading...' : loadedDay ? `Editing · ${fmtDate(form.date)}` : form.day ? fmtDate(form.date) : ''}
            </p>
          </div>
          <button className="day-btn" onClick={() => goDay(String(Math.min(100,(+form.day||0)+1)))}>›</button>
        </div>
        {existingDays.length > 0 && (
          <div style={{ padding:'0 16px 10px', display:'flex', flexWrap:'wrap', gap:4, borderTop:'0.5px solid rgba(60,60,67,0.12)', paddingTop:10 }}>
            {existingDays.map(d => (
              <button key={d} onClick={() => goDay(String(d))} style={{
                padding:'3px 9px', borderRadius:6, fontSize:12, fontWeight:600, border:'none', cursor:'pointer', fontFamily:'inherit',
                background: +form.day === d ? '#FF2D55' : '#F2F2F7', color: +form.day === d ? '#fff' : '#8E8E93',
              }}>{d}</button>
            ))}
          </div>
        )}
      </div>

      {/* Basics */}
      <p className="gh">Basics</p>
      <div className="card">
        <SH title="Weight & date" section="basics" color="#FF9500" />
        <ValRow icon="⚖️" iconBg={ok} label="Weight" value={form.weight} k="weight" placeholder="kg" color="#FF9500" type="number" />
        <Row icon="📅" iconBg="rgba(0,122,255,0.12)" label="Date">
          <input className="row-input" type="date" value={form.date} onChange={(e:any) => f('date', e.target.value)} style={{ color:'#8E8E93' }} />
        </Row>
      </div>

      {/* Photos */}
      <p className="gh">Photos</p>
      <div className="card">
        <SH title="Daily photos" section="photos" color="#8E8E93" />
        <div className="photo-grid">
          {[{k:'scale',l:'Scale',i:'⚖️'},{k:'food',l:'Meal',i:'🍽️'},{k:'selfie',l:'Selfie',i:'🤳'}].map(({k,l,i}) => (
            <label key={k} style={{ cursor:'pointer' }}>
              <div className="photo-box" style={{
                border: previews[k] ? '2px solid #34C759' : existing[k] ? '2px solid #34C75966' : '1.5px dashed #D1D1D6',
              }}>
                {(previews[k] || existing[k]) ? (
                  <img src={previews[k] || existing[k]} alt={l} />
                ) : (
                  <><span style={{ fontSize:22 }}>{i}</span><span style={{ fontSize:10, color:'#8E8E93', marginTop:3, fontWeight:500 }}>{l}</span></>
                )}
              </div>
              <input type="file" accept="image/*" style={{ display:'none' }}
                onChange={e => pickPhoto(k, e.target.files?.[0] || null)} />
            </label>
          ))}
        </div>
      </div>

      {/* Non-Negotiables */}
      <p className="gh">Non-negotiables</p>
      <div className="card">
        <SH title="5 must-do habits" section="non-neg" />
        <Row icon="🍽️" iconBg={pk} label="OMAD"><Toggle k="omad" /></Row>
        {form.omad && (
          <div style={{ padding:'0 16px 10px' }}>
            <textarea className="notes-input" rows={2} value={form.meal_description} onChange={e => f('meal_description', e.target.value)} placeholder="What did you eat?" />
          </div>
        )}
        <ValRow icon="🚶" iconBg={pk} label="Steps" value={form.steps} k="steps" placeholder="0" color="#FF2D55" type="number" />
        <Row icon="🧘" iconBg={pk} label="Meditate"><Toggle k="meditate" /></Row>
        {form.meditate && (
          <>
            <ValRow icon="🧘" iconBg={pp} label="Duration" value={form.meditate_mins} k="meditate_mins" placeholder="min" color="#FF2D55" sub type="number" />
            <ValRow icon="🧘" iconBg={pp} label="Start" value={form.meditate_start} k="meditate_start" color="#FF2D55" sub type="time" />
            <ValRow icon="🧘" iconBg={pp} label="End" value={form.meditate_end} k="meditate_end" color="#FF2D55" sub type="time" />
          </>
        )}
        <ValRow icon="😴" iconBg={pk} label="Sleep hours" value={form.sleep_hours} k="sleep_hours" placeholder="0" color="#FF2D55" type="number" />
        <ValRow icon="🌙" iconBg={pp} label="Bedtime" value={form.sleep_time} k="sleep_time" color="#FF2D55" sub type="time" />
        <ValRow icon="☀️" iconBg={ok} label="Wake time" value={form.wake_time} k="wake_time" color="#FF2D55" sub type="time" />
        <Row icon="📵" iconBg={pk} label="Zero content"><Toggle k="zero_content" /></Row>
      </div>

      {/* Best Effort */}
      <p className="gh">Best effort</p>
      <div className="card">
        <SH title="5 bonus habits" section="best-effort" color="#34C759" />
        <Row icon="✨" iconBg={gk} label="Manifest"><Toggle k="manifest" green /></Row>
        <ValRow icon="💧" iconBg={gk} label="Water (litres)" value={form.water_liters} k="water_liters" placeholder="0" color="#34C759" type="number" />
        <Row icon="📖" iconBg={gk} label="Yoga Sutras"><Toggle k="yoga_sutras" green /></Row>
        <Row icon="📬" iconBg={gk} label="Zero inbox"><Toggle k="zero_inbox" green /></Row>
        <Row icon="💪" iconBg={gk} label="Workout"><Toggle k="workout" green /></Row>
        {form.workout && (
          <ValRow icon="🏊" iconBg={gk} label="Type" value={form.workout_type} k="workout_type" placeholder="Swimming..." color="#34C759" sub />
        )}
      </div>

      {/* Notes */}
      <p className="gh">Notes</p>
      <div className="card">
        <SH title="How are you feeling?" section="notes" color="#8E8E93" />
        <div style={{ padding:'0 16px 12px' }}>
          <textarea className="notes-input" rows={3} value={form.notes} onChange={e => f('notes', e.target.value)} placeholder="Write something..." />
        </div>
      </div>

      <button onClick={saveAll} disabled={saving || uploading} className="save-all"
        style={{ marginTop:4, opacity:(saving||uploading)?0.5:1 }}>
        {uploading ? 'Uploading...' : saving ? 'Saving...' : saved ? '✓ Day Saved!' : `Save Day ${form.day}`}
      </button>
    </div>
  )
}
