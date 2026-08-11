import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createUser,
  getCurrentUser,
  getUserAvatarContent,
  listRolePermissionPresets,
  listUsers,
  updateRolePermissionPreset,
  updateCurrentProfile,
  updateUser,
} from './userService'

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

  it('creates a user as multipart so an avatar can be included', async () => {
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
        body: expect.any(FormData),
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    )
    const body = fetchMock.mock.calls[0][1].body
    expect(Object.fromEntries(body.entries())).toEqual(payload)
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Content-Type')
  })

  it('updates a user as multipart with bearer authentication and PATCH', async () => {
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
        body: expect.any(FormData),
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    )
    expect(Object.fromEntries(fetchMock.mock.calls[0][1].body.entries())).toEqual({
      ...changes,
      is_active: 'false',
    })
  })

  it('loads and updates the authenticated profile using the current-user endpoint', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response({ id: 4, first_name: 'Elena' }))
      .mockResolvedValueOnce(response({ id: 4, first_name: 'Elena María' }))
    vi.stubGlobal('fetch', fetchMock)

    await getCurrentUser('access-token')
    await updateCurrentProfile('access-token', {
      first_name: 'Elena María',
      remove_avatar: true,
    })

    expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8000/api/auth/me/')
    expect(fetchMock.mock.calls[1][0]).toBe('http://127.0.0.1:8000/api/auth/me/')
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({
      method: 'PATCH',
      body: expect.any(FormData),
      headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
    }))
    expect(Object.fromEntries(fetchMock.mock.calls[1][1].body.entries())).toEqual({
      first_name: 'Elena María',
      remove_avatar: 'true',
    })
  })

  it('downloads a protected avatar as a blob', async () => {
    const avatar = new Blob(['avatar'], { type: 'image/png' })
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(avatar),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(getUserAvatarContent(
      'access-token',
      '/api/auth/users/4/avatar/',
    )).resolves.toBe(avatar)
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/users/4/avatar/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    )
  })

  it('lists role permission presets with bearer authentication', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ presets: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await listRolePermissionPresets('access-token')

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/role-permissions/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    )
  })

  it('replaces a role permission preset with PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({
      role: 'ODONTOLOGO',
      permissions: ['patients.view'],
    }))
    vi.stubGlobal('fetch', fetchMock)

    await updateRolePermissionPreset('access-token', 'ODONTOLOGO', ['patients.view'])

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/role-permissions/ODONTOLOGO/',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ permissions: ['patients.view'] }),
        headers: expect.objectContaining({ Authorization: 'Bearer access-token' }),
      }),
    )
  })
})
