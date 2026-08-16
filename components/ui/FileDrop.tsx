"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { UploadCloud } from "lucide-react";

export function FileDrop({
  onFiles,
  accept,
  multiple = false,
  previews,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  previews?: { name: string; size?: string; url?: string }[];
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div>
      <div
        className={cn("file-drop", over && "is-over")}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const files = Array.from(e.dataTransfer.files);
          onFiles(files);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <span className="file-drop__icon">
          <UploadCloud size={40} strokeWidth={1.5} />
        </span>
        <div className="file-drop__title">اسحب الملفات هنا أو انقر للاختيار</div>
        <div className="file-drop__hint">
          {accept ? `أنواع الملفات: ${accept}` : "جميع أنواع الملفات"}
          {multiple ? " — يمكن اختيار أكثر من ملف" : ""}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            onFiles(files);
          }}
        />
      </div>
      {previews && previews.length > 0 && (
        <div className="stack" style={{ marginTop: "var(--s4)" }}>
          {previews.map((file, idx) => (
            <div key={idx} className="file-preview">
              {file.url && (
                <img src={file.url} alt={file.name} />
              )}
              <div>
                <div className="file-preview__name">{file.name}</div>
                {file.size && <div className="file-preview__meta">{file.size}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
