import { useState } from 'react';
import { Button, Input, Modal, Popconfirm, Tooltip, App as AntApp } from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SettingOutlined,
  LogoutOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import type { Conversation } from '../types';
import './Sidebar.css';

interface Props {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  conversations,
  currentId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  onOpenSettings,
  onLogout,
}: Props) {
  const { message } = AntApp.useApp();
  const [renaming, setRenaming] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');

  const confirmRename = () => {
    const title = draft.trim();
    if (!title) return message.warning('标题不能为空');
    if (renaming) onRename(renaming.id, title);
    setRenaming(null);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <span className="sidebar-brand">对话</span>
      </div>

      <Button type="primary" icon={<PlusOutlined />} block onClick={onCreate}>
        新建对话
      </Button>

      <div className="sidebar-list">
        {conversations.length === 0 && <div className="sidebar-empty">还没有对话</div>}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={`sidebar-item${c.id === currentId ? ' active' : ''}`}
            onClick={() => onSelect(c.id)}
          >
            <MessageOutlined className="sidebar-item-icon" />
            <span className="sidebar-item-title" title={c.title}>
              {c.title}
            </span>
            <span className="sidebar-item-actions" onClick={(e) => e.stopPropagation()}>
              <Tooltip title="重命名">
                <EditOutlined
                  onClick={() => {
                    setRenaming(c);
                    setDraft(c.title);
                  }}
                />
              </Tooltip>
              <Popconfirm
                title="删除这个对话？"
                description="聊天记录会一并删除，不可恢复"
                okText="删除"
                okButtonProps={{ danger: true }}
                cancelText="取消"
                onConfirm={() => onDelete(c.id)}
              >
                <Tooltip title="删除">
                  <DeleteOutlined />
                </Tooltip>
              </Popconfirm>
            </span>
          </div>
        ))}
      </div>

      <div className="sidebar-foot">
        <Button type="text" icon={<SettingOutlined />} onClick={onOpenSettings} block>
          系统提示词
        </Button>
        <Button type="text" icon={<LogoutOutlined />} onClick={onLogout} block>
          退出登录
        </Button>
      </div>

      <Modal
        title="重命名对话"
        open={!!renaming}
        onOk={confirmRename}
        onCancel={() => setRenaming(null)}
        okText="保存"
        cancelText="取消"
        destroyOnHidden
      >
        <Input
          autoFocus
          value={draft}
          maxLength={100}
          onChange={(e) => setDraft(e.target.value)}
          onPressEnter={confirmRename}
        />
      </Modal>
    </aside>
  );
}
