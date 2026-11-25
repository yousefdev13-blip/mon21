const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

async function withServer(t, options) {
  const server = createApp(options);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  t.after(() => new Promise(resolve => server.close(resolve)));
  return async (path, options = {}) => {
    const response = await fetch(base + path, {
      ...options,
      headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    });
    const body = await response.json();
    return { status: response.status, body };
  };
}

test('GET /health returns API status', async t => {
  const request = await withServer(t);
  const result = await request('/health');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { status: 'ok' });
});

test('GET /api/flashcards returns an empty list initially', async t => {
  const request = await withServer(t);
  const result = await request('/api/flashcards');
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, { data: [] });
});

test('GET /api/flashcards returns seeded cards', async t => {
  const request = await withServer(t, { initialCards: [{ id: '7', front: 'A', back: 'B' }] });
  const result = await request('/api/flashcards');
  assert.equal(result.body.data.length, 1);
  assert.equal(result.body.data[0].front, 'A');
});

test('POST /api/flashcards creates a card', async t => {
  const request = await withServer(t);
  const result = await request('/api/flashcards', {
    method: 'POST', body: JSON.stringify({ front: 'Question', back: 'Answer' }),
  });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.front, 'Question');
  assert.equal(result.body.data.back, 'Answer');
  assert.ok(result.body.data.id);
});

test('POST rejects missing or empty fields', async t => {
  const request = await withServer(t);
  for (const payload of [{ front: 'Q' }, { front: '', back: 'A' }, { front: 'Q', back: '  ' }]) {
    const result = await request('/api/flashcards', { method: 'POST', body: JSON.stringify(payload) });
    assert.equal(result.status, 400);
  }
});

test('POST rejects malformed JSON', async t => {
  const request = await withServer(t);
  const result = await request('/api/flashcards', { method: 'POST', body: '{bad json' });
  assert.equal(result.status, 400);
});

test('GET /api/flashcards/:id returns one card', async t => {
  const request = await withServer(t, { initialCards: [{ id: '1', front: 'Q', back: 'A' }] });
  const result = await request('/api/flashcards/1');
  assert.equal(result.status, 200);
  assert.equal(result.body.data.back, 'A');
});

test('GET /api/flashcards/:id returns 404 for an unknown card', async t => {
  const request = await withServer(t);
  const result = await request('/api/flashcards/404');
  assert.equal(result.status, 404);
});

test('PATCH updates only supplied fields', async t => {
  const request = await withServer(t, { initialCards: [{ id: '1', front: 'Old Q', back: 'Old A' }] });
  const result = await request('/api/flashcards/1', {
    method: 'PATCH', body: JSON.stringify({ front: 'New Q' }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.front, 'New Q');
  assert.equal(result.body.data.back, 'Old A');
});

test('PUT updates both fields', async t => {
  const request = await withServer(t, { initialCards: [{ id: '1', front: 'Old Q', back: 'Old A' }] });
  const result = await request('/api/flashcards/1', {
    method: 'PUT', body: JSON.stringify({ front: 'New Q', back: 'New A' }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.body.data.back, 'New A');
});

test('update rejects empty values', async t => {
  const request = await withServer(t, { initialCards: [{ id: '1', front: 'Q', back: 'A' }] });
  const result = await request('/api/flashcards/1', {
    method: 'PATCH', body: JSON.stringify({ back: '' }),
  });
  assert.equal(result.status, 400);
});

test('DELETE removes a card', async t => {
  const request = await withServer(t, { initialCards: [{ id: '1', front: 'Q', back: 'A' }] });
  const deleted = await request('/api/flashcards/1', { method: 'DELETE' });
  assert.equal(deleted.status, 200);
  const list = await request('/api/flashcards');
  assert.deepEqual(list.body.data, []);
});

test('DELETE returns 404 for an unknown card', async t => {
  const request = await withServer(t);
  const result = await request('/api/flashcards/99', { method: 'DELETE' });
  assert.equal(result.status, 404);
});

test('unknown routes return 404', async t => {
  const request = await withServer(t);
  const result = await request('/unknown');
  assert.equal(result.status, 404);
});
