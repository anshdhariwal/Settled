import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Field } from '../components/layout'
import { IconChevronLeft } from '../components/icons'

export default function AddGeneral({ people, clanId }) {
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [fromPerson, setFromPerson] = useState(people[0]?.id || '')
  const [toPerson, setToPerson] = useState(people[1]?.id || '')
  const [amount, setAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!amount || Number(amount) <= 0 || !fromPerson || !toPerson || fromPerson === toPerson) return
    setSaving(true)
    await supabase.from('general_transactions').insert({
      clan_id: clanId,
      date,
      description: description.trim() || 'General Payment',
      from_person: fromPerson,
      to_person: toPerson,
      amount: Number(amount),
    })
    setSaving(false)
    navigate(`/clan/${clanId}`)
  }

  return (
    <div className="settled-card p-6 space-y-5">
      <div className="ph">
        <button onClick={() => navigate(`/clan/${clanId}`)} className="back-btn" title="Back">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="ph-title">New General Transaction</h2>
      </div>

      <div className="space-y-4">
        <Field label="Date">
          <input type="date" className="settled-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Description (Optional)">
          <input placeholder="e.g. WiFi bill or Cash payment" className="settled-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Payer (Who Paid)">
            <select className="settled-select" value={fromPerson} onChange={(e) => setFromPerson(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.alias}</option>
              ))}
            </select>
          </Field>
          <Field label="Recipient (Who Received)">
            <select className="settled-select" value={toPerson} onChange={(e) => setToPerson(e.target.value)}>
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.alias}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Amount">
          <div className="flex items-stretch settled-input p-0 overflow-hidden gap-0">
            <span className="flex items-center pl-3 pr-1 text-zinc-400 font-mono text-sm shrink-0 select-none pointer-events-none">₹</span>
            <input
              placeholder="0.00"
              inputMode="decimal"
              className="flex-1 bg-transparent outline-none font-mono text-sm text-white placeholder:text-zinc-600 pr-3 py-0 h-full"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, '')
                const parts = val.split('.')
                if (parts.length > 2) return
                setAmount(val)
              }}
            />
          </div>
        </Field>

        <button
          disabled={saving || !amount || fromPerson === toPerson}
          className="btn btn-p disabled:opacity-40"
          onClick={save}
        >
          {saving ? 'Saving...' : 'Save General Transaction'}
        </button>
      </div>
    </div>
  )
}
