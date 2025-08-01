import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#1e1e1e',
      color: 'white',
      minHeight: '100vh',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>🧪 React App テスト</h1>
      <p>この画面が表示されていれば、Reactアプリは正常に動作しています。</p>
      
      <div style={{
        backgroundColor: '#333',
        padding: '15px',
        borderRadius: '8px',
        margin: '20px 0'
      }}>
        <h2>📊 状態確認</h2>
        <ul>
          <li>✅ React正常動作</li>
          <li>✅ TypeScript正常コンパイル</li>
          <li>✅ Vite開発サーバー正常動作</li>
          <li>✅ HMR（Hot Module Replacement）動作中</li>
        </ul>
      </div>
      
      <button 
        onClick={() => alert('Button click works!')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#4A90E2',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          fontSize: '16px'
        }}
      >
        🔘 動作テスト
      </button>
    </div>
  );
};

export default TestApp;
