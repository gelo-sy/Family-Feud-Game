import { useState, useEffect } from "react";
import io from "socket.io-client";
import "./App.css";

const SOCKET_SERVER_URL = "http://localhost:3001";
const socket = io(SOCKET_SERVER_URL);

export default function App() {
  const [gameState, setGameState] = useState(null);
  const [questionDraft, setQuestionDraft] = useState({
    question: "",
    answers: [{ text: "", points: "" }],
  });
  const [questionError, setQuestionError] = useState("");

  const queryParams = new URLSearchParams(window.location.search);
  const view = queryParams.get("view") || "board";

  useEffect(() => {
    socket.on("update-game", (state) => setGameState(state));
    socket.on("question-error", (message) => setQuestionError(message));
    socket.on("play-sound", (sound) => {
      new Audio(`/audio/${sound}.mp3`).play().catch(() => {});
    });
    return () => {
      socket.off("update-game");
      socket.off("question-error");
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
    const updateAnswer = (index, field, value) => {
      setQuestionDraft((draft) => ({
        ...draft,
        answers: draft.answers.map((answer, answerIndex) =>
          answerIndex === index ? { ...answer, [field]: value } : answer,
        ),
      }));
    };

    const addAnswer = () => {
      if (questionDraft.answers.length >= 8) {
        setQuestionError("A question can have up to 8 answers.");
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
                ? `Time remaining: ${gameState.fastMoney.remaining}s`
                : gameState.fastMoney.remaining === 0
                  ? "Time is up. Answers remain on the display."
                  : "Fast Money screen ready. Start a 20-second round."}
            </p>
            <div className="host-fast-money-actions">
              <button
                type="button"
                className="host-fast-money-start"
                onClick={() => socket.emit("start-fast-money")}
              >
                {gameState.fastMoney.active
                  ? "Restart 20s Timer"
                  : gameState.fastMoney.remaining === 0
                    ? "Start New Round"
                    : "Start 20s Round"}
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
                    <div className="host-fast-money-answer-row" key={idx}>
                      <label className="host-field">
                        Answer {idx + 1}
                        <input
                          value={answer.text}
                          maxLength={120}
                          onChange={(event) =>
                            socket.emit("update-fast-money-answer", {
                              participant,
                              index: idx,
                              field: "text",
                              value: event.target.value,
                            })
                          }
                          placeholder={`Enter answer ${idx + 1}`}
                        />
                      </label>
                      <label className="host-field host-fast-money-points">
                        Points
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={answer.points}
                          onChange={(event) =>
                            socket.emit("update-fast-money-answer", {
                              participant,
                              index: idx,
                              field: "points",
                              value: event.target.value,
                            })
                          }
                        />
                      </label>
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

            <h3>Reveal Answers:</h3>
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
      .reduce((total, answer) => total + answer.points, 0);

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
        <div className="fast-money-participants">
          {gameState.fastMoney.answers.map((answers, participant) => (
            <section className="fast-money-participant" key={participant}>
              <div className="fast-money-answer-list">
                {answers.map((answer, idx) => (
                  <div className="fast-money-answer" key={idx}>
                    <span className="fast-money-answer-number">{idx + 1}</span>
                    <span className="fast-money-answer-text">
                      {answer.text}
                    </span>
                    <span className="fast-money-answer-points">
                      {answer.points}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
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
  // Keep the board at eight slots, even when a question has fewer answers.
  const displaySlots = [...gameState.answers];
  while (displaySlots.length < 8) {
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
                {!ans.empty && (ans.revealed ? (
                  <>
                    <span className="answer-card-text">
                      {ans.text}
                    </span>
                    <span className="fast-money-answer-points">
                      {ans.points}
                    </span>
                  </>
                ) : (
                  <span className="fast-money-answer-number answer-card-number">
                    {idx + 1}
                  </span>
                ))}
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
