import { useState } from 'react';
import { Button, Input, Tooltip } from 'antd';
import {
  SendOutlined,
  StopOutlined,
  MenuOutlined,
  SunOutlined,
  MoonOutlined,
  DesktopOutlined,
} from '@ant-design/icons';
import MessageList, { type RenderItem } from './MessageList';
import useMediaQuery from '../useMediaQuery';
import { useTheme, type ThemeMode } from '../theme';
import './ChatView.css';

interface Props {
  title: string;
  items: RenderItem[];
  loading: boolean;
  streaming: boolean;
  onSend: (content: string) => void;
  onStop: () => void;
  /** 仅在移动端传入；桌面端不传，标题栏就不会出现汉堡按钮 */
  onOpenSidebar?: () => void;
}

const MODE_LABEL: Record<ThemeMode, string> = {
  system: '跟随系统',
  light: '浅色',
  dark: '深色',
};

const MODE_ICON: Record<ThemeMode, React.ReactNode> = {
  system: <DesktopOutlined />,
  light: <SunOutlined />,
  dark: <MoonOutlined />,
};

export default function ChatView({
  title,
  items,
  loading,
  streaming,
  onSend,
  onStop,
  onOpenSidebar,
}: Props) {
  const [draft, setDraft] = useState('');
  const touch = useMediaQuery('(hover: none)');
  const { mode, cycle } = useTheme();

  const send = () => {
    const content = draft.trim();
    if (!content || streaming) return;
    setDraft('');
    onSend(content);
  };

  return (
    <section className="chat-view">
      <header className="chat-head">
        {onOpenSidebar && (
          <Button
            type="text"
            className="chat-head-btn"
            aria-label="打开会话列表"
            icon={<MenuOutlined />}
            onClick={onOpenSidebar}
          />
        )}
        <span className="chat-head-title">{title}</span>
        <div className="chat-head-actions">
          <Tooltip title={`主题：${MODE_LABEL[mode]}`}>
            <Button
              type="text"
              className="chat-head-btn"
              aria-label={`切换主题，当前${MODE_LABEL[mode]}`}
              icon={MODE_ICON[mode]}
              onClick={cycle}
            />
          </Tooltip>
        </div>
      </header>

      {items.length === 0 && !loading ? (
        <div className="chat-empty">
          <div className="chat-empty-logo">对话</div>
          <p>开始新的对话吧</p>
          <span>
            {touch ? '输入问题后点击发送' : '输入问题后按 Enter 发送，Shift + Enter 换行'}
          </span>
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
              // 触屏上 Enter 应该是换行，发送交给按钮
              if (!e.shiftKey && !touch) {
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
