import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import correctAnswerSound from "./family-feud sfx/correct answer.mp3";
import wrongAnswerSound from "./family-feud sfx/wrong answer.mp3";
import fastMoneyMusic from "./family-feud sfx/Fastmoney Music.mp3";
import mainGameMusic from "./family-feud sfx/Main Game.mp3";
import themeMusic from "./family-feud sfx/Thememusic.mp3";
import jortizLogo from "./assets/jortiz-logo.png";
import "./App.css";

const SOCKET_SERVER_URL = "http://localhost:3001";
const socket = io(SOCKET_SERVER_URL);
const answerSounds = {
  correct: correctAnswerSound,
  wrong: wrongAnswerSound,
};

function getBackgroundTrack(state) {
  if (state?.screenState === "intro") return themeMusic;
  if (state?.screenState === "board") return mainGameMusic;
  if (state?.screenState === "fast-money") return fastMoneyMusic;
  return null;
}

export default function App() {
  const [gameState, setGameState] = useState(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const musicRef = useRef(null);
  const gameStateRef = useRef(gameState);
  const [questionDraft, setQuestionDraft] = useState({
    question: "",
    answers: [{ text: "", points: "" }],
  });
  const [questionError, setQuestionError] = useState("");
  const [activeFastMoneyAnswer, setActiveFastMoneyAnswer] = useState(null);

  const queryParams = new URLSearchParams(window.location.search);
  const view = queryParams.get("view") || "board";

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    document.title = view === "host" || view === "server" ? "Server" : "Player";
  }, [view]);

  useEffect(() => {
    if (view === "host") return;

    const music = new Audio();
    music.loop = true;
    music.volume = 0.35;
    musicRef.current = music;

    const unlockAudio = () => {
      setAudioUnlocked(true);
      const state = gameStateRef.current;
      const track = state?.playerAudioEnabled
        ? getBackgroundTrack(state)
        : null;
      if (!track) return;

      if (music.dataset.track !== track) {
        music.src = track;
        music.dataset.track = track;
      }

      music.play().catch((error) => {
        console.warn("Unable to play game music:", error);
      });
    };
    window.addEventListener("pointerdown", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      music.pause();
      musicRef.current = null;
    };
  }, [view]);

  useEffect(() => {
    if (view === "host") return;

    const music = musicRef.current;
    if (!music) return;
    if (!gameState?.playerAudioEnabled) {
      music.pause();
      return;
    }
    if (!audioUnlocked) return;

    const track = getBackgroundTrack(gameState);

    if (!track) {
      music.pause();
      music.dataset.track = "";
      return;
    }

    if (music.dataset.track !== track) {
      music.pause();
      music.currentTime = 0;
      music.src = track;
      music.dataset.track = track;
    }

    if (music.paused) {
      music.play().catch((error) => {
        console.warn("Unable to play game music:", error);
      });
    }
  }, [audioUnlocked, gameState, view]);

  useEffect(() => {
    socket.on("update-game", (state) => setGameState(state));
    socket.on("question-error", (message) => setQuestionError(message));
    socket.on("play-sound", (sound) => {
      if (view === "host" || !audioUnlocked || !gameState?.playerAudioEnabled)
        return;

      const source = answerSounds[sound];
      if (!source) return;

      new Audio(source).play().catch((error) => {
        console.warn(`Unable to play ${sound} answer sound:`, error);
      });
    });
    return () => {
      socket.off("update-game");
      socket.off("question-error");
      socket.off("play-sound");
    };
  }, [audioUnlocked, gameState?.playerAudioEnabled, view]);

  if (!gameState)
    return (
      <div style={{ color: "#fff", textAlign: "center", marginTop: "20%" }}>
        Loading Feud Engine...
      </div>
    );

  // --- MOBILE HOST CONTROLLER ---
  if (view === "host") {
    const updateAnswer = (index, field, value) => {
      setQuestionDraft((draft) => ({
        ...draft,
        answers: draft.answers.map((answer, answerIndex) =>
          answerIndex === index ? { ...answer, [field]: value } : answer,
        ),
      }));
    };

    const addAnswer = () => {
      if (questionDraft.answers.length >= 10) {
        setQuestionError("A question can have up to 10 answers.");
        return;
      }
      setQuestionDraft((draft) => ({
        ...draft,
        answers: [...draft.answers, { text: "", points: "" }],
      }));
    };

    const createQuestion = (event) => {
      event.preventDefault();
      const question = questionDraft.question.trim();
      const answers = questionDraft.answers.map((answer) => ({
        text: answer.text.trim(),
        points: Number(answer.points),
      }));

      if (!question || answers.length === 0) {
        setQuestionError("Enter a question and at least one answer.");
        return;
      }
      if (
        answers.some(
          (answer) =>
            !answer.text ||
            !Number.isInteger(answer.points) ||
            answer.points < 0,
        )
      ) {
        setQuestionError(
          "Each answer needs text and a whole-number point value.",
        );
        return;
      }

      setQuestionError("");
      socket.emit("add-question", { question, answers });
      setQuestionDraft({ question: "", answers: [{ text: "", points: "" }] });
    };

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
        <button
          type="button"
          onClick={() =>
            socket.emit("set-player-audio", !gameState.playerAudioEnabled)
          }
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            background: gameState.playerAudioEnabled ? "#dc3545" : "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "bold",
          }}
        >
          {gameState.playerAudioEnabled
            ? "Mute Player Sound"
            : "Enable Player Sound"}
        </button>

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
          <button
            onClick={() => socket.emit("set-screen", "fast-money")}
            style={{
              flex: 1,
              padding: "12px",
              background:
                gameState.screenState === "fast-money" ? "#28a745" : "#444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
            }}
          >
            Fast Money
          </button>
        </div>

        {gameState.screenState === "fast-money" ? (
          <section className="host-fast-money">
            <h3>Fast Money Round</h3>
            <p>
              {gameState.fastMoney.active
                ? `Participant ${gameState.fastMoney.currentParticipant + 1}: ${gameState.fastMoney.remaining}s remaining`
                : gameState.fastMoney.awaitingSecondParticipant
                  ? "Participant 1's time is up. Start Participant 2 when ready."
                  : gameState.fastMoney.remaining === 0
                    ? "Time is up. Answers remain on the display."
                    : "Fast Money screen ready. Start the 20-second and 25-second rounds."}
            </p>
            <div className="host-fast-money-actions">
              {gameState.fastMoney.awaitingSecondParticipant && (
                <button
                  type="button"
                  className="host-fast-money-start"
                  onClick={() => socket.emit("start-fast-money-second")}
                >
                  Start Participant 2 (25s)
                </button>
              )}
              <button
                type="button"
                className="host-fast-money-start"
                onClick={() => socket.emit("start-fast-money")}
              >
                {gameState.fastMoney.active ||
                gameState.fastMoney.awaitingSecondParticipant
                  ? "Restart Fast Money Timers"
                  : gameState.fastMoney.remaining === 0
                    ? "Start New Round"
                    : "Start Fast Money Timers"}
              </button>
              {gameState.fastMoney.visible && (
                <button
                  type="button"
                  className="host-fast-money-stop"
                  onClick={() => socket.emit("end-fast-money")}
                >
                  End Round
                </button>
              )}
            </div>
            <div className="host-fast-money-answers">
              {gameState.fastMoney.answers.map((answers, participant) => (
                <div className="host-fast-money-participant" key={participant}>
                  <h4>Participant {participant + 1}</h4>
                  {answers.map((answer, idx) => (
                    <div
                      className="host-fast-money-answer-row host-fast-money-survey-row"
                      key={idx}
                    >
                      <label className="host-field host-fast-money-question">
                        Question {idx + 1}
                        <input
                          value={answer.question}
                          maxLength={120}
                          onChange={(event) =>
                            socket.emit("update-fast-money-answer", {
                              participant,
                              index: idx,
                              field: "question",
                              value: event.target.value,
                            })
                          }
                        />
                      </label>
                      <div className="host-fast-money-answer-select">
                        <label className="host-field">
                          Survey Answer
                          <input
                            value={answer.text}
                            maxLength={120}
                            onFocus={() =>
                              setActiveFastMoneyAnswer(`${participant}-${idx}`)
                            }
                            onBlur={() => setActiveFastMoneyAnswer(null)}
                            onChange={(event) =>
                              socket.emit("update-fast-money-answer", {
                                participant,
                                index: idx,
                                field: "text",
                                value: event.target.value,
                              })
                            }
                            placeholder="Type or choose an answer"
                          />
                        </label>
                        {activeFastMoneyAnswer === `${participant}-${idx}` && (
                          <div
                            className="host-fast-money-answer-options"
                            role="listbox"
                          >
                            {answer.options
                              .filter((option) =>
                                option.text
                                  .toLowerCase()
                                  .includes(answer.text.toLowerCase()),
                              )
                              .map((option) => {
                                const optionIndex =
                                  answer.options.indexOf(option);
                                return (
                                  <button
                                    type="button"
                                    role="option"
                                    aria-selected={
                                      answer.selectedOption === optionIndex
                                    }
                                    key={option.text}
                                    onMouseDown={(event) =>
                                      event.preventDefault()
                                    }
                                    onClick={() => {
                                      socket.emit("select-fast-money-answer", {
                                        participant,
                                        index: idx,
                                        optionIndex,
                                      });
                                      setActiveFastMoneyAnswer(null);
                                    }}
                                  >
                                    {option.text} ({option.points} points)
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="host-fast-money-reveal"
                        onClick={() =>
                          socket.emit("toggle-fast-money-answer-field", {
                            participant,
                            index: idx,
                            field: "answer",
                          })
                        }
                      >
                        {answer.answerRevealed
                          ? "Hide Answer"
                          : "Reveal Answer"}
                      </button>
                      <label className="host-field host-fast-money-points">
                        Points
                        <input
                          type="number"
                          value={answer.points}
                          readOnly
                        />
                      </label>
                      <button
                        type="button"
                        className="host-fast-money-reveal"
                        onClick={() =>
                          socket.emit("toggle-fast-money-answer-field", {
                            participant,
                            index: idx,
                            field: "points",
                          })
                        }
                      >
                        {answer.pointsRevealed
                          ? "Hide Points"
                          : "Reveal Points"}
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ) : (
          <>
            <form className="host-question-form" onSubmit={createQuestion}>
              <h3>Create a Question</h3>
              <label className="host-field">
                Question
                <input
                  value={questionDraft.question}
                  onChange={(event) => {
                    setQuestionDraft((draft) => ({
                      ...draft,
                      question: event.target.value,
                    }));
                    setQuestionError("");
                  }}
                  placeholder="Enter the question"
                  required
                />
              </label>
              <div className="host-answer-list">
                {questionDraft.answers.map((answer, idx) => (
                  <div className="host-answer-row" key={idx}>
                    <label className="host-field">
                      Answer {idx + 1}
                      <input
                        value={answer.text}
                        onChange={(event) => {
                          updateAnswer(idx, "text", event.target.value);
                          setQuestionError("");
                        }}
                        placeholder="Answer text"
                        required
                      />
                    </label>
                    <label className="host-field host-points-field">
                      Points
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={answer.points}
                        onChange={(event) => {
                          updateAnswer(idx, "points", event.target.value);
                          setQuestionError("");
                        }}
                        placeholder="0"
                        required
                      />
                    </label>
                    {questionDraft.answers.length > 1 && (
                      <button
                        type="button"
                        className="host-remove-answer"
                        aria-label={`Remove answer ${idx + 1}`}
                        onClick={() => {
                          setQuestionDraft((draft) => ({
                            ...draft,
                            answers: draft.answers.filter(
                              (_, answerIndex) => answerIndex !== idx,
                            ),
                          }));
                          setQuestionError("");
                        }}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div className="host-question-actions">
                <button
                  type="button"
                  className="host-add-answer"
                  onClick={addAnswer}
                >
                  Add Answer
                </button>
                <button type="submit" className="host-submit-question">
                  Add to Question Sequence
                </button>
              </div>
              {questionError && (
                <p className="host-question-error" role="alert">
                  {questionError}
                </p>
              )}
            </form>

            <section className="host-question-sequence">
              <h3>Question Sequence</h3>
              <p>
                {gameState.questions.length} question
                {gameState.questions.length === 1 ? "" : "s"} in order
              </p>
              <div className="host-sequence-navigation">
                <button
                  type="button"
                  disabled={gameState.currentQuestionIndex <= 0}
                  onClick={() =>
                    socket.emit(
                      "show-question",
                      gameState.currentQuestionIndex - 1,
                    )
                  }
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={
                    gameState.currentQuestionIndex >=
                    gameState.questions.length - 1
                  }
                  onClick={() =>
                    socket.emit(
                      "show-question",
                      gameState.currentQuestionIndex + 1,
                    )
                  }
                >
                  Next Question
                </button>
              </div>
              <ol className="host-sequence-list">
                {gameState.questions.map((item, idx) => (
                  <li
                    className={
                      idx === gameState.currentQuestionIndex ? "is-current" : ""
                    }
                    key={`${idx}-${item.question}`}
                  >
                    <span>{item.question}</span>
                    <div className="host-sequence-item-actions">
                      <button
                        type="button"
                        disabled={idx === gameState.currentQuestionIndex}
                        onClick={() => socket.emit("show-question", idx)}
                      >
                        {idx === gameState.currentQuestionIndex
                          ? "Showing"
                          : "Display"}
                      </button>
                      <button
                        type="button"
                        className="host-delete-question"
                        aria-label={`Delete question ${idx + 1}`}
                        onClick={() => socket.emit("delete-question", idx)}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <h4>Question: {gameState.question || "No question selected"}</h4>
            <hr style={{ borderColor: "#333" }} />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <h3>Reveal Answers:</h3>
              <button
                type="button"
                onClick={() => socket.emit("clear-answers")}
                style={{
                  padding: "8px 12px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                }}
              >
                Clear Answers
              </button>
            </div>
            {gameState.answers.map((ans, idx) => (
              <button
                key={idx}
                onClick={() =>
                  socket.emit(
                    ans.revealed ? "hide-answer" : "reveal-answer",
                    idx,
                  )
                }
                style={{
                  display: "block",
                  width: "100%",
                  padding: "14px",
                  margin: "8px 0",
                  background: ans.revealed ? "#6c757d" : "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "16px",
                  fontWeight: "bold",
                }}
              >
                {ans.revealed ? "Hide" : "Reveal"} {idx + 1}. {ans.text} (
                {ans.points} pts) {ans.revealed ? "✅" : ""}
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
          </>
        )}
      </div>
    );
  }

  if (gameState.screenState === "fast-money") {
    const fastMoneyTotal = gameState.fastMoney.answers
      .flat()
      .reduce(
        (total, answer) => total + (answer.pointsRevealed ? answer.points : 0),
        0,
      );

    return (
      <div className="board-container fast-money-board">
        <h1 className="fast-money-title">FAST MONEY</h1>
        <div
          className={`fast-money-countdown ${
            gameState.fastMoney.remaining <= 5 ? "is-urgent" : ""
          }`}
        >
          {gameState.fastMoney.remaining}
        </div>
        <div
          className="top-score-box fast-money-total-score"
          aria-label={`Total points: ${fastMoneyTotal}`}
        >
          {fastMoneyTotal}
        </div>
        <div className="answers-grid fast-money-answer-grid">
          {gameState.fastMoney.answers.flatMap((answers, participant) =>
            answers.map((answer, idx) => (
              <div
                className="answer-card fast-money-survey-card"
                key={`${participant}-${idx}`}
              >
                <span className="answer-card-text">
                  {answer.answerRevealed ? answer.text : ""}
                </span>
                <span className="answer-card-points">
                  {answer.pointsRevealed ? answer.points : ""}
                </span>
              </div>
            )),
          )}
        </div>
      </div>
    );
  }

  // --- INTRO SCREEN VIEW ---
  if (gameState.screenState === "intro") {
    return (
      <div className="intro-screen">
        <div className="intro-oval">
          <img className="intro-logo" src={jortizLogo} alt="Jortiz Dialysis Corporation" />
          <div className="title-text">
            Family Feud
          </div>
        </div>
      </div>
    );
  }

  // --- BIG BOARD DISPLAY VIEW ---
  // Keep the board at ten slots, even when a question has fewer answers.
  const displaySlots = [...gameState.answers];
  while (displaySlots.length < 10) {
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
                <span className="answer-card-text">
                  {ans.revealed ? ans.text : ""}
                </span>
                <span className="answer-card-points">
                  {ans.revealed ? ans.points : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {gameState.strikesVisible && gameState.strikes > 0 && (
        <div className="strikes-overlay">{"❌ ".repeat(gameState.strikes)}</div>
      )}
    </div>
  );
}
