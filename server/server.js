const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let gameState = {
  screenState: "intro", // "intro" or "board"
  question: "Name a popular ice cream flavor",
  answers: [
    { text: "VANILLA", points: 42, revealed: false },
    { text: "CHOCOLATE", points: 22, revealed: true },
    { text: "STRAWBERRY", points: 15, revealed: false },
    { text: "MINT CHIP", points: 9, revealed: false },
    { text: "COOKIE DOUGH", points: 7, revealed: false },
    { text: "BUTTER PECAN", points: 5, revealed: false },
  ],
  currentScore: 22,
  team1Score: 0,
  team2Score: 0,
  strikes: 0,
};

io.on("connection", (socket) => {
  socket.emit("update-game", gameState);

  socket.on("set-screen", (screenName) => {
    gameState.screenState = screenName;
    io.emit("update-game", gameState);
  });

  socket.on("reveal-answer", (index) => {
    if (!gameState.answers[index].revealed) {
      gameState.answers[index].revealed = true;
      gameState.currentScore += gameState.answers[index].points;
      io.emit("play-sound", "ding");
      io.emit("update-game", gameState);
    }
  });

  socket.on("trigger-strike", () => {
    gameState.strikes = Math.min(gameState.strikes + 1, 3);
    io.emit("play-sound", "buzzer");
    io.emit("update-game", gameState);
  });

  socket.on("clear-strikes", () => {
    gameState.strikes = 0;
    io.emit("update-game", gameState);
  });

  socket.on("award-points", (team) => {
    if (team === 1) gameState.team1Score += gameState.currentScore;
    if (team === 2) gameState.team2Score += gameState.currentScore;
    gameState.currentScore = 0;
    io.emit("update-game", gameState);
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log(`🚀 Game Server running on port 3001`);
});
