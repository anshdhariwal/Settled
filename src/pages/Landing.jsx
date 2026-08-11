import { useNavigate } from 'react-router-dom'
import { Shell } from '../components/layout'
import { BrandLogo, IconPlus, IconChevronRight } from '../components/icons'

export default function Landing() {
  const navigate = useNavigate()

  return (
    <Shell>
      <div className="settled-card p-5 sm:p-6 space-y-6 text-center">
        <div className="space-y-2">
          <BrandLogo height="h-9" />
          <p className="text-zinc-400 text-xs sm:text-sm">Real-time shared expense splitting</p>
        </div>

        <div className="space-y-2.5">
          <button className="btn btn-p text-xs sm:text-sm" onClick={() => navigate('/create')}>
            <IconPlus className="w-4 h-4 text-zinc-950" />
            <span>Create a new Clan</span>
          </button>
          <button className="btn btn-s text-xs sm:text-sm" onClick={() => navigate('/join')}>
            <span>Join Clan with Code</span>
            <IconChevronRight className="w-4 h-4 text-zinc-400" />
          </button>
        </div>
      </div>
    </Shell>
  )
}
