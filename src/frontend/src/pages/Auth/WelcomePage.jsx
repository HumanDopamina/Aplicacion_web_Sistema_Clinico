import { useAuth } from '../../context/authContextValue'
import DashboardPage from '../Dashboard/DashboardPage'

export default function WelcomePage() {
  const { user, accessToken } = useAuth()
  return <DashboardPage user={user} accessToken={accessToken} />
}
