import React, { useState, useEffect, useRef } from 'react';

function ActivityFeed({ activities = [], isOpen, onToggle }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const activityEndRef = useRef(null);

  useEffect(() => {
    if (activityEndRef.current && activities.length > 0) {
      activityEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activities]);

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const activityTime = new Date(timestamp);
    const diffMs = now - activityTime;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    return activityTime.toLocaleDateString();
  };

  const getUserColor = (username) => {
    // Generate consistent color for each user
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 70%, 60%)`;
  };

  const getActivityIcon = (action) => {
    if (action.includes('joined')) return '👋';
    if (action.includes('left')) return '👋';
    if (action.includes('modified') || action.includes('edited')) return '✏️';
    if (action.includes('deleted')) return '🗑️';
    if (action.includes('added')) return '➕';
    return '📝';
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: isOpen ? '0' : '-350px',
        top: '70px',
        width: '350px',
        height: 'calc(100vh - 70px)',
        background: 'rgba(30, 30, 30, 0.98)',
        backdropFilter: 'blur(10px)',
        borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
        transition: 'right 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 100,
        boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          left: '-40px',
          top: '20px',
          width: '40px',
          height: '40px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '8px 0 0 8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          transition: 'all 0.2s',
          boxShadow: '-2px 2px 8px rgba(0, 0, 0, 0.3)',
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'translateX(-5px)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'translateX(0)';
        }}
      >
        {isOpen ? '›' : '‹'}
      </button>

      {/* Header */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: 'rgba(255, 255, 255, 0.03)',
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '20px' }}>📝</span>
          Activity Feed
        </h3>
        <p
          style={{
            margin: '8px 0 0 0',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          {activities.length} {activities.length === 1 ? 'change' : 'changes'} tracked
        </p>
      </div>

      {/* Activity List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '15px',
        }}
      >
        {activities.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'rgba(255, 255, 255, 0.4)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>👀</div>
            <p style={{ margin: 0, fontSize: '14px' }}>
              No activity yet. Start editing to see changes here!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activities.map((activity, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  padding: '12px 15px',
                  borderLeft: `3px solid ${getUserColor(activity.username)}`,
                  transition: 'all 0.2s',
                  animation: index === activities.length - 1 ? 'slideIn 0.3s ease' : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ fontSize: '16px' }}>{getActivityIcon(activity.action)}</span>
                  <span
                    style={{
                      fontWeight: '600',
                      fontSize: '13px',
                      color: getUserColor(activity.username),
                    }}
                  >
                    {activity.username}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginLeft: '26px',
                  }}
                >
                  {activity.action}
                </div>
                {activity.codeSnippet && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginTop: '8px',
                      marginLeft: '26px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      padding: '8px 10px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      maxHeight: '60px',
                      overflow: 'hidden',
                      position: 'relative',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                    }}
                  >
                    {activity.codeSnippet.length > 100 
                      ? `${activity.codeSnippet.substring(0, 100)}...` 
                      : activity.codeSnippet}
                  </div>
                )}
                <div
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    marginTop: '6px',
                    marginLeft: '26px',
                  }}
                >
                  {getTimeAgo(activity.timestamp)}
                </div>
              </div>
            ))}
            <div ref={activityEndRef} />
          </div>
        )}
      </div>

      {/* Inline Styles for Animation */}
      <style>
        {`
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          
          /* Custom Scrollbar */
          div::-webkit-scrollbar {
            width: 8px;
          }
          
          div::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
          }
          
          div::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
          }
          
          div::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
        `}
      </style>
    </div>
  );
}

export default ActivityFeed;
