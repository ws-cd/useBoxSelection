import { useEffect, useRef } from "react"

interface IOption {
  cellClassName: string;
  markClassName: string;
  onChange?: (elements: HTMLElement[], origins: HTMLElement[]) => void;
}
type Status<E extends HTMLElement = HTMLElement> = {
  downPoint: Point | null;
  selections: E[];
  cellMap: WeakMap<Element, Rectangle>;
  cells: Set<Element>;
  mark: HTMLDivElement | null
}
class Point {
  x: number;
  y: number;
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  static formEvent<E extends HTMLElement>(e: MouseEvent, container: E) {
    const { left, top } = container.getBoundingClientRect();
    return new Point(e.x - left, e.y - top)
  }
}
class Rectangle extends Point {
  width: number;
  height: number;
  constructor(width = 0, height = 0, x = 0, y = 0) {
    super(x, y);
    this.width = width;
    this.height = height
  }
}
function debounce(fn: Function, wait: number) {
  let timer: number;
  return (...args: any) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => fn(...args), wait);
  }
}
function getBound(e: MouseEvent, container: HTMLElement, startPoint: Point) {
  const bounds = new Rectangle();

  const mousePoint = Point.formEvent(e, container)
  if (mousePoint.x < 0) {
    mousePoint.x = 0;
  } else if (mousePoint.x > container.scrollWidth) {
    mousePoint.x = container.scrollWidth;
  }
  if (mousePoint.y < 0) {
    mousePoint.y = 0;
  } else if (mousePoint.y > container.scrollHeight) {
    mousePoint.y = container.scrollHeight;
  }

  bounds.x = Math.min(mousePoint.x, startPoint.x)
  bounds.y = Math.min(mousePoint.y, startPoint.y);
  bounds.width = Math.abs(mousePoint.x - startPoint.x);
  bounds.height = Math.abs(mousePoint.y - startPoint.y);
  return bounds;
}
function isInBound(bound: Rectangle, rect: Rectangle | undefined) {
  if (!rect) return false;
  const left = bound.x;
  const right = bound.x + bound.width;
  const top = bound.y;
  const bottom = bound.y + bound.height;
  if (rect.x > right) return false;
  if (rect.y > bottom) return false;
  if (rect.x + rect.width < left) return false;
  if (rect.y + rect.height < top) return false;
  return true;
}
function isSelectionChange(origin: HTMLElement[], change: HTMLElement[]) {
  return origin.length !== change.length || new Set([...origin, ...change]).size !== origin.length
}
const defaultOption: IOption = { cellClassName: 'boxselection-cell', markClassName: 'boxselection-mark' };
export default function useBoxSelection<T extends HTMLElement = HTMLElement>({ cellClassName, markClassName, onChange } = defaultOption) {
  const statusRef = useRef<Status>({ downPoint: null, selections: [], cellMap: new WeakMap(), cells: new Set(), mark: null });
  const ref = useRef<T>(null);
  const changeFunc = useRef(onChange);
  changeFunc.current = onChange

  useEffect(() => {
    const { left, top } = ref.current!.getBoundingClientRect();
    const initialCellMap = () => {
      const cells = new Set(Array.from(document.querySelectorAll('.' + cellClassName)));
      cells.forEach(element => {
        const { width, height, left: el, top: et } = element.getBoundingClientRect();
        statusRef.current.cellMap.set(element, new Rectangle(width, height, el - left, et - top))
      });
      statusRef.current.cells = cells;
    };
    const observer = new ResizeObserver(debounce(initialCellMap, 500));
    observer.observe(ref.current!);

    const mouseup = (e: MouseEvent) => {
      if (statusRef.current.downPoint) {
        const { downPoint, cellMap, cells, selections } = statusRef.current;
        const boundSelections: HTMLElement[] = [];
        const bounds = getBound(e, ref.current!, downPoint);
        cells.forEach(cell => {
          if (isInBound(bounds, cellMap.get(cell))) {
            boundSelections.push(cell as HTMLElement);
          }
        });
        if (isSelectionChange(selections, boundSelections)) {
          changeFunc.current?.(boundSelections, selections);
          statusRef.current.selections = boundSelections;
        }

        if (statusRef.current.mark) {
          statusRef.current.mark.remove();
          statusRef.current.mark = null
        }
        statusRef.current.downPoint = null;
      }
    }
    const mousemove = (e: MouseEvent) => {
      const { downPoint, mark } = statusRef.current
      if (downPoint && mark) {
        const bounds = getBound(e, ref.current!, downPoint);
        mark.style.top = `${bounds.y}px`;
        mark.style.left = `${bounds.x}px`;
        mark.style.width = `${bounds.width}px`;
        mark.style.height = `${bounds.height}px`;
      }
    }
    const mousedown = (e: MouseEvent) => {
      if (statusRef.current.mark) {
        statusRef.current.mark.remove();
      }
      const downPoint = Point.formEvent(e, ref.current!)
      statusRef.current.downPoint = downPoint;

      document.getSelection()?.removeAllRanges();
      const mark = document.createElement('div');
      mark.classList.add(markClassName);
      mark.style.position = 'absolute';
      ref.current!.appendChild(mark);

      statusRef.current.mark = mark;
    }
    ref.current!.style.position = 'relative'
    ref.current!.addEventListener('mousedown', mousedown);
    document.addEventListener('mouseup', mouseup);
    document.addEventListener('mousemove', mousemove)
    return () => {
      observer.disconnect();
      document.removeEventListener('mouseup', mouseup);
      document.removeEventListener('mousemove', mousemove);
    };
  }, [cellClassName, markClassName])


  return { ref, cellClassName }
}