'use client'

import { useState, useEffect, useMemo } from 'react'

// ─── DATA ────────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id: 'streaming',  label: 'Streaming',   icon: '▶',  color: '#e11d48' },
  { id: 'music',      label: 'Music',       icon: '♫',  color: '#7c3aed' },
  { id: 'software',   label: 'Software',    icon: '⌘',  color: '#2563eb' },
  { id: 'gaming',     label: 'Gaming',      icon: '◈',  color: '#16a34a' },
  { id: 'fitness',    label: 'Fitness',     icon: '◎',  color: '#ea580c' },
  { id: 'shopping',   label: 'Shopping',    icon: '◇',  color: '#db2777' },
  { id: 'cloud',      label: 'Cloud',       icon: '⬡',  color: '#0891b2' },
  { id: 'other',      label: 'Other',       icon: '●',  color: '#6b7280' },
]

const BILLING = [
  { id: 'monthly',   label: 'Monthly',   months: 1 },
  { id: 'quarterly', label: 'Quarterly', months: 3 },
  { id: 'yearly',    label: 'Yearly',    months: 12 },
]

const SAMPLE_SUBS = [
  { id: 1, name: 'Netflix',        category: 'streaming', billing: 'monthly',   price: 15.49, renewDay: 14, active: true },
  { id: 2, name: 'Spotify',        category: 'music',     billing: 'monthly',   price: 10.99, renewDay: 3,  active: true },
  { id: 3, name: 'Adobe Creative', category: 'software',  billing: 'monthly',   price: 54.99, renewDay: 22, active: true },
  { id: 4, name: 'Xbox Game Pass', category: 'gaming',    billing: 'monthly',   price: 16.99, renewDay: 8,  active: true },
  { id: 5, name: 'Disney+',        category: 'streaming', billing: 'monthly',   price: 13.99, renewDay: 19, active: true },
  { id: 6, name: 'iCloud 200GB',   category: 'cloud',     billing: 'monthly',   price: 2.99,  renewDay: 1,  active: true },
  { id: 7, name: 'Amazon Prime',   category: 'shopping',  billing: 'yearly',    price: 139.00,renewDay: 11, active: true },
  { id: 8, name: 'Gym Membership', category: 'fitness',   billing: 'monthly',   price: 49.99, renewDay: 28, active: true },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const annualized   = (sub) => { const b = BILLING.find(b => b.id === sub.billing); return (sub.price / b.months) * 12 }
const monthlyEquiv = (sub) => { const b = BILLING.find(b => b.id === sub.billing); return sub.price / b.months }
const daysUntilRenew = (day) => {
  const now  = new Date()
  const next = new Date(now.getFullYear(), now.getMonth(), day)
  if (next <= now) next.setMonth(next.getMonth() + 1)
  return Math.ceil((next - now) / 86400000)
}
const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ─── DONUT ───────────────────────────────────────────────────────────────────
function Donut({ data, size = 140 }) {
  const r     = (size / 2) - 14
  const circ  = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.value, 0)
  let offset  = 0
  const slices = data.map((d) => {
    const len   = total ? (d.value / total) * circ : 0
    const slice = { ...d, offset, len }
    offset += len
    return slice
  })
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth={11} />
      {slices.map((s, i) => (
        <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
          stroke={s.color} strokeWidth={11}
          strokeDasharray={`${s.len} ${circ - s.len}`}
          strokeDashoffset={-s.offset}
          strokeLinecap="round"
          style={{ transition: 'all 0.4s ease' }}
        />
      ))}
    </svg>
  )
}

// ─── MODAL ───────────────────────────────────────────────────────────────────
function Modal({ open, onClose, children }) {
  if (!open) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:100, animation:'fadeIn 0.15s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:'20px 20px 0 0', width:'100%', maxWidth:500, maxHeight:'85vh', overflowY:'auto' }}>
        {children}
      </div>
    </div>
  )
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [subs, setSubs]             = useState([])
  const [loaded, setLoaded]         = useState(false)
  const [started, setStarted]       = useState(false) // past landing
  const [view, setView]             = useState('dashboard')
  const [modalOpen, setModalOpen]   = useState(false)
  const [editing, setEditing]       = useState(null)
  const [form, setForm]             = useState({ name:'', category:'streaming', billing:'monthly', price:'', renewDay: new Date().getDate() })
  const [filterCat, setFilterCat]   = useState('all')
  const [sortBy, setSortBy]         = useState('cost')

  // ── persistence ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem('billguard_subs')
      if (saved) { setSubs(JSON.parse(saved)); setStarted(true) }
      else       { setSubs(SAMPLE_SUBS) }
    } catch(e) { setSubs(SAMPLE_SUBS) }
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (loaded) localStorage.setItem('billguard_subs', JSON.stringify(subs))
  }, [subs, loaded])

  // ── modal ──
  const openAdd = () => {
    setEditing(null)
    setForm({ name:'', category:'streaming', billing:'monthly', price:'', renewDay: new Date().getDate() })
    setModalOpen(true)
  }
  const openEdit = (sub) => {
    setEditing(sub)
    setForm({ name: sub.name, category: sub.category, billing: sub.billing, price: String(sub.price), renewDay: sub.renewDay })
    setModalOpen(true)
  }
  const saveForm = () => {
    if (!form.name.trim() || !form.price) return
    if (editing) {
      setSubs(prev => prev.map(s => s.id === editing.id ? { ...s, ...form, price: parseFloat(form.price) } : s))
    } else {
      setSubs(prev => [...prev, { id: Date.now(), ...form, price: parseFloat(form.price), active: true }])
    }
    setModalOpen(false)
    setStarted(true)
  }
  const deleteSub = (id) => {
    setSubs(prev => prev.filter(s => s.id !== id))
    setModalOpen(false)
  }
  const toggleActive = (id) => setSubs(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s))

  // ── derived ──
  const activeSubs   = subs.filter(s => s.active)
  const totalMonthly = activeSubs.reduce((s, sub) => s + monthlyEquiv(sub), 0)
  const totalAnnual  = activeSubs.reduce((s, sub) => s + annualized(sub), 0)
  const totalDaily   = totalAnnual / 365

  const byCategory = useMemo(() => {
    const map = {}
    activeSubs.forEach(sub => { map[sub.category] = (map[sub.category] || 0) + annualized(sub) })
    return CATEGORIES.filter(c => map[c.id]).map(c => ({ ...c, value: map[c.id] })).sort((a, b) => b.value - a.value)
  }, [activeSubs])

  const upcoming = useMemo(() =>
    activeSubs.map(s => ({ ...s, daysLeft: daysUntilRenew(s.renewDay) })).sort((a, b) => a.daysLeft - b.daysLeft).slice(0, 4)
  , [activeSubs])

  const filtered = useMemo(() => {
    let list = filterCat === 'all' ? [...subs] : subs.filter(s => s.category === filterCat)
    if (sortBy === 'cost')   list.sort((a, b) => annualized(b) - annualized(a))
    if (sortBy === 'name')   list.sort((a, b) => a.name.localeCompare(b.name))
    if (sortBy === 'renew')  list.sort((a, b) => daysUntilRenew(a.renewDay) - daysUntilRenew(b.renewDay))
    return list
  }, [subs, filterCat, sortBy])

  // ─── LANDING PAGE ────────────────────────────────────────────────────────
  if (!started) {
    return (
      <div style={{ minHeight:'100vh', background:'#fafafa', display:'flex', flexDirection:'column' }}>
        {/* nav */}
        <nav style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'20px 28px' }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, fontWeight:700, color:'#1a1a1a' }}>
            Bill<span style={{ color:'#e11d48' }}>guard</span>
          </h1>
          <button onClick={() => setStarted(true)} style={{ background:'#1a1a1a', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:500, padding:'9px 20px', cursor:'pointer' }}>
            Get Started
          </button>
        </nav>

        {/* hero */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'40px 28px 80px' }}>
          {/* badge */}
          <div style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:20, padding:'6px 14px', fontSize:11, color:'#6b7280', fontWeight:500, marginBottom:28, display:'inline-flex', alignItems:'center', gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#16a34a', display:'inline-block' }}/>
            Free · No account needed · Saves locally
          </div>

          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize: 'clamp(32px, 8vw, 52px)', fontWeight:700, color:'#1a1a1a', lineHeight:1.15, maxWidth:480, margin:'0 auto 18px' }}>
            Stop paying for<br/><span style={{ color:'#e11d48' }}>things you forgot about</span>
          </h2>

          <p style={{ fontSize:15, color:'#6b7280', maxWidth:400, lineHeight:1.7, margin:'0 auto 36px', fontWeight:300 }}>
            The average person wastes <strong style={{ color:'#1a1a1a', fontWeight:500 }}>$237/year</strong> on subscriptions they don't use. Billguard shows you exactly what you're paying for — so you can cut what you don't need.
          </p>

          <button onClick={() => setStarted(true)} style={{ background:'#1a1a1a', border:'none', borderRadius:12, color:'#fff', fontSize:15, fontWeight:500, padding:'15px 40px', cursor:'pointer', boxShadow:'0 4px 24px rgba(0,0,0,0.12)', letterSpacing:0.2 }}>
            Track My Subscriptions
          </button>

          <p style={{ fontSize:11, color:'#bbb', marginTop:14 }}>No sign up. Works in your browser.</p>

          {/* feature pills */}
          <div style={{ display:'flex', gap:10, marginTop:48, flexWrap:'wrap', justifyContent:'center' }}>
            {['📊 Visual Breakdown','⏰ Renewal Alerts','💡 Smart Insights','✏️ Add & Edit'].map(f => (
              <div key={f} style={{ background:'#fff', border:'1px solid #e8e8e8', borderRadius:10, padding:'8px 14px', fontSize:12, color:'#555', fontWeight:400 }}>{f}</div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ─── MAIN APP ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#fafafa', maxWidth:500, margin:'0 auto', display:'flex', flexDirection:'column' }}>

      {/* header */}
      <header style={{ background:'#fff', padding:'24px 22px 0', borderBottom:'1px solid #ececec', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:18 }}>
          <div>
            <h1 style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:'#1a1a1a' }}>
              Bill<span style={{ color:'#e11d48' }}>guard</span>
            </h1>
            <p style={{ fontSize:11, color:'#999', marginTop:2, fontWeight:300 }}>track what you're paying for</p>
          </div>
          <button onClick={openAdd} style={{ background:'#1a1a1a', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:500, padding:'8px 16px', cursor:'pointer', letterSpacing:0.3 }}>
            + Add
          </button>
        </div>
        {/* tabs */}
        <div style={{ display:'flex', gap:0 }}>
          {[['dashboard','Dashboard'],['manage','Manage']].map(([id, label]) => (
            <button key={id} onClick={() => setView(id)} style={{
              flex:1, background:'none', border:'none',
              fontSize:11, fontWeight:500, letterSpacing:0.5, textTransform:'uppercase',
              color: view === id ? '#1a1a1a' : '#999',
              padding:'10px 0',
              borderBottom: view === id ? '2px solid #1a1a1a' : '2px solid transparent',
              cursor:'pointer', transition:'all 0.2s'
            }}>{label}</button>
          ))}
        </div>
      </header>

      {/* main */}
      <main style={{ flex:1, padding:'20px 22px 40px', overflowY:'auto' }}>

        {/* ═══ DASHBOARD ═══ */}
        {view === 'dashboard' && (
          <div className="animate-up">
            {/* stats */}
            <div style={{ display:'flex', gap:8, marginBottom:20 }}>
              {[
                { label:'Monthly', val: fmt(totalMonthly), highlight: false },
                { label:'Per Year', val: fmt(totalAnnual), highlight: true },
                { label:'Per Day', val: fmt(totalDaily), highlight: false },
              ].map((s, i) => (
                <div key={i} style={{ flex:1, background:'#fff', borderRadius:12, padding:'14px 12px', textAlign:'center', border:'1px solid #ececec', boxShadow:'0 1px 2px rgba(0,0,0,0.03)' }}>
                  <p style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.8, marginBottom:4 }}>{s.label}</p>
                  <p style={{ fontSize:17, fontWeight:600, color: s.highlight ? '#e11d48' : '#1a1a1a', fontFamily:"'Playfair Display',serif" }}>{s.val}</p>
                </div>
              ))}
            </div>

            {/* donut + legend */}
            <div style={{ display:'flex', gap:16, alignItems:'center', background:'#fff', borderRadius:14, padding:20, border:'1px solid #ececec', marginBottom:20, boxShadow:'0 1px 2px rgba(0,0,0,0.03)' }}>
              <div style={{ position:'relative', width:150, height:150, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <Donut data={byCategory} size={150} />
                <div style={{ position:'absolute', display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <span style={{ fontSize:20, fontWeight:700, color:'#1a1a1a', fontFamily:"'Playfair Display',serif" }}>{activeSubs.length}</span>
                  <span style={{ fontSize:9, color:'#999', textTransform:'uppercase', letterSpacing:0.5 }}>active</span>
                </div>
              </div>
              <div style={{ flex:1, display:'flex', flexDirection:'column', gap:7 }}>
                {byCategory.map(c => (
                  <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ width:8, height:8, borderRadius:'50%', background:c.color, flexShrink:0, display:'inline-block' }} />
                    <span style={{ flex:1, fontSize:12, color:'#555' }}>{c.label}</span>
                    <span style={{ fontSize:12, fontWeight:600, color:'#1a1a1a' }}>{fmt(c.value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* upcoming renewals */}
            <p style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:1, marginBottom:10, fontWeight:500 }}>Upcoming Renewals</p>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:20 }}>
              {upcoming.map(s => {
                const cat    = CATEGORIES.find(c => c.id === s.category)
                const urgent = s.daysLeft <= 3
                return (
                  <div key={s.id} onClick={() => openEdit(s)} style={{
                    display:'flex', justifyContent:'space-between', alignItems:'center',
                    background:'#fff', borderRadius:10, padding:'11px 14px',
                    border: urgent ? '1px solid #fca5a5' : '1px solid #ececec',
                    borderLeft: urgent ? '3px solid #e11d48' : '3px solid transparent',
                    cursor:'pointer', transition:'box-shadow 0.15s'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <span style={{ width:34, height:34, borderRadius:8, background: cat.color+'15', color: cat.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>{cat.icon}</span>
                      <div>
                        <p style={{ fontSize:13, fontWeight:500, color:'#1a1a1a' }}>{s.name}</p>
                        <p style={{ fontSize:10, color:'#999', marginTop:1 }}>{fmt(s.price)} / {BILLING.find(b => b.id === s.billing)?.label.toLowerCase()}</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <span style={{ fontSize:18, fontWeight:700, fontFamily:"'Playfair Display',serif", color: urgent ? '#e11d48' : '#6b7280' }}>{s.daysLeft}d</span>
                      <span style={{ fontSize:9, color:'#bbb', textTransform:'uppercase', letterSpacing:0.5 }}>left</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* insight */}
            <div style={{ display:'flex', gap:12, alignItems:'flex-start', background:'#fff', border:'1px solid #ececec', borderRadius:12, padding:16, boxShadow:'0 1px 2px rgba(0,0,0,0.03)' }}>
              <span style={{ fontSize:20, flexShrink:0 }}>💡</span>
              <div>
                <p style={{ fontSize:11, fontWeight:600, color:'#1a1a1a', marginBottom:3 }}>Insight</p>
                <p style={{ fontSize:12, color:'#777', lineHeight:1.55 }}>
                  {byCategory.length > 0
                    ? `Your biggest spend is ${byCategory[0].label} at ${fmt(byCategory[0].value)}/yr — that's ${Math.round((byCategory[0].value / totalAnnual) * 100)}% of your total subscriptions.`
                    : 'Add some subscriptions to start tracking your spending.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ═══ MANAGE ═══ */}
        {view === 'manage' && (
          <div className="animate-up">
            {/* filters */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14, gap:8 }}>
              <div style={{ display:'flex', gap:4, overflowX:'auto', flexShrink:1 }}>
                {[{ id:'all', label:'All' }, ...CATEGORIES].map(c => (
                  <button key={c.id} onClick={() => setFilterCat(c.id)} style={{
                    background: filterCat === c.id ? '#1a1a1a' : 'none',
                    border: filterCat === c.id ? '1px solid #1a1a1a' : '1px solid #e0e0e0',
                    borderRadius:6, color: filterCat === c.id ? '#fff' : '#999',
                    fontSize:10, fontWeight:500, padding:'4px 10px', cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.15s'
                  }}>{c.label}</button>
                ))}
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background:'#fff', border:'1px solid #e0e0e0', borderRadius:6, color:'#666', fontSize:10, padding:'4px 8px', cursor:'pointer', flexShrink:0 }}>
                <option value="cost">Cost ↓</option>
                <option value="name">Name A–Z</option>
                <option value="renew">Renewing Soon</option>
              </select>
            </div>

            {/* list */}
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {filtered.map((s, i) => {
                const cat = CATEGORIES.find(c => c.id === s.category)
                return (
                  <div key={s.id} style={{
                    display:'flex', alignItems:'center', gap:10,
                    background:'#fff', borderRadius:10, padding:'11px 12px',
                    border:'1px solid #ececec', opacity: s.active ? 1 : 0.4,
                    animation:`up 0.3s ease ${i * 0.03}s both`, transition:'opacity 0.2s'
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10, flex:1, minWidth:0 }}>
                      <span style={{ width:36, height:36, borderRadius:9, background: cat.color+'15', color: cat.color, display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, flexShrink:0 }}>{cat.icon}</span>
                      <div style={{ minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:500, color:'#1a1a1a', textDecoration: s.active ? 'none' : 'line-through', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{s.name}</p>
                        <p style={{ fontSize:10, color:'#999', marginTop:1 }}>{cat.label} · {BILLING.find(b => b.id === s.billing)?.label} · renews {s.renewDay}th</p>
                      </div>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', flexShrink:0 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>{fmt(s.price)}</span>
                      <span style={{ fontSize:9, color:'#bbb' }}>{fmt(annualized(s))}/yr</span>
                    </div>
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      <button onClick={() => toggleActive(s.id)} style={{
                        background:'none', border:'1px solid #ddd', borderRadius:6,
                        fontSize:11, width:28, height:28, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        color: s.active ? '#16a34a' : '#ccc',
                        borderColor: s.active ? '#16a34a' : '#ddd'
                      }}>{s.active ? '●' : '○'}</button>
                      <button onClick={() => openEdit(s)} style={{ background:'none', border:'1px solid #ddd', borderRadius:6, color:'#999', fontSize:13, width:28, height:28, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✎</button>
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px 0' }}>
                  <p style={{ fontSize:13, color:'#bbb' }}>No subscriptions here.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ═══ MODAL ═══ */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px 0' }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:600, color:'#1a1a1a' }}>{editing ? 'Edit' : 'Add'} Subscription</h3>
          <button onClick={() => setModalOpen(false)} style={{ background:'none', border:'none', fontSize:22, color:'#999', cursor:'pointer', lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:'18px 22px 28px', display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <label style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.7, fontWeight:500, display:'block', marginBottom:5 }}>Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Netflix" style={{ width:'100%', background:'#fafafa', border:'1px solid #e4e4e4', borderRadius:8, color:'#1a1a1a', fontSize:14, padding:'10px 12px', transition:'border-color 0.2s' }} />
          </div>

          <div>
            <label style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.7, fontWeight:500, display:'block', marginBottom:5 }}>Category</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:6 }}>
              {CATEGORIES.map(c => (
                <button key={c.id} onClick={() => setForm({ ...form, category: c.id })} style={{
                  display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                  background:'#fafafa', border: form.category === c.id ? `1px solid ${c.color}` : '1px solid #e4e4e4',
                  borderRadius:8, padding:'8px 2px', cursor:'pointer', transition:'all 0.15s',
                  background: form.category === c.id ? c.color + '12' : '#fafafa'
                }}>
                  <span style={{ color: form.category === c.id ? c.color : '#999' }}>{c.icon}</span>
                  <span style={{ fontSize:9, color: form.category === c.id ? c.color : '#999' }}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.7, fontWeight:500, display:'block', marginBottom:5 }}>Price</label>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#999', fontSize:13, zIndex:1 }}>$</span>
                <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="0.00" style={{ width:'100%', background:'#fafafa', border:'1px solid #e4e4e4', borderRadius:8, color:'#1a1a1a', fontSize:14, padding:'10px 12px 10px 24px', transition:'border-color 0.2s' }} />
              </div>
            </div>
            <div style={{ flex:1 }}>
              <label style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.7, fontWeight:500, display:'block', marginBottom:5 }}>Billing</label>
              <select value={form.billing} onChange={e => setForm({ ...form, billing: e.target.value })} style={{ width:'100%', background:'#fafafa', border:'1px solid #e4e4e4', borderRadius:8, color:'#1a1a1a', fontSize:14, padding:'10px 12px', appearance:'none', cursor:'pointer' }}>
                {BILLING.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize:10, color:'#999', textTransform:'uppercase', letterSpacing:0.7, fontWeight:500, display:'block', marginBottom:5 }}>Renews on day</label>
            <input type="number" min="1" max="31" value={form.renewDay} onChange={e => setForm({ ...form, renewDay: parseInt(e.target.value) || 1 })} style={{ width:'100%', background:'#fafafa', border:'1px solid #e4e4e4', borderRadius:8, color:'#1a1a1a', fontSize:14, padding:'10px 12px', transition:'border-color 0.2s' }} />
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
            {editing && <button onClick={() => deleteSub(editing.id)} style={{ background:'none', border:'none', color:'#e11d48', fontSize:12, cursor:'pointer', padding:'8px 0', fontWeight:500 }}>Delete</button>}
            <button onClick={saveForm} style={{ background:'#1a1a1a', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:500, padding:'10px 22px', cursor:'pointer', letterSpacing:0.2, marginLeft:'auto' }}>
              {editing ? 'Save Changes' : 'Add Subscription'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
