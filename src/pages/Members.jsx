import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { IconPlus, IconTrash, IconPencil, IconCrown, IconKey, IconGripVertical } from '../components/icons'
import { formatINR, formatDOB, isValidDOB } from '../lib/formatINR'
import Modal from '../components/Modal'

export default function Members({ members, balances, memberId, currentMember, clanId, onRefresh }) {
  const [newMemberName, setNewMemberName] = useState('')
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [editAlias, setEditAlias] = useState('')
  const [showLeaderModal, setShowLeaderModal] = useState(false)
  const [leaderDob, setLeaderDob] = useState('')
  const [leaderError, setLeaderError] = useState('')
  const [shakeDob, setShakeDob] = useState(false)

  const [draggingId, setDraggingId] = useState(null)
  const [localNonLeaders, setLocalNonLeaders] = useState(null)

  useEffect(() => {
    setLocalNonLeaders(null)
  }, [members])

  const leaderMember = members.find((m) => m.is_creator)
  const baseNonLeaders = members.filter((m) => !m.is_creator)
  const activeNonLeaders = localNonLeaders || baseNonLeaders
  const displayMembers = leaderMember ? [leaderMember, ...activeNonLeaders] : activeNonLeaders

  function triggerDobShake() {
    setShakeDob(true)
    setTimeout(() => setShakeDob(false), 420)
  }

  async function persistOrder(newNonLeaderList) {
    const baseTime = Date.now()
    const updates = newNonLeaderList.map((m, idx) => {
      const isoTime = new Date(baseTime + idx * 1000).toISOString()
      return supabase.from('clan_members').update({ created_at: isoTime }).eq('id', m.id)
    })
    await Promise.all(updates)
    onRefresh()
  }

  function handlePointerDown(e, targetMemberId) {
    setDraggingId(targetMemberId)
    if (e.target.setPointerCapture) {
      try {
        e.target.setPointerCapture(e.pointerId)
      } catch (err) { }
    }
  }

  function handlePointerMove(e) {
    if (!draggingId) return
    const targetElement = document.elementFromPoint(e.clientX, e.clientY)
    if (!targetElement) return
    const rowEl = targetElement.closest('[data-member-id]')
    if (!rowEl) return
    const targetId = rowEl.getAttribute('data-member-id')
    const isLeader = rowEl.getAttribute('data-is-leader') === 'true'
    if (isLeader || !targetId || targetId === draggingId) return

    const list = [...activeNonLeaders]
    const fromIdx = list.findIndex((m) => m.id === draggingId)
    const toIdx = list.findIndex((m) => m.id === targetId)

    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      const [moved] = list.splice(fromIdx, 1)
      list.splice(toIdx, 0, moved)
      setLocalNonLeaders(list)
    }
  }

  async function handlePointerUp(e) {
    if (!draggingId) return
    if (e.target.releasePointerCapture) {
      try {
        e.target.releasePointerCapture(e.pointerId)
      } catch (err) { }
    }
    const currentList = localNonLeaders || baseNonLeaders
    setDraggingId(null)
    await persistOrder(currentList)
  }

  async function handleAddMember() {
    if (!newMemberName.trim()) return
    if (members.length >= 10) return
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
    if (localNonLeaders) {
      setLocalNonLeaders(localNonLeaders.filter((m) => m.id !== id))
    }
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

        <div className="p-3 space-y-2 select-none">
          {displayMembers.map((member) => {
            const balanceObj = balances.net_balances.find((nb) => nb.person === member.id)
            const isSelf = member.id === memberId
            const isEditing = editingMemberId === member.id
            const net = balanceObj?.net ?? 0
            const isCurrentlyDragging = draggingId === member.id

            return (
              <div
                key={member.id}
                data-member-id={member.id}
                data-is-leader={member.is_creator}
                className={`p-3 rounded-xl border transition-all duration-150 flex items-center gap-3 select-none ${isCurrentlyDragging
                    ? 'bg-blue-500/15 border-blue-500/60 shadow-xl scale-[1.02] z-20 relative'
                    : 'bg-zinc-900/70 border-zinc-800/90 hover:border-zinc-700/70 hover:bg-zinc-800/40'
                  }`}
              >
                {/* Touch Drag Handle */}
                {!member.is_creator && !isEditing ? (
                  <div
                    className="w-7 h-7 rounded-lg bg-zinc-800/70 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/60 active:bg-blue-500/20 active:text-blue-300 touch-none cursor-grab active:cursor-grabbing shrink-0 select-none transition-colors"
                    title="Touch/Hold & Swipe to move"
                    onPointerDown={(e) => handlePointerDown(e, member.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                  >
                    <IconGripVertical className="w-3.5 h-3.5" />
                  </div>
                ) : (
                  <div className="w-7 h-7 shrink-0" aria-hidden="true" />
                )}

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/60 text-zinc-200 flex items-center justify-center font-semibold text-sm shrink-0 select-none">
                  {member.alias.charAt(0).toUpperCase()}
                </div>

                {/* Member Info / Edit Form */}
                <div className="min-w-0 flex-1 select-none">
                  {isEditing ? (
                    <div className="flex gap-2 items-center">
                      <input
                        className="settled-input !h-8 text-xs py-1"
                        value={editAlias}
                        maxLength={12}
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
                        <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20 font-medium">
                          <IconCrown className="w-3 h-3 text-amber-400" />
                          <span>Leader</span>
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
                          className="icon-btn text-zinc-400 hover:text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40 transition-colors p-1"
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
          <button className="btn btn-s btn-sm text-xs px-3.5 shrink-0 border-amber-500/40 text-amber-300 hover:bg-amber-500/10 inline-flex items-center gap-1.5" onClick={() => setShowLeaderModal(true)}>
            <IconKey className="w-3.5 h-3.5 text-amber-400" />
            <span>Claim Leader Access</span>
          </button>
        </div>
      )}

      {currentMember?.is_creator && (
        <div className="settled-card p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="sec-lbl">Add Member</p>
            <span className="text-[11px] font-mono text-zinc-400">{members.length}/10</span>
          </div>
          {members.length >= 10 ? (
            <p className="text-xs text-amber-400 font-medium">Maximum member limit reached (10 max per clan)</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); handleAddMember(); }} className="flex gap-2">
              <input
                className="settled-input flex-1"
                value={newMemberName}
                maxLength={12}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Enter member name"
              />
              <button type="submit" className="btn btn-p btn-sm px-4 flex items-center gap-1.5 shrink-0 w-auto">
                <IconPlus className="w-3.5 h-3.5 text-zinc-950" />
                <span>Add</span>
              </button>
            </form>
          )}
        </div>
      )}

      <Modal
        isOpen={showLeaderModal}
        onClose={() => setShowLeaderModal(false)}
        title="Leader Access Verification"
        icon={IconKey}
        iconColor="text-amber-400"
        confirmText="Verify"
        cancelText="Cancel"
        onConfirm={handleVerifyLeaderDob}
        danger={false}
      >
        <div className="space-y-3">
          <p className="text-xs text-zinc-400">
            Enter the Leader Date of Birth (DOB) set during clan creation to claim leader privileges.
          </p>

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
        </div>
      </Modal>
    </div>
  )
}
