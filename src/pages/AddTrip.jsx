import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Field } from '../components/layout'
import { IconChevronLeft, IconChevronRight, IconTrash, IconPlus } from '../components/icons'

function ShareSelector({ people, selected, onChange, shakeShare }) {
  const allSelected = selected.length === people.length
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
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-zinc-400 font-medium">Shared By:</span>
        <button type="button" onClick={toggleAll} className="text-amber-400 font-semibold hover:underline">
          {allSelected ? 'Clear All' : 'Select All'}
        </button>
      </div>
      <div className={`flex flex-wrap gap-1.5 rounded-lg transition-all ${shakeShare ? 'field-shake' : ''}`}>
        {people.map((p) => {
          const active = selected.includes(p.id)
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                active
                  ? 'bg-zinc-200 text-zinc-900 border-zinc-300'
                  : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200'
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

  function triggerShake(fields) {
    setShakeFields(fields)
    setTimeout(() => setShakeFields([]), 420)
  }

  const itemTotal = itemDrafts.reduce((sum, i) => sum + Number(i.price || 0), 0)
  const payTotal = payDrafts.reduce((sum, p) => sum + Number(p.amount || 0), 0)

  function addItem() {
    const missing = []
    if (!itemName.trim()) missing.push('name')
    if (!itemPrice || Number(itemPrice) <= 0) missing.push('price')
    if (itemShare.length === 0) missing.push('share')
    if (missing.length > 0) { triggerShake(missing); return }
    setItemDrafts([...itemDrafts, { name: itemName.trim(), price: Number(itemPrice), shared_by: itemShare }])
    setItemName('')
    setItemPrice('')
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
            <Field label="Trip Date">
              <input type="date" className="settled-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label="Store / Place">
              <input placeholder="e.g. Grocery Mart" className="settled-input" value={place} onChange={(e) => setPlace(e.target.value)} />
            </Field>
          </div>

          {itemDrafts.length > 0 && (
            <div className="space-y-2">
              <p className="sec-lbl">Added Items ({itemDrafts.length})</p>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800 overflow-hidden">
                {itemDrafts.map((it, idx) => (
                  <div key={idx} className="px-3 py-2.5 text-xs flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-md bg-zinc-800 border border-zinc-700/60 text-zinc-400 font-mono text-[10px] font-semibold flex items-center justify-center shrink-0">
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
                      <span className="font-mono text-blue-400 font-semibold">₹{it.price}</span>
                      <button className="icon-btn text-zinc-500 hover:text-rose-400" onClick={() => setItemDrafts(itemDrafts.filter((_, i) => i !== idx))}>
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
                placeholder="Item name (e.g. Milk)"
                className={`settled-input col-span-2 ${shakeFields.includes('name') ? 'field-shake' : ''}`}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
              <div className={`relative col-span-1 flex items-stretch settled-input p-0 overflow-hidden gap-0 ${shakeFields.includes('price') ? 'field-shake' : ''}`}>
                <span className="flex items-center pl-0 pr-2 text-zinc-400 font-mono text-xs shrink-0 select-none pointer-events-none">₹</span>
                <input
                  placeholder="0.00"
                  inputMode="decimal"
                  className="flex-1 min-w-0 bg-transparent outline-none font-mono text-xs text-white placeholder:text-zinc-500 pr-2 py-0 h-full"
                  value={itemPrice}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '')
                    const parts = val.split('.')
                    if (parts.length > 2) return
                    setItemPrice(val)
                  }}
                />
              </div>
            </div>
            <ShareSelector people={people} selected={itemShare} onChange={setItemShare} shakeShare={shakeFields.includes('share')} />
            <div className="flex justify-end">
              <button
                className={`btn btn-sm w-auto px-4 flex items-center gap-1.5 transition-all ${
                  !itemName.trim() || !itemPrice || itemShare.length === 0
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
            <span className="font-mono font-bold text-blue-400 text-sm">₹{itemTotal}</span>
          </div>

          <button
            disabled={itemDrafts.length === 0}
            className="btn btn-p disabled:opacity-40 flex items-center justify-center gap-2"
            onClick={() => setStep('payments')}
          >
            <span>Next: Payment Breakdown</span>
            <IconChevronRight className="w-4 h-4 text-zinc-950" />
          </button>
        </div>
      )}

      {step === 'payments' && (
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1">
            <p className="text-zinc-300 font-semibold">Total to Cover: <span className="text-blue-400 font-mono">₹{itemTotal}</span></p>
            <p className="text-zinc-500">Current Payments Total: <span className={`font-mono font-semibold ${payTotal === itemTotal ? 'text-emerald-400' : 'text-rose-400'}`}>₹{payTotal}</span></p>
          </div>

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
    </div>
  )
}
