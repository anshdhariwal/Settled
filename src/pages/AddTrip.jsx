import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Field } from '../components/layout'
import { IconChevronLeft, IconChevronRight, IconPlus, IconTrash, IconSuccessTick } from '../components/icons'

function ShareSelector({ people, selected, onChange }) {
  function toggle(id) {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Shared By ({selected.length}/{people.length})</label>
        <div className="flex gap-2">
          <button type="button" className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700" onClick={() => onChange(people.map((p) => p.id))}>Select All</button>
          <button type="button" className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700" onClick={() => onChange([])}>Clear</button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {people.map((p) => {
          const isSelected = selected.includes(p.id)
          return (
            <button
              type="button"
              key={p.id}
              onClick={() => toggle(p.id)}
              className={`p-2.5 rounded-xl text-xs font-medium border transition-all text-center flex items-center justify-center gap-1.5 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 font-semibold'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {isSelected && <IconSuccessTick className="w-3.5 h-3.5 text-amber-400" />}
              <span>{p.alias}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function AddTrip({ people, personId, clanId }) {
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [place, setPlace] = useState('')
  const [itemDrafts, setItemDrafts] = useState([])
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemShare, setItemShare] = useState(people.map((p) => p.id))
  const [payDrafts, setPayDrafts] = useState(people.map((p) => ({ person_id: p.id, amount: '' })))
  const [step, setStep] = useState('items')
  const [saving, setSaving] = useState(false)

  const itemTotal = itemDrafts.reduce((sum, it) => sum + it.price, 0)
  const payTotal = payDrafts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  function addItem() {
    if (!itemName.trim() || !itemPrice || Number(itemPrice) <= 0 || itemShare.length === 0) return
    setItemDrafts([...itemDrafts, { name: itemName.trim(), price: Number(itemPrice), shared_by: itemShare }])
    setItemName('')
    setItemPrice('')
    setItemShare(people.map((p) => p.id))
  }

  async function save() {
    setSaving(true)
    const { data: trip } = await supabase
      .from('trips')
      .insert({ clan_id: clanId, date, place: place.trim(), created_by: personId })
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

  return (
    <div className="settled-card p-6 space-y-5">
      <div className="ph">
        <button onClick={() => navigate(`/clan/${clanId}`)} className="back-btn" title="Back">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="ph-title">New Buy Trip (Itemized)</h2>
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
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">Added Items ({itemDrafts.length})</label>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 divide-y divide-zinc-800 overflow-hidden">
                {itemDrafts.map((it, idx) => (
                  <div key={idx} className="px-3 py-2.5 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{it.name}</p>
                      <p className="text-[10px] text-zinc-400">Shared by {it.shared_by.length} members</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-amber-400 font-semibold">₹{it.price}</span>
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
              <input placeholder="Item name (e.g. Milk)" className="settled-input col-span-2" value={itemName} onChange={(e) => setItemName(e.target.value)} />
              <input placeholder="₹ Price" type="number" className="settled-input font-mono" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
            </div>
            <ShareSelector people={people} selected={itemShare} onChange={setItemShare} />
            <button className="btn btn-s btn-sm w-full flex items-center justify-center gap-1.5" onClick={addItem}>
              <IconPlus className="w-3.5 h-3.5" />
              <span>Add Item to Trip</span>
            </button>
          </div>

          <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <span className="text-zinc-400 font-medium">Trip Total:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">₹{itemTotal}</span>
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
            <p className="text-zinc-300 font-semibold">Total to Cover: <span className="text-amber-400 font-mono">₹{itemTotal}</span></p>
            <p className="text-zinc-500">Current Payments Total: <span className={`font-mono font-semibold ${payTotal === itemTotal ? 'text-emerald-400' : 'text-rose-400'}`}>₹{payTotal}</span></p>
          </div>

          <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
            {payDrafts.map((p, idx) => (
              <div key={p.person_id} className="flex justify-between items-center p-3">
                <span className="text-xs font-semibold text-white">{people.find((pp) => pp.id === p.person_id)?.alias}</span>
                <input
                  type="number"
                  placeholder="₹0"
                  className="w-28 settled-input text-right font-mono text-xs"
                  value={p.amount}
                  onChange={(e) => {
                    const next = [...payDrafts]
                    next[idx] = { ...next[idx], amount: e.target.value }
                    setPayDrafts(next)
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button className="btn btn-s flex-1 flex items-center justify-center gap-1" onClick={() => setStep('items')}>
              <IconChevronLeft className="w-4 h-4" />
              <span>Items</span>
            </button>
            <button
              disabled={saving || payDrafts.every((p) => !p.amount)}
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
