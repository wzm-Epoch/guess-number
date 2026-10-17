import { GamePage } from "./components/GamePage";
import { ThemePicker } from "./components/ThemePicker";

export function App() {
  const testSecret = import.meta.env.MODE === "test" ? 42 : null;
  return (
    <>
      <GamePage createSecret={testSecret === null ? undefined : () => testSecret} />
      <ThemePicker />
    </>
  );
}
