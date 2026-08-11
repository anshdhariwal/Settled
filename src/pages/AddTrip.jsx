import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Field } from '../components/layout'
import { IconChevronLeft, IconChevronRight, IconTrash, IconPlus, IconCalendar, IconMapPin } from '../components/icons'
import { formatINR } from '../lib/formatINR'

function ShareSelector({ people, selected, onChange, shakeShare }) {
  const allSelected = people.length > 0 && selected.length === people.length

  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
    } else {
      onChange([...selected, id])
    }
  }

  function toggleAll() {
    if (allSelected) {
      onChange([])
    } else {
      onChange(people.map((p) => p.id))
    }
  }

  return (
    <div className={`space-y-1.5 ${shakeShare ? 'field-shake' : ''}`}>
      <div className="flex justify-between items-center">
        <label className="text-zinc-400 font-medium text-xs">Shared By</label>
        <button
          type="button"
          className="text-[11px] text-blue-400 hover:underline font-medium"
          onClick={toggleAll}
        >
          {allSelected ? 'Clear All' : 'Select All'}
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {people.map((p) => {
          const active = selected.includes(p.id)
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                active
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/50 hover:bg-zinc-700/60'
              }`}
            >
              {p.alias}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AddTrip({ people, clanId }) {
  const navigate = useNavigate()
  const itemNameInputRef = useRef(null)
  const [step, setStep] = useState('items')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [place, setPlace] = useState('')
  const [itemDrafts, setItemDrafts] = useState([])

  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemShare, setItemShare] = useState(people.map((p) => p.id))

  const [payDrafts, setPayDrafts] = useState(people.map((p) => ({ person_id: p.id, amount: '' })))
  const [saving, setSaving] = useState(false)
  const [shakeFields, setShakeFields] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  function triggerShake(fields) {
    setShakeFields(fields)
    setTimeout(() => setShakeFields([]), 420)
  }

  const itemTotal = itemDrafts.reduce((sum, i) => sum + Number(i.price || 0), 0)
  const payTotal = payDrafts.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const remainingAmount = itemTotal - payTotal

  function addItem() {
    const missing = []
    if (!itemName.trim()) missing.push('name')
    if (!itemPrice || Number(itemPrice) <= 0) missing.push('price')
    if (itemShare.length === 0) missing.push('share')
    if (missing.length > 0) { triggerShake(missing); return }
    setItemDrafts([...itemDrafts, { name: itemName.trim(), price: Number(itemPrice), shared_by: itemShare }])
    setItemName('')
    setItemPrice('')
    itemNameInputRef.current?.focus()
  }

  async function save() {
    if (itemDrafts.length === 0 || payTotal !== itemTotal) return
    setSaving(true)
    const { data: trip } = await supabase
      .from('buy_trips')
      .insert({ clan_id: clanId, date, place: place.trim() || 'Buy Trip' })
      .select()
      .single()

    for (const it of itemDrafts) {
      const { data: item } = await supabase
        .from('trip_items')
        .insert({ trip_id: trip.id, name: it.name, price: it.price })
        .select()
        .single()
      await supabase.from('trip_item_shares').insert(it.shared_by.map((pid) => ({ item_id: item.id, person_id: pid })))
    }

    const realPayments = payDrafts.filter((p) => Number(p.amount) > 0)
    if (realPayments.length > 0) {
      await supabase.from('trip_payments').insert(realPayments.map((p) => ({ trip_id: trip.id, person_id: p.person_id, amount: Number(p.amount) })))
    }

    setSaving(false)
    navigate(`/clan/${clanId}`)
  }

  function handleHeaderBack() {
    if (step === 'payments') {
      setStep('items')
    } else {
      navigate(`/clan/${clanId}`)
    }
  }

  return (
    <div className="settled-card p-6 space-y-5">
      <div className="ph">
        <button onClick={handleHeaderBack} className="back-btn" title="Back">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="ph-title">
          {step === 'payments' ? 'Payment Breakdown' : 'New Buy Trip (Itemized)'}
        </h2>
      </div>

      {step === 'items' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={
              <span className="inline-flex items-center gap-1.5">
                <IconCalendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Trip Date</span>
              </span>
            }>
              <input type="date" className="settled-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={
              <span className="inline-flex items-center gap-1.5">
                <IconMapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Store / Place</span>
              </span>
            }>
              <input placeholder="e.g. Grocery Mart" className="settled-input" value={place} onChange={(e) => setPlace(e.target.value)} />
            </Field>
          </div>

          {itemDrafts.length > 0 && (
            <div className="space-y-2">
              <p className="sec-lbl">Added Items ({itemDrafts.length})</p>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800 max-h-42 overflow-y-auto custom-scrollbar">
                {itemDrafts.map((it, idx) => (
                  <div key={idx} className="px-3 py-2.5 text-xs flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700/60 text-white font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{it.name}</p>
                        <p className="text-[10px] text-zinc-400 truncate">
                          Shared by: {it.shared_by.map((id) => people.find((p) => p.id === id)?.alias).filter(Boolean).join(', ')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono text-blue-400 font-semibold">₹{formatINR(it.price)}</span>
                      <button className="icon-btn icon-btn-danger text-zinc-400" onClick={() => setItemDrafts(itemDrafts.filter((_, i) => i !== idx))}>
                        <div className="squish"></div>
                        <IconTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <input
                ref={itemNameInputRef}
                placeholder="Item name (e.g. Milk)"
                maxLength={40}
                className={`settled-input col-span-2 ${shakeFields.includes('name') ? 'field-shake' : ''}`}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addItem()
                  }
                }}
              />
              <div className={`relative col-span-1 flex items-stretch settled-input p-0 overflow-hidden gap-0 ${shakeFields.includes('price') ? 'field-shake' : ''}`}>
                <span className="flex items-center pl-0 pr-2 text-zinc-400 font-mono text-xs shrink-0 select-none pointer-events-none">₹</span>
                <input
                  placeholder="0.00"
                  inputMode="decimal"
                  maxLength={9}
                  className="flex-1 min-w-0 bg-transparent outline-none font-mono text-xs text-white placeholder:text-zinc-500 pr-2 py-0 h-full"
                  value={itemPrice}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '')
                    const parts = val.split('.')
                    if (parts.length > 2) return
                    setItemPrice(val)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addItem()
                    }
                  }}
                />
              </div>
            </div>
            <ShareSelector people={people} selected={itemShare} onChange={setItemShare} shakeShare={shakeFields.includes('share')} />
            <div className="flex justify-end">
              <button
                className={`btn btn-sm w-auto px-4 flex items-center gap-1.5 transition-all ${!itemName.trim() || !itemPrice || itemShare.length === 0
                    ? 'btn-s opacity-40 cursor-not-allowed'
                    : 'btn-emerald font-semibold shadow-sm'
                  }`}
                onClick={addItem}
              >
                <IconPlus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <span className="text-zinc-400 font-medium">Trip Total:</span>
            <span className="font-mono font-bold text-blue-400 text-sm">₹{formatINR(itemTotal)}</span>
          </div>

          <button
            disabled={itemDrafts.length === 0}
            className="btn btn-p disabled:opacity-40 flex items-center justify-center gap-2"
            onClick={() => setShowConfirmModal(true)}
          >
            <span>Next: Payment Breakdown</span>
            <IconChevronRight className="w-4 h-4 text-zinc-950" />
          </button>
        </div>
      )}

      {step === 'payments' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 font-medium">Total to Cover:</span>
              <span className="text-blue-400 font-mono font-bold">₹{formatINR(itemTotal)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400 font-medium">Current Payments Total:</span>
              <span className={`font-mono font-bold ${payTotal === itemTotal ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{formatINR(payTotal)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-1.5 border-t border-zinc-800/80">
              <span className="text-zinc-400 font-medium">Remaining Amount:</span>
              <span className={`font-mono font-bold ${remainingAmount === 0 ? 'text-emerald-400' : remainingAmount < 0 ? 'text-amber-400' : 'text-rose-400'}`}>
                ₹{formatINR(Math.abs(remainingAmount))} {remainingAmount < 0 ? '(Overpaid)' : ''}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="sec-lbl">Who paid the bill ?</p>
            <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
              {payDrafts.map((p, idx) => (
                <div key={p.person_id} className="flex justify-between items-center p-3">
                  <span className="text-sm font-medium text-white truncate min-w-0 flex-1 mr-3">
                    {people.find((pp) => pp.id === p.person_id)?.alias}
                  </span>
                  <div className="flex items-stretch settled-input p-0 overflow-hidden gap-0 shrink-0 !w-[120px]">
                    <span className="flex items-center pl-3 pr-1 text-zinc-400 font-mono text-xs shrink-0 select-none pointer-events-none">₹</span>
                    <input
                      placeholder="0.00"
                      inputMode="decimal"
                      className="flex-1 min-w-0 bg-transparent outline-none font-mono text-xs text-white placeholder:text-zinc-500 pr-2 py-0 h-full text-right"
                      value={p.amount}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9.]/g, '')
                        const parts = val.split('.')
                        if (parts.length > 2) return
                        const next = [...payDrafts]
                        next[idx] = { ...next[idx], amount: val }
                        setPayDrafts(next)
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn btn-s flex-1" onClick={() => setStep('items')}>Back to Items</button>
            <button
              disabled={saving || itemDrafts.length === 0 || payTotal !== itemTotal}
              className="btn btn-p flex-1 disabled:opacity-40"
              onClick={save}
            >
              {saving ? 'Saving...' : 'Save Buy Trip'}
            </button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 action-sheet-bg" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm settled-card p-5 space-y-4 border border-zinc-700/60 action-sheet text-left">
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-white">Proceed to Payment Breakdown?</h3>
              <p className="text-xs text-zinc-400">
                You have added <strong className="text-white">{itemDrafts.length} item{itemDrafts.length !== 1 ? 's' : ''}</strong> totaling <strong className="text-blue-400 font-mono">₹{formatINR(itemTotal)}</strong>. Have you added all items from your trip?
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn btn-s flex-1 text-xs" onClick={() => setShowConfirmModal(false)}>
                Add More Items
              </button>
              <button
                className="btn btn-p flex-1 text-xs font-semibold"
                onClick={() => {
                  setShowConfirmModal(false)
                  setStep('payments')
                }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
