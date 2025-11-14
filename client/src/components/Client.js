import React from 'react';
import Avatar from 'react-avatar';
import '../App.css';

function Client({username}) {

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        marginBottom: '12px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'all 0.3s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
        e.currentTarget.style.borderColor = 'var(--accent-color)';
        e.currentTarget.style.transform = 'translateX(5px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        e.currentTarget.style.transform = 'translateX(0)';
      }}
    >
      <div style={{ position: 'relative' }}>
        <Avatar 
          name={username.toString()} 
          size={45} 
          round="12px" 
          style={{ border: '2px solid var(--accent-color)', marginRight: '12px' }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '2px',
            right: '8px',
            width: '12px',
            height: '12px',
            background: '#10b981',
            borderRadius: '50%',
            border: '2px solid #1e1e1e',
          }}
        />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ 
          color: 'white', 
          fontWeight: 500, 
          fontSize: '15px',
          marginBottom: '2px'
        }}>
          {username.toString()}
        </div>
        <div style={{ 
          color: 'var(--text-secondary)', 
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <div
            style={{
              width: '6px',
              height: '6px',
              background: '#10b981',
              borderRadius: '50%',
            }}
          />
          Online
        </div>
      </div>
    </div>
  );
}

export default Client;