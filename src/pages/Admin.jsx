import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Shell, Field } from '../components/layout'
import {
  IconChevronLeft,
  IconUsers,
  IconHistory,
  IconChartBar,
  IconLock,
  IconTrash,
  IconSuccessTick,
  IconChevronRight,
  IconSettings,
  IconCart,
  IconExchange,
  IconClose,
} from '../components/icons'
import { formatINR } from '../lib/formatINR'

const ADMIN_PASSCODE_KEY = 'settled_admin_authed'
// Master admin passcode SHA-256 signature
const TARGET_PASSCODE_HASH = '09e037f37d8b17e823d23543dd0fd139d6bfce24f2f3367a4f8e689d61cb7111'

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function Admin() {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [passcode, setPasscode] = useState('')
  const [passError, setPassError] = useState('')
  const [activeTab, setActiveTab] = useState('clans')

  const [clans, setClans] = useState([])
  const [members, setMembers] = useState([])
  const [trips, setTrips] = useState([])
  const [generalTx, setGeneralTx] = useState([])
  const [tripItems, setTripItems] = useState([])
  const [tripPayments, setTripPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedClanId, setSelectedClanId] = useState(null)
  const [deletingClan, setDeletingClan] = useState(null)
  const [toastMsg, setToastMsg] = useState('')

  function triggerToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  useEffect(() => {
    const isAuthed = sessionStorage.getItem(ADMIN_PASSCODE_KEY) === 'true'
    if (isAuthed) {
      setIsAuthenticated(true)
      loadAdminData()
    }
  }, [])

  async function handleLogin(e) {
    if (e) e.preventDefault()
    const inputHash = await sha256(passcode.trim())
    if (inputHash === TARGET_PASSCODE_HASH) {
      sessionStorage.setItem(ADMIN_PASSCODE_KEY, 'true')
      setIsAuthenticated(true)
      setPassError('')
      loadAdminData()
    } else {
      setPassError('Incorrect Admin Passcode.')
    }
  }

  function handleLogout() {
    sessionStorage.removeItem(ADMIN_PASSCODE_KEY)
    setPasscode('')
    setPassError('')
    setIsAuthenticated(false)
  }

  async function loadAdminData() {
    setLoading(true)
    try {
      // 1. Fetch clans via RPC (with passcode) or fallback select
      let clanList = []
      const { data: rpcClans, error: rpcErr } = await supabase.rpc('get_admin_clan_details')
      if (!rpcErr && rpcClans && rpcClans.length > 0) {
        clanList = rpcClans
      } else {
        const { data: selectClans } = await supabase
          .from('clans')
          .select('id, name, join_code, created_at')
          .order('created_at', { ascending: false })
        clanList = selectClans || []
      }

      // 2. Fetch members, trips, items, payments, and general transactions
      const [membersRes, tripsRes, itemsRes, paymentsRes, generalRes] = await Promise.all([
        supabase.from('clan_members').select('*').order('created_at', { ascending: false }),
        supabase.from('trips').select('*').order('created_at', { ascending: false }),
        supabase.from('trip_items').select('*'),
        supabase.from('trip_payments').select('*'),
        supabase.from('general_transactions').select('*').order('created_at', { ascending: false }),
      ])

      setClans(clanList)
      setMembers(membersRes.data || [])
      setTrips(tripsRes.data || [])
      setTripItems(itemsRes.data || [])
      setTripPayments(paymentsRes.data || [])
      setGeneralTx(generalRes.data || [])
    } catch (err) {
      console.error('Error loading admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function confirmDeleteClan(clanId, clanName) {
    setLoading(true)
    try {
      await supabase.from('trip_item_shares').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('trip_payments').delete().eq('clan_id', clanId)
      await supabase.from('settlements').delete().eq('clan_id', clanId)
      await supabase.from('general_transactions').delete().eq('clan_id', clanId)
      await supabase.from('trip_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      await supabase.from('trips').delete().eq('clan_id', clanId)
      await supabase.from('clan_members').delete().eq('clan_id', clanId)
      await supabase.from('clans').delete().eq('id', clanId)

      setDeletingClan(null)
      triggerToast(`Clan "${clanName}" deleted.`)
      await loadAdminData()
    } catch (err) {
      console.error('Error deleting clan:', err)
    } finally {
      setLoading(false)
    }
  }

  function getMemberName(mId) {
    const m = members.find((mem) => mem.id === mId)
    return m ? m.alias : 'Unknown Member'
  }

  function getClanInfo(cId) {
    const c = clans.find((clan) => clan.id === cId)
    return c ? { name: c.name, code: c.join_code } : { name: 'Unknown Clan', code: 'N/A' }
  }

  if (!isAuthenticated) {
    return (
      <Shell maxWidth="max-w-sm">
        <div className="settled-card p-6 space-y-5 text-left">
          <div className="ph">
            <h2 className="ph-title text-white">Admin Console</h2>
            <p className="text-xs text-zinc-400">Database & System Controller</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 pt-1">
            <Field label="Enter Secret Admin Passcode">
              <input
                type="password"
                className="settled-input text-center font-mono tracking-widest text-lg"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="••••"
                maxLength={16}
                autoFocus
              />
            </Field>

            {passError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {passError}
              </p>
            )}

            <button type="submit" className="btn btn-p font-semibold">
              Unlock Console
            </button>
          </form>
        </div>
      </Shell>
    )
  }

  // Calculate totals
  const totalItemSpend = tripItems.reduce((acc, it) => acc + Number(it.price || 0), 0)
  const totalPaymentsSpend = tripPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
  const totalGeneralSpend = generalTx.reduce((acc, tx) => acc + Number(tx.amount || 0), 0)
  const totalTrackedSpend = Math.max(totalItemSpend, totalPaymentsSpend) + totalGeneralSpend
  const activeMembersCount = members.filter((m) => !m.deleted).length

  return (
    <div className="min-h-screen text-zinc-100 font-sans pb-20" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 px-4 py-3.5 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2">
          <div className="ph flex items-center gap-3">
            <button onClick={() => navigate('/clan')} className="back-btn" title="Back to App">
              <IconChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="ph-title text-white">Database Admin Console</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold">
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                {clans.length} Clans · {activeMembersCount} Members · {trips.length} Trips
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button onClick={loadAdminData} className="btn btn-s btn-sm text-xs px-3">
              Refresh
            </button>
            <button onClick={handleLogout} className="btn btn-s btn-sm text-xs px-3 text-rose-300">
              Lock
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-5">
        {toastMsg && (
          <p className="toast-msg text-emerald-400 text-xs font-medium bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
            {toastMsg}
          </p>
        )}

        {/* Top Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="settled-card p-3.5 text-center">
            <p className="text-[11px] text-zinc-400">Total Clans</p>
            <p className="text-lg font-bold text-white font-mono">{clans.length}</p>
          </div>
          <div className="settled-card p-3.5 text-center">
            <p className="text-[11px] text-zinc-400">Active Members</p>
            <p className="text-lg font-bold text-emerald-400 font-mono">{activeMembersCount}</p>
          </div>
          <div className="settled-card p-3.5 text-center">
            <p className="text-[11px] text-zinc-400">Total Trips</p>
            <p className="text-lg font-bold text-blue-400 font-mono">{trips.length}</p>
          </div>
          <div className="settled-card p-3.5 text-center">
            <p className="text-[11px] text-zinc-400">Tracked Spend</p>
            <p className="text-lg font-bold text-amber-400 font-mono">{formatINR(totalTrackedSpend)}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 gap-6">
          <button
            onClick={() => setActiveTab('clans')}
            className={`pb-2.5 text-xs font-semibold tracking-wide transition-colors relative ${
              activeTab === 'clans' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Clans & Leaders ({clans.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2.5 text-xs font-semibold tracking-wide transition-colors relative ${
              activeTab === 'activity' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Recent Activity Feed ({trips.length + generalTx.length})
          </button>
        </div>

        {/* Tab 1: Clans List */}
        {activeTab === 'clans' && (
          <div className="settled-card p-5 space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-sm text-white">Database Clans</h3>
              <span className="text-xs font-mono text-zinc-400">{clans.length} Active Records</span>
            </div>

            {loading ? (
              <div className="text-center py-8 text-zinc-500 text-xs font-mono">Loading clans...</div>
            ) : clans.length === 0 ? (
              <p className="text-xs text-zinc-400 text-center py-6">No clans found in database.</p>
            ) : (
              <div className="divide-y divide-zinc-800/80 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950/60">
                {clans.map((c) => {
                  const clanM = members.filter((m) => m.clan_id === c.id && !m.deleted)
                  const leaderM = clanM.find((m) => m.is_creator) || clanM[0]
                  const clanTripsList = trips.filter((t) => t.clan_id === c.id)

                  return (
                    <div key={c.id} className="p-4 space-y-2 hover:bg-zinc-900/40 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm text-white truncate">{c.name}</p>
                            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-blue-400 font-bold tracking-wider">
                              #{c.join_code}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Leader: <strong className="text-zinc-200">{leaderM?.alias || 'Unknown'}</strong> · {clanM.length} Members · {clanTripsList.length} Trips
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => setSelectedClanId(selectedClanId === c.id ? null : c.id)}
                            className="btn btn-s btn-sm text-xs px-3"
                          >
                            {selectedClanId === c.id ? 'Close' : 'Inspect'}
                          </button>
                          <button
                            onClick={() => setDeletingClan({ id: c.id, name: c.name })}
                            className="btn btn-danger btn-sm px-2.5"
                            title="Delete Clan"
                          >
                            <IconTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {selectedClanId === c.id && (
                        <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                              <p className="text-[10px] text-zinc-400 uppercase font-mono">Clan ID</p>
                              <p className="font-mono text-zinc-300 break-all text-[11px]">{c.id}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                              <p className="text-[10px] text-zinc-400 uppercase font-mono">Leader Passcode (DOB)</p>
                              <p className="font-mono text-amber-400 font-semibold">
                                {c.passcode ? c.passcode : 'Run SQL script to enable'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-zinc-300">Active Members ({clanM.length})</p>
                            <div className="flex flex-wrap gap-1.5">
                              {clanM.map((m) => (
                                <span
                                  key={m.id}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${
                                    m.is_creator
                                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                      : 'bg-zinc-900 border-zinc-800 text-zinc-300'
                                  }`}
                                >
                                  {m.alias} {m.is_creator && '👑'}
                                </span>
                              ))}
                            </div>
                          </div>

                          {clanTripsList.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                              <p className="text-xs font-semibold text-zinc-300">Trips in Clan ({clanTripsList.length})</p>
                              <div className="space-y-1 text-xs">
                                {clanTripsList.map((t) => (
                                  <div key={t.id} className="p-2 rounded bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
                                    <span>📍 {t.place}</span>
                                    <span className="text-zinc-400 font-mono text-[11px]">{t.date}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Recent Activity Feed */}
        {activeTab === 'activity' && (
          <div className="settled-card p-5 space-y-4 text-left">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-sm text-white">Recent Updates & Activity Feed</h3>
              <span className="text-xs font-mono text-zinc-400">Latest Database Events</span>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Buy Trips ({trips.length})</p>
              {trips.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3">No trips created yet.</p>
              ) : (
                <div className="space-y-3">
                  {trips.map((t) => {
                    const clanInfo = getClanInfo(t.clan_id)
                    const tItems = tripItems.filter((i) => i.trip_id === t.id)
                    const tPayments = tripPayments.filter((p) => p.trip_id === t.id)
                    const itemCost = tItems.reduce((acc, i) => acc + Number(i.price || 0), 0)
                    const paymentCost = tPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0)
                    const totalCost = itemCost > 0 ? itemCost : paymentCost
                    const creatorName = t.created_by ? getMemberName(t.created_by) : 'Leader'

                    return (
                      <div key={t.id} className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
                        {/* Top Clan Tag Pill */}
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[11px] font-semibold">
                              🏷️ Clan: {clanInfo.name} (#{clanInfo.code})
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-500 font-mono">{t.date}</span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
                              <IconCart className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-white">Buy Trip: {t.place}</p>
                              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                                Paid by: <strong className="text-zinc-200">
                                  {tPayments.length > 0
                                    ? tPayments.map((p) => `${getMemberName(p.person_id)} (${formatINR(p.amount)})`).join(', ')
                                    : creatorName}
                                </strong>
                              </p>
                              <p className="text-[11px] text-zinc-500 font-mono mt-0.5">
                                {tItems.length} line items recorded
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-mono text-sm font-bold text-amber-400">{formatINR(totalCost)}</p>
                            <p className="text-[10px] text-zinc-500 font-mono truncate max-w-[120px]" title={t.id}>
                              ID: {t.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider pt-3">General Peer Payments ({generalTx.length})</p>
              {generalTx.length === 0 ? (
                <p className="text-xs text-zinc-500 py-3">No direct peer payments recorded.</p>
              ) : (
                <div className="space-y-3">
                  {generalTx.map((tx) => {
                    const clanInfo = getClanInfo(tx.clan_id)

                    return (
                      <div key={tx.id} className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2.5">
                        {/* Top Clan Tag Pill */}
                        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] font-semibold">
                            🏷️ Clan: {clanInfo.name} (#{clanInfo.code})
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">{tx.date}</span>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <IconExchange className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-white">
                                {getMemberName(tx.from_person)} ➔ {getMemberName(tx.to_person)}
                              </p>
                              <p className="text-xs text-zinc-400 font-mono mt-0.5">{tx.note || 'Direct Peer Payment'}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="font-mono text-sm font-bold text-emerald-400">{formatINR(tx.amount)}</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {deletingClan && (
        <div className="settled-modal-backdrop">
          <div className="settled-modal-card settled-card p-6 space-y-4 text-left border border-rose-500/30">
            <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <span className="text-rose-400">⚠️</span> Confirm Delete Clan
              </h3>
              <button onClick={() => setDeletingClan(null)} className="back-btn" title="Close">
                <IconClose className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-zinc-300">
                Are you sure you want to delete clan <strong className="text-white">"{deletingClan.name}"</strong>?
              </p>
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                This will permanently delete all members, trips, items, and settlements in this clan. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingClan(null)}
                className="btn btn-s text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteClan(deletingClan.id, deletingClan.name)}
                className="btn btn-danger text-xs px-4 py-2"
              >
                {loading ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
