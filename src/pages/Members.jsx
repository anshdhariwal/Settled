import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { IconPlus, IconTrash, IconPencil } from '../components/icons'

export default function Members({ members, balances, memberId, currentMember, clanId, onRefresh }) {
  const [newMemberName, setNewMemberName] = useState('')
  const [editingMemberId, setEditingMemberId] = useState(null)
  const [editAlias, setEditAlias] = useState('')

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

                {/* Name / edit row */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        className="settled-input flex-1 text-sm"
                        value={editAlias}
                        onChange={(e) => setEditAlias(e.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-s btn-sm shrink-0 w-auto px-3" onClick={() => handleSaveEdit(member.id)}>Save</button>
                      <button className="btn btn-s btn-sm shrink-0 w-auto px-3" onClick={() => setEditingMemberId(null)}>✕</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-white truncate">{member.alias}</span>
                      {isSelf && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded font-medium">you</span>}
                      {member.is_creator && <span className="text-[10px] text-zinc-400 font-medium">leader</span>}
                    </div>
                  )}
                </div>

                {/* Right side — balance + actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {balanceObj && (
                    <span className={`text-xs font-mono font-semibold tabular-nums ${net > 0.005 ? 'text-emerald-400' : net < -0.005 ? 'text-rose-400' : 'text-zinc-400'}`}>
                      {net > 0.005 ? `+₹${net}` : net < -0.005 ? `-₹${Math.abs(net)}` : '—'}
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
                          title="Remove"
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
    </div>
  )
}
