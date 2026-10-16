import type { GameFeedbackState } from "../game/use-single-player-game";

export function GameFeedback({ feedback }: { feedback: GameFeedbackState }) {
  return (
    <div className="feedback" data-state={feedback.tone} role="status" aria-live="polite">
      <span aria-hidden="true">{feedback.symbol}</span>
      <div>
        <strong>{feedback.title}</strong>
        <p>{feedback.detail}</p>
      </div>
    </div>
  );
}
