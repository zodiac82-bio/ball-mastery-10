import ui from '../styles/ui.module.css';

export interface SegOption<T> {
  value: T;
  label: string;
}

export interface SegmentedProps<T> {
  /** 화면 낭독기용 묶음 이름 */
  label: string;
  options: ReadonlyArray<SegOption<T>>;
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}

/** 여러 개 중 하나를 고르는 묶음 버튼 */
export function Segmented<T extends string | number>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: SegmentedProps<T>) {
  return (
    <div className={ui.seg} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={o.value === value ? ui.segOn : ui.segBtn}
          aria-pressed={o.value === value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
