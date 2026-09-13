import { useState } from 'react';
import { Button, Input, App as AntApp } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { login, setToken } from '../api';
import './LoginGate.css';

interface Props {
  onSuccess: () => void;
}

export default function LoginGate({ onSuccess }: Props) {
  const { message } = AntApp.useApp();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!password) return setError('请输入密码');
    setLoading(true);
    setError(null);
    try {
      const { token } = await login(password);
      setToken(token);
      message.success('验证通过');
      onSuccess();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">
          <LockOutlined />
        </div>
        <h1>对话</h1>
        <p className="login-sub">请输入访问密码</p>
        <Input.Password
          size="large"
          autoFocus
          placeholder="密码"
          value={password}
          status={error ? 'error' : undefined}
          onChange={(e) => {
            setPassword(e.target.value);
            setError(null);
          }}
          onPressEnter={submit}
        />
        <div className="login-error">{error || ' '}</div>
        <Button type="primary" size="large" block loading={loading} onClick={submit}>
          进入
        </Button>
      </div>
    </div>
  );
}
