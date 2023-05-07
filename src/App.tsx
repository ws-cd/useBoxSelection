import { useMemo, useState } from "react";
import useBoxSelection from "./useBoxSelection";

const App = () => {
  const [count, setCount] = useState(0);
  const cells = useMemo(() => new Array(100).fill(0).map((_, i) => i), []);
  const { cellClassName, ...containerProps } = useBoxSelection<HTMLDivElement>({
    cellClassName: "cell",
    markClassName: "mark",
    onChange: (els, origins) => {
      origins.forEach(
        (o) => !els.includes(o) && o.classList.remove("cell-selected")
      );
      els.forEach((el) => el.classList.add("cell-selected"));
      setCount(els.length);
    },
  });
  return (
    <>
      <div className="row" {...containerProps}>
        {cells.map((c) => (
          <div key={c} className={cellClassName}>
            {c}
          </div>
        ))}
      </div>
      <h1 className="number-label">选中{count}个</h1>
    </>
  );
};

export default App;
