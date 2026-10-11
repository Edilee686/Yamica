export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function safeFileName(name: string) {
  return (name.trim() || "yamica").replace(/[^\p{L}\p{N}\- _]+/gu, "").replace(/\s+/g, "-").toLowerCase().slice(0, 60) || "yamica";
}
