import { useEffect, useState } from 'react'
import { getUserAvatarContent } from '../services/userService'

const initialsFor = (user) => {
  const parts = [user?.first_name, user?.last_name].filter(Boolean)
  if (parts.length) return parts.map((part) => part[0]).join('').slice(0, 2).toUpperCase()
  return (user?.email || 'U').slice(0, 2).toUpperCase()
}

export default function AuthenticatedAvatar({
  user,
  accessToken,
  alt = '',
  className = 'h-10 w-10',
  imageClassName = '',
}) {
  const [source, setSource] = useState('')

  useEffect(() => {
    let active = true
    let objectUrl = ''
    if (!user?.avatar_url) {
      setSource('')
      return undefined
    }
    getUserAvatarContent(accessToken, user.avatar_url)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setSource(objectUrl)
      })
      .catch(() => { if (active) setSource('') })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [accessToken, user?.avatar_url])

  const shared = `${className} grid shrink-0 place-items-center overflow-hidden rounded-full bg-blue-100 text-xs font-bold text-blue-700`
  if (source) {
    return <span className={shared}><img src={source} alt={alt} className={`h-full w-full object-cover ${imageClassName}`} /></span>
  }
  return <span aria-label={alt || undefined} className={shared}>{initialsFor(user)}</span>
}
