import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Spin, App as AntApp } from 'antd';
import { UserOutlined, RobotOutlined, CheckOutlined, CopyOutlined } from '@ant-design/icons';
import type { Role } from '../types';
import './MessageList.css';

export interface RenderItem {
  key: string;
  role: Role;
  content: string;
  streaming?: boolean;
}

/** 代码块右上角的复制按钮；组件定义在模块层级，避免每次渲染重建导致重挂载 */
function CodeBlock({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null);
  const [copied, setCopied] = useState(false);
  const { message } = AntApp.useApp();

  const copy = async () => {
    const text = ref.current?.innerText ?? '';
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      message.error('复制失败');
    }
  };

  return (
    <div className="code-wrap">
      <button className="code-copy" onClick={copy} type="button">
        {copied ? <CheckOutlined /> : <CopyOutlined />}
        {copied ? '已复制' : '复制'}
      </button>
      <pre ref={ref}>{children}</pre>
    </div>
  );
}

/** 宽表格在窄屏上会撑破气泡，套一层横向滚动容器 */
function TableBlock({ children, ...rest }: React.ComponentPropsWithoutRef<'table'>) {
  return (
    <div className="table-wrap">
      <table {...rest}>{children}</table>
    </div>
  );
}

const markdownComponents = { pre: CodeBlock, table: TableBlock };

interface Props {
  items: RenderItem[];
  loading: boolean;
}

export default function MessageList({ items, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  // 用户往上翻看历史时不要强行拉回底部
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const lastContent = items.length ? items[items.length - 1].content : '';

  useEffect(() => {
    if (pinned.current) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [items.length, lastContent]);

  if (loading) {
    return (
      <div className="chat-loading">
        <Spin />
      </div>
    );
  }

  return (
    <div className="msg-scroll" ref={scrollRef} onScroll={onScroll}>
      <div className="msg-inner">
        {items.map((item) => (
          <div key={item.key} className={`msg-row ${item.role}`}>
            <div className="msg-avatar">{item.role === 'user' ? <UserOutlined /> : <RobotOutlined />}</div>
            <div className="msg-bubble">
              {item.role === 'assistant' ? (
                <div className="markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {item.content || ''}
                  </ReactMarkdown>
                  {item.streaming && <span className="caret" />}
                </div>
              ) : (
                <div className="plain">{item.content}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
