import { useEffect, useState } from 'react';
import { Modal, Input, Button, Spin, App as AntApp } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { getSettings, saveSettings } from '../api';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  const { message, modal } = AntApp.useApp();
  const [prompt, setPrompt] = useState('');
  const [defaultPrompt, setDefaultPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getSettings()
      .then((s) => {
        setPrompt(s.systemPrompt);
        setDefaultPrompt(s.defaultPrompt);
      })
      .catch((e) => message.error((e as Error).message))
      .finally(() => setLoading(false));
  }, [open, message]);

  const save = async () => {
    if (!prompt.trim()) return message.warning('系统提示词不能为空');
    setSaving(true);
    try {
      await saveSettings(prompt);
      message.success('已保存，新消息立即生效');
      onClose();
    } catch (e) {
      message.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    modal.confirm({
      title: '恢复默认提示词？',
      content: '当前内容会被替换为预设的默认提示词，保存后生效。',
      okText: '恢复',
      cancelText: '取消',
      onOk: () => setPrompt(defaultPrompt),
    });
  };

  return (
    <Modal
      title="系统提示词"
      open={open}
      onCancel={onClose}
      width={640}
      footer={[
        <Button key="reset" icon={<ReloadOutlined />} onClick={reset} style={{ float: 'left' }}>
          恢复默认
        </Button>,
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" loading={saving} onClick={save}>
          保存
        </Button>,
      ]}
    >
      <p style={{ color: '#8b95a1', fontSize: 13, marginTop: 0 }}>
        每次对话都会把这段提示词作为系统消息发给模型，对所有会话生效。
      </p>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin />
        </div>
      ) : (
        <Input.TextArea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          autoSize={{ minRows: 10, maxRows: 20 }}
          placeholder="例如：你是一个乐于助人的助手，始终使用中文回答。"
        />
      )}
    </Modal>
  );
}
