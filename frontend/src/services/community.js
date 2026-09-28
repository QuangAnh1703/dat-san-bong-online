import { api } from './api';

// Posts
export async function listPosts(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const query = params.toString();
  return api.get(`/api/community/posts${query ? '?' + query : ''}`);
}

export async function getPost(id) {
  return api.get(`/api/community/posts/${id}`);
}

export async function createPost(data) {
  return api.post('/api/community/posts', data);
}

export async function updatePost(id, data) {
  return api.put(`/api/community/posts/${id}`, data);
}

// Join Requests
export async function sendJoinRequest(data) {
  return api.post('/api/community/requests', data);
}

export async function listJoinRequests(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) params.append(key, value);
  });
  const query = params.toString();
  return api.get(`/api/community/requests${query ? '?' + query : ''}`);
}

export async function updateJoinRequest(id, data) {
  return api.put(`/api/community/requests/${id}`, data);
}

// Conversations
export async function listConversations() {
  return api.get('/api/community/conversations');
}

export async function getMessages(conversationId, filters = {}) {
  const params = new URLSearchParams(filters);
  const query = params.toString();
  return api.get(`/api/community/conversations/${conversationId}/messages${query ? '?' + query : ''}`);
}

export async function sendMessage(conversationId, data) {
  return api.post(`/api/community/conversations/${conversationId}/messages`, data);
}
