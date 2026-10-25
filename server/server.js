const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
let strikeTimer;
let fastMoneyTimer;

function clearStrikeTimers() {
  clearTimeout(strikeTimer);
  strikeTimer = undefined;
}

function stopFastMoneyTimer() {
  clearInterval(fastMoneyTimer);
  fastMoneyTimer = undefined;
}

const initialQuestion = {
  question: "Name a popular ice cream flavor",
  answers: [
    { text: "VANILLA", points: 42 },
    { text: "CHOCOLATE", points: 22 },
    { text: "STRAWBERRY", points: 15 },
    { text: "MINT CHIP", points: 9 },
    { text: "COOKIE DOUGH", points: 7 },
    { text: "BUTTER PECAN", points: 5 },
  ],
};

let gameState = {
  screenState: "intro", // "intro" or "board"
  questions: [initialQuestion],
  currentQuestionIndex: 0,
  question: initialQuestion.question,
  answers: initialQuestion.answers.map((answer, index) => ({
    ...answer,
    revealed: index === 1,
  })),
  currentScore: 22,
  team1Score: 0,
  team2Score: 0,
  strikes: 0,
  strikesVisible: false,
  fastMoney: {
    active: false,
    visible: false,
    remaining: 20,
    answers: Array.from({ length: 2 }, () =>
      Array.from({ length: 5 }, () => ({ text: "", points: 0 })),
    ),
  },
};

io.on("connection", (socket) => {
  socket.emit("update-game", gameState);

  socket.on("set-screen", (screenName) => {
    if (!["intro", "board", "fast-money"].includes(screenName)) return;
    if (screenName === "fast-money") {
      gameState.fastMoney.visible = true;
    } else {
      stopFastMoneyTimer();
      gameState.fastMoney.active = false;
      gameState.fastMoney.visible = false;
    }
    gameState.screenState = screenName;
    io.emit("update-game", gameState);
  });

  socket.on("start-fast-money", () => {
    stopFastMoneyTimer();
    gameState.fastMoney = {
      active: true,
      visible: true,
      remaining: 20,
      answers: Array.from({ length: 2 }, () =>
        Array.from({ length: 5 }, () => ({ text: "", points: 0 })),
      ),
    };
    gameState.screenState = "fast-money";
    io.emit("update-game", gameState);

    fastMoneyTimer = setInterval(() => {
      gameState.fastMoney.remaining = Math.max(
        0,
        gameState.fastMoney.remaining - 1,
      );
      if (gameState.fastMoney.remaining === 0) {
        gameState.fastMoney.active = false;
        stopFastMoneyTimer();
      }
      io.emit("update-game", gameState);
    }, 1000);
  });

  socket.on(
    "update-fast-money-answer",
    ({ participant, index, field, value } = {}) => {
      if (
        !Number.isInteger(participant) ||
        participant < 0 ||
        participant >= gameState.fastMoney.answers.length ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= gameState.fastMoney.answers[participant].length ||
        !["text", "points"].includes(field)
      ) {
        return;
      }

      if (field === "text") {
        if (typeof value !== "string") return;
        gameState.fastMoney.answers[participant][index].text =
          value.slice(0, 120);
      } else {
        const points = value === "" ? 0 : Number(value);
        if (!Number.isInteger(points) || points < 0) return;
        gameState.fastMoney.answers[participant][index].points = points;
      }
      io.emit("update-game", gameState);
    },
  );

  socket.on("end-fast-money", () => {
    stopFastMoneyTimer();
    gameState.fastMoney.active = false;
    gameState.fastMoney.visible = false;
    gameState.screenState = "board";
    io.emit("update-game", gameState);
  });

  socket.on("add-question", (payload) => {
    const question = payload?.question?.trim();
    const answers = payload?.answers;

    if (
      !question ||
      !Array.isArray(answers) ||
      answers.length === 0 ||
      answers.length > 8 ||
      answers.some(
        (answer) =>
          typeof answer?.text !== "string" ||
          !answer.text.trim() ||
          !Number.isInteger(answer.points) ||
          answer.points < 0,
      )
    ) {
      socket.emit(
        "question-error",
        "Enter a question and 1 to 8 answers, each with a whole-number point value of 0 or more.",
      );
      return;
    }

    gameState.questions.push({
      question,
      answers: answers.map((answer) => ({
        text: answer.text.trim(),
        points: answer.points,
      })),
    });
    io.emit("update-game", gameState);
  });

  socket.on("show-question", (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= gameState.questions.length)
      return;

    clearStrikeTimers();
    const selectedQuestion = gameState.questions[index];
    gameState.currentQuestionIndex = index;
    stopFastMoneyTimer();
    gameState.fastMoney.active = false;
    gameState.fastMoney.visible = false;
    gameState.question = selectedQuestion.question;
    gameState.answers = selectedQuestion.answers.map((answer) => ({
      text: answer.text.trim(),
      points: answer.points,
      revealed: false,
    }));
    gameState.currentScore = 0;
    gameState.strikes = 0;
    gameState.strikesVisible = false;
    gameState.screenState = "board";
    io.emit("update-game", gameState);
  });

  socket.on("delete-question", (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= gameState.questions.length)
      return;

    gameState.questions.splice(index, 1);

    if (gameState.questions.length === 0) {
      clearStrikeTimers();
      gameState.currentQuestionIndex = -1;
      gameState.question = "";
      gameState.answers = [];
      gameState.currentScore = 0;
      gameState.strikes = 0;
      gameState.strikesVisible = false;
    } else if (index === gameState.currentQuestionIndex) {
      clearStrikeTimers();
      const nextIndex = Math.min(index, gameState.questions.length - 1);
      const selectedQuestion = gameState.questions[nextIndex];
      gameState.currentQuestionIndex = nextIndex;
      gameState.question = selectedQuestion.question;
      gameState.answers = selectedQuestion.answers.map((answer) => ({
        ...answer,
        revealed: false,
      }));
      gameState.currentScore = 0;
      gameState.strikes = 0;
      gameState.strikesVisible = false;
      gameState.screenState = "board";
    } else if (index < gameState.currentQuestionIndex) {
      gameState.currentQuestionIndex -= 1;
    }

    io.emit("update-game", gameState);
  });

  socket.on("reveal-answer", (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= gameState.answers.length)
      return;

    const answer = gameState.answers[index];
    if (answer.revealed) return;

    answer.revealed = true;
    gameState.currentScore += answer.points;
    io.emit("play-sound", "ding");
    io.emit("update-game", gameState);
  });

  socket.on("hide-answer", (index) => {
    if (!Number.isInteger(index) || index < 0 || index >= gameState.answers.length)
      return;

    const answer = gameState.answers[index];
    if (!answer.revealed) return;

    answer.revealed = false;
    gameState.currentScore = Math.max(0, gameState.currentScore - answer.points);
    io.emit("update-game", gameState);
  });

  socket.on("trigger-strike", () => {
    gameState.strikes = gameState.strikes >= 3 ? 1 : gameState.strikes + 1;
    gameState.strikesVisible = true;
    io.emit("play-sound", "buzzer");
    io.emit("update-game", gameState);

    clearStrikeTimers();
    strikeTimer = setTimeout(() => {
      strikeTimer = undefined;
      gameState.strikesVisible = false;
      io.emit("update-game", gameState);
    }, 3000);
  });

  socket.on("clear-strikes", () => {
    clearStrikeTimers();
    gameState.strikes = 0;
    gameState.strikesVisible = false;
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
