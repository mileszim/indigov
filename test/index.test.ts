import { env, applyD1Migrations } from 'cloudflare:test'
import { describe, test, expect, beforeAll } from 'vitest'
import app from '../src/index'
import { Constituent } from '../src/types'

beforeAll(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
})

describe('GET /constituents', () => {
  describe('format=JSON', () => {
    test('GET /constituents', async () => {
      const res = await app.request('http://localhost/constituents', {}, env)
      expect(res.status).toBe(200)
      const body: Constituent[] = await res.json()
      expect(body).toHaveLength(25)
      expect(body[0]).toHaveProperty('id')
      expect(body[0]).toHaveProperty('email')
      expect(body[0]).toHaveProperty('name')
      expect(body[0]).toHaveProperty('phone')
      expect(body[0]).toHaveProperty('address')
      expect(body[0]).toHaveProperty('created_at')
      expect(body[0]).toHaveProperty('updated_at')
      expect(body[0]).toHaveProperty('unsubscribed_at')
    })

    test('GET /constituents?limit=10&offset=5', async () => {
      const res = await app.request('http://localhost/constituents?limit=10&offset=5', {}, env)
      expect(res.status).toBe(200)
      const body: Constituent[] = await res.json()
      expect(body).toHaveLength(10)
      expect(body[0]).toHaveProperty('id')
      expect(body[0]).toHaveProperty('email')
      expect(body[0]).toHaveProperty('name')
      expect(body[0]).toHaveProperty('phone')
      expect(body[0]).toHaveProperty('address')
      expect(body[0]).toHaveProperty('created_at')
      expect(body[0]).toHaveProperty('updated_at')
      expect(body[0]).toHaveProperty('unsubscribed_at')
    })
  })

  describe('format=CSV', () => {
    test('GET /constituents?format=csv', async () => {
      const res = await app.request('http://localhost/constituents?format=csv', {}, env)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/csv')
      const body = await res.text()
      const csv = body.split('\n').map(row => row.split(','))
      expect(body).toMatch(/id,email,name,phone,address,created_at,updated_at,unsubscribed_at\n/)
      expect(csv).toHaveLength(501)
    })

    test('GET /constituents?format=csv&created_at=>${date}', async () => {
      env.DB.prepare(
        `INSERT INTO constituents (id, email, name, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        'testid',
        'testemail@email.com',
        'Test User',
        '123-456-7890',
        '123 Test St',
        // pick a date far in the future so we filter for only one record
        '2030-02-01T00:00:00Z',
        '2030-02-01T00:00:00Z',
      ).run()
      const res = await app.request('http://localhost/constituents?format=csv&created_at=>2030-01-01T00:00:00Z', {}, env)
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/csv')
      const body = await res.text()
      expect(body).toMatch(/id,email,name,phone,address,created_at,updated_at,unsubscribed_at\n/)
      const csv = body.split('\n').map(row => row.split(','))
      expect(csv).toHaveLength(2)
    })
  })
})

describe('POST /constituents', () => {
  test('basic functionality', async () => {
    const res = await app.request('http://localhost/constituents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test@email.com',
        name: 'Test User',
        phone: '123-456-7890',
        address: '123 Test St',
      }),
    }, env)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({
      id: expect.stringMatching(/[A-Z0-9]{26}/),
      email: 'test@email.com',
      name: 'Test User',
      phone: '123-456-7890',
      address: '123 Test St',
      created_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
      updated_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
      unsubscribed_at: null,
    })
  })

  test('constituent record with identical email is updated', async () => {
    const res = await app.request('http://localhost/constituents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test2@email.com',
        name: 'Test User 2',
        phone: '123-456-1111',
        address: '123 Test St',
      }),
    }, env)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({
      id: expect.stringMatching(/[A-Z0-9]{26}/),
      email: 'test2@email.com',
      name: 'Test User 2',
      phone: '123-456-1111',
      address: '123 Test St',
      created_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
      updated_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
      unsubscribed_at: null,
    })

    const dupres = await app.request('http://localhost/constituents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test2@email.com',
        name: 'Updated Test User 2',
        phone: '111-111-1111',
        address: '123 Test St',
      }),
    }, env)
    expect(dupres.status).toBe(201)
    expect(await dupres.json()).toEqual({
      id: expect.stringMatching(/[A-Z0-9]{26}/),
      email: 'test2@email.com',
      name: 'Updated Test User 2',
      phone: '111-111-1111',
      address: '123 Test St',
      created_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
      updated_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
      unsubscribed_at: null,
    })
  })

  test('email is validated', async () => {
    const res = await app.request('http://localhost/constituents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'bad email',
      }),
    }, env)
    expect(res.status).toBe(400)
    const body: Record<string, any> = await res.json()
    expect(body).toHaveProperty('success', false)
    expect(body.error.issues).toHaveLength(1)
    expect(body.error.issues[0]).toEqual({
      "validation": "email",
      "code": "invalid_string",
      "message": "Invalid email",
      "path": [
          "email"
      ]
    })
  })

  test('unvalidated fields are ignored', async () => {
    const res = await app.request('http://localhost/constituents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test3@email.com',
        name: 'Test User 3',
        ignored_param: 'ignored value',
      }),
    }, env)
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({
      id: expect.stringMatching(/[A-Z0-9]{26}/),
      email: 'test3@email.com',
      name: 'Test User 3',
      phone: null,
      address: null,
      created_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
      updated_at: expect.stringMatching(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/),
      unsubscribed_at: null,
    })
  })
})
