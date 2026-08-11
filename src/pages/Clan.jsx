import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { calculateBalances } from '../lib/calculateBalances'
import { Shell } from '../components/layout'
import {
  IconSettings,
  IconCopy,
  IconSuccessTick,
  IconPlus,
  IconClose,
  IconChartBar,
  IconHistory,
  IconUsers,
  IconCart,
  IconExchange,
  IconChevronRight,
} from '../components/icons'
import Overview from './overview'
import History from './history'
import Members from './members'
import Settings from './settings'
import AddTrip from './addtrip'
import AddGeneral from './addgeneral'

export default function Clan({ memberId, onExit, viewOverride }) {
  const { clanId: paramClanId } = useParams()
  const clanId = paramClanId || localStorage.getItem('settled_clan_id')
  const navigate = useNavigate()

  const [clan, setClan] = useState(null)
  const [members, setMembers] = useState([])
  const [trips, setTrips] = useState([])
  const [items, setItems] = useState([])
  const [shares, setShares] = useState([])
  const [payments, setPayments] = useState([])
  const [generalTx, setGeneralTx] = useState([])
  const [settlements, setSettlements] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedCode, setCopiedCode] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)

  async function loadAllData() {
    if (!clanId) return
    const [clanRes, membersRes, tripsRes, itemsRes, sharesRes, paymentsRes, generalTxRes, settlementsRes] = await Promise.all([
      supabase.from('clans').select('*').eq('id', clanId).maybeSingle(),
      supabase.from('clan_members').select('*').eq('clan_id', clanId).eq('deleted', false).order('created_at'),
      supabase.from('trips').select('*').eq('clan_id', clanId).order('date', { ascending: false }),
      supabase.from('trip_items').select('*'),
      supabase.from('trip_item_shares').select('*'),
      supabase.from('trip_payments').select('*'),
      supabase.from('general_transactions').select('*').eq('clan_id', clanId).order('date', { ascending: false }),
      supabase.from('settlements').select('*').eq('clan_id', clanId),
    ])

    if (!clanRes.data) {
      onExit()
      navigate('/')
      return
    }

    setClan(clanRes.data)
    setMembers(membersRes.data || [])
    setTrips(tripsRes.data || [])
    setItems(itemsRes.data || [])
    setShares(sharesRes.data || [])
    setPayments(paymentsRes.data || [])
    setGeneralTx(generalTxRes.data || [])
    setSettlements(settlementsRes.data || [])
  }

  useEffect(() => {
    loadAllData()
    if (!clanId) return
    const channel = supabase
      .channel(`clan-${clanId}`)
      .on('postgres_changes', { event: '*', schema: 'public' }, () => loadAllData())
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

  function getMemberName(id) {
    return members.find((m) => m.id === id)?.alias || '?'
  }

  const currentMember = members.find((m) => m.id === memberId)

  function handleCopyJoinCode() {
    if (!clan?.join_code) return
    navigator.clipboard.writeText(clan.join_code)
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  if (!clan) {
    return (
      <Shell>
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-zinc-500 text-xs font-mono">Syncing clan data...</p>
        </div>
      </Shell>
    )
  }

  return (
    <div className="min-h-screen text-zinc-100 font-sans antialiased pb-28" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 sm:px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Settled Logo" className="h-7 object-contain" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-sm tracking-tight text-white">{clan.name}</h1>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">Member: <span className="text-zinc-300 font-medium">{currentMember?.alias || 'You'}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJoinCode}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-amber-400 hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
              title="Click to copy Join Code"
            >
              <span>{clan.join_code}</span>
              {copiedCode ? <IconSuccessTick className="w-3.5 h-3.5 text-emerald-400" /> : <IconCopy className="w-3.5 h-3.5 text-zinc-500" />}
            </button>
            <button
              onClick={() => navigate(viewOverride === 'settings' ? `/clan/${clanId}` : `/clan/${clanId}/settings`)}
              className="icon-btn"
              title="Settings"
            >
              <div className="squish"></div>
              <IconSettings className="w-4 h-4 text-zinc-300" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-5">
        {viewOverride === 'settings' ? (
          <div className="screen-transition">
            <Settings
              clan={clan}
              currentMember={currentMember}
              clanId={clanId}
              memberId={memberId}
              onExit={onExit}
            />
          </div>
        ) : viewOverride === 'addtrip' ? (
          <div className="screen-transition">
            <AddTrip people={members} personId={memberId} clanId={clanId} />
          </div>
        ) : viewOverride === 'addgeneral' ? (
          <div className="screen-transition">
            <AddGeneral people={members} clanId={clanId} />
          </div>
        ) : (
          <div className="space-y-5 screen-transition">
            <div className="seg">
              <button
                className={`seg-item ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <IconChartBar className="w-4 h-4" />
                <span>Balances</span>
              </button>
              <button
                className={`seg-item ${activeTab === 'trips' ? 'active' : ''}`}
                onClick={() => setActiveTab('trips')}
              >
                <IconHistory className="w-4 h-4" />
                <span>Activity ({trips.length + generalTx.length})</span>
              </button>
              <button
                className={`seg-item ${activeTab === 'members' ? 'active' : ''}`}
                onClick={() => setActiveTab('members')}
              >
                <IconUsers className="w-4 h-4" />
                <span>Members ({members.length})</span>
              </button>
            </div>

            {activeTab === 'overview' && (
              <div className="tab-content">
                <Overview
                  balances={balances}
                  getMemberName={getMemberName}
                  onSettle={async (from, to, amount) => {
                    await supabase.from('settlements').insert({ clan_id: clanId, from_person: from, to_person: to, amount })
                  }}
                  onGoAddTrip={() => navigate(`/clan/${clanId}/add-trip`)}
                  onGoAddGeneral={() => navigate(`/clan/${clanId}/add-general`)}
                />
              </div>
            )}

            {activeTab === 'trips' && (
              <div className="tab-content">
                <History
                  trips={trips}
                  items={items}
                  shares={shares}
                  payments={payments}
                  generalTx={generalTx}
                  getMemberName={getMemberName}
                  onDeleteTrip={async (id) => {
                    await supabase.from('trips').delete().eq('id', id)
                  }}
                  onDeleteGeneral={async (id) => {
                    await supabase.from('general_transactions').delete().eq('id', id)
                  }}
                />
              </div>
            )}

            {activeTab === 'members' && (
              <div className="tab-content">
                <Members
                  members={members}
                  balances={balances}
                  memberId={memberId}
                  currentMember={currentMember}
                  clanId={clanId}
                  onRefresh={loadAllData}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {!viewOverride && (
        <div className="fab-zone orbit">
          <div className="dot dot1"></div>
          <div className="dot dot2"></div>
          <div className="dot dot3"></div>
          <button
            className="fab"
            onClick={() => setShowActionModal(!showActionModal)}
            title="Add Expense or Transaction"
          >
            <IconPlus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      )}

      {showActionModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-sm settled-card p-5 space-y-4 border border-zinc-700 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-sm text-white">Add New Entry</h3>
              <button onClick={() => setShowActionModal(false)} className="back-btn" title="Close">
                <IconClose className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 transition-colors flex items-center justify-between text-left"
                onClick={() => {
                  setShowActionModal(false)
                  navigate(`/clan/${clanId}/add-trip`)
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <IconCart className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">Buy Trip (Grocery / Ration)</p>
                    <p className="text-xs text-zinc-400">Itemized cost with fractional share split</p>
                  </div>
                </div>
                <IconChevronRight className="w-4 h-4 text-zinc-500" />
              </button>

              <button
                className="w-full p-3.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 transition-colors flex items-center justify-between text-left"
                onClick={() => {
                  setShowActionModal(false)
                  navigate(`/clan/${clanId}/add-general`)
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                    <IconExchange className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-white">General Amount</p>
                    <p className="text-xs text-zinc-400">Direct payment entry (A paid B ₹X)</p>
                  </div>
                </div>
                <IconChevronRight className="w-4 h-4 text-zinc-500" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
