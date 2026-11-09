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

const initialFastMoneyParticipantOneAnswers = [
  {
    question: "Name a food people often eat for breakfast",
    options: [
      { text: "EGGS", points: 34 },
      { text: "BACON", points: 22 },
      { text: "CEREAL", points: 18 },
      { text: "TOAST", points: 15 },
      { text: "PANCAKES", points: 11 },
    ],
  },
  {
    question: "Name something people pack for a vacation",
    options: [
      { text: "CLOTHES", points: 31 },
      { text: "TOILETRIES", points: 24 },
      { text: "PHONE", points: 19 },
      { text: "CHARGER", points: 15 },
      { text: "SHOES", points: 11 },
    ],
  },
  {
    question: "Name an animal you might see at a zoo",
    options: [
      { text: "ELEPHANT", points: 28 },
      { text: "LION", points: 25 },
      { text: "MONKEY", points: 21 },
      { text: "GIRAFFE", points: 15 },
      { text: "ZEBRA", points: 11 },
    ],
  },
  {
    question: "Name something people do when they wake up",
    options: [
      { text: "CHECK THEIR PHONE", points: 36 },
      { text: "BRUSH THEIR TEETH", points: 24 },
      { text: "TAKE A SHOWER", points: 18 },
      { text: "GET DRESSED", points: 13 },
      { text: "MAKE COFFEE", points: 9 },
    ],
  },
  {
    question: "Name a popular pizza topping",
    options: [
      { text: "PEPPERONI", points: 42 },
      { text: "CHEESE", points: 23 },
      { text: "MUSHROOMS", points: 14 },
      { text: "SAUSAGE", points: 12 },
      { text: "OLIVES", points: 9 },
    ],
  },
];

function createFastMoneyAnswers() {
  const createParticipantAnswers = () =>
    initialFastMoneyParticipantOneAnswers.map(({ question, options }) => ({
      question,
      options,
      selectedOption: null,
      text: "",
      points: 0,
      answerRevealed: false,
      pointsRevealed: false,
    }));

  return [createParticipantAnswers(), createParticipantAnswers()];
}

function resetFastMoneyAnswerReveals(answers) {
  return answers.map((participantAnswers) =>
    participantAnswers.map((answer) => ({
      ...answer,
      answerRevealed: false,
      pointsRevealed: false,
    })),
  );
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

const questionSequence = [
  initialQuestion,
  {
    question: "Name something people do before going to bed",
    answers: [
      { text: "BRUSH TEETH", points: 34 },
      { text: "SET ALARM", points: 22 },
      { text: "READ", points: 17 },
      { text: "WASH FACE", points: 13 },
      { text: "CHECK PHONE", points: 9 },
      { text: "LOCK DOORS", points: 5 },
    ],
  },
  {
    question: "Name a popular pizza topping",
    answers: [
      { text: "PEPPERONI", points: 38 },
      { text: "CHEESE", points: 24 },
      { text: "MUSHROOMS", points: 13 },
      { text: "SAUSAGE", points: 11 },
      { text: "ONIONS", points: 8 },
      { text: "OLIVES", points: 6 },
    ],
  },
  {
    question: "Name something you bring to the beach",
    answers: [
      { text: "TOWEL", points: 30 },
      { text: "SUNSCREEN", points: 25 },
      { text: "SWIMSUIT", points: 18 },
      { text: "UMBRELLA", points: 12 },
      { text: "SNACKS", points: 9 },
      { text: "SUNGLASSES", points: 6 },
    ],
  },
  {
    question: "Name an animal people keep as a pet",
    answers: [
      { text: "DOG", points: 43 },
      { text: "CAT", points: 32 },
      { text: "FISH", points: 10 },
      { text: "BIRD", points: 7 },
      { text: "HAMSTER", points: 5 },
      { text: "RABBIT", points: 3 },
    ],
  },
  {
    question: "Name something people drink in the morning",
    answers: [
      { text: "COFFEE", points: 45 },
      { text: "WATER", points: 20 },
      { text: "ORANGE JUICE", points: 15 },
      { text: "TEA", points: 10 },
      { text: "MILK", points: 6 },
      { text: "SMOOTHIE", points: 4 },
    ],
  },
  {
    question: "Name something you might find in a school bag",
    answers: [
      { text: "BOOKS", points: 30 },
      { text: "PENCILS", points: 24 },
      { text: "NOTEBOOK", points: 19 },
      { text: "LUNCH", points: 12 },
      { text: "WATER BOTTLE", points: 9 },
      { text: "PHONE", points: 6 },
    ],
  },
  {
    question: "Name a reason someone might be late",
    answers: [
      { text: "TRAFFIC", points: 35 },
      { text: "OVERSLEPT", points: 25 },
      { text: "MISSED THE BUS", points: 16 },
      { text: "COULD NOT FIND KEYS", points: 10 },
      { text: "BAD WEATHER", points: 8 },
      { text: "WRONG TIME", points: 6 },
    ],
  },
  {
    question: "Name something people do at a birthday party",
    answers: [
      { text: "EAT CAKE", points: 32 },
      { text: "OPEN GIFTS", points: 24 },
      { text: "SING", points: 18 },
      { text: "DANCE", points: 12 },
      { text: "PLAY GAMES", points: 9 },
      { text: "TAKE PHOTOS", points: 5 },
    ],
  },
  {
    question: "Name something you might pack for a road trip",
    answers: [
      { text: "SNACKS", points: 29 },
      { text: "CLOTHES", points: 24 },
      { text: "PHONE CHARGER", points: 18 },
      { text: "MUSIC", points: 13 },
      { text: "PILLOW", points: 9 },
      { text: "MAP", points: 7 },
    ],
  },
];

let gameState = {
  screenState: "intro", // "intro" or "board"
  questions: questionSequence,
  currentQuestionIndex: 0,
  question: initialQuestion.question,
  answers: initialQuestion.answers.map((answer) => ({
    ...answer,
    revealed: false,
  })),
  currentScore: 0,
  team1Score: 0,
  team2Score: 0,
  strikes: 0,
  strikesVisible: false,
  playerAudioEnabled: true,
  fastMoney: {
    active: false,
    visible: false,
    awaitingSecondParticipant: false,
    currentParticipant: 0,
    remaining: 20,
    answers: createFastMoneyAnswers(),
  },
};

function runFastMoneyTimer() {
  fastMoneyTimer = setInterval(() => {
    gameState.fastMoney.remaining = Math.max(
      0,
      gameState.fastMoney.remaining - 1,
    );
    if (gameState.fastMoney.remaining === 0) {
      gameState.fastMoney.active = false;
      stopFastMoneyTimer();
      if (gameState.fastMoney.currentParticipant === 0) {
        gameState.fastMoney.currentParticipant = 1;
        gameState.fastMoney.remaining = 25;
        gameState.fastMoney.awaitingSecondParticipant = true;
      }
    }
    io.emit("update-game", gameState);
  }, 1000);
}

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
      gameState.fastMoney.awaitingSecondParticipant = false;
    }
    gameState.screenState = screenName;
    io.emit("update-game", gameState);
  });

  socket.on("set-player-audio", (enabled) => {
    if (typeof enabled !== "boolean") return;
    gameState.playerAudioEnabled = enabled;
    io.emit("update-game", gameState);
  });

  socket.on("start-fast-money", () => {
    stopFastMoneyTimer();
    gameState.fastMoney = {
      active: true,
      visible: true,
      awaitingSecondParticipant: false,
      currentParticipant: 0,
      remaining: 20,
      answers: resetFastMoneyAnswerReveals(gameState.fastMoney.answers),
    };
    gameState.screenState = "fast-money";
    io.emit("update-game", gameState);
    runFastMoneyTimer();
  });

  socket.on("start-fast-money-second", () => {
    if (
      !gameState.fastMoney.awaitingSecondParticipant ||
      gameState.screenState !== "fast-money"
    )
      return;

    gameState.fastMoney.awaitingSecondParticipant = false;
    gameState.fastMoney.active = true;
    gameState.fastMoney.remaining = 25;
    io.emit("update-game", gameState);
    runFastMoneyTimer();
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
        !["question", "text"].includes(field)
      ) {
        return;
      }

      if (typeof value !== "string") return;
      const updatedValue = value.slice(0, 120);
      if (field === "question") {
        gameState.fastMoney.answers.forEach((participantAnswers) => {
          participantAnswers[index].question = updatedValue;
        });
      } else {
        const answer = gameState.fastMoney.answers[participant][index];
        answer.text = updatedValue;
        answer.points = 0;
        answer.selectedOption = null;
      }
      io.emit("update-game", gameState);
    },
  );

  socket.on(
    "select-fast-money-answer",
    ({ participant, index, optionIndex } = {}) => {
      if (
        !Number.isInteger(participant) ||
        participant < 0 ||
        participant >= gameState.fastMoney.answers.length ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= gameState.fastMoney.answers[participant].length
      ) {
        return;
      }

      const answer = gameState.fastMoney.answers[participant][index];
      if (optionIndex === "") {
        answer.selectedOption = null;
        answer.text = "";
        answer.points = 0;
      } else {
        const selectedIndex = Number(optionIndex);
        if (
          !Number.isInteger(selectedIndex) ||
          selectedIndex < 0 ||
          selectedIndex >= answer.options.length
        ) {
          return;
        }
        const selectedAnswer = answer.options[selectedIndex];
        answer.selectedOption = selectedIndex;
        answer.text = selectedAnswer.text;
        answer.points = selectedAnswer.points;
      }
      io.emit("update-game", gameState);
    },
  );

  socket.on(
    "toggle-fast-money-answer-field",
    ({ participant, index, field } = {}) => {
      if (
        !Number.isInteger(participant) ||
        participant < 0 ||
        participant >= gameState.fastMoney.answers.length ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= gameState.fastMoney.answers[participant].length ||
        !["answer", "points"].includes(field)
      ) {
        return;
      }

      const answer = gameState.fastMoney.answers[participant][index];
      const revealField = `${field}Revealed`;
      answer[revealField] = !answer[revealField];
      io.emit("update-game", gameState);
    },
  );

  socket.on("end-fast-money", () => {
    stopFastMoneyTimer();
    gameState.fastMoney.active = false;
    gameState.fastMoney.visible = false;
    gameState.fastMoney.awaitingSecondParticipant = false;
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
      answers.length > 10 ||
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
        "Enter a question and 1 to 10 answers, each with a whole-number point value of 0 or more.",
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
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= gameState.questions.length
    )
      return;

    clearStrikeTimers();
    const selectedQuestion = gameState.questions[index];
    gameState.currentQuestionIndex = index;
    stopFastMoneyTimer();
    gameState.fastMoney.active = false;
    gameState.fastMoney.visible = false;
    gameState.fastMoney.awaitingSecondParticipant = false;
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
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= gameState.questions.length
    )
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
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= gameState.answers.length
    )
      return;

    const answer = gameState.answers[index];
    if (answer.revealed) return;

    answer.revealed = true;
    gameState.currentScore += answer.points;
    io.emit("play-sound", "correct");
    io.emit("update-game", gameState);
  });

  socket.on("hide-answer", (index) => {
    if (
      !Number.isInteger(index) ||
      index < 0 ||
      index >= gameState.answers.length
    )
      return;

    const answer = gameState.answers[index];
    if (!answer.revealed) return;

    answer.revealed = false;
    gameState.currentScore = Math.max(
      0,
      gameState.currentScore - answer.points,
    );
    io.emit("update-game", gameState);
  });

  socket.on("clear-answers", () => {
    gameState.answers.forEach((answer) => {
      answer.revealed = false;
    });
    gameState.currentScore = 0;
    io.emit("update-game", gameState);
  });

  socket.on("trigger-strike", () => {
    gameState.strikes = gameState.strikes >= 3 ? 1 : gameState.strikes + 1;
    gameState.strikesVisible = true;
    io.emit("play-sound", "wrong");
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
