import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Field } from '../components/layout'
import { IconChevronLeft, IconChevronRight, IconTrash, IconPlus, IconCalendar, IconMapPin, IconChevronUp, IconChevronDown, IconPencil, IconSuccessTick } from '../components/icons'
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
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${active
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

export default function AddTrip({ people, clanId, personId, editingTrip, onDoneEditing }) {
  const navigate = useNavigate()
  const itemNameInputRef = useRef(null)
  const [step, setStep] = useState('items')
  const [date, setDate] = useState(editingTrip?.date || new Date().toISOString().slice(0, 10))
  const [place, setPlace] = useState(editingTrip?.place || '')
  const [itemDrafts, setItemDrafts] = useState(
    editingTrip?.items ? editingTrip.items.map((it) => ({ name: it.name, price: Number(it.price), shared_by: it.shared_by || [] })) : []
  )
  const [expandedItemsArea, setExpandedItemsArea] = useState(false)

  const [editingItemIdx, setEditingItemIdx] = useState(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemPrice, setEditItemPrice] = useState('')
  const [editItemShare, setEditItemShare] = useState([])

  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemShare, setItemShare] = useState(people.map((p) => p.id))

  const [payDrafts, setPayDrafts] = useState(
    people.map((p) => {
      const existingPay = editingTrip?.payments?.find((pay) => pay.person_id === p.id)
      return { person_id: p.id, amount: existingPay ? String(existingPay.amount) : '' }
    })
  )
  const [saving, setSaving] = useState(false)
  const [shakeFields, setShakeFields] = useState([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  function startEditingItem(idx) {
    const item = itemDrafts[idx]
    setEditingItemIdx(idx)
    setEditItemName(item.name)
    setEditItemPrice(String(item.price))
    setEditItemShare([...item.shared_by])
  }

  function saveEditingItem(idx) {
    if (!editItemName.trim() || !editItemPrice || Number(editItemPrice) <= 0 || editItemShare.length === 0) {
      return
    }
    const updated = [...itemDrafts]
    updated[idx] = {
      name: editItemName.trim(),
      price: Number(editItemPrice),
      shared_by: editItemShare,
    }
    setItemDrafts(updated)
    setEditingItemIdx(null)
  }

  function triggerShake(fields) {
    setShakeFields(fields)
    setTimeout(() => setShakeFields([]), 420)
  }

  const itemTotal = itemDrafts.reduce((sum, i) => sum + Number(i.price || 0), 0)
  const payTotal = payDrafts.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const remainingAmount = itemTotal - payTotal

  function addItem() {
    const missing = []
    if (!place.trim()) missing.push('place')
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
    if (!place.trim()) {
      triggerShake(['place'])
      return
    }
    if (itemDrafts.length === 0 || payTotal !== itemTotal) return
    setSaving(true)

    try {
      let tripId = editingTrip?.id
      const creatorId = personId || people[0]?.id

      if (editingTrip) {
        await supabase.from('trips').update({ date, place: place.trim(), created_by: creatorId }).eq('id', editingTrip.id)
        const existingItemIds = (editingTrip.items || []).map((i) => i.id).filter(Boolean)
        if (existingItemIds.length > 0) {
          await supabase.from('trip_item_shares').delete().in('item_id', existingItemIds)
        }
        await supabase.from('trip_payments').delete().eq('trip_id', editingTrip.id)
        await supabase.from('trip_items').delete().eq('trip_id', editingTrip.id)
      } else {
        const { data: trip, error: tripErr } = await supabase
          .from('trips')
          .insert({ clan_id: clanId, date, place: place.trim(), created_by: creatorId })
          .select()
          .single()

        if (tripErr || !trip) {
          console.error('Error inserting trip:', tripErr)
          return
        }
        tripId = trip.id
      }

      for (const it of itemDrafts) {
        const { data: item, error: itemErr } = await supabase
          .from('trip_items')
          .insert({ trip_id: tripId, name: it.name, price: it.price })
          .select()
          .single()

        if (itemErr || !item) {
          console.error('Error inserting item:', itemErr)
          continue
        }
        await supabase.from('trip_item_shares').insert(it.shared_by.map((pid) => ({ item_id: item.id, person_id: pid })))
      }

      const realPayments = payDrafts.filter((p) => Number(p.amount) > 0)
      if (realPayments.length > 0) {
        await supabase.from('trip_payments').insert(realPayments.map((p) => ({ trip_id: tripId, person_id: p.person_id, amount: Number(p.amount) })))
      }

      if (onDoneEditing) onDoneEditing()
      navigate(`/clan/${clanId}/trip/${tripId}`)
    } catch (err) {
      console.error('Error during trip save:', err)
    } finally {
      setSaving(false)
    }
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
          {step === 'payments' ? 'Payment Breakdown' : (editingTrip ? 'Edit Buy Trip' : 'New Buy Trip (Itemized)')}
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
              <input placeholder="e.g. Grocery Mart (Required)" maxLength={15} className={`settled-input ${shakeFields.includes('place') ? 'field-shake' : ''}`} value={place} onChange={(e) => setPlace(e.target.value)} />
            </Field>
          </div>

          {itemDrafts.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="sec-lbl">Added Items ({itemDrafts.length})</p>
                {itemDrafts.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setExpandedItemsArea(!expandedItemsArea)}
                    className="icon-btn text-zinc-400 hover:text-white transition-all p-1"
                    title={expandedItemsArea ? "Collapse visible area" : "Double visible items area"}
                    aria-label={expandedItemsArea ? "Collapse" : "Expand"}
                  >
                    <div className="squish"></div>
                    {expandedItemsArea ? (
                      <IconChevronUp className="w-4 h-4 text-blue-400" />
                    ) : (
                      <IconChevronDown className="w-4 h-4 text-zinc-400" />
                    )}
                  </button>
                )}
              </div>
              <div className={`rounded-xl border border-zinc-800 bg-zinc-900/60 transition-all duration-200 overflow-y-auto custom-scrollbar ${
                expandedItemsArea ? 'max-h-92' : 'max-h-46'
              }`}>
                {itemDrafts.map((it, idx) => {
                  const isEditingThis = editingItemIdx === idx

                  return (
                    <div key={idx} className={`px-3.5 py-3 flex flex-col gap-1.5 border-b border-zinc-800/60 last:border-b-0 transition-colors ${isEditingThis ? 'bg-zinc-800/40' : ''}`}>
                      {/* Top Line: Badge + Item Name (Left) & Pencil/Tick + Trash (Top Right) */}
                      <div className="flex justify-between items-center gap-2 w-full">
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700/80 text-white font-bold text-xs flex items-center justify-center shrink-0 leading-none select-none shadow-xs">
                            {idx + 1}
                          </span>
                          {isEditingThis ? (
                            <input
                              className="font-semibold text-sm text-white bg-transparent border-b border-zinc-700 focus:border-zinc-400 outline-none w-full max-w-[160px] py-0 leading-tight"
                              value={editItemName}
                              maxLength={15}
                              onChange={(e) => setEditItemName(e.target.value)}
                              placeholder="Item name"
                              autoFocus
                            />
                          ) : (
                            <p className="font-semibold text-sm text-white truncate">{it.name}</p>
                          )}
                        </div>

                        {/* Top Right Action Buttons */}
                        <div className="flex items-center gap-1 shrink-0 select-none">
                          {isEditingThis ? (
                            <button
                              type="button"
                              className="w-5 h-5 flex items-center justify-center text-emerald-400 hover:text-emerald-300 rounded transition-colors shrink-0"
                              onClick={() => saveEditingItem(idx)}
                              title="Save edits"
                            >
                              <IconSuccessTick className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-zinc-200 rounded transition-colors shrink-0"
                              onClick={() => startEditingItem(idx)}
                              title="Edit item"
                            >
                              <IconPencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            type="button"
                            className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-rose-400 rounded transition-colors shrink-0"
                            onClick={() => {
                              if (editingItemIdx === idx) setEditingItemIdx(null)
                              setItemDrafts(itemDrafts.filter((_, i) => i !== idx))
                            }}
                            title="Delete item"
                          >
                            <IconTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Line: Shared By (Bottom Left) & Price (Bottom Right) */}
                      <div className="flex justify-between items-center gap-2 w-full pl-8.5">
                        {isEditingThis ? (
                          <div className="text-xs text-zinc-400 select-none flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-normal flex-1 min-w-0">
                            <span className="text-zinc-400 font-medium shrink-0">Shared by:</span>
                            {people.map((p, pIdx) => {
                              const isSelected = editItemShare.includes(p.id)
                              return (
                                <span key={p.id} className="inline-flex items-center">
                                  <span
                                    onClick={() => {
                                      if (isSelected) {
                                        if (editItemShare.length > 1) {
                                          setEditItemShare(editItemShare.filter((id) => id !== p.id))
                                        }
                                      } else {
                                        setEditItemShare([...editItemShare, p.id])
                                      }
                                    }}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'text-white font-semibold'
                                        : 'text-zinc-500 line-through opacity-50 hover:opacity-90'
                                    }`}
                                    title={`Click to ${isSelected ? 'exclude' : 'include'} ${p.alias}`}
                                  >
                                    {p.alias}
                                  </span>
                                  {pIdx < people.length - 1 && <span className="text-zinc-500 mr-0.5">,</span>}
                                </span>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-xs text-zinc-400 flex flex-wrap items-center gap-x-1 gap-y-0.5 leading-normal flex-1 min-w-0">
                            <span className="text-zinc-400 shrink-0">Shared by:</span>
                            {it.shared_by.map((id, sIdx) => {
                              const alias = people.find((p) => p.id === id)?.alias
                              if (!alias) return null
                              return (
                                <span key={id} className="text-zinc-200 font-medium inline-flex items-center">
                                  <span>{alias}</span>
                                  {sIdx < it.shared_by.length - 1 && <span className="text-zinc-500 mr-0.5">,</span>}
                                </span>
                              )
                            })}
                          </div>
                        )}

                        {/* Price on Bottom Right */}
                        <div className="shrink-0 select-none ml-2">
                          {isEditingThis ? (
                            <div className="flex items-center border-b border-zinc-700 focus-within:border-zinc-400 pb-0.5">
                              <span className="font-mono text-blue-400 font-bold text-sm select-none">₹</span>
                              <input
                                inputMode="decimal"
                                maxLength={7}
                                className="font-mono text-blue-400 font-bold text-sm bg-transparent outline-none w-14 text-right py-0"
                                value={editItemPrice}
                                onChange={(e) => setEditItemPrice(e.target.value.replace(/[^0-9.]/g, ''))}
                                placeholder="0.00"
                              />
                            </div>
                          ) : (
                            <span className="font-mono text-blue-400 font-bold text-sm">₹{formatINR(it.price)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <input
                ref={itemNameInputRef}
                placeholder="Item name (e.g. Milk)"
                maxLength={15}
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
                  maxLength={7}
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
                      maxLength={7}
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
              {saving ? (editingTrip ? 'Updating...' : 'Saving...') : (editingTrip ? 'Update Buy Trip' : 'Save Buy Trip')}
            </button>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 action-sheet-bg" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
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
