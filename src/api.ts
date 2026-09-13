import type { Conversation, Message } from './types';

const PREFIX = '/chat-api';
const TOKEN_KEY = 'chat-token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/** 401 时由 App 注册，用于踢回登录页 */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void): void {
  onUnauthorized = fn;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(PREFIX + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-chat-token': getToken() ?? '',
      ...(options.headers || {}),
    },
  });
  // /login 的 401 是"密码错误"，不能当作登录过期处理
  if (res.status === 401 && path !== '/login') {
    clearToken();
    onUnauthorized?.();
    throw new Error('登录已过期');
  }
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) throw new Error(data?.error || `请求失败 (${res.status})`);
  return data as T;
}

export function login(password: string): Promise<{ token: string }> {
  return request('/login', { method: 'POST', body: JSON.stringify({ password }) });
}

export function logout(): Promise<unknown> {
  return request('/logout', { method: 'POST' }).catch(() => null);
}

export function checkAuth(): Promise<{ ok: boolean }> {
  return request('/auth-check');
}

export function listConversations(): Promise<Conversation[]> {
  return request('/conversations');
}

export function createConversation(): Promise<Conversation> {
  return request('/conversations', { method: 'POST' });
}

export function renameConversation(id: string, title: string): Promise<unknown> {
  return request(`/conversations/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) });
}

export function deleteConversation(id: string): Promise<unknown> {
  return request(`/conversations/${id}`, { method: 'DELETE' });
}

export function listMessages(id: string): Promise<Message[]> {
  return request(`/conversations/${id}/messages`);
}

export function getSettings(): Promise<{ systemPrompt: string; defaultPrompt: string }> {
  return request('/settings');
}

export function saveSettings(systemPrompt: string): Promise<unknown> {
  return request('/settings', { method: 'PUT', body: JSON.stringify({ systemPrompt }) });
}

interface StreamHandlers {
  onDelta: (delta: string) => void;
  onDone: (title?: string) => void;
  onError: (message: string) => void;
}

/** 流式对话，返回一个可中断的函数 */
export function streamChat(
  conversationId: string,
  content: string,
  handlers: StreamHandlers
): { abort: () => void; finished: Promise<void> } {
  const controller = new AbortController();

  const finished = (async () => {
    let res: Response;
    try {
      res = await fetch(`${PREFIX}/conversations/${conversationId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-chat-token': getToken() ?? '' },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') handlers.onError('网络错误，请检查后端服务');
      return;
    }

    if (res.status === 401) {
      clearToken();
      onUnauthorized?.();
      handlers.onError('登录已过期');
      return;
    }
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => '');
      let msg = `请求失败 (${res.status})`;
      try {
        msg = JSON.parse(detail)?.error || msg;
      } catch {
        /* 非 JSON 响应，用默认提示 */
      }
      handlers.onError(msg);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.delta) handlers.onDelta(parsed.delta);
            if (parsed.done) handlers.onDone(parsed.title);
            if (parsed.error) handlers.onError(parsed.error);
          } catch {
            /* 忽略无法解析的片段 */
          }
        }
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') handlers.onError('连接中断');
    }
  })();

  return { abort: () => controller.abort(), finished };
}
