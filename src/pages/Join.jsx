import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { Shell, Field } from '../components/layout'
import { IconChevronLeft, IconChevronRight, IconSuccessTick } from '../components/icons'

export default function Join({ onEnter }) {
  const navigate = useNavigate()
  const [step, setStep] = useState('code')
  const [code, setCode] = useState('')
  const [clan, setClan] = useState(null)
  const [availableMembers, setAvailableMembers] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [newMemberAlias, setNewMemberAlias] = useState('')
  const [isAddingNew, setIsAddingNew] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function showToastError(msg) {
    setError(msg)
    setTimeout(() => setError(''), 3500)
  }

  function handleBackClick() {
    if (step === 'select_identity') {
      if (isAddingNew && availableMembers.length > 0) {
        setIsAddingNew(false)
      } else {
        setStep('code')
      }
    } else {
      navigate('/')
    }
  }

  async function handleVerifyCode() {
    if (!code.trim()) {
      showToastError('Enter a join code.')
      return
    }
    setError('')
    setLoading(true)
    const { data: clanData, error: clanError } = await supabase
      .from('clans')
      .select('*')
      .eq('join_code', code.toUpperCase().trim())
      .maybeSingle()

    if (clanError || !clanData) {
      setLoading(false)
      showToastError('No clan found with that join code.')
      return
    }

    const { data: membersData } = await supabase
      .from('clan_members')
      .select('*')
      .eq('clan_id', clanData.id)
      .eq('deleted', false)
      .eq('is_creator', false)

    setClan(clanData)
    setAvailableMembers(membersData || [])
    if (membersData && membersData.length > 0) {
      setSelectedMemberId(membersData[0].id)
      setIsAddingNew(false)
    } else {
      setIsAddingNew(true)
    }
    setLoading(false)
    setStep('select_identity')
  }

  async function handleJoinClan() {
    if (isAddingNew) {
      if (!newMemberAlias.trim()) {
        showToastError('Please enter your name.')
        return
      }
      setLoading(true)
      const { data: newMember, error: insertError } = await supabase
        .from('clan_members')
        .insert({ clan_id: clan.id, alias: newMemberAlias.trim(), is_creator: false })
        .select()
        .single()

      setLoading(false)
      if (insertError) {
        showToastError('Could not join clan. Try again.')
        return
      }
      onEnter(clan.id, newMember.id)
      navigate(`/clan/${clan.id}`)
    } else {
      if (!selectedMemberId) {
        showToastError('Please select your name.')
        return
      }
      onEnter(clan.id, selectedMemberId)
      navigate(`/clan/${clan.id}`)
    }
  }

  return (
    <Shell>
      <div className="settled-card p-5 sm:p-6 space-y-5">
        <div className="ph">
          <button onClick={handleBackClick} className="back-btn" title="Back">
            <IconChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="ph-title">Join a Clan</h2>
        </div>

        {step === 'code' && (
          <div className="space-y-4">
            <Field label="Enter 6-Character Join Code">
              <input
                className="settled-input text-center tracking-[0.2em] font-mono text-lg uppercase"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AB12CD"
                autoFocus
              />
            </Field>
            {error && (
              <p className="toast-msg text-rose-400 text-xs font-medium bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}
            <button
              disabled={loading || code.length < 6}
              className="btn btn-p disabled:opacity-40"
              onClick={handleVerifyCode}
            >
              <span>{loading ? 'Finding Clan...' : 'Next'}</span>
              <IconChevronRight className="w-4 h-4 text-zinc-950" />
            </button>
          </div>
        )}

        {step === 'select_identity' && (
          <div className="space-y-4">
            <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs text-zinc-400">
              Clan: <span className="font-semibold text-white">{clan.name}</span>
            </div>

            {availableMembers.length > 0 && !isAddingNew ? (
              <div className="space-y-3">
                <Field label="Select Your Identity">
                  <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                    {availableMembers.map((member) => {
                      const isSelected = selectedMemberId === member.id
                      return (
                        <button
                          type="button"
                          key={member.id}
                          onClick={() => setSelectedMemberId(member.id)}
                          className={`w-full p-3 rounded-xl text-xs text-left border transition-all flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-500/10 border-blue-500/50 text-blue-300'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center font-bold text-xs">
                              {member.alias.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-white">{member.alias}</p>
                              <p className="text-[11px] text-zinc-400">Claim identity</p>
                            </div>
                          </div>
                          {isSelected ? (
                            <IconSuccessTick className="w-4 h-4 text-blue-400" />
                          ) : (
                            <IconChevronRight className="w-4 h-4 text-zinc-500" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </Field>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  className="text-xs text-blue-400 hover:underline inline-block pt-1"
                >
                  + Name not listed? Add yourself
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="Your Name / Alias">
                  <input
                    className="settled-input"
                    value={newMemberAlias}
                    onChange={(e) => setNewMemberAlias(e.target.value)}
                    placeholder="e.g. Badal"
                    autoFocus
                  />
                </Field>
                {availableMembers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="text-xs text-zinc-400 hover:underline inline-block"
                  >
                    Select from existing member list
                  </button>
                )}
              </div>
            )}

            {error && (
              <p className="toast-msg text-rose-400 text-xs font-medium bg-rose-500/10 p-3 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}

            <button
              disabled={loading}
              className="btn btn-p disabled:opacity-50"
              onClick={handleJoinClan}
            >
              {loading ? 'Joining...' : 'Enter Clan'}
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}
