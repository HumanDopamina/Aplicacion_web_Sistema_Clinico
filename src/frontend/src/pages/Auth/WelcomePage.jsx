import { useAuth } from '../../context/authContextValue'
import DashboardPage from '../Dashboard/DashboardPage'

export default function WelcomePage() {
  const { user } = useAuth()
  return <DashboardPage user={user} />
}
