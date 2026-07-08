import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAppointments, useAllSlots, useClientReliability } from '../../hooks'

const STATUS_LABELS = {
  pending_confirmation: { hu: 'Megerősítésre vár', color: '#e09050' },
  confirmed:            { hu: 'Megerősítve',        color: '#5aaa70' },
  approved:             { hu: 'Jóváhagyva',         color: '#5aaa70' },
  completed:            { hu: 'Teljesítve',          color: '#888'   },
  cancelled:            { hu: 'Lemondva',            color: '#888'   },
  no_show:              { hu: 'Nem jelent meg',      color: '#e05050' },
}

const LEVEL_CONFIG = {
  0: { label: 'Tiszta',           color: 'var(--text-muted)' },
  1: { label: '⚠ Warning',        color: '#e09050'           },
  2: { label: '⚠⚠ Warning',       color: '#e07030'           },
  3: { label: '🔴 Piros',         color: '#e05050'           },
  4: { label: '🚫 Blokkolt',      color: '#cc0000'           },
}

const FILTER_TABS = [
  { key: 'all',                  label: 'Mind'              },
  { key: 'pending_confirmation', label: 'Megerősítésre vár' },
  { key: 'confirmed',            label: 'Megerősítve'       },
  { key: 'no_show',              label: 'Nem jelent meg'    },
  { key: 'cancelled',            label: 'Lemondva'          },
]

export default function AdminBookings() {
  const [filter,    setFilter]    = useState('all')
  const [subTab,    setSubTab]    = useState('appointments') // appointments | slots | reliability
  const [editSlot,  setEditSlot]  = useState(null)
  const [slotForm,  setSlotForm]  = useState({})
  const [slotSaving, setSlotSaving] = useState(false)
  const [slotError,  setSlotError]  = useState('')
  const [showNewSlot, setShowNewSlot] = useState(false)
  const [editReliability, setEditReliability] = useState(null)
  const [reliabilityNote, setReliabilityNote] = useState('')
  const [reliabilityLevel, setReliabilityLevel] = useState(0)
  const [manualEmail, setManualEmail] = useState('')
  const [manualName,  setManualName]  = useState('')
  const [showManual,  setShowManual]  = useState(false)

  const { appointments, loading: apptLoading, refetch: refetchAppts } = useAppointments(filter)
  const { slots,        loading: slotsLoading, refetch: refetchSlots } = useAllSlots()
  const { clients,      loading: relLoading,   refetch: refetchRel }   = useClientReliability()

  // ── Foglalás státusz változtatás ─────────────────────────
  const updateStatus = async (id, status) => {
    await supabase.from('appointments').update({ status }).eq('id', id)
    refetchAppts()
    // Ha no_show → reliability szint növelése
    if (status === 'no_show') {
      const appt = appointments.find(a => a.id === id)
      if (appt) await bumpReliability(appt.email, appt.name, 'no_show')
    }
  }

  // ── Reliability növelés ───────────────────────────────────
  const bumpReliability = async (email, name, type) => {
    const { data } = await supabase
      .from('client_reliability')
      .select('*')
      .eq('email', email)
      .single()

    if (data) {
      const updates = { last_incident_at: new Date().toISOString() }
      if (type === 'no_show') {
        updates.no_show_count     = (data.no_show_count || 0) + 1
        updates.reliability_level = Math.min(4, (data.reliability_level || 0) + 1)
      }
      if (type === 'unconfirmed') {
        updates.unconfirmed_count = (data.unconfirmed_count || 0) + 1
        updates.reliability_level = Math.min(4, (data.reliability_level || 0) + 1)
      }
      await supabase.from('client_reliability').update(updates).eq('email', email)
    } else {
      await supabase.from('client_reliability').insert({
        email, name,
        reliability_level: 1,
        no_show_count:     type === 'no_show' ? 1 : 0,
        unconfirmed_count: type === 'unconfirmed' ? 1 : 0,
        last_incident_at:  new Date().toISOString(),
      })
    }
    refetchRel()
  }

  // ── Manuális reliability hozzáadás ───────────────────────
  const addManual = async () => {
    if (!manualEmail.trim()) return
    await supabase.from('client_reliability').upsert({
      email: manualEmail.trim(),
      name:  manualName.trim() || null,
      reliability_level: reliabilityLevel,
      notes: reliabilityNote.trim() || null,
    }, { onConflict: 'email' })
    setShowManual(false); setManualEmail(''); setManualName(''); setReliabilityNote(''); setReliabilityLevel(0)
    refetchRel()
  }

  // ── Slot mentés ───────────────────────────────────────────
  const EMPTY_SLOT = {
    title: '', description: '', service_type: 'portrait',
    slot_date: '', start_time: '', end_time: '',
    capacity: 1, visible: true,
    is_recurring: false, recurrence_rule: '', recurrence_end: '',
  }

  const openNewSlot = () => {
    setEditSlot('new')
    setSlotForm(EMPTY_SLOT)
    setSlotError('')
    setShowNewSlot(true)
  }

  const openEditSlot = (slot) => {
    setEditSlot(slot.id)
    setSlotForm({
      title:          slot.title,
      description:    slot.description || '',
      service_type:   slot.service_type,
      slot_date:      slot.slot_date,
      start_time:     slot.start_time?.slice(0,5) || '',
      end_time:       slot.end_time?.slice(0,5) || '',
      capacity:       slot.capacity,
      visible:        slot.visible,
      is_recurring:   slot.is_recurring,
      recurrence_rule: slot.recurrence_rule || '',
      recurrence_end:  slot.recurrence_end || '',
    })
    setSlotError('')
    setShowNewSlot(true)
  }

  const saveSlot = async (e) => {
    e.preventDefault()
    if (!slotForm.title || !slotForm.slot_date || !slotForm.start_time || !slotForm.end_time) {
      setSlotError('Cím, dátum és időpontok kötelezők.'); return
    }
    setSlotSaving(true); setSlotError('')
    const payload = {
      title:           slotForm.title.trim(),
      description:     slotForm.description.trim() || null,
      service_type:    slotForm.service_type,
      slot_date:       slotForm.slot_date,
      start_time:      slotForm.start_time,
      end_time:        slotForm.end_time,
      capacity:        parseInt(slotForm.capacity) || 1,
      visible:         slotForm.visible,
      is_recurring:    slotForm.is_recurring,
      recurrence_rule: slotForm.is_recurring ? slotForm.recurrence_rule : null,
      recurrence_end:  slotForm.is_recurring && slotForm.recurrence_end ? slotForm.recurrence_end : null,
    }
    const { error } = editSlot === 'new'
      ? await supabase.from('appointment_slots').insert(payload)
      : await supabase.from('appointment_slots').update(payload).eq('id', editSlot)
    if (error) { setSlotError('Hiba: ' + error.message); setSlotSaving(false); return }
    await refetchSlots()
    setShowNewSlot(false); setSlotSaving(false)
  }

  const deleteSlot = async (id) => {
    if (!window.confirm('Törlöd az időpontot és az összes hozzá tartozó foglalást?')) return
    await supabase.from('appointment_slots').delete().eq('id', id)
    refetchSlots()
  }

  return (
    <div className="acms-section">
      <div className="acms-section-header">
        <div>
          <div className="acms-section-title">Foglalások</div>
          <div className="acms-section-sub">Időpontok és megbízhatósági lista</div>
        </div>
        {subTab === 'slots' && (
          <button className="acms-btn-primary" onClick={openNewSlot}>+ Új időpont</button>
        )}
        {subTab === 'reliability' && (
          <button className="acms-btn-secondary" onClick={() => setShowManual(v => !v)}>
            + Manuális hozzáadás
          </button>
        )}
      </div>

      {/* Sub-tabok */}
      <div className="acms-subtabs">
        <button className={`acms-subtab ${subTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setSubTab('appointments')}>
          Foglalások {appointments.length > 0 && `(${appointments.length})`}
        </button>
        <button className={`acms-subtab ${subTab === 'slots' ? 'active' : ''}`}
          onClick={() => setSubTab('slots')}>
          Időpontok {slots.length > 0 && `(${slots.length})`}
        </button>
        <button className={`acms-subtab ${subTab === 'reliability' ? 'active' : ''}`}
          onClick={() => setSubTab('reliability')}>
          Megbízhatóság {clients.length > 0 && `(${clients.length})`}
        </button>
      </div>

      {/* ── FOGLALÁSOK ── */}
      {subTab === 'appointments' && (
        <>
          <div className="acms-booking-filters">
            {FILTER_TABS.map(t => (
              <button key={t.key}
                className={`filter-btn ${filter === t.key ? 'active' : ''}`}
                onClick={() => setFilter(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          {apptLoading ? <div className="admin-empty">Betöltés...</div>
          : appointments.length === 0 ? <div className="admin-empty">Nincs foglalás.</div>
          : appointments.map(a => {
            const sl = STATUS_LABELS[a.status]
            const slot = a.appointment_slots
            return (
              <div key={a.id} className="acms-booking-card">
                <div className="acms-booking-card-header">
                  <div>
                    <div className="acms-booking-name">{a.name}</div>
                    <div className="acms-booking-contact">{a.email}{a.phone ? ` · ${a.phone}` : ''}</div>
                  </div>
                  <span className="acms-booking-status" style={{ color: sl?.color }}>
                    {sl?.hu}
                  </span>
                </div>
                {slot && (
                  <div className="acms-booking-slot-info">
                    📅 {slot.slot_date} · {slot.start_time?.slice(0,5)}–{slot.end_time?.slice(0,5)} · {slot.title}
                  </div>
                )}
                {a.message && (
                  <div className="acms-booking-message">{a.message}</div>
                )}
                <div className="acms-booking-actions">
                  {a.status === 'confirmed' && (
                    <button className="acms-btn-sm" onClick={() => updateStatus(a.id, 'completed')}>
                      ✓ Teljesítve
                    </button>
                  )}
                  {['confirmed','approved','pending_confirmation'].includes(a.status) && (
                    <button className="acms-btn-sm acms-btn-danger" onClick={() => updateStatus(a.id, 'no_show')}>
                      Nem jelent meg
                    </button>
                  )}
                  {!['cancelled','completed'].includes(a.status) && (
                    <button className="acms-btn-sm" onClick={() => updateStatus(a.id, 'cancelled')}>
                      Lemondás
                    </button>
                  )}
                </div>
                <div className="acms-booking-meta">
                  {new Date(a.created_at).toLocaleString('hu-HU')}
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ── IDŐPONTOK ── */}
      {subTab === 'slots' && (
        <>
          {slotsLoading ? <div className="admin-empty">Betöltés...</div>
          : slots.length === 0 ? <div className="admin-empty">Még nincs időpont. Hozz létre egyet!</div>
          : slots.map(s => (
            <div key={s.id} className={`acms-slot-card ${!s.visible ? 'acms-hidden' : ''}`}>
              <div className="acms-slot-header">
                <div>
                  <div className="acms-slot-date">{s.slot_date} · {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}</div>
                  <div className="acms-slot-title">{s.title}</div>
                </div>
                <div className="acms-slot-capacity">
                  <span>{s.booked_count}/{s.capacity}</span>
                  <span className="acms-hint">foglalt</span>
                </div>
              </div>
              {s.is_recurring && (
                <div className="acms-hint" style={{marginBottom:'0.4rem'}}>
                  🔁 Ismétlődő: {s.recurrence_rule}
                  {s.recurrence_end ? ` · eddig: ${s.recurrence_end}` : ''}
                </div>
              )}
              <div className="acms-list-actions">
                <button className="acms-btn-sm" onClick={() => openEditSlot(s)}>Szerkeszt</button>
                <button className="acms-btn-sm" onClick={async () => {
                  await supabase.from('appointment_slots').update({ visible: !s.visible }).eq('id', s.id)
                  refetchSlots()
                }}>{s.visible ? 'Elrejt' : 'Megjelenit'}</button>
                <button className="acms-btn-sm acms-btn-danger" onClick={() => deleteSlot(s.id)}>Töröl</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ── MEGBÍZHATÓSÁG ── */}
      {subTab === 'reliability' && (
        <>
          {showManual && (
            <div className="acms-cat-panel" style={{marginBottom:'1.5rem'}}>
              <div className="acms-cat-panel-title">Manuális hozzáadás</div>
              <div className="acms-form-row">
                <div className="acms-form-group">
                  <label>Email *</label>
                  <input className="acms-input" value={manualEmail}
                    onChange={e => setManualEmail(e.target.value)} placeholder="email@cim.hu" />
                </div>
                <div className="acms-form-group">
                  <label>Név</label>
                  <input className="acms-input" value={manualName}
                    onChange={e => setManualName(e.target.value)} placeholder="Teljes név" />
                </div>
              </div>
              <div className="acms-form-group">
                <label>Szint</label>
                <select className="acms-input" value={reliabilityLevel}
                  onChange={e => setReliabilityLevel(Number(e.target.value))}>
                  {Object.entries(LEVEL_CONFIG).map(([k,v]) => (
                    <option key={k} value={k}>{k} – {v.label}</option>
                  ))}
                </select>
              </div>
              <div className="acms-form-group">
                <label>Megjegyzés</label>
                <textarea className="acms-input acms-textarea" rows={3}
                  value={reliabilityNote} onChange={e => setReliabilityNote(e.target.value)}
                  placeholder="Miért kerül fel a listára..." />
              </div>
              <div className="acms-form-actions">
                <button className="acms-btn-secondary" onClick={() => setShowManual(false)}>Mégse</button>
                <button className="acms-btn-primary" onClick={addManual}>Hozzáad</button>
              </div>
            </div>
          )}

          {relLoading ? <div className="admin-empty">Betöltés...</div>
          : clients.length === 0 ? <div className="admin-empty">A lista üres – itt jelennek meg a figyelendő ügyfelek.</div>
          : clients.map(c => {
            const lvl = LEVEL_CONFIG[c.reliability_level]
            return (
              <div key={c.id} className="acms-reliability-card">
                <div className="acms-reliability-header">
                  <div>
                    <div className="acms-booking-name">{c.name || '—'}</div>
                    <div className="acms-booking-contact">{c.email}{c.phone ? ` · ${c.phone}` : ''}</div>
                  </div>
                  <span className="acms-reliability-level" style={{ color: lvl.color }}>
                    {lvl.label}
                  </span>
                </div>
                <div className="acms-reliability-stats">
                  <span>Meg nem erősített: {c.unconfirmed_count}</span>
                  <span>Késői lemondás: {c.late_cancel_count}</span>
                  <span>Nem jelent meg: {c.no_show_count}</span>
                </div>
                {c.notes && <div className="acms-booking-message">{c.notes}</div>}
                <div className="acms-list-actions">
                  <select className="acms-input acms-input--sm"
                    value={c.reliability_level}
                    onChange={async e => {
                      await supabase.from('client_reliability')
                        .update({ reliability_level: Number(e.target.value) })
                        .eq('id', c.id)
                      refetchRel()
                    }}>
                    {Object.entries(LEVEL_CONFIG).map(([k,v]) => (
                      <option key={k} value={k}>{k} – {v.label}</option>
                    ))}
                  </select>
                  <button className="acms-btn-sm acms-btn-danger" onClick={async () => {
                    if (!window.confirm('Törlöd a bejegyzést?')) return
                    await supabase.from('client_reliability').delete().eq('id', c.id)
                    refetchRel()
                  }}>Töröl</button>
                </div>
              </div>
            )
          })}
        </>
      )}

      {/* ── SLOT FORM MODAL ── */}
      {showNewSlot && (
        <div className="acms-modal-backdrop" onClick={() => setShowNewSlot(false)}>
          <div className="acms-modal acms-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="acms-modal-header">
              <span>{editSlot === 'new' ? 'Új időpont' : 'Időpont szerkesztése'}</span>
              <button className="acms-modal-close" onClick={() => setShowNewSlot(false)}>✕</button>
            </div>
            <form onSubmit={saveSlot} className="acms-form">
              <div className="acms-form-group">
                <label>Cím *</label>
                <input className="acms-input" value={slotForm.title || ''}
                  onChange={e => setSlotForm(p => ({...p, title: e.target.value}))}
                  placeholder="pl. Portré fotózás – stúdió" />
              </div>
              <div className="acms-form-group">
                <label>Leírás (kliensnek látható)</label>
                <textarea className="acms-input acms-textarea" rows={2}
                  value={slotForm.description || ''}
                  onChange={e => setSlotForm(p => ({...p, description: e.target.value}))}
                  placeholder="Opcionális részletek az ügyfeleknek..." />
              </div>
              <div className="acms-form-row">
                <div className="acms-form-group">
                  <label>Típus</label>
                  <select className="acms-input" value={slotForm.service_type || 'portrait'}
                    onChange={e => setSlotForm(p => ({...p, service_type: e.target.value}))}>
                    <option value="portrait">Portré & Stúdió</option>
                    <option value="event">Rendezvény & Buli</option>
                    <option value="video">Videóklipp</option>
                    <option value="other">Egyéb</option>
                  </select>
                </div>
                <div className="acms-form-group">
                  <label>Kapacitás</label>
                  <input type="number" min="1" max="100" className="acms-input"
                    value={slotForm.capacity || 1}
                    onChange={e => setSlotForm(p => ({...p, capacity: e.target.value}))} />
                </div>
              </div>
              <div className="acms-form-row acms-form-row--3">
                <div className="acms-form-group">
                  <label>Dátum *</label>
                  <input type="date" className="acms-input" value={slotForm.slot_date || ''}
                    onChange={e => setSlotForm(p => ({...p, slot_date: e.target.value}))} />
                </div>
                <div className="acms-form-group">
                  <label>Kezdés *</label>
                  <input type="time" className="acms-input" value={slotForm.start_time || ''}
                    onChange={e => setSlotForm(p => ({...p, start_time: e.target.value}))} />
                </div>
                <div className="acms-form-group">
                  <label>Vége *</label>
                  <input type="time" className="acms-input" value={slotForm.end_time || ''}
                    onChange={e => setSlotForm(p => ({...p, end_time: e.target.value}))} />
                </div>
              </div>

              {/* Ismétlődés */}
              <div className="acms-form-group acms-form-group--check">
                <label>
                  <input type="checkbox" checked={slotForm.is_recurring || false}
                    onChange={e => setSlotForm(p => ({...p, is_recurring: e.target.checked}))} />
                  <span>Ismétlődő időpont</span>
                </label>
              </div>
              {slotForm.is_recurring && (
                <>
                  <div className="acms-form-group">
                    <label>Ismétlődési szabály (rrule)</label>
                    <div className="acms-booking-rrule-presets">
                      {[
                        { label: 'Minden hétfő',              value: 'FREQ=WEEKLY;BYDAY=MO' },
                        { label: 'Minden hétfő-szerda',       value: 'FREQ=WEEKLY;BYDAY=MO,WE' },
                        { label: 'Minden munkanap',           value: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR' },
                        { label: 'Minden szombat',            value: 'FREQ=WEEKLY;BYDAY=SA' },
                        { label: 'Minden héten (a fenti naptól)', value: 'FREQ=WEEKLY' },
                      ].map(p => (
                        <button key={p.value} type="button" className="acms-btn-sm"
                          onClick={() => setSlotForm(prev => ({...prev, recurrence_rule: p.value}))}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <input className="acms-input" style={{marginTop:'0.5rem'}}
                      value={slotForm.recurrence_rule || ''}
                      onChange={e => setSlotForm(p => ({...p, recurrence_rule: e.target.value}))}
                      placeholder="pl. FREQ=WEEKLY;BYDAY=MO,WE" />
                    <span className="acms-hint">Válassz egyet fentről vagy írd be kézzel</span>
                  </div>
                  <div className="acms-form-group">
                    <label>Ismétlődés vége</label>
                    <input type="date" className="acms-input" value={slotForm.recurrence_end || ''}
                      onChange={e => setSlotForm(p => ({...p, recurrence_end: e.target.value}))} />
                    <span className="acms-hint">Üresen hagyva határozatlan ideig ismétlődik</span>
                  </div>
                </>
              )}

              <div className="acms-form-group acms-form-group--check">
                <label>
                  <input type="checkbox" checked={slotForm.visible !== false}
                    onChange={e => setSlotForm(p => ({...p, visible: e.target.checked}))} />
                  <span>Látható a weboldalon</span>
                </label>
              </div>

              {slotError && <div className="acms-error">{slotError}</div>}
              <div className="acms-form-actions">
                <button type="button" className="acms-btn-secondary"
                  onClick={() => setShowNewSlot(false)}>Mégse</button>
                <button type="submit" className="acms-btn-primary" disabled={slotSaving}>
                  {slotSaving ? 'Mentés...' : 'Mentés'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
