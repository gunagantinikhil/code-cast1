const express = require("express");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const ACTIONS = require("./Actions");
const cors = require("cors");
const axios = require("axios");
const os = require("os");
const server = http.createServer(app);
require("dotenv").config();

const languageConfig = {
  python3: { versionIndex: "3" },
  java: { versionIndex: "3" },
  cpp: { versionIndex: "4" },
  nodejs: { versionIndex: "3" },
  c: { versionIndex: "4" },
  ruby: { versionIndex: "3" },
  go: { versionIndex: "3" },
  scala: { versionIndex: "3" },
  bash: { versionIndex: "3" },
  sql: { versionIndex: "3" },
  pascal: { versionIndex: "2" },
  csharp: { versionIndex: "3" },
  php: { versionIndex: "3" },
  swift: { versionIndex: "3" },
  rust: { versionIndex: "3" },
  r: { versionIndex: "3" },
};

// Function to detect LAN IP address
const getLocalNetworkIP = () => {
  const interfaces = os.networkInterfaces();
  for (const interfaceName in interfaces) {
    for (const iface of interfaces[interfaceName]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (!iface.internal && iface.family === 'IPv4') {
        return iface.address;
      }
    }
  }
  return 'localhost';
};

const LOCAL_IP = getLocalNetworkIP();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Function to validate if origin is from local network or localhost
const isValidOrigin = (origin) => {
  if (!origin) return false;
  
  // Allow localhost
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
    return true;
  }
  
  // Allow connections from LAN IP addresses
  const localNetworkRegex = /^http:\/\/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+):\d+$/;
  if (localNetworkRegex.test(origin)) {
    return true;
  }
  
  // Allow connection from the same LAN IP as server
  if (origin.includes(`http://${LOCAL_IP}:`)) {
    return true;
  }
  
  return false;
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isValidOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST"],
  },
});

const userSocketMap = {};
const roomAuthorshipMap = {}; // Track authorship per room
const roomCodeMap = {}; // Track last known code per room for accurate diffs

const getAllConnectedClients = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        username: userSocketMap[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  // console.log('Socket connected', socket.id);
  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSocketMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    // notify that new user join
    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  // sync the code
  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code, username, timestamp, authorship, changedLines = [] }) => {
    // Broadcast the code update to other clients in the room
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });

  // Snapshot previous authorship map (shallow copy) so merging incoming authorship doesn't overwrite it
  const prevAuth = { ...(roomAuthorshipMap[roomId] || {}) };

    // If authorship info or username/timestamp provided, update authorship and broadcast an activity
    if (authorship) {
      // Merge incoming authorship into room map while preserving the original author (first writer)
      roomAuthorshipMap[roomId] = roomAuthorshipMap[roomId] || {};
      Object.keys(authorship).forEach((lnKey) => {
        const incoming = authorship[lnKey];
        const existing = roomAuthorshipMap[roomId][lnKey];
        if (existing) {
          // preserve originalAuthor if it exists, otherwise set it from existing.username
          const originalAuthor = existing.originalAuthor || existing.username || incoming.username;
          roomAuthorshipMap[roomId][lnKey] = {
            originalAuthor,
            username: incoming.username,
            timestamp: incoming.timestamp,
            line: incoming.line,
            action: incoming.action,
          };
        } else {
          // first time this line is seen; set originalAuthor to incoming.username
          roomAuthorshipMap[roomId][lnKey] = {
            originalAuthor: incoming.username,
            username: incoming.username,
            timestamp: incoming.timestamp,
            line: incoming.line,
            action: incoming.action,
          };
        }
      });
      socket.in(roomId).emit(ACTIONS.CODE_AUTHORSHIP, { authorship: roomAuthorshipMap[roomId] });
    }

    // Use a robust line-diff (LCS) against last known room code to detect deletions reliably
    if (username && timestamp) {
      const prevCode = roomCodeMap[roomId] || "";
      const prevLines = (prevCode || '').split('\n');
      const newLines = (code || '').split('\n');

      // LCS DP
      const n = prevLines.length, m = newLines.length;
      const dp = Array(n + 1).fill(null).map(() => Array(m + 1).fill(0));
      for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
          if (prevLines[i - 1] === newLines[j - 1]) dp[i][j] = dp[i - 1][j - 1] + 1;
          else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }

      // backtrack matches
      const matches = [];
      let i = n, j = m;
      while (i > 0 && j > 0) {
        if (prevLines[i - 1] === newLines[j - 1]) {
          matches.push([i - 1, j - 1]);
          i--; j--;
        } else if (dp[i - 1][j] >= dp[i][j - 1]) i--; else j--;
      }
      matches.reverse();

      const matchedPrev = new Set(matches.map(p => p[0]));
      const matchedNew = new Set(matches.map(p => p[1]));

      const deletedLines = [];
      const deletedContents = [];
      const addedLines = [];
      const modifiedLines = [];
      const prevAuthorsSet = new Set();

      // detect deletions (prev indices not matched)
      for (let pi = 0; pi < prevLines.length; pi++) {
        if (!matchedPrev.has(pi) && (prevLines[pi] || '').trim() !== '') {
          deletedLines.push(pi);
          deletedContents.push(prevLines[pi]);
          const prev = prevAuth[pi] || prevAuth[String(pi)];
          if (prev) prevAuthorsSet.add(prev.originalAuthor || prev.username);
        }
      }

      // detect additions (new indices not matched)
      for (let ni = 0; ni < newLines.length; ni++) {
        if (!matchedNew.has(ni) && (newLines[ni] || '').trim() !== '') {
          addedLines.push(ni);
        }
      }

      // detect simple modifications where an unmatched prev index and unmatched new index share same position
      // treat as modification rather than deletion+addition
      const addedSet = new Set(addedLines);
      const deletedSet = new Set(deletedLines);
      const toTreatAsModified = [];
      deletedLines.slice().forEach((delIdx) => {
        if (addedSet.has(delIdx)) {
          // modification at same index
          modifiedLines.push(delIdx);
          toTreatAsModified.push(delIdx);
        }
      });
      // remove modified from deleted/added
      for (const idx of toTreatAsModified) {
        deletedSet.delete(idx);
        addedSet.delete(idx);
      }
      const finalDeleted = Array.from(deletedSet).sort((a,b)=>a-b);
      const finalAdded = Array.from(addedSet).sort((a,b)=>a-b);

      // Build readable line list (1-based)
      const lineText = (linesArr) => {
        if (!linesArr || linesArr.length === 0) return '';
        if (linesArr.length === 1) return `line ${linesArr[0] + 1}`;
        return `lines ${linesArr.map((n) => n + 1).join(', ')}`;
      };

      // Decide activity
      let activityToSend = null;
      if (finalDeleted.length > 0) {
        if (prevAuthorsSet.size === 1) {
          const prevAuthor = Array.from(prevAuthorsSet)[0];
          activityToSend = `deleted ${prevAuthor}'s code in ${lineText(finalDeleted)}`;
        } else {
          activityToSend = `deleted others' code in ${lineText(finalDeleted)}`;
        }
      } else if (modifiedLines.length > 0) {
        if (prevAuthorsSet.size === 1) {
          const prevAuthor = Array.from(prevAuthorsSet)[0];
          activityToSend = `modified ${prevAuthor}'s code in ${lineText(modifiedLines)}`;
        } else {
          activityToSend = `modified others' code in ${lineText(modifiedLines)}`;
        }
      } else if (finalAdded.length > 0) {
        activityToSend = `entered code in ${lineText(finalAdded)}`;
      }

      if (activityToSend) {
        try { console.log('[Server] USER_ACTIVITY ->', { roomId, username, activityToSend, deletedCount: finalDeleted.length, modifiedCount: modifiedLines.length, addedCount: finalAdded.length }); } catch(e){}

        const payload = { username, action: activityToSend, timestamp };
        if (finalDeleted.length > 0) {
          payload.codeSnippet = deletedContents.join('\n').substring(0,100);
          payload.deletedLines = finalDeleted;
        }
        io.in(roomId).emit(ACTIONS.USER_ACTIVITY, payload);

        // Rebuild authorship map aligned with newLines using matches
        const newMap = {};
        // carry over matched entries
        matches.forEach(([pIdx, nIdx]) => {
          const prevEntry = prevAuth[pIdx];
          if (prevEntry) {
            newMap[nIdx] = {
              originalAuthor: prevEntry.originalAuthor || prevEntry.username,
              username: prevEntry.username,
              timestamp: prevEntry.timestamp,
              line: newLines[nIdx],
              action: prevEntry.action,
            };
          }
        });
        // add inserted lines as entered by current user
        finalAdded.forEach((nIdx) => {
          newMap[nIdx] = {
            originalAuthor: newMap[nIdx]?.originalAuthor || username,
            username,
            timestamp,
            line: newLines[nIdx],
            action: 'added',
          };
        });
        // modifiedLines (we treated as same index) -> set as modified by current user
        modifiedLines.forEach((idx) => {
          const prevEntry = prevAuth[idx] || {};
          newMap[idx] = {
            originalAuthor: prevEntry.originalAuthor || prevEntry.username || username,
            username,
            timestamp,
            line: newLines[idx] || "",
            action: 'modified',
          };
        });

        roomAuthorshipMap[roomId] = newMap;
      } else {
        try { console.log('[Server] No meaningful activity for CODE_CHANGE'); } catch(e){}
        // still update authorship map to reflect code (carry matches)
        const newMap = {};
        matches.forEach(([pIdx, nIdx]) => {
          const prevEntry = prevAuth[pIdx];
          if (prevEntry) newMap[nIdx] = { ...prevEntry, line: newLines[nIdx] };
        });
        roomAuthorshipMap[roomId] = newMap;
      }

      // update room code snapshot
      roomCodeMap[roomId] = code;
    }
  });
  
  // when new user join the room all the code which are there are also shows on that persons editor
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });
  
  // Sync authorship when new user joins
  socket.on(ACTIONS.SYNC_AUTHORSHIP, ({ socketId, roomId }) => {
    const authorship = roomAuthorshipMap[roomId] || {};
    io.to(socketId).emit(ACTIONS.CODE_AUTHORSHIP, { authorship });
  });

  // leave room
  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    // leave all the room
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSocketMap[socket.id],
      });
    });

    delete userSocketMap[socket.id];
    socket.leave();
  });
});

app.post("/compile", async (req, res) => {
  const { code, language } = req.body;

  // Basic payload validation
  if (!code || !language) {
    return res.status(400).json({ error: "Missing 'code' or 'language' in request body." });
  }

  // Validate language is supported
  if (!languageConfig[language]) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }

  try {
    if (!process.env.JDOODLE_CLIENT_ID || !process.env.JDOODLE_CLIENT_SECRET) {
      return res.status(500).json({ error: "Compiler is not configured. Missing JDoodle credentials." });
    }

    const response = await axios.post("https://api.jdoodle.com/v1/execute", {
      script: code,
      language: language,
      versionIndex: languageConfig[language].versionIndex,
      clientId: process.env.JDOODLE_CLIENT_ID,
      clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    });

    res.json(response.data);
  } catch (error) {
    // Log more context to help debugging
    console.error("Compile error:", error?.response?.data || error?.message || error);
    res.status(500).json({ error: "Failed to compile code", details: error?.response?.data || error?.message });
  }
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📍 Local access: http://localhost:${PORT}`);
  console.log(`🌐 LAN access: http://${LOCAL_IP}:${PORT}`);
  console.log(`\n📱 Connect from other devices using: http://${LOCAL_IP}:${PORT}\n`);
});
