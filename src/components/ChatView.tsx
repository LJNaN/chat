import { useState } from 'react';
import { Button, Input } from 'antd';
import { SendOutlined, StopOutlined } from '@ant-design/icons';
import MessageList, { type RenderItem } from './MessageList';
import './ChatView.css';

interface Props {
  title: string;
  items: RenderItem[];
  loading: boolean;
  streaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
}

export default function ChatView({ title, items, loading, streaming, onSend, onStop }: Props) {
  const [draft, setDraft] = useState('');

  const send = () => {
    const content = draft.trim();
    if (!content || streaming) return;
    setDraft('');
    onSend(content);
  };

  return (
    <section className="chat-view">
      <header className="chat-head">
        <span className="chat-head-title">{title}</span>
      </header>

      {items.length === 0 && !loading ? (
        <div className="chat-empty">
          <div className="chat-empty-logo">对话</div>
          <p>开始新的对话吧</p>
          <span>输入问题后按 Enter 发送，Shift + Enter 换行</span>
        </div>
      ) : (
        <MessageList items={items} loading={loading} />
      )}

      <div className="chat-input-wrap">
        <div className="chat-input-inner">
          <Input.TextArea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="输入消息…"
            autoSize={{ minRows: 1, maxRows: 7 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          {streaming ? (
            <Button danger icon={<StopOutlined />} onClick={onStop}>
              停止
            </Button>
          ) : (
            <Button type="primary" icon={<SendOutlined />} disabled={!draft.trim()} onClick={send}>
              发送
            </Button>
          )}
        </div>
        <div className="chat-hint">Enter 发送 · Shift + Enter 换行</div>
      </div>
    </section>
  );
}
