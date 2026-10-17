import { useEffect, useState, type CSSProperties } from "react";

const colors = ["#9b87ff", "#4fd8ff", "#61e6a8", "#ffbb66", "#ff7185"] as const;

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  drift: number;
  color: string;
}

interface ConfettiLayerProps {
  active: boolean;
  random?: () => number;
  onFinished?: () => void;
}

function randomInteger(minimum: number, maximum: number, random: () => number): number {
  const value = Number(random());
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(0.999999999999, value)) : 0;
  return Math.floor(safeValue * (maximum - minimum + 1)) + minimum;
}

export function ConfettiLayer({ active, random = Math.random, onFinished }: ConfettiLayerProps) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!active) {
      setPieces([]);
      return undefined;
    }

    setPieces(Array.from({ length: 34 }, (_, index) => ({
      id: index,
      left: randomInteger(2, 98, random),
      delay: randomInteger(0, 12, random),
      drift: randomInteger(-90, 90, random),
      color: colors[index % colors.length]
    })));
    const timer = window.setTimeout(() => {
      setPieces([]);
      onFinished?.();
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [active, onFinished, random]);

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((piece) => {
        const style = {
          left: `${piece.left}%`,
          backgroundColor: piece.color,
          animationDelay: `${piece.delay / 100}s`,
          "--drift": `${piece.drift}px`
        } as CSSProperties;
        return <span className="confetti-piece" data-testid="confetti-piece" style={style} key={piece.id} />;
      })}
    </div>
  );
}
