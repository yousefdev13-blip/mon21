const http = require('node:http');
const { URL } = require('node:url');

function createApp({ initialCards = [] } = {}) {
  let cards = initialCards.map((card, index) => ({
    id: card.id || String(index + 1),
    front: card.front,
    back: card.back,
    createdAt: card.createdAt || new Date().toISOString(),
  }));
  let nextId = cards.reduce((max, card) => Math.max(max, Number(card.id) || 0), 0) + 1;

  function send(res, status, data) {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
  }

  async function readBody(req) {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    if (!raw) return {};
    try { return JSON.parse(raw); }
    catch { throw Object.assign(new Error('Invalid JSON body'), { status: 400 }); }
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);

    if (req.method === 'GET' && url.pathname === '/health') {
      return send(res, 200, { status: 'ok' });
    }
    if (req.method === 'GET' && url.pathname === '/api/flashcards') {
      return send(res, 200, { data: cards });
    }
    if (req.method === 'POST' && url.pathname === '/api/flashcards') {
      try {
        const body = await readBody(req);
        if (typeof body.front !== 'string' || !body.front.trim() ||
            typeof body.back !== 'string' || !body.back.trim()) {
          return send(res, 400, { error: 'front and back are required' });
        }
        const card = {
          id: String(nextId++),
          front: body.front.trim(),
          back: body.back.trim(),
          createdAt: new Date().toISOString(),
        };
        cards.push(card);
        return send(res, 201, { data: card });
      } catch (error) {
        return send(res, error.status || 500, { error: error.message });
      }
    }
    if (parts[0] === 'api' && parts[1] === 'flashcards' && parts.length === 3) {
      const id = parts[2];
      const index = cards.findIndex(card => card.id === id);
      if (index === -1) return send(res, 404, { error: 'Flashcard not found' });

      if (req.method === 'GET') return send(res, 200, { data: cards[index] });
      if (req.method === 'PUT' || req.method === 'PATCH') {
        try {
          const body = await readBody(req);
          const front = body.front === undefined ? cards[index].front : body.front;
          const back = body.back === undefined ? cards[index].back : body.back;
          if (typeof front !== 'string' || !front.trim() ||
              typeof back !== 'string' || !back.trim()) {
            return send(res, 400, { error: 'front and back must be non-empty strings' });
          }
          cards[index] = { ...cards[index], front: front.trim(), back: back.trim() };
          return send(res, 200, { data: cards[index] });
        } catch (error) {
          return send(res, error.status || 500, { error: error.message });
        }
      }
      if (req.method === 'DELETE') {
        const [deleted] = cards.splice(index, 1);
        return send(res, 200, { data: deleted });
      }
    }
    return send(res, 404, { error: 'Route not found' });
  });

  return server;
}

module.exports = { createApp };
