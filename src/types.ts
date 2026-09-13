export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export type Role = 'user' | 'assistant';

export interface Message {
  id: number;
  conversation_id: string;
  role: Role;
  content: string;
  created_at: string;
}

/** 流式过程中只在内存里存在的待发送/待接收消息 */
export interface PendingMessage {
  role: Role;
  content: string;
}
