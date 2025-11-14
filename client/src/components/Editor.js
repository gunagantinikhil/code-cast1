import React, { useEffect, useRef } from "react";
// Commonly used modes preloaded; others will be dynamically imported
import "codemirror/mode/javascript/javascript";
import "codemirror/theme/material.css";
import "codemirror/theme/dracula.css";
import "codemirror/theme/monokai.css";
import "codemirror/addon/edit/closetag";
import "codemirror/addon/edit/closebrackets";
import "codemirror/lib/codemirror.css";
import CodeMirror from "codemirror";
import { ACTIONS } from "../Actions";

// Map compiler language keys to CodeMirror mode names and optional mime
const LANGUAGE_TO_MODE = {
  javascript: { name: "javascript" },
  nodejs: { name: "javascript" },
  typescript: { name: "javascript" },
  python: { name: "python" },
  python3: { name: "python" },
  java: { name: "clike" },
  c: { name: "clike" },
  cpp: { name: "clike" },
  csharp: { name: "clike" },
  php: { name: "php" },
  ruby: { name: "ruby" },
  go: { name: "go" },
  rust: { name: "rust" },
  swift: { name: "swift" },
  scala: { name: "clike" },
  bash: { name: "shell" },
  sql: { name: "sql" },
  pascal: { name: "pascal" },
  r: { name: "r" },
};

// Dynamic imports for modes that aren't bundled by default
async function ensureModeLoaded(modeName) {
  try {
    switch (modeName) {
      case "python":
        await import("codemirror/mode/python/python");
        break;
      case "clike":
        await import("codemirror/mode/clike/clike");
        break;
      case "php":
        await import("codemirror/mode/php/php");
        break;
      case "ruby":
        await import("codemirror/mode/ruby/ruby");
        break;
      case "go":
        await import("codemirror/mode/go/go");
        break;
      case "rust":
        await import("codemirror/mode/rust/rust");
        break;
      case "swift":
        await import("codemirror/mode/swift/swift");
        break;
      case "shell":
        await import("codemirror/mode/shell/shell");
        break;
      case "sql":
        await import("codemirror/mode/sql/sql");
        break;
      case "pascal":
        await import("codemirror/mode/pascal/pascal");
        break;
      case "r":
        await import("codemirror/mode/r/r");
        break;
      case "javascript":
      default:
        // already imported at top
        break;
    }
  } catch (e) {
    // ignore load errors, fallback to JS mode
  }
}

function Editor({ socketRef, roomId, onCodeChange, selectedLanguage = "javascript", value = "", username = "" }) {
  const editorRef = useRef(null);
  const changeTimerRef = useRef(null);
  const pendingChangedLinesRef = useRef([]); // store changed lines between keystrokes
  const lastChangeRef = useRef({ code: "", timestamp: Date.now() });
  const authorshipRef = useRef({}); // Store line authorship: { lineNumber: { username, timestamp, action } }
  const tooltipRef = useRef(null);
  
  useEffect(() => {
    const init = async () => {
      const editor = CodeMirror.fromTextArea(
        document.getElementById("realtimeEditor"),
        {
          mode: { name: "javascript", json: true },
          theme: "material",
          autoCloseTags: true,
          autoCloseBrackets: true,
          lineNumbers: true,
          lineWrapping: true,
          indentUnit: 2,
          tabSize: 2,
          indentWithTabs: false,
        }
      );
      
      // for sync the code
      editorRef.current = editor;

      // Set editor to fill container
      editor.setSize("100%", "100%");
      
      editorRef.current.on("change", (instance, changes) => {
        const { origin, from, to, text, removed } = changes;
        const code = instance.getValue();
        onCodeChange(code);
        
        if (origin !== "setValue") {
          // Track authorship for changed lines
          if (username) {
            const fromLine = from.line;
            const timestamp = new Date().toISOString();

            // Determine action type based on what happened (added/modified)
            let action = 'modified';
            if (text.length > 1 || (text.length === 1 && text[0].trim() !== '')) {
              if (removed && removed.length > 0 && removed[0] !== '') {
                action = 'modified';
              } else if (text.length > 1) {
                action = 'added';
              } else {
                action = 'added';
              }
            } else if (removed && removed.length > 0 && removed[0] !== '') {
              action = 'modified';
            }

            // Mark affected lines with authorship and collect changed line numbers
            const lines = code.split('\n');
            const changedLines = [];
            for (let i = fromLine; i < Math.min(fromLine + text.length, lines.length); i++) {
              if (lines[i].trim() !== '') { // Only track non-empty lines
                authorshipRef.current[i] = {
                  username,
                  timestamp,
                  action,
                  line: lines[i]
                };
                changedLines.push(i);
              }
            }

            // Store changed lines in a dedicated ref while typing
            pendingChangedLinesRef.current = changedLines;
            // If the change contains a newline or multi-line paste, emit immediately so fast typing
            // across lines (pressing Enter) is tracked without waiting for debounce.
            const insertedMultiLine = (text && (text.length > 1 || text.join('\n').includes('\n')));
            if (insertedMultiLine) {
              try { console.debug('[Editor] immediate emit for multi-line insert', { roomId, username, changedLines }); } catch (e) {}
              lastChangeRef.current = { code, timestamp: Date.now() };
              socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                roomId,
                code,
                username,
                timestamp: new Date().toISOString(),
                authorship: authorshipRef.current,
                changedLines: changedLines,
              });
              // clear tracked changed lines after sending
              pendingChangedLinesRef.current = [];
              // don't start the debounce timer for this change
              return;
            }
          }
          
          // Clear any existing timer
          if (changeTimerRef.current) {
            clearTimeout(changeTimerRef.current);
            changeTimerRef.current = null;
          }
          
          // Debounce: Only emit after user stops typing for 2 seconds
          changeTimerRef.current = setTimeout(() => {
            const now = Date.now();
            const timeSinceLastChange = now - lastChangeRef.current.timestamp;
            
            // Only track if code actually changed and it's been at least 1 second
            if (code !== lastChangeRef.current.code && timeSinceLastChange >= 1000) {
              lastChangeRef.current = { code, timestamp: now };
              
              // Include changed line numbers so server can compute activity (entered vs modified, previous authors)
              const changedLinesToSend = pendingChangedLinesRef.current || [];
              // Debug log: what we're about to emit
              try { console.debug('[Editor] emitting CODE_CHANGE', { roomId, username, changedLines: changedLinesToSend }); } catch (e) {}
              socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                roomId,
                code,
                username,
                timestamp: new Date().toISOString(),
                authorship: authorshipRef.current,
                changedLines: changedLinesToSend,
              });
              // clear tracked changed lines after sending
              pendingChangedLinesRef.current = [];
            } else {
              // Still emit code change for real-time sync, but without activity tracking
              socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                roomId,
                code,
              });
            }
          }, 2000); // 2 second debounce
        }
      });
      
      // Track cursor selection to show authorship tooltip
      editorRef.current.on("cursorActivity", (instance) => {
        const selection = instance.getSelection();
        const cursor = instance.getCursor();
        
        if (selection || cursor) {
          const lineNumber = cursor.line;
          const authorship = authorshipRef.current[lineNumber];
          
          if (authorship && tooltipRef.current) {
            const coords = instance.cursorCoords(cursor, "page");
            showTooltip(authorship, coords);
          } else if (tooltipRef.current) {
            hideTooltip();
          }
        }
      });
    };

    init();
  }, []);
  
  // Tooltip functions
  const showTooltip = (authorship, coords) => {
    if (!tooltipRef.current) return;
    
    const timeAgo = (timestamp) => {
      const now = new Date();
      const then = new Date(timestamp);
      const diffMs = now - then;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);
      
      if (diffMins < 1) return 'just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    };
    
    const actionText = authorship.action === 'added' ? 'added this line' : 'modified this line';
    
    tooltipRef.current.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 4px;">
        ${authorship.username}
      </div>
      <div style="font-size: 11px; color: rgba(255, 255, 255, 0.7);">
        ${actionText} ${timeAgo(authorship.timestamp)}
      </div>
    `;
    
    tooltipRef.current.style.display = 'block';
    tooltipRef.current.style.left = coords.left + 'px';
    tooltipRef.current.style.top = (coords.top - 60) + 'px';
  };
  
  const hideTooltip = () => {
    if (tooltipRef.current) {
      tooltipRef.current.style.display = 'none';
    }
  };

  // Sync external value into editor when language changes or value updates
  useEffect(() => {
    if (!editorRef.current) return;
    const current = editorRef.current.getValue();
    if (current !== value) {
      const cursor = editorRef.current.getCursor();
      editorRef.current.setValue(value || "");
      editorRef.current.setCursor(cursor);
    }
  }, [value, selectedLanguage]);

  // Update CodeMirror mode when selectedLanguage changes
  useEffect(() => {
    if (!editorRef.current) return;
    const langKey = (selectedLanguage || "javascript").toLowerCase();
    const mapping = LANGUAGE_TO_MODE[langKey] || { name: "javascript" };
    ensureModeLoaded(mapping.name).then(() => {
      editorRef.current.setOption("mode", mapping);
    });
  }, [selectedLanguage]);

  // data receive from server
  useEffect(() => {
    if (socketRef.current) {
      socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
        if (typeof code === 'string') {
          const current = editorRef.current.getValue();
          if (current !== code) {
            editorRef.current.setValue(code);
          }
        }
      });
      
      // Receive authorship updates from other users
      socketRef.current.on(ACTIONS.CODE_AUTHORSHIP, ({ authorship }) => {
        if (authorship) {
          authorshipRef.current = { ...authorshipRef.current, ...authorship };
        }
      });
      
      // Request authorship sync when joining
      socketRef.current.emit(ACTIONS.SYNC_AUTHORSHIP, {
        socketId: socketRef.current.id,
        roomId: roomId,
      });
    }
    return () => {
      socketRef.current.off(ACTIONS.CODE_CHANGE);
      socketRef.current.off(ACTIONS.CODE_AUTHORSHIP);
    };
  }, [socketRef.current, roomId]);

  return (
    <div style={{ 
      height: "100%", 
      position: "relative",
      background: "#1e1e1e",
      overflow: "hidden"
    }}>
      {/* Authorship Tooltip */}
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed',
          display: 'none',
          background: 'rgba(0, 0, 0, 0.95)',
          color: 'white',
          padding: '10px 15px',
          borderRadius: '8px',
          fontSize: '12px',
          zIndex: 10000,
          pointerEvents: 'none',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
          maxWidth: '250px',
        }}
      />
      
      <style>
        {`
          .CodeMirror {
            height: 100% !important;
            font-size: 15px !important;
            font-family: 'Fira Code', 'Source Code Pro', 'Monaco', 'Menlo', monospace !important;
            line-height: 1.6 !important;
          }
          .CodeMirror-line {
            padding-left: 20px;
          }
          .CodeMirror-gutters {
            background: #1e1e1e !important;
            border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
            padding-right: 10px !important;
          }
          .CodeMirror-linenumber {
            color: rgba(255, 255, 255, 0.3) !important;
            font-size: 13px;
          }
          .CodeMirror-cursor {
            border-left: 2px solid var(--accent-color) !important;
          }
          .CodeMirror-selected {
            background: rgba(102, 126, 234, 0.2) !important;
          }
          .CodeMirror-focused .CodeMirror-selected {
            background: rgba(102, 126, 234, 0.3) !important;
          }
        `}
      </style>
      <textarea 
        id="realtimeEditor"
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          border: "none",
          outline: "none",
        }}
      ></textarea>
    </div>
  );
}

export default Editor;