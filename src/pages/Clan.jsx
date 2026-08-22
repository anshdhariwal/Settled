import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { calculateBalances } from '../lib/calculateBalances'
import { copyToClipboard } from '../lib/copyToClipboard'
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
  IconShare,
} from '../components/icons'
import Overview from './Overview'
import History from './History'
import Members from './Members'
import Settings from './Settings'
import AddTrip from './AddTrip'
import AddGeneral from './AddGeneral'
import TripSummary from './TripSummary'

export default function Clan({ memberId, onExit, viewOverride }) {
  const { clanId: paramClanId, tripId } = useParams()
  const clanId = paramClanId || localStorage.getItem('settled_clan_id')
  const navigate = useNavigate()
  const location = useLocation()
  const [selectedSummaryTrip, setSelectedSummaryTrip] = useState(null)

  const [clan, setClan] = useState(null)
  const [members, setMembers] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [trips, setTrips] = useState([])
  const [items, setItems] = useState([])
  const [shares, setShares] = useState([])
  const [payments, setPayments] = useState([])
  const [generalTx, setGeneralTx] = useState([])
  const [settlements, setSettlements] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [copiedCode, setCopiedCode] = useState(false)
  const [copiedShareLink, setCopiedShareLink] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [showActionModal, setShowActionModal] = useState(false)
  const [editingTrip, setEditingTrip] = useState(null)

  function triggerToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  useEffect(() => {
    if (location.state?.toast) {
      triggerToast(location.state.toast)
      window.history.replaceState({}, document.title)
    }
  }, [location])

  async function loadAllData() {
    if (!clanId) return

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clanId)
    const clanQuery = isUuid
      ? supabase.from('clans').select('id, name, join_code, created_at').eq('id', clanId).maybeSingle()
      : supabase.from('clans').select('id, name, join_code, created_at').eq('join_code', clanId.toUpperCase()).maybeSingle()

    const clanRes = await clanQuery

    if (!clanRes.data) {
      onExit()
      navigate('/')
      return
    }

    const targetClanId = clanRes.data.id

    const [membersRes, allMembersRes, tripsRes, generalTxRes, settlementsRes] = await Promise.all([
      supabase.from('clan_members').select('*').eq('clan_id', targetClanId).eq('deleted', false).order('created_at'),
      supabase.from('clan_members').select('id, alias, is_creator').eq('clan_id', targetClanId).order('created_at'),
      supabase.from('trips').select('*').eq('clan_id', targetClanId).order('date', { ascending: false }),
      supabase.from('general_transactions').select('*').eq('clan_id', targetClanId).order('date', { ascending: false }),
      supabase.from('settlements').select('*').eq('clan_id', targetClanId),
    ])

    const activeMembers = membersRes.data || []
    const validMember = activeMembers.find((m) => m.id === memberId)

    if (!memberId || !validMember) {
      if (clanRes.data?.join_code) {
        navigate(`/join?code=${clanRes.data.join_code}`, { replace: true })
      } else {
        navigate('/join', { replace: true })
      }
      return
    }

    const validTrips = tripsRes.data || []
    const tripIds = validTrips.map((t) => t.id)

    let validItems = []
    let validShares = []
    let validPayments = []

    if (tripIds.length > 0) {
      const [itemsRes, paymentsRes] = await Promise.all([
        supabase.from('trip_items').select('*').in('trip_id', tripIds),
        supabase.from('trip_payments').select('*').in('trip_id', tripIds),
      ])
      validItems = itemsRes.data || []
      validPayments = paymentsRes.data || []

      const itemIds = validItems.map((i) => i.id)
      if (itemIds.length > 0) {
        const sharesRes = await supabase.from('trip_item_shares').select('*').in('item_id', itemIds)
        validShares = sharesRes.data || []
      }
    }

    setClan(clanRes.data)
    setMembers(activeMembers)
    setAllMembers(allMembersRes.data || [])
    setTrips(validTrips)
    setItems(validItems)
    setShares(validShares)
    setPayments(validPayments)
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
  }, [clanId, tripId])

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
      people: allMembers.map((m) => m.id),
      trips: tripsInput,
      general_transactions: generalTx.map((t) => ({ from: t.from_person, to: t.to_person, amount: Number(t.amount) })),
      settlements: settlements.map((s) => ({ from: s.from_person, to: s.to_person, amount: Number(s.amount) })),
    })
  }, [members, allMembers, trips, items, shares, payments, generalTx, settlements])

  function getMemberName(id) {
    const m = allMembers.find((x) => x.id === id) || members.find((x) => x.id === id)
    if (m) return m.alias
    return 'Unknown member'
  }

  const currentMember = members.find((m) => m.id === memberId)

  function handleCopyJoinCode() {
    if (!clan?.join_code) return
    copyToClipboard(clan.join_code)
    setCopiedCode(true)
    triggerToast('Join code copied to clipboard!')
    setTimeout(() => setCopiedCode(false), 3000)
  }

  function handleShareJoinLink() {
    if (!clan?.join_code) return
    const joinUrl = `${window.location.origin}/join?code=${clan.join_code}`
    const shareText = `Share my clan for all our settlement using the link below:\n\n${joinUrl}\n\n*Settled App*`

    if (navigator.share) {
      navigator.share({
        title: clan.name,
        text: shareText,
      }).catch(() => {
        copyToClipboard(shareText)
        setCopiedShareLink(true)
        triggerToast('Share link copied to clipboard!')
        setTimeout(() => setCopiedShareLink(false), 3000)
      })
    } else {
      copyToClipboard(shareText)
      setCopiedShareLink(true)
      triggerToast('Share link copied to clipboard!')
      setTimeout(() => setCopiedShareLink(false), 3000)
    }
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
        <div className="max-w-xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <img src="/logo.svg" alt="Settled Logo" className="h-7 object-contain shrink-0" />
            <div className="w-px h-7 bg-zinc-700/60 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <h1 className="font-bold text-sm tracking-tight text-white truncate max-w-[180px] sm:max-w-[320px]" title={clan.name}>
                {clan.name}
              </h1>
              <p className="text-[11px] text-zinc-500 truncate">Member: <span className="text-zinc-300 font-medium">{currentMember?.alias || 'You'}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleShareJoinLink}
              className="p-2 sm:px-2.5 sm:py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[11px] font-semibold transition-colors flex items-center gap-1.5 shrink-0"
              title="Share direct join link"
            >
              {copiedShareLink ? <IconSuccessTick className="w-4 h-4 text-emerald-400" /> : <IconShare className="w-4 h-4 text-emerald-400/80" />}
              <span className="hidden sm:inline">Share</span>
            </button>
            <button
              onClick={() => navigate(viewOverride === 'settings' ? '/clan' : '/clan/settings')}
              className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/60 transition-colors shrink-0"
              title="Settings"
            >
              <IconSettings className="w-4 h-4" />
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
              onRefresh={loadAllData}
            />
          </div>
        ) : viewOverride === 'tripsummary' || selectedSummaryTrip ? (
          <div className="screen-transition">
            {(() => {
              const summaryTrip = selectedSummaryTrip || (tripId ? trips.find((t) => t.id === tripId) : null)
              if (!summaryTrip) {
                return (
                  <div className="settled-card p-8 text-center space-y-4">
                    <p className="text-zinc-300 text-sm font-semibold">Trip not found</p>
                    <p className="text-zinc-500 text-xs">The requested trip could not be found or has been deleted.</p>
                    <button
                      onClick={() => {
                        setSelectedSummaryTrip(null)
                        navigate('/clan')
                      }}
                      className="btn btn-s btn-sm text-xs px-4"
                    >
                      Back to Dashboard
                    </button>
                  </div>
                )
              }
              return (
                <TripSummary
                  trip={summaryTrip}
                  items={items}
                  shares={shares}
                  payments={payments}
                  settlements={settlements}
                  members={members}
                  allMembers={allMembers}
                  clanId={clanId}
                  onBack={() => {
                    setSelectedSummaryTrip(null)
                    setActiveTab('trips')
                    navigate('/clan')
                  }}
                />
              )
            })()}
          </div>
        ) : viewOverride === 'addtrip' ? (
          <div className="screen-transition">
            <AddTrip
              key={editingTrip?.id || 'new-trip'}
              people={members}
              personId={memberId}
              clanId={clanId}
              editingTrip={editingTrip}
              onDoneEditing={() => setEditingTrip(null)}
            />
          </div>
        ) : viewOverride === 'addgeneral' ? (
          <div className="screen-transition">
            <AddGeneral key="new-general" people={members} clanId={clanId} />
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
                <span>Activity ({trips.length + generalTx.length + settlements.length})</span>
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
                    const { error } = await supabase.from('settlements').insert({ clan_id: clan.id, from_person: from, to_person: to, amount })
                    if (error) { triggerToast('Failed to record settlement'); return }
                    await loadAllData()
                    triggerToast('Settlement recorded!')
                  }}
                  onGoAddTrip={() => {
                    setEditingTrip(null)
                    navigate('/clan/add-trip')
                  }}
                  onGoAddGeneral={() => navigate('/clan/add-general')}
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
                  settlements={settlements}
                  getMemberName={getMemberName}
                  onViewTrip={(trip) => {
                    setSelectedSummaryTrip(trip)
                    navigate(`/clan/trip/${trip.id}`)
                  }}
                  onEditTrip={(trip) => {
                    const tripItems = items.filter((it) => it.trip_id === trip.id).map((it) => ({
                      id: it.id,
                      name: it.name,
                      price: Number(it.price),
                      shared_by: shares.filter((s) => s.item_id === it.id).map((s) => s.person_id),
                    }))
                    const tripPayments = payments.filter((p) => p.trip_id === trip.id)
                    const tripPreSettlements = settlements.filter((s) => s.trip_id === trip.id)
                    setEditingTrip({ id: trip.id, place: trip.place, date: trip.date, items: tripItems, payments: tripPayments, pre_settlements: tripPreSettlements })
                    navigate('/clan/add-trip')
                  }}
                  onDeleteTrip={async (id) => {
                    const tripItems = items.filter((i) => i.trip_id === id)
                    const itemIds = tripItems.map((i) => i.id)
                    if (itemIds.length > 0) {
                      const { error: e1 } = await supabase.from('trip_item_shares').delete().in('item_id', itemIds)
                      if (e1) { triggerToast('Failed to delete trip items'); return }
                    }
                    const { error: e2 } = await supabase.from('trip_payments').delete().eq('trip_id', id)
                    if (e2) { triggerToast('Failed to delete trip payments'); return }
                    const { error: e3 } = await supabase.from('settlements').delete().eq('trip_id', id)
                    if (e3) { triggerToast('Failed to delete trip settlements'); return }
                    const { error: e4 } = await supabase.from('trip_items').delete().eq('trip_id', id)
                    if (e4) { triggerToast('Failed to delete trip'); return }
                    const { error: e5 } = await supabase.from('trips').delete().eq('id', id)
                    if (e5) { triggerToast('Failed to delete trip'); return }
                    await loadAllData()
                  }}
                  onDeleteGeneral={async (id) => {
                    const { error } = await supabase.from('general_transactions').delete().eq('id', id)
                    if (error) { triggerToast('Failed to delete transaction'); return }
                    await loadAllData()
                  }}
                  onDeleteSettlement={async (id) => {
                    const { error } = await supabase.from('settlements').delete().eq('id', id)
                    if (error) { triggerToast('Failed to delete settlement'); return }
                    await loadAllData()
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
                  joinCode={clan?.join_code}
                  onRefresh={loadAllData}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {!viewOverride && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-zinc-900/95 border border-zinc-700/80 text-white shadow-2xl hover:bg-zinc-800 active:scale-95 transition-all duration-200 backdrop-blur-md"
            onClick={() => setShowActionModal(!showActionModal)}
            title="Add Expense or Transaction"
          >
            <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold shrink-0">
              <IconPlus className="w-3.5 h-3.5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-semibold tracking-wide text-zinc-100 pr-1">Add Entry</span>
          </button>
        </div>
      )}

      {showActionModal && typeof document !== 'undefined' && createPortal(
        <div
          className="settled-modal-backdrop animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowActionModal(false)
          }}
        >
          <div className="settled-modal-card settled-card p-5 space-y-4 border border-zinc-700/60 text-left">
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
                  navigate('/clan/add-trip')
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
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
                  navigate('/clan/add-general')
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 text-zinc-300 flex items-center justify-center">
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
        </div>,
        document.body
      )}

      {toastMsg && (
        <div className="toast-banner">
          <IconSuccessTick className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}
