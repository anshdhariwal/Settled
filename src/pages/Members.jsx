import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { IconPlus, IconTrash, IconPencil } from '../components/icons'
import { formatINR, formatDOB, isValidDOB } from '../lib/formatINR'

export default function Members({ members, balances, memberId, currentMember, clanId, onRefresh }) {
  const [newMemberName, setNewMemberName] = useState('')
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [editAlias, setEditAlias] = useState('')
  const [showLeaderModal, setShowLeaderModal] = useState(false)
  const [leaderDob, setLeaderDob] = useState('')
  const [leaderError, setLeaderError] = useState('')
  const [shakeDob, setShakeDob] = useState(false)

  function triggerDobShake() {
    setShakeDob(true)
    setTimeout(() => setShakeDob(false), 420)
  }

  async function handleAddMember() {
    if (!newMemberName.trim()) return
    await supabase.from('clan_members').insert({ clan_id: clanId, alias: newMemberName.trim(), is_creator: false })
    setNewMemberName('')
    onRefresh()
  }

  async function handleSaveEdit(id) {
    if (!editAlias.trim()) return
    await supabase.from('clan_members').update({ alias: editAlias.trim() }).eq('id', id)
    setEditingMemberId(null)
    onRefresh()
  }

  async function handleRemoveMember(id) {
    await supabase.from('clan_members').update({ deleted: true }).eq('id', id)
    onRefresh()
  }

  async function handleVerifyLeaderDob() {
    if (!isValidDOB(leaderDob.trim())) {
      triggerDobShake()
      setLeaderError('Enter valid DOB (DD-MM-YYYY)')
      return
    }
    const { data: clanData } = await supabase.from('clans').select('passcode').eq('id', clanId).single()
    if (!clanData?.passcode || leaderDob.trim() !== clanData.passcode) {
      triggerDobShake()
      setLeaderError('Incorrect Leader DOB. Access denied.')
      return
    }
    setLeaderError('')
    await supabase.from('clan_members').update({ is_creator: true }).eq('id', memberId)
    setShowLeaderModal(false)
    onRefresh()
  }

  return (
    <div className="space-y-3">
      <div className="settled-card overflow-hidden">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <p className="sec-lbl">Clan Members</p>
          <span className="text-[11px] font-mono text-zinc-400">{members.length} member{members.length !== 1 ? 's' : ''}</span>
        </div>

        <div className="divide-y divide-zinc-800/60">
          {members.map((member) => {
            const balanceObj = balances.net_balances.find((nb) => nb.person === member.id)
            const isSelf = member.id === memberId
            const isEditing = editingMemberId === member.id
            const net = balanceObj?.net ?? 0

            return (
              <div key={member.id} className="px-4 py-3 flex items-center gap-3">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-200 flex items-center justify-center font-semibold text-sm shrink-0 select-none">
                  {member.alias.charAt(0).toUpperCase()}
                </div>

                {/* Member Info / Edit Form */}
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
                      <input
                        className="settled-input !h-8 text-xs py-1"
                        value={editAlias}
                        onChange={(e) => setEditAlias(e.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-s btn-sm !h-8 text-xs px-2" onClick={() => handleSaveEdit(member.id)}>Save</button>
                      <button className="btn btn-s btn-sm !h-8 text-xs px-2" onClick={() => setEditingMemberId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="font-medium text-sm text-white truncate">{member.alias}</p>
                      {member.is_creator && (
                        <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                          Leader
                        </span>
                      )}
                      {isSelf && (
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-medium">
                          You
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right side — balance + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {balanceObj && (
                    <span className={`text-xs font-mono font-semibold tabular-nums ${net > 0.005 ? 'text-emerald-400' : net < -0.005 ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {net > 0.005 ? `+₹${formatINR(net)}` : net < -0.005 ? `-₹${formatINR(Math.abs(net))}` : '—'}
                    </span>
                  )}

                  {currentMember?.is_creator && !isEditing && (
                    <div className="flex items-center gap-0.5">
                      <button
                        className="icon-btn text-zinc-500 hover:text-zinc-200"
                        onClick={() => { setEditingMemberId(member.id); setEditAlias(member.alias) }}
                        title="Edit name"
                      >
                        <div className="squish"></div>
                        <IconPencil className="w-3.5 h-3.5" />
                      </button>
                      {!member.is_creator && (
                        <button
                          className="icon-btn icon-btn-danger text-zinc-400"
                          onClick={() => handleRemoveMember(member.id)}
                          title="Remove member"
                        >
                          <div className="squish"></div>
                          <IconTrash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {!currentMember?.is_creator && (
        <div className="settled-card p-4 flex items-center justify-between gap-3 border-amber-500/30">
          <div className="text-left">
            <p className="text-xs font-semibold text-amber-400">Are you the clan leader?</p>
            <p className="text-[11px] text-zinc-400">Claim leader access using your DOB</p>
          </div>
          <button className="btn btn-s btn-sm text-xs px-3.5 shrink-0 border-amber-500/40 text-amber-300 hover:bg-amber-500/10" onClick={() => setShowLeaderModal(true)}>
            Claim Leader Access
          </button>
        </div>
      )}

      {currentMember?.is_creator && (
        <div className="settled-card p-4 space-y-3">
          <p className="sec-lbl">Add Member</p>
          <div className="flex gap-2">
            <input
              className="settled-input flex-1"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Enter member name"
            />
            <button onClick={handleAddMember} className="btn btn-p btn-sm px-4 flex items-center gap-1.5 shrink-0 w-auto">
              <IconPlus className="w-3.5 h-3.5 text-zinc-950" />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}

      {showLeaderModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 action-sheet-bg" style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm settled-card p-5 space-y-4 border border-amber-500/40 action-sheet text-left">
            <div className="space-y-1.5">
              <h3 className="font-bold text-base text-white">Leader Access Verification</h3>
              <p className="text-xs text-zinc-400">
                Enter the Leader Date of Birth (DOB) set during clan creation to claim leader privileges.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Leader DOB (DD-MM-YYYY)</label>
              <input
                className={`settled-input font-mono text-center tracking-wider text-base ${shakeDob ? 'field-shake' : ''}`}
                value={leaderDob}
                onChange={(e) => {
                  setLeaderDob(formatDOB(e.target.value))
                  setLeaderError('')
                }}
                placeholder="DD-MM-YYYY"
                maxLength={10}
                inputMode="numeric"
                autoFocus
              />
            </div>

            {leaderError && (
              <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                {leaderError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button className="btn btn-s flex-1 text-xs" onClick={() => setShowLeaderModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-p flex-1 text-xs font-semibold bg-amber-400 text-zinc-950 hover:bg-amber-300"
                onClick={handleVerifyLeaderDob}
              >
                Verify & Claim Leader
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
