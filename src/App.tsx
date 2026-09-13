import { useCallback, useEffect, useRef, useState } from 'react';
import { Spin, App as AntApp } from 'antd';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import SettingsModal from './components/SettingsModal';
import LoginGate from './components/LoginGate';
import type { RenderItem } from './components/MessageList';
import type { Conversation, Message } from './types';
import {
  checkAuth,
  clearToken,
  createConversation,
  deleteConversation,
  getToken,
  listConversations,
  listMessages,
  logout as apiLogout,
  renameConversation,
  setUnauthorizedHandler,
  streamChat,
} from './api';
import './App.css';

export default function App() {
  const { message } = AntApp.useApp();

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [streamText, setStreamText] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const abortRef = useRef<(() => void) | null>(null);
  const currentIdRef = useRef<string | null>(null);
  currentIdRef.current = currentId;
  const conversationsRef = useRef<Conversation[]>([]);
  conversationsRef.current = conversations;

  const resetToLogin = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    clearToken();
    setAuthed(false);
    setReady(true);
    setConversations([]);
    setCurrentId(null);
    setMessages([]);
    setPendingUser(null);
    setStreamText(null);
    setStreaming(false);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(resetToLogin);
  }, [resetToLogin]);

  // 启动：有 token 就校验一次，避免拿着失效 token 一直 401
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!getToken()) {
        setReady(true);
        return;
      }
      try {
        await checkAuth();
        if (cancelled) return;
        setAuthed(true);
        const list = await listConversations();
        if (cancelled) return;
        setConversations(list);
        if (list.length) setCurrentId(list[0].id);
      } catch {
        clearToken();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 切换会话时加载历史
  useEffect(() => {
    if (!authed || !currentId) {
      setMessages([]);
      return;
    }
    let cancelled = false;
    setLoadingMessages(true);
    listMessages(currentId)
      .then((msgs) => {
        if (!cancelled) setMessages(msgs);
      })
      .catch((e) => {
        if (!cancelled) message.error((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authed, currentId, message]);

  const refreshLists = useCallback(async (convId: string) => {
    const [msgs, convs] = await Promise.all([listMessages(convId), listConversations()]);
    setMessages(msgs);
    setConversations(convs);
  }, []);

  const handleSend = useCallback(
    async (content: string) => {
      let convId = currentIdRef.current;
      try {
        if (!convId) {
          const conv = await createConversation();
          convId = conv.id;
          setConversations((prev) => [conv, ...prev]);
          setCurrentId(conv.id);
          setMessages([]);
        }
      } catch (e) {
        message.error((e as Error).message);
        return;
      }

      setPendingUser(content);
      setStreamText('');
      setStreaming(true);

      const { abort, finished } = streamChat(convId, content, {
        onDelta: (delta) => setStreamText((prev) => (prev ?? '') + delta),
        onDone: () => {},
        onError: (msg) => message.error(msg),
      });
      abortRef.current = abort;

      await finished;
      abortRef.current = null;

      try {
        await refreshLists(convId);
      } catch {
        // 刷新失败时保留当前视图，不清空已显示的内容
      }

      setPendingUser(null);
      setStreamText(null);
      setStreaming(false);
    },
    [message, refreshLists]
  );

  const handleStop = useCallback(() => {
    abortRef.current?.();
  }, []);

  const handleSelect = useCallback(
    (id: string) => {
      if (streaming) {
        message.warning('请先等待当前回复结束或点击停止');
        return;
      }
      if (id === currentIdRef.current) return;
      // 先清空，避免加载新会话历史期间闪现上一个会话的内容
      setMessages([]);
      setCurrentId(id);
    },
    [streaming, message]
  );

  const handleCreate = useCallback(async () => {
    if (streaming) {
      message.warning('请先等待当前回复结束或点击停止');
      return;
    }
    try {
      const conv = await createConversation();
      setConversations((prev) => [conv, ...prev]);
      setCurrentId(conv.id);
      setMessages([]);
    } catch (e) {
      message.error((e as Error).message);
    }
  }, [streaming, message]);

  const handleRename = useCallback(
    async (id: string, title: string) => {
      try {
        await renameConversation(id, title);
        setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
      } catch (e) {
        message.error((e as Error).message);
      }
    },
    [message]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        const wasCurrent = currentIdRef.current === id;
        const next = conversationsRef.current.filter((c) => c.id !== id);
        setConversations(next);
        if (wasCurrent) {
          setMessages([]);
          setCurrentId(next.length ? next[0].id : null);
        }
      } catch (e) {
        message.error((e as Error).message);
      }
    },
    [message]
  );

  const handleLogout = useCallback(async () => {
    await apiLogout();
    resetToLogin();
  }, [resetToLogin]);

  if (!ready) {
    return (
      <div className="app-loading">
        <Spin size="large" />
      </div>
    );
  }

  if (!authed) {
    return (
      <LoginGate
        onSuccess={async () => {
          setAuthed(true);
          try {
            const list = await listConversations();
            setConversations(list);
            if (list.length) setCurrentId(list[0].id);
          } catch {
            /* 列表加载失败不阻止进入 */
          }
        }}
      />
    );
  }

  const items: RenderItem[] = [
    ...messages.map((m) => ({ key: `m${m.id}`, role: m.role, content: m.content })),
    ...(pendingUser !== null ? [{ key: 'pending-user', role: 'user' as const, content: pendingUser }] : []),
    ...(streamText !== null
      ? [{ key: 'pending-assistant', role: 'assistant' as const, content: streamText, streaming: true }]
      : []),
  ];

  const currentTitle = conversations.find((c) => c.id === currentId)?.title ?? '新对话';

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        currentId={currentId}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
        onOpenSettings={() => setSettingsOpen(true)}
        onLogout={handleLogout}
      />
      <ChatView
        title={currentTitle}
        items={items}
        loading={loadingMessages}
        streaming={streaming}
        onSend={handleSend}
        onStop={handleStop}
      />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
