import { useEffect, useRef, useState } from "react";

type BaseProps<T> = {
  value: T;
  onSave: (value: T) => Promise<void>;
  placeholder?: string;
  multiline?: boolean;
};

type TextProps = BaseProps<string> & { kind: "text" };
type NumberProps = BaseProps<number | null> & { kind: "number" };
type SelectProps = BaseProps<string> & { kind: "select"; options: { value: string; label: string }[] };

type Props = TextProps | NumberProps | SelectProps;

export function InlineEdit(props: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(formatValue(props));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (!editing) setDraft(formatValue(props));
  }, [props, editing]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  async function commit() {
    setError(false);
    const initial = formatValue(props);
    if (draft === initial) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      if (props.kind === "number") {
        const trimmed = draft.trim();
        const num = trimmed === "" ? null : Number(trimmed.replace(",", "."));
        if (num !== null && Number.isNaN(num)) throw new Error("nan");
        await props.onSave(num);
      } else {
        await props.onSave(draft);
      }
      setEditing(false);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <span
        className={`inline-edit${error ? " err" : ""}`}
        onClick={() => setEditing(true)}
        title="Нажмите чтобы изменить"
      >
        {displayValue(props) || <span className="inline-placeholder">{props.placeholder || "—"}</span>}
      </span>
    );
  }

  const common = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDraft(e.target.value),
    onBlur: commit,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !(props.kind === "text" && props.multiline && e.shiftKey)) {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        setDraft(formatValue(props));
        setEditing(false);
      }
    },
    disabled: saving,
    className: `inline-edit-input${error ? " err" : ""}`,
  };

  if (props.kind === "select") {
    return (
      <select {...common} ref={inputRef as React.RefObject<HTMLSelectElement>}>
        {props.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  if (props.kind === "text" && props.multiline) {
    return <textarea {...common} ref={inputRef as React.RefObject<HTMLTextAreaElement>} rows={3} />;
  }

  return <input type={props.kind === "number" ? "text" : "text"} inputMode={props.kind === "number" ? "decimal" : "text"} {...common} ref={inputRef as React.RefObject<HTMLInputElement>} />;
}

function formatValue(p: Props): string {
  if (p.kind === "number") return p.value === null || p.value === undefined ? "" : String(p.value);
  return p.value ?? "";
}

function displayValue(p: Props): string {
  if (p.kind === "select") {
    return p.options.find((o) => o.value === p.value)?.label ?? p.value;
  }
  return formatValue(p);
}
