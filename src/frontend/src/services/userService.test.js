import { afterEach, describe, expect, it, vi } from 'vitest'
import { createUser, listUsers, updateUser } from './userService'

const response = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(data),
})

describe('userService', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lists users with bearer authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response([]))
    vi.stubGlobal('fetch', fetchMock)

    await listUsers('access-token')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/users/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    )
  })

  it('creates a user with bearer authentication and the allowed payload', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: 2 }, 201))
    vi.stubGlobal('fetch', fetchMock)
    const payload = {
      email: 'nuevo@dentalclinic.com',
      first_name: 'Lucía',
      last_name: 'Méndez',
      role: 'ODONTOLOGO',
      password: 'ContraseñaSegura123!',
      confirm_password: 'ContraseñaSegura123!',
    }

    await createUser('access-token', payload)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/users/',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    )
  })

  it('updates a user with bearer authentication and PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ id: 4, first_name: 'Elena' }))
    vi.stubGlobal('fetch', fetchMock)
    const changes = {
      email: 'elena@dentalclinic.com',
      first_name: 'Elena',
      last_name: 'Vargas',
      role: 'ODONTOLOGO',
      is_active: false,
    }

    await updateUser('access-token', 4, changes)

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/users/4/',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(changes),
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    )
  })
})
