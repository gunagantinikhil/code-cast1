import React, { useEffect, useRef, useState } from "react";
import Client from "./Client";
import Editor from "./Editor";
import ActivityFeed from "./ActivityFeed";
import AuthorshipLegend from "./AuthorshipLegend";
import { initSocket } from "../Socket";
import { ACTIONS } from "../Actions";
import {
  useNavigate,
  useLocation,
  Navigate,
  useParams,
} from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import "../App.css";

// List of supported languages
const LANGUAGES = [
  "python3",
  "java",
  "cpp",
  "nodejs",
  "c",
  "ruby",
  "go",
  "scala",
  "bash",
  "sql",
  "pascal",
  "csharp",
  "php",
  "swift",
  "rust",
  "r",
];

function EditorPage() {
  const Location = useLocation();
  const navigate = useNavigate();
  const { roomId } = useParams();

  // State hooks - MUST BE BEFORE ANY CONDITIONAL RETURNS
  const [clients, setClients] = useState([]);
  const [output, setOutput] = useState("");
  const [isCompileWindowOpen, setIsCompileWindowOpen] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("python3");
  // store code per language key
  const [codeByLang, setCodeByLang] = useState({ python3: "" });
  const [activities, setActivities] = useState([]);
  const [isActivityFeedOpen, setIsActivityFeedOpen] = useState(false);
  const codeRef = useRef("");

  const socketRef = useRef(null);

  // Fallback to session storage for refresh survival
  const safeUsername = Location.state?.username || (() => {
    try { return sessionStorage.getItem('cc_username'); } catch { return null; }
  })();
  const safeRoomId = roomId || (() => {
    try { return sessionStorage.getItem('cc_roomId'); } catch { return null; }
  })();


  useEffect(() => {
    const init = async () => {
      socketRef.current = await initSocket();
      socketRef.current.on("connect_error", (err) => handleErrors(err));
      socketRef.current.on("connect_failed", (err) => handleErrors(err));

      const handleErrors = (err) => {
        console.log("Error", err);
        toast.error("Socket connection failed, Try again later");
        navigate("/");
      };

      socketRef.current.emit(ACTIONS.JOIN, {
        roomId: safeRoomId,
        username: safeUsername,
      });

      socketRef.current.on(
        ACTIONS.JOINED,
        ({ clients, username, socketId }) => {
          if (username !== safeUsername) {
            toast.success(`${username} joined the room.`);
            // Add join activity
            setActivities((prev) => {
              const newActivity = { 
                username, 
                action: 'joined the room', 
                timestamp: new Date().toISOString() 
              };
              const updated = [...prev, newActivity];
              return updated.slice(-50);
            });
          }
          setClients(clients);
          socketRef.current.emit(ACTIONS.SYNC_CODE, {
            code: codeRef.current,
            socketId,
          });
        }
      );

      socketRef.current.on(ACTIONS.DISCONNECTED, ({ socketId, username }) => {
        toast.success(`${username} left the room`);
        // Add leave activity
        setActivities((prev) => {
          const newActivity = { 
            username, 
            action: 'left the room', 
            timestamp: new Date().toISOString() 
          };
          const updated = [...prev, newActivity];
          return updated.slice(-50);
        });
        setClients((prev) => {
          return prev.filter((client) => client.socketId !== socketId);
        });
      });

      // Listen for user activity
      socketRef.current.on(ACTIONS.USER_ACTIVITY, ({ username, action, timestamp, codeSnippet, deletedLines }) => {
        setActivities((prev) => {
          const newActivity = { username, action, timestamp };
          if (codeSnippet) newActivity.codeSnippet = codeSnippet;
          if (deletedLines) newActivity.deletedLines = deletedLines;
          // Keep only last 50 activities to prevent memory issues
          const updated = [...prev, newActivity];
          return updated.slice(-50);
        });
      });
    };
    init();

    return () => {
      socketRef.current && socketRef.current.disconnect();
      socketRef.current.off(ACTIONS.JOINED);
      socketRef.current.off(ACTIONS.DISCONNECTED);
      socketRef.current.off(ACTIONS.USER_ACTIVITY);
    };
  }, []);

  const copyRoomId = async () => {
    try {
      await navigator.clipboard.writeText(safeRoomId || roomId);
      toast.success(`Room ID copied to clipboard`);
    } catch (error) {
      console.log(error);
      toast.error("Unable to copy the room ID");
    }
  };

  const leaveRoom = async () => {
    navigate("/");
  };

  const runCode = async () => {
    setIsCompiling(true);
    try {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      const response = await axios.post(`${BACKEND_URL}/compile`, {
        code: codeRef.current || codeByLang[selectedLanguage] || "",
        language: selectedLanguage,
      });
      console.log("Backend response:", response.data);
      setOutput(response.data.output || JSON.stringify(response.data));
    } catch (error) {
      console.error("Error compiling code:", error);
      setOutput(error.response?.data?.error || "An error occurred");
    } finally {
      setIsCompiling(false);
    }
  };

  const toggleCompileWindow = () => {
    setIsCompileWindowOpen(!isCompileWindowOpen);
  };

  // Ensure we always have a tab entry for current language
  useEffect(() => {
    setCodeByLang((prev) => {
      if (prev[selectedLanguage] === undefined) {
        return { ...prev, [selectedLanguage]: "" };
      }
      return prev;
    });
    // keep codeRef in sync with active language
    codeRef.current = codeByLang[selectedLanguage] || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLanguage]);

  const handleLanguageChange = (newLang) => {
    setCodeByLang((prev) => (prev[newLang] === undefined ? { ...prev, [newLang]: "" } : prev));
    setSelectedLanguage(newLang);
  };

  // Check authentication AFTER all hooks have been called
  if (!safeUsername) {
    return <Navigate to="/" />;
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-dark)",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.05)",
          backdropFilter: "blur(10px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          padding: "15px 30px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 15px rgba(102, 126, 234, 0.4)",
              }}
            >
              <svg
                width="20"
                height="20"
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
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: "white" }}>
                CodeCast
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                Room: {(safeRoomId || roomId || "").toString().substring(0, 20)}...
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
          {/* Language Tabs for visited languages */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.keys(codeByLang).map((lang) => (
              <button
                key={lang}
                className="btn-modern"
                onClick={() => handleLanguageChange(lang)}
                style={{
                  padding: '8px 14px',
                  fontSize: '13px',
                  background: lang === selectedLanguage ? 'var(--accent-color)' : 'rgba(255,255,255,0.08)',
                  border: lang === selectedLanguage ? 'none' : '1px solid rgba(255,255,255,0.15)'
                }}
              >
                {lang}
              </button>
            ))}
          </div>
          <select
            className="select-modern"
            value={selectedLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{ minWidth: "120px" }}
          >
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
          <button
            className="btn-modern btn-success-modern"
            onClick={runCode}
            disabled={isCompiling}
            style={{ padding: "10px 20px", fontSize: "14px" }}
          >
            {isCompiling ? "Compiling..." : "▶ Run"}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Sidebar - Members */}
        <div
          style={{
            width: "280px",
            background: "rgba(255, 255, 255, 0.03)",
            borderRight: "1px solid rgba(255, 255, 255, 0.1)",
            display: "flex",
            flexDirection: "column",
            padding: "25px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 600,
              marginBottom: "20px",
              color: "var(--accent-color)",
              display: "flex",
              alignItems: "center",
              gap: "10px",
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
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Members ({clients.length})
          </div>

          {/* Client list container */}
          <div style={{ flex: 1, overflowY: "auto", marginBottom: "20px" }}>
            {clients.map((client) => (
              <Client key={client.socketId} username={client.username} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <button
              className="btn-modern btn-success-modern"
              onClick={copyRoomId}
              style={{ width: "100%", padding: "12px", fontSize: "14px" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "inline-block", verticalAlign: "middle", marginRight: "8px" }}
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              Copy Room ID
            </button>
            <button
              className="btn-modern btn-danger-modern"
              onClick={leaveRoom}
              style={{ width: "100%", padding: "12px", fontSize: "14px" }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ display: "inline-block", verticalAlign: "middle", marginRight: "8px" }}
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              Leave Room
            </button>
          </div>
        </div>

        {/* Editor panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#1e1e1e", position: "relative" }}>
          <Editor
            socketRef={socketRef}
            roomId={safeRoomId || roomId}
            value={codeByLang[selectedLanguage] || ""}
            selectedLanguage={selectedLanguage}
            username={safeUsername}
            onCodeChange={(code) => {
              codeRef.current = code;
              setCodeByLang((prev) => ({ ...prev, [selectedLanguage]: code }));
            }}
          />
          
          {/* Authorship Legend */}
          <AuthorshipLegend clients={clients} />
        </div>
      </div>

      {/* Compiler Output Panel */}
      <div
        className={isCompileWindowOpen ? "fade-in" : ""}
        style={{
          position: "fixed",
          bottom: isCompileWindowOpen ? 0 : "-45vh",
          left: 0,
          right: 0,
          height: "45vh",
          background: "rgba(15, 23, 42, 0.98)",
          backdropFilter: "blur(10px)",
          borderTop: "2px solid var(--accent-color)",
          transition: "all 0.3s ease-in-out",
          zIndex: 1040,
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 -8px 32px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 30px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: isCompiling ? "#fbbf24" : "#10b981",
                animation: isCompiling ? "pulse 1s infinite" : "none",
              }}
            />
            <h5 style={{ margin: 0, color: "white", fontWeight: 600 }}>
              Output ({selectedLanguage})
            </h5>
          </div>
          <button
            className="btn-modern"
            onClick={toggleCompileWindow}
            style={{
              background: "var(--accent-color)",
              padding: "8px 16px",
              fontSize: "13px",
            }}
          >
            {isCompileWindowOpen ? "▼ Close" : "▲ Open"}
          </button>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 30px",
            fontFamily: "monospace",
            fontSize: "14px",
            lineHeight: "1.6",
          }}
        >
          <pre
            style={{
              color: "white",
              margin: 0,
              padding: "20px",
              background: "rgba(0, 0, 0, 0.3)",
              borderRadius: "12px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              minHeight: "200px",
            }}
          >
            {output || (
              <span style={{ color: "var(--text-secondary)" }}>
                Output will appear here after compilation...
              </span>
            )}
        </pre>
        </div>
      </div>

      {/* Toggle Compiler Button */}
      {!isCompileWindowOpen && (
        <button
          className="btn-modern btn-success-modern"
          onClick={toggleCompileWindow}
          style={{
            position: "fixed",
            bottom: "30px",
            right: "30px",
            padding: "15px 25px",
            fontSize: "14px",
            borderRadius: "50px",
            zIndex: 1050,
            boxShadow: "0 8px 32px rgba(16, 185, 129, 0.5)",
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
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          View Output
        </button>
      )}

      {/* Activity Feed */}
      <ActivityFeed 
        activities={activities}
        isOpen={isActivityFeedOpen}
        onToggle={() => setIsActivityFeedOpen(!isActivityFeedOpen)}
      />

      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: 0.5;
            }
          }
        `}
      </style>
    </div>
  );
}

export default EditorPage;