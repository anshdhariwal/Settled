import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { calculateBalances } from './lib/calculateBalances'

const CLAN_ID_KEY = 'settled_clan_id'
const MEMBER_ID_KEY = 'settled_member_id'

function randomJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

export default function App() {
  const [clanId, setClanId] = useState(localStorage.getItem(CLAN_ID_KEY) || '')
  const [memberId, setMemberId] = useState(localStorage.getItem(MEMBER_ID_KEY) || '')

  function enterClan(newClanId, newMemberId) {
    localStorage.setItem(CLAN_ID_KEY, newClanId)
    localStorage.setItem(MEMBER_ID_KEY, newMemberId)
    setClanId(newClanId)
    setMemberId(newMemberId)
  }

  function exitClan() {
    localStorage.removeItem(CLAN_ID_KEY)
    localStorage.removeItem(MEMBER_ID_KEY)
    setClanId('')
    setMemberId('')
  }

  if (!clanId || !memberId) {
    return <Landing onEnter={enterClan} />
  }

  return <ClanApp clanId={clanId} memberId={memberId} onExit={exitClan} />
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased flex items-center justify-center p-6">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}

function Landing({ onEnter }) {
  const [mode, setMode] = useState('landing') // landing | create | join

  if (mode === 'create') return <CreateClan onEnter={onEnter} onBack={() => setMode('landing')} />
  if (mode === 'join') return <JoinClan onEnter={onEnter} onBack={() => setMode('landing')} />

  return (
    <Shell>
      <div className="space-y-8 text-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Settled</h1>
          <p className="text-zinc-500 text-sm">Split expenses with your group</p>
        </div>
        <div className="space-y-3">
          <button
            className="w-full rounded-xl bg-zinc-100 text-zinc-900 p-4 font-medium hover:bg-white transition-colors"
            onClick={() => setMode('create')}
          >
            Create a clan
          </button>
          <button
            className="w-full rounded-xl border border-zinc-800 p-4 font-medium hover:bg-zinc-900 transition-colors"
            onClick={() => setMode('join')}
          >
            Join a clan
          </button>
        </div>
      </div>
    </Shell>
  )
}

function CreateClan({ onEnter, onBack }) {
  const [step, setStep] = useState('form') // form | success
  const [clanName, setClanName] = useState('')
  const [alias, setAlias] = useState('')
  const [passcode, setPasscode] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function create() {
    if (!clanName || !alias || !passcode) {
      setError('Fill in all fields.')
      return
    }
    setError('')
    const join_code = randomJoinCode()
    const { data: clan, error: clanErr } = await supabase
      .from('clans')
      .insert({ name: clanName, join_code, passcode })
      .select()
      .single()
    if (clanErr) {
      setError('Could not create clan. Try again.')
      return
    }
    const { data: member, error: memberErr } = await supabase
      .from('clan_members')
      .insert({ clan_id: clan.id, alias, is_creator: true })
      .select()
      .single()
    if (memberErr) {
      setError('Could not create your profile. Try again.')
      return
    }
    setResult({ clanId: clan.id, memberId: member.id, joinCode: join_code })
    setStep('success')
  }

  if (step === 'success' && result) {
    return (
      <Shell>
        <div className="space-y-6 text-center">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight">Clan created</h2>
            <p className="text-zinc-500 text-sm">Share this code with your group</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <p className="text-3xl font-bold tracking-[0.3em]">{result.joinCode}</p>
          </div>
          <p className="text-xs text-zinc-500">
            They'll need this code and the passcode you set. Passcodes aren't recoverable from here — remember it.
          </p>
          <button
            className="w-full rounded-xl bg-zinc-100 text-zinc-900 p-3 font-medium hover:bg-white transition-colors"
            onClick={() => onEnter(result.clanId, result.memberId)}
          >
            Continue
          </button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight">Create a clan</h2>
          <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300">Back</button>
        </div>
        <div className="space-y-3">
          <Field label="Clan name">
            <input className="settled-input" value={clanName} onChange={(e) => setClanName(e.target.value)} placeholder="e.g. The Ration Squad" />
          </Field>
          <Field label="Your name">
            <input className="settled-input" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. Ansh" />
          </Field>
          <Field label="Passcode (share with your group)">
            <input className="settled-input" value={passcode} onChange={(e) => setPasscode(e.target.value)} placeholder="Set a passcode" />
          </Field>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button className="w-full rounded-xl bg-zinc-100 text-zinc-900 p-3 font-medium hover:bg-white transition-colors" onClick={create}>
          Create clan
        </button>
      </div>
    </Shell>
  )
}

function JoinClan({ onEnter, onBack }) {
  const [step, setStep] = useState('code') // code | passcode | alias
  const [code, setCode] = useState('')
  const [passcode, setPasscode] = useState('')
  const [alias, setAlias] = useState('')
  const [clan, setClan] = useState(null)
  const [error, setError] = useState('')

  async function submitCode() {
    setError('')
    const { data, error: err } = await supabase.from('clans').select('*').eq('join_code', code.toUpperCase().trim()).maybeSingle()
    if (err || !data) {
      setError('No clan found with that code.')
      return
    }
    setClan(data)
    setStep('passcode')
  }

  function submitPasscode() {
    if (passcode !== clan.passcode) {
      setError('Wrong passcode.')
      return
    }
    setError('')
    setStep('alias')
  }

  async function submitAlias() {
    if (!alias) {
      setError('Enter a name.')
      return
    }
    const { data: member, error: err } = await supabase
      .from('clan_members')
      .insert({ clan_id: clan.id, alias, is_creator: false })
      .select()
      .single()
    if (err) {
      setError('Could not join. Try again.')
      return
    }
    onEnter(clan.id, member.id)
  }

  return (
    <Shell>
      <div className="space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold tracking-tight">Join a clan</h2>
          <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300">Back</button>
        </div>

        {step === 'code' && (
          <>
            <Field label="Join code">
              <input className="settled-input text-center tracking-widest" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. AB12CD" autoFocus />
            </Field>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button className="w-full rounded-xl bg-zinc-100 text-zinc-900 p-3 font-medium hover:bg-white transition-colors" onClick={submitCode}>
              Next
            </button>
          </>
        )}

        {step === 'passcode' && (
          <>
            <p className="text-sm text-zinc-500">Joining <span className="text-zinc-200">{clan.name}</span></p>
            <Field label="Passcode">
              <input className="settled-input text-center tracking-widest" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoFocus />
            </Field>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button className="w-full rounded-xl bg-zinc-100 text-zinc-900 p-3 font-medium hover:bg-white transition-colors" onClick={submitPasscode}>
              Next
            </button>
          </>
        )}

        {step === 'alias' && (
          <>
            <Field label="Your name">
              <input className="settled-input" value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="e.g. Badal" autoFocus />
            </Field>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button className="w-full rounded-xl bg-zinc-100 text-zinc-900 p-3 font-medium hover:bg-white transition-colors" onClick={submitAlias}>
              Join clan
            </button>
          </>
        )}
      </div>
    </Shell>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 mb-1">{label}</label>
      {children}
    </div>
  )
}

function ClanApp({ clanId, memberId, onExit }) {
  const [clan, setClan] = useState(null)
  const [members, setMembers] = useState([])
  const [trips, setTrips] = useState([])
  const [items, setItems] = useState([])
  const [shares, setShares] = useState([])
  const [payments, setPayments] = useState([])
  const [generalTx, setGeneralTx] = useState([])
  const [settlements, setSettlements] = useState([])
  const [view, setView] = useState('main') // main | addTrip | addGeneral | history | settings

  async function loadAll() {
    const [c, mem, t, i, s, pay, gt, se] = await Promise.all([
      supabase.from('clans').select('*').eq('id', clanId).maybeSingle(),
      supabase.from('clan_members').select('*').eq('clan_id', clanId).eq('deleted', false).order('created_at'),
      supabase.from('trips').select('*').eq('clan_id', clanId).order('date', { ascending: false }),
      supabase.from('trip_items').select('*'),
      supabase.from('trip_item_shares').select('*'),
      supabase.from('trip_payments').select('*'),
      supabase.from('general_transactions').select('*').eq('clan_id', clanId).order('date', { ascending: false }),
      supabase.from('settlements').select('*').eq('clan_id', clanId),
    ])
    if (!c.data) {
      // clan was disbanded
      onExit()
      return
    }
    setClan(c.data)
    setMembers(mem.data || [])
    setTrips(t.data || [])
    setItems(i.data || [])
    setShares(s.data || [])
    setPayments(pay.data || [])
    setGeneralTx(gt.data || [])
    setSettlements(se.data || [])
  }

  useEffect(() => {
    loadAll()
    const channel = supabase
      .channel(`clan-${clanId}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => loadAll())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [clanId])

  const balances = useMemo(() => {
    if (members.length === 0) return { net_balances: [], settlements: [], explanation: [] }
    const tripsInput = trips.map((trip) => ({
      items: items
        .filter((it) => it.trip_id === trip.id)
        .map((it) => ({
          price: Number(it.price),
          shared_by: shares.filter((s) => s.item_id === it.id).map((s) => s.person_id),
        })),
      payments: payments
        .filter((p) => p.trip_id === trip.id)
        .map((p) => ({ person: p.person_id, amount: Number(p.amount) })),
    }))
    return calculateBalances({
      people: members.map((m) => m.id),
      trips: tripsInput,
      general_transactions: generalTx.map((t) => ({ from: t.from_person, to: t.to_person, amount: Number(t.amount) })),
      settlements: settlements.map((s) => ({ from: s.from_person, to: s.to_person, amount: Number(s.amount) })),
    })
  }, [members, trips, items, shares, payments, generalTx, settlements])

  function nameOf(id) {
    return members.find((m) => m.id === id)?.alias || '?'
  }

  const me = members.find((m) => m.id === memberId)

  if (!clan) return <Shell><p className="text-zinc-500 text-center text-sm">Loading...</p></Shell>

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans antialiased">
      <div className="max-w-md sm:max-w-xl mx-auto px-4 sm:px-6 pb-24">
        <header className="flex items-center justify-between py-6 sm:py-8 border-b border-zinc-800/80 mb-6">
          <div>
            <p className="text-lg font-semibold tracking-tight">{clan.name}</p>
            <p className="text-xs text-zinc-500">{nameOf(memberId)}</p>
          </div>
          <button className="text-zinc-500 hover:text-zinc-300 text-sm" onClick={() => setView('settings')}>Settings</button>
        </header>

        {view === 'main' && (
          <MainScreen
            balances={balances}
            nameOf={nameOf}
            onSettle={async (from, to, amount) => {
              await supabase.from('settlements').insert({ clan_id: clanId, from_person: from, to_person: to, amount })
            }}
            onGoHistory={() => setView('history')}
            onGoAddTrip={() => setView('addTrip')}
            onGoAddGeneral={() => setView('addGeneral')}
          />
        )}

        {view === 'addTrip' && (
          <AddTripScreen
            people={members}
            personId={memberId}
            clanId={clanId}
            onCancel={() => setView('main')}
            onSaved={() => setView('main')}
          />
        )}

        {view === 'addGeneral' && (
          <AddGeneralScreen
            people={members}
            clanId={clanId}
            onCancel={() => setView('main')}
            onSaved={() => setView('main')}
          />
        )}

        {view === 'history' && (
          <HistoryScreen
            trips={trips}
            items={items}
            shares={shares}
            payments={payments}
            generalTx={generalTx}
            nameOf={nameOf}
            onBack={() => setView('main')}
            onDeleteTrip={async (id) => { await supabase.from('trips').delete().eq('id', id) }}
            onDeleteGeneral={async (id) => { await supabase.from('general_transactions').delete().eq('id', id) }}
          />
        )}

        {view === 'settings' && (
          <SettingsScreen
            clan={clan}
            me={me}
            clanId={clanId}
            memberId={memberId}
            onBack={() => setView('main')}
            onExit={onExit}
          />
        )}
      </div>
    </div>
  )
}

function SettingsScreen({ clan, me, clanId, memberId, onBack, onExit }) {
  const [clanName, setClanName] = useState(clan.name)
  const [alias, setAlias] = useState(me?.alias || '')
  const [confirmDisband, setConfirmDisband] = useState('')
  const [showDisband, setShowDisband] = useState(false)

  async function saveClanName() {
    await supabase.from('clans').update({ name: clanName }).eq('id', clanId)
  }

  async function saveAlias() {
    await supabase.from('clan_members').update({ alias }).eq('id', memberId)
  }

  async function leaveClan() {
    await supabase.from('clan_members').update({ deleted: true }).eq('id', memberId)
    onExit()
  }

  async function disbandClan() {
    if (confirmDisband !== 'DELETE') return
    await supabase.from('clans').delete().eq('id', clanId)
    onExit()
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight">Settings</h2>
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300">Back</button>
      </div>

      <div className="space-y-3">
        <Field label="Clan name">
          <div className="flex gap-2">
            <input className="settled-input flex-1" value={clanName} onChange={(e) => setClanName(e.target.value)} />
            <button className="rounded-lg border border-zinc-700 px-3 text-sm hover:bg-zinc-800" onClick={saveClanName}>Save</button>
          </div>
        </Field>
        <Field label="Your name">
          <div className="flex gap-2">
            <input className="settled-input flex-1" value={alias} onChange={(e) => setAlias(e.target.value)} />
            <button className="rounded-lg border border-zinc-700 px-3 text-sm hover:bg-zinc-800" onClick={saveAlias}>Save</button>
          </div>
        </Field>
        <Field label="Join code">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-2.5 text-sm tracking-widest text-center">{clan.join_code}</div>
        </Field>
      </div>

      <div className="pt-4 border-t border-zinc-800 space-y-3">
        <button className="w-full rounded-xl border border-zinc-800 p-3 text-sm hover:bg-zinc-900 transition-colors" onClick={leaveClan}>
          Leave clan
        </button>

        {me?.is_creator && !showDisband && (
          <button className="w-full rounded-xl border border-red-900 text-red-400 p-3 text-sm hover:bg-red-950/30 transition-colors" onClick={() => setShowDisband(true)}>
            Disband clan
          </button>
        )}

        {me?.is_creator && showDisband && (
          <div className="rounded-xl border border-red-900 p-4 space-y-3">
            <p className="text-sm text-red-400">This deletes the clan and all its data for everyone. Type DELETE to confirm.</p>
            <input className="settled-input" value={confirmDisband} onChange={(e) => setConfirmDisband(e.target.value)} placeholder="DELETE" />
            <div className="flex gap-2">
              <button className="flex-1 rounded-lg border border-zinc-700 p-2 text-sm hover:bg-zinc-800" onClick={() => setShowDisband(false)}>Cancel</button>
              <button
                disabled={confirmDisband !== 'DELETE'}
                className="flex-1 rounded-lg bg-red-600 p-2 text-sm font-medium disabled:opacity-30 hover:bg-red-500"
                onClick={disbandClan}
              >
                Disband
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function MainScreen({ balances, nameOf, onSettle, onGoHistory, onGoAddTrip, onGoAddGeneral }) {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">Balances</h3>
        <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
          {balances.net_balances.map((b) => (
            <div key={b.person} className="flex justify-between items-center px-4 py-3">
              <span className="font-medium">{nameOf(b.person)}</span>
              <span className={`tabular-nums text-sm ${b.net > 0.005 ? 'text-emerald-400' : b.net < -0.005 ? 'text-red-400' : 'text-zinc-500'}`}>
                {b.net > 0.005 ? `+₹${b.net}` : b.net < -0.005 ? `-₹${Math.abs(b.net)}` : 'settled'}
              </span>
            </div>
          ))}
          {balances.net_balances.length === 0 && (
            <div className="px-4 py-6 text-center text-zinc-500 text-sm">Nothing yet. Add a trip to get started.</div>
          )}
        </div>
      </div>

      {balances.settlements.length > 0 && (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-3">Suggested payments</h3>
          <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
            {balances.settlements.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center px-4 py-3">
                <span className="text-sm">{nameOf(s.from)} <span className="text-zinc-600">→</span> {nameOf(s.to)} <span className="text-zinc-500">₹{s.amount}</span></span>
                <button
                  className="rounded-md border border-zinc-700 px-3 py-1 text-xs font-medium hover:bg-zinc-800 transition-colors"
                  onClick={() => onSettle(s.from, s.to, s.amount)}
                >
                  Mark paid
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button className="rounded-xl bg-zinc-100 text-zinc-900 p-4 font-medium hover:bg-white transition-colors" onClick={onGoAddTrip}>+ Buy Trip</button>
        <button className="rounded-xl border border-zinc-800 p-4 font-medium hover:bg-zinc-900 transition-colors" onClick={onGoAddGeneral}>+ General</button>
      </div>
      <button className="w-full rounded-xl border border-zinc-800 p-3 text-sm text-zinc-400 hover:bg-zinc-900 transition-colors" onClick={onGoHistory}>View history</button>
    </div>
  )
}

function ShareSelector({ people, selected, onChange }) {
  const [dragging, setDragging] = useState(false)
  const [dragTarget, setDragTarget] = useState(null)

  function toggle(id, forceState) {
    const isSelected = selected.includes(id)
    const next = forceState !== undefined ? forceState : !isSelected
    if (next && !isSelected) onChange([...selected, id])
    if (!next && isSelected) onChange(selected.filter((x) => x !== id))
  }

  function handlePointerDown(id) {
    const startState = !selected.includes(id)
    setDragging(true)
    setDragTarget(startState)
    toggle(id, startState)
  }

  function handlePointerEnter(id) {
    if (dragging) toggle(id, dragTarget)
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button type="button" className="text-xs rounded-md border border-zinc-700 px-2 py-1 text-zinc-400 hover:bg-zinc-800" onClick={() => onChange(people.map((p) => p.id))}>Select all</button>
        <button type="button" className="text-xs rounded-md border border-zinc-700 px-2 py-1 text-zinc-400 hover:bg-zinc-800" onClick={() => onChange([])}>Select none</button>
      </div>
      <div
        className="grid grid-cols-3 gap-2 select-none"
        onPointerUp={() => setDragging(false)}
        onPointerLeave={() => setDragging(false)}
      >
        {people.map((p) => (
          <div
            key={p.id}
            onPointerDown={() => handlePointerDown(p.id)}
            onPointerEnter={() => handlePointerEnter(p.id)}
            className={`rounded-lg p-3 text-center text-sm cursor-pointer touch-none border transition-colors ${
              selected.includes(p.id) ? 'bg-zinc-100 text-zinc-900 border-zinc-100' : 'bg-zinc-900 border-zinc-800 text-zinc-300'
            }`}
          >
            {p.alias}
          </div>
        ))}
      </div>
    </div>
  )
}

function AddTripScreen({ people, personId, clanId, onCancel, onSaved }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [place, setPlace] = useState('')
  const [itemDrafts, setItemDrafts] = useState([])
  const [itemName, setItemName] = useState('')
  const [itemPrice, setItemPrice] = useState('')
  const [itemShare, setItemShare] = useState(people.map((p) => p.id))
  const [payDrafts, setPayDrafts] = useState(people.map((p) => ({ person_id: p.id, amount: '' })))
  const [step, setStep] = useState('items')

  const itemTotal = itemDrafts.reduce((sum, it) => sum + it.price, 0)
  const payTotal = payDrafts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

  function addItem() {
    if (!itemName || !itemPrice || itemShare.length === 0) return
    setItemDrafts([...itemDrafts, { name: itemName, price: Number(itemPrice), shared_by: itemShare }])
    setItemName('')
    setItemPrice('')
    setItemShare(people.map((p) => p.id))
  }

  async function save() {
    const { data: trip } = await supabase.from('trips').insert({ clan_id: clanId, date, place, created_by: personId }).select().single()
    for (const it of itemDrafts) {
      const { data: item } = await supabase.from('trip_items').insert({ trip_id: trip.id, name: it.name, price: it.price }).select().single()
      await supabase.from('trip_item_shares').insert(it.shared_by.map((pid) => ({ item_id: item.id, person_id: pid })))
    }
    const realPayments = payDrafts.filter((p) => Number(p.amount) > 0)
    if (realPayments.length > 0) {
      await supabase.from('trip_payments').insert(realPayments.map((p) => ({ trip_id: trip.id, person_id: p.person_id, amount: Number(p.amount) })))
    }
    onSaved()
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight">Buy Trip</h2>
        <button onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-300">Cancel</button>
      </div>

      {step === 'items' && (
        <>
          <div className="flex gap-2">
            <input type="date" className="settled-input flex-1" value={date} onChange={(e) => setDate(e.target.value)} />
            <input placeholder="Place" className="settled-input flex-1" value={place} onChange={(e) => setPlace(e.target.value)} />
          </div>

          {itemDrafts.length > 0 && (
            <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
              {itemDrafts.map((it, idx) => (
                <div key={idx} className="px-3 py-2 text-sm flex justify-between items-center">
                  <span>{it.name} <span className="text-zinc-500">₹{it.price} · {it.shared_by.length} people</span></span>
                  <button className="text-zinc-600 hover:text-red-400" onClick={() => setItemDrafts(itemDrafts.filter((_, i) => i !== idx))}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-3">
            <div className="flex gap-2">
              <input placeholder="Item name" className="settled-input flex-1" value={itemName} onChange={(e) => setItemName(e.target.value)} />
              <input placeholder="₹" type="number" className="settled-input w-20" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} />
            </div>
            <ShareSelector people={people} selected={itemShare} onChange={setItemShare} />
            <button className="w-full rounded-lg border border-zinc-700 p-2 text-sm font-medium hover:bg-zinc-800 transition-colors" onClick={addItem}>Add item</button>
          </div>

          <div className="flex justify-between text-sm text-zinc-500">
            <span>Item total</span>
            <span className="tabular-nums text-zinc-300">₹{itemTotal}</span>
          </div>

          <button
            disabled={itemDrafts.length === 0}
            className="w-full rounded-xl bg-zinc-100 text-zinc-900 p-3 font-medium disabled:opacity-30 hover:bg-white transition-colors"
            onClick={() => setStep('payments')}
          >
            Next: who paid
          </button>
        </>
      )}

      {step === 'payments' && (
        <>
          <p className="text-sm text-zinc-500">Item total ₹{itemTotal}. Enter what each person actually paid.</p>
          <div className="rounded-xl border border-zinc-800 divide-y divide-zinc-800 overflow-hidden">
            {payDrafts.map((p, idx) => (
              <div key={p.person_id} className="flex justify-between items-center gap-2 px-3 py-2">
                <span className="text-sm">{people.find((pp) => pp.id === p.person_id)?.alias}</span>
                <input
                  type="number"
                  placeholder="₹0"
                  className="w-24 rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-sm text-right placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
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
          <p className={`text-sm ${payTotal === itemTotal ? 'text-emerald-400' : 'text-red-400'}`}>
            Paid total ₹{payTotal} {payTotal !== itemTotal && `— should be ₹${itemTotal}`}
          </p>
          <button
            disabled={payTotal !== itemTotal}
            className="w-full rounded-xl bg-zinc-100 text-zinc-900 p-3 font-medium disabled:opacity-30 hover:bg-white transition-colors"
            onClick={save}
          >
            Save trip
          </button>
        </>
      )}
    </div>
  )
}

function AddGeneralScreen({ people, clanId, onCancel, onSaved }) {
  const [rows, setRows] = useState([{ from: '', to: '', amount: '', note: '' }])
  const [date] = useState(new Date().toISOString().slice(0, 10))

  function updateRow(idx, field, value) {
    const next = [...rows]
    next[idx] = { ...next[idx], [field]: value }
    setRows(next)
  }

  async function save() {
    const valid = rows.filter((r) => r.from && r.to && Number(r.amount) > 0)
    if (valid.length === 0) return
    await supabase.from('general_transactions').insert(
      valid.map((r) => ({ clan_id: clanId, from_person: r.from, to_person: r.to, amount: Number(r.amount), note: r.note, date }))
    )
    onSaved()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight">General Amount</h2>
        <button onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-300">Cancel</button>
      </div>

      {rows.map((row, idx) => (
        <div key={idx} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 space-y-2">
          <div className="flex gap-2">
            <select className="settled-input flex-1" value={row.from} onChange={(e) => updateRow(idx, 'from', e.target.value)}>
              <option value="">From</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}
            </select>
            <select className="settled-input flex-1" value={row.to} onChange={(e) => updateRow(idx, 'to', e.target.value)}>
              <option value="">To</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.alias}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <input placeholder="₹ amount" type="number" className="settled-input w-28" value={row.amount} onChange={(e) => updateRow(idx, 'amount', e.target.value)} />
            <input placeholder="Note (optional)" className="settled-input flex-1" value={row.note} onChange={(e) => updateRow(idx, 'note', e.target.value)} />
          </div>
        </div>
      ))}

      <button className="w-full rounded-lg border border-zinc-700 p-2 text-sm font-medium hover:bg-zinc-800 transition-colors" onClick={() => setRows([...rows, { from: '', to: '', amount: '', note: '' }])}>
        + Add another
      </button>
      <button className="w-full rounded-xl bg-zinc-100 text-zinc-900 p-3 font-medium hover:bg-white transition-colors" onClick={save}>
        Save
      </button>
    </div>
  )
}

function HistoryScreen({ trips, items, shares, payments, generalTx, nameOf, onBack, onDeleteTrip, onDeleteGeneral }) {
  const combined = [
    ...trips.map((t) => ({ type: 'trip', date: t.date, id: t.id, place: t.place })),
    ...generalTx.map((g) => ({ type: 'general', date: g.date, id: g.id, from: g.from_person, to: g.to_person, amount: g.amount, note: g.note })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold tracking-tight">History</h2>
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-300">Back</button>
      </div>
      <div className="space-y-2">
        {combined.map((entry) => (
          <div key={entry.id} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 text-sm">
            {entry.type === 'trip' ? (
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{entry.place || 'Trip'} <span className="text-zinc-500 font-normal">· {entry.date}</span></p>
                  <ul className="text-zinc-500 mt-1 space-y-0.5">
                    {items.filter((it) => it.trip_id === entry.id).map((it) => (
                      <li key={it.id}>
                        {it.name}: ₹{it.price} <span className="text-zinc-600">({shares.filter((s) => s.item_id === it.id).map((s) => nameOf(s.person_id)).join(', ')})</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-zinc-600 mt-1">
                    Paid by {payments.filter((p) => p.trip_id === entry.id).map((p) => `${nameOf(p.person_id)} ₹${p.amount}`).join(', ')}
                  </p>
                </div>
                <button className="text-zinc-600 hover:text-red-400 shrink-0" onClick={() => onDeleteTrip(entry.id)}>✕</button>
              </div>
            ) : (
              <div className="flex justify-between items-center gap-2">
                <span>{nameOf(entry.from)} <span className="text-zinc-600">→</span> {nameOf(entry.to)} ₹{entry.amount} {entry.note && <span className="text-zinc-500">({entry.note})</span>} <span className="text-zinc-600">· {entry.date}</span></span>
                <button className="text-zinc-600 hover:text-red-400 shrink-0" onClick={() => onDeleteGeneral(entry.id)}>✕</button>
              </div>
            )}
          </div>
        ))}
        {combined.length === 0 && <p className="text-zinc-500 text-sm">No entries yet.</p>}
      </div>
    </div>
  )
}
