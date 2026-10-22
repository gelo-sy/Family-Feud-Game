import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import "./App.css";

const SOCKET_SERVER_URL = "http://localhost:3001";
const socket = io(SOCKET_SERVER_URL);

export default function App() {
  const [gameState, setGameState] = useState(null);

  const queryParams = new URLSearchParams(window.location.search);
  const view = queryParams.get("view") || "board";

  useEffect(() => {
    socket.on("update-game", (state) => setGameState(state));
    socket.on("play-sound", (sound) => {
      new Audio(`/audio/${sound}.mp3`).play().catch(() => {});
    });
    return () => {
      socket.off("update-game");
      socket.off("play-sound");
    };
  }, []);

  if (!gameState)
    return (
      <div style={{ color: "#fff", textAlign: "center", marginTop: "20%" }}>
        Loading Feud Engine...
      </div>
    );

  // --- MOBILE HOST CONTROLLER ---
  if (view === "host") {
    return (
      <div
        style={{
          padding: "20px",
          fontFamily: "Arial",
          background: "#121212",
          color: "#fff",
          minHeight: "100vh",
        }}
      >
        <h2>📱 Host Control Panel</h2>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          <button
            onClick={() => socket.emit("set-screen", "intro")}
            style={{
              flex: 1,
              padding: "12px",
              background:
                gameState.screenState === "intro" ? "#28a745" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            Title Screen
          </button>
          <button
            onClick={() => socket.emit("set-screen", "board")}
            style={{
              flex: 1,
              padding: "12px",
              background:
                gameState.screenState === "board" ? "#28a745" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            Game Board
          </button>
        </div>

        <h4>Question: {gameState.question}</h4>
        <hr style={{ borderColor: "#333" }} />

        <h3>Reveal Answers:</h3>
        {gameState.answers.map((ans, idx) => (
          <button
            key={idx}
            disabled={ans.revealed}
            onClick={() => socket.emit("reveal-answer", idx)}
            style={{
              display: "block",
              width: "100%",
              padding: "14px",
              margin: "8px 0",
              background: ans.revealed ? "#333" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "bold",
            }}
          >
            {idx + 1}. {ans.text} ({ans.points} pts) {ans.revealed ? "✅" : ""}
          </button>
        ))}

        <hr style={{ borderColor: "#333", margin: "20px 0" }} />

        <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
          <button
            onClick={() => socket.emit("trigger-strike")}
            style={{
              flex: 2,
              padding: "16px",
              background: "#dc3545",
              color: "white",
              border: "none",
              fontWeight: "bold",
              fontSize: "18px",
              borderRadius: "8px",
            }}
          >
            STRIKE ❌
          </button>
          <button
            onClick={() => socket.emit("clear-strikes")}
            style={{
              flex: 1,
              padding: "16px",
              background: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "8px",
            }}
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  // --- INTRO SCREEN VIEW ---
  if (gameState.screenState === "intro") {
    return (
      <div className="intro-screen">
        <div className="intro-oval">
          <div className="title-text">
            FAMILY
            <br />
            FEUD
          </div>
        </div>
      </div>
    );
  }

  // --- BIG BOARD DISPLAY VIEW (Matches your 2nd Image Arch Layout) ---
  // Ensure we always display 6 slots in the 2-column grid format
  const displaySlots = [...gameState.answers];
  while (displaySlots.length < 6) {
    displaySlots.push({ text: "", points: "", revealed: false, empty: true });
  }

  return (
    <div className="board-container">
      <div className="stage-arch">
        <div className="stage-inner">
          {/* Top Score Box (Displays current accumulated bank points) */}
          <div className="top-score-box">{gameState.currentScore}</div>

          {/* 2-Column Answer Cards Grid */}
          <div className="answers-grid">
            {displaySlots.map((ans, idx) => (
              <div key={idx} className="answer-card">
                {ans.empty ? (
                  <div></div>
                ) : ans.revealed ? (
                  <>
                    <span>{ans.text}</span>
                    <span className="card-pts">{ans.points}</span>
                  </>
                ) : (
                  <div className="card-num">{idx + 1}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {gameState.strikes > 0 && (
        <div className="strikes-overlay">{"❌ ".repeat(gameState.strikes)}</div>
      )}
    </div>
  );
}
