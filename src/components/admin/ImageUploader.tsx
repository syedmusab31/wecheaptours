"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowLeft, Link2, LoaderCircle, Upload, X } from "lucide-react";

/**
 * Manages a list of image URLs in a hidden <input name={name}> as JSON.
 * Uploads go straight from the browser to Cloudinary with a server-signed request.
 */
export function ImageUploader({ name = "images", initial = [], max = 12 }: { name?: string; initial?: string[]; max?: number }) {
  const [images, setImages] = useState<string[]>(initial);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    setBusy(true);
    try {
      const sigRes = await fetch("/api/admin/cloudinary-signature", { method: "POST" });
      const sig = await sigRes.json();
      if (!sigRes.ok) throw new Error(sig.error ?? "Upload is not available.");
      const added: string[] = [];
      for (const file of Array.from(files).slice(0, max - images.length)) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is over 10 MB.`);
        const fd = new FormData();
        fd.append("file", file);
        fd.append("api_key", sig.apiKey);
        fd.append("timestamp", String(sig.timestamp));
        fd.append("signature", sig.signature);
        fd.append("folder", sig.folder);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message ?? "Cloudinary rejected the upload.");
        added.push(data.secure_url);
      }
      setImages((cur) => [...cur, ...added]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addUrl() {
    const u = url.trim();
    if (!/^https:\/\/.+/.test(u)) return setError("Paste a full image link starting with https://");
    setError(null);
    setImages((cur) => [...cur, u]);
    setUrl("");
  }

  return (
    <div>
      <input type="hidden" name={name} value={JSON.stringify(images)} />
      {images.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((src, i) => (
            <li key={src + i} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-mist">
              <Image src={src} alt="" fill sizes="200px" className="object-cover" />
              {i === 0 && <span className="absolute left-2 top-2 rounded bg-ink/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">Cover</span>}
              <div className="absolute right-1.5 top-1.5 flex gap-1">
                {i > 0 && (
                  <button
                    type="button"
                    title="Move left"
                    onClick={() => setImages((cur) => { const n = [...cur]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })}
                    className="rounded bg-white/95 p-1 shadow"
                  >
                    <ArrowLeft size={14} />
                  </button>
                )}
                <button type="button" title="Remove" onClick={() => setImages((cur) => cur.filter((_, j) => j !== i))} className="rounded bg-white/95 p-1 text-danger shadow">
                  <X size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-ink-mute">No photos yet. The first photo becomes the cover.</p>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || images.length >= max} className="btn btn-ghost">
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Upload size={16} />} Upload to Cloudinary
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => upload(e.target.files)} />
        <div className="flex flex-1 gap-2">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addUrl();
              }
            }}
            placeholder="…or paste an image link"
            className="field flex-1"
          />
          <button type="button" onClick={addUrl} className="btn btn-ghost" title="Add link">
            <Link2 size={16} />
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
