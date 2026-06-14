import { useRef, useState } from "react";

type Props = { label: string; onPick: (file: File) => Promise<void> };

export function UploadButton({ label, onPick }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  async function handle(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try {
      await onPick(f);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  }
  return (
    <>
      <button className="upload-btn" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? "Загрузка…" : label}
      </button>
      <input ref={ref} type="file" accept=".xlsx" hidden onChange={handle} />
    </>
  );
}
