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
  const [errorMsg, setErrorMsg] = useState('')

  async function save() {
    if (!amount || Number(amount) <= 0 || !fromPerson || !toPerson || fromPerson === toPerson) return
    setSaving(true)
    setErrorMsg('')
    const { error: insertError } = await supabase.from('general_transactions').insert({
      clan_id: clanId,
      date,
      description: description.trim() || 'General Payment',
      from_person: fromPerson,
      to_person: toPerson,
      amount: Number(amount),
    })
    setSaving(false)
    if (insertError) {
      setErrorMsg('Failed to record transaction. Please try again.')
      return
    }
    navigate('/clan')
  }

  return (
    <div className="settled-card p-6 space-y-5">
      <div className="ph">
        <button onClick={() => navigate('/clan')} className="back-btn" title="Back">
          <IconChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="ph-title">New General Transaction</h2>
      </div>

      {errorMsg && (
        <p className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
          {errorMsg}
        </p>
      )}

      {people.length < 2 ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs space-y-3">
          <p className="font-semibold text-sm">Need At Least 2 Members</p>
          <p className="leading-relaxed text-zinc-300">
            Direct peer payments require at least two members in the clan (a Payer and a Recipient). Share your clan join code to add another member!
          </p>
          <button onClick={() => navigate('/clan')} className="btn btn-s btn-sm text-xs px-4">
            Back to Dashboard
          </button>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); if (!saving && amount && fromPerson !== toPerson) save(); }} className="space-y-4">
        <Field label="Date">
          <input type="date" className="settled-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        <Field label="Description (Optional)">
          <input placeholder="e.g. WiFi bill or Cash payment" maxLength={15} className="settled-input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Payer (Who Paid)">
            <select
              className="settled-select"
              value={fromPerson}
              onChange={(e) => {
                const newFrom = e.target.value
                setFromPerson(newFrom)
                const firstOther = people.find((p) => p.id !== newFrom)
                if (firstOther) setToPerson(firstOther.id)
              }}
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>{p.alias}</option>
              ))}
            </select>
          </Field>
          <Field label="Recipient (Who Received)">
            <select className="settled-select" value={toPerson} onChange={(e) => setToPerson(e.target.value)}>
              {people.filter((p) => p.id !== fromPerson).map((p) => (
                <option key={p.id} value={p.id}>{p.alias}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Amount">
          <div className="flex items-stretch settled-input p-0 overflow-hidden gap-0">
            <span className="flex items-center pl-0 pr-2 text-zinc-400 font-mono text-sm shrink-0 select-none pointer-events-none">₹</span>
            <input
              placeholder="0.00"
              inputMode="decimal"
              maxLength={7}
              className="flex-1 min-w-0 bg-transparent outline-none font-mono text-sm text-white placeholder:text-zinc-500 pr-3 py-0 h-full"
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
          type="submit"
          disabled={saving || !amount || fromPerson === toPerson}
          className="btn btn-p disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save General Transaction'}
        </button>
      </form>
      )}
    </div>
  )
}
