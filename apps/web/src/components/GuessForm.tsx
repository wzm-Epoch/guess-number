import { type FormEvent } from "react";

interface GuessFormProps {
  value: string;
  disabled: boolean;
  error: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function GuessForm({ value, disabled, error, onChange, onSubmit }: GuessFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <div className="play-area">
      <div className="field-label">
        <label htmlFor="guess-input">输入你的猜测</label>
        <span>整数 1–100</span>
      </div>
      <form noValidate onSubmit={handleSubmit}>
        <div className="guess-row">
          <input
            id="guess-input"
            name="guess"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="例如：42"
            aria-describedby="guess-error"
            aria-invalid={error ? "true" : undefined}
            disabled={disabled}
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <button type="submit" disabled={disabled}>猜一猜</button>
        </div>
      </form>
      <p id="guess-error" className="error-message" role="alert" aria-live="assertive">
        {error}
      </p>
    </div>
  );
}
