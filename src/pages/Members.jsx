import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { IconPlus, IconTrash } from '../components/icons'

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
    <div className="space-y-4">
      <div className="settled-card p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Clan Members ({members.length})</h3>
        </div>

        <div className="divide-y divide-zinc-800">
          {members.map((member) => {
            const balanceObj = balances.net_balances.find((nb) => nb.person === member.id)
            const isSelf = member.id === memberId
            const isEditing = editingMemberId === member.id

            return (
              <div key={member.id} className="py-3 flex justify-between items-center gap-2">
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-xs">
                    {member.alias.charAt(0).toUpperCase()}
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2 flex-1 max-w-xs">
                      <input
                        className="settled-input py-1 text-xs"
                        value={editAlias}
                        onChange={(e) => setEditAlias(e.target.value)}
                        autoFocus
                      />
                      <button className="btn btn-s btn-sm" onClick={() => handleSaveEdit(member.id)}>Save</button>
                      <button className="btn btn-s btn-sm" onClick={() => setEditingMemberId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <span>{member.alias}</span>
                        {isSelf && <span className="text-[10px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">You</span>}
                        {member.is_creator && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">Leader</span>}
                      </p>
                      <p className="text-[11px] text-zinc-500">Joined member</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {balanceObj && (
                    <span className={`text-xs font-mono font-semibold ${balanceObj.net > 0.005 ? 'text-emerald-400' : balanceObj.net < -0.005 ? 'text-rose-400' : 'text-zinc-500'}`}>
                      {balanceObj.net > 0.005 ? `+₹${balanceObj.net}` : balanceObj.net < -0.005 ? `-₹${Math.abs(balanceObj.net)}` : 'settled'}
                    </span>
                  )}

                  {currentMember?.is_creator && !isEditing && (
                    <div className="flex items-center gap-1">
                      <button
                        className="btn btn-s btn-sm text-[11px]"
                        onClick={() => {
                          setEditingMemberId(member.id)
                          setEditAlias(member.alias)
                        }}
                      >
                        Edit
                      </button>
                      {!member.is_creator && (
                        <button
                          className="icon-btn text-zinc-500 hover:text-rose-400"
                          onClick={() => handleRemoveMember(member.id)}
                          title="Remove Member"
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
        <div className="settled-card p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">Leader Control: Add Member</h4>
          <div className="flex gap-2">
            <input
              className="settled-input flex-1"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Enter new member name"
            />
            <button onClick={handleAddMember} className="btn btn-p btn-sm px-4 flex items-center gap-1.5">
              <IconPlus className="w-3.5 h-3.5 text-zinc-950" />
              <span>Add</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
