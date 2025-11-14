import React, { useState } from "react";
import { v4 as uuid } from "uuid";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import "../App.css";

function Home() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");

  const navigate = useNavigate();

  const generateRoomId = (e) => {
    e.preventDefault();
    const Id = uuid();
    setRoomId(Id);
    toast.success("Room ID generated!");
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      toast.error("Both fields are required");
      return;
    }

    // redirect
    try {
      sessionStorage.setItem('cc_roomId', roomId);
      sessionStorage.setItem('cc_username', username);
    } catch {}
    navigate(`/editor/${roomId}`, {
      state: {
        username,
      },
    });
    toast.success("Joining room...");
  };

  // when enter then also join
  const handleInputEnter = (e) => {
    if (e.code === "Enter") {
      joinRoom();
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Animated Background Shapes */}
      <div
        style={{
          position: "absolute",
          top: "-50%",
          right: "-50%",
          width: "1000px",
          height: "1000px",
          background: "radial-gradient(circle, rgba(102,126,234,0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          animation: "float 20s ease-in-out infinite",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-30%",
          left: "-30%",
          width: "800px",
          height: "800px",
          background: "radial-gradient(circle, rgba(118,75,162,0.1) 0%, transparent 70%)",
          borderRadius: "50%",
          animation: "float 15s ease-in-out infinite reverse",
        }}
      />

      <div
        className="container-fluid d-flex align-items-center justify-content-center"
        style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}
      >
        <div className="col-12 col-md-8 col-lg-6 col-xl-5 fade-in-up">
          <div
            className="glass-card hover-glow"
            style={{ margin: "20px" }}
          >
            {/* Logo and Title */}
            <div className="text-center mb-4">
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  margin: "0 auto 20px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 40px rgba(102, 126, 234, 0.4)",
                }}
              >
                <svg
                  width="60"
                  height="60"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </div>
              <h1
                className="gradient-text"
                style={{
                  fontSize: "42px",
                  fontWeight: 800,
                  marginBottom: "10px",
                  letterSpacing: "-1px",
                }}
              >
                CodeCast
              </h1>
              <p
                style={{
                  color: "var(--text-secondary)",
                  fontSize: "16px",
                  marginBottom: "30px",
                }}
              >
                Real-time code collaboration platform
              </p>
            </div>

            {/* Form */}
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="input-modern"
                placeholder="Enter room ID"
                onKeyUp={handleInputEnter}
              />
            </div>

            <div style={{ marginBottom: "30px" }}>
              <label
                style={{
                  display: "block",
                  marginBottom: "8px",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                  fontSize: "14px",
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-modern"
                placeholder="Enter your username"
                onKeyUp={handleInputEnter}
              />
            </div>

            <button onClick={joinRoom} className="btn-modern btn-success-modern" style={{ width: "100%", marginBottom: "20px" }}>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "inline-block", verticalAlign: "middle", marginRight: "8px" }}
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Join Room
            </button>

            <div
              style={{
                textAlign: "center",
                paddingTop: "20px",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <p style={{ color: "var(--text-secondary)", marginBottom: "15px" }}>
                Don't have a room?
              </p>
              <button
                onClick={generateRoomId}
                className="btn-modern"
                style={{
                  background: "transparent",
                  border: "2px solid var(--accent-color)",
                  color: "white",
                  width: "100%",
                  boxShadow: "none",
                }}
                onMouseOver={(e) => {
                  e.target.style.background = "var(--accent-color)";
                  e.target.style.boxShadow = "0 4px 15px rgba(102, 126, 234, 0.4)";
                }}
                onMouseOut={(e) => {
                  e.target.style.background = "transparent";
                  e.target.style.boxShadow = "none";
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ display: "inline-block", verticalAlign: "middle", marginRight: "8px" }}
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Create New Room
              </button>
            </div>
          </div>

          {/* Features Section */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              marginTop: "40px",
              padding: "30px",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "16px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>⚡</div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 500 }}>
                Real-time
              </div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>👥</div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 500 }}>
                Collaboration
              </div>
            </div>
            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>🖥️</div>
              <div style={{ fontSize: "14px", color: "var(--text-secondary)", fontWeight: 500 }}>
                Code Editor
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>
        {`
          @keyframes float {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(180deg);
            }
          }
        `}
      </style>
    </div>
  );
}

export default Home;