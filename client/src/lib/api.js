const API_BASE = '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error || 'Request failed';
    throw new Error(message);
  }

  return payload;
}

export const api = {
  getSessions: () => request('/sessions'),
  createSession: (title) =>
    request('/sessions', {
      method: 'POST',
      body: JSON.stringify({ title }),
    }),
  getSession: (id) => request(`/sessions/${id}`),
  deleteSession: (id) =>
    request(`/sessions/${id}`, {
      method: 'DELETE',
    }),
  addParticipant: (sessionId, participant) =>
    request(`/sessions/${sessionId}/participants`, {
      method: 'POST',
      body: JSON.stringify(participant),
    }),
  updateParticipant: (sessionId, participantId, participant) =>
    request(`/sessions/${sessionId}/participants/${participantId}`, {
      method: 'PUT',
      body: JSON.stringify(participant),
    }),
  deleteParticipant: (sessionId, participantId) =>
    request(`/sessions/${sessionId}/participants/${participantId}`, {
      method: 'DELETE',
    }),
  addItem: (sessionId, item) =>
    request(`/sessions/${sessionId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    }),
  updateItem: (sessionId, itemId, item) =>
    request(`/sessions/${sessionId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    }),
  deleteItem: (sessionId, itemId) =>
    request(`/sessions/${sessionId}/items/${itemId}`, {
      method: 'DELETE',
    }),
  updateCharges: (sessionId, charges) =>
    request(`/sessions/${sessionId}/charges`, {
      method: 'PUT',
      body: JSON.stringify(charges),
    }),
  getSummary: (sessionId) => request(`/sessions/${sessionId}/summary`),
  getMenuMappings: () => request('/menu-mappings'),
  classifyMenuItems: (names) =>
    request('/menu-mappings/classify', {
      method: 'POST',
      body: JSON.stringify({ names }),
    }),
  saveMenuMapping: (itemName, mapping) =>
    request(`/menu-mappings/${encodeURIComponent(itemName)}`, {
      method: 'PUT',
      body: JSON.stringify(mapping),
    }),
};
