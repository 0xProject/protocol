import { useState } from "react";

export function Counter() {
  const [counter, setCounter] = useState(0);

  return (
    <div className="bg-gray-300">
      <button onClick={() => setCounter(counter + 1)}>Inc</button>
      <p>{counter}</p>
    </div>
  );
}
