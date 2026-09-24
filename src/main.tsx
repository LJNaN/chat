import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import App from './App';
import { ThemeProvider, useTheme } from './theme';
import './index.css';

/** ConfigProvider 在 App 之上，所以主题状态必须从它外面读，再往下发 */
function ThemedRoot() {
  const { resolved } = useTheme();
  const dark = resolved === 'dark';

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: dark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#1668dc',
          borderRadius: 8,
          // 这三个必须与 index.css 的 --c-surface / --c-bg 一致，
          // 否则 antd 的输入框、弹层会和自定义容器出现色差
          colorBgContainer: dark ? '#1f2023' : '#ffffff',
          colorBgElevated: dark ? '#26272b' : '#ffffff',
          colorBgLayout: dark ? '#17181a' : '#f5f6f8',
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ThemedRoot />
    </ThemeProvider>
  </React.StrictMode>
);
