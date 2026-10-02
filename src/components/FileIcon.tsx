import { FileImage, FileVideo, FileAudio, FileArchive, FileText } from "lucide-react";

export function FileIcon({ type, size = 21 }: { type?: string; size?: number }) {
  if (type?.startsWith("image/")) return <FileImage size={size} />;
  if (type?.startsWith("video/")) return <FileVideo size={size} />;
  if (type?.startsWith("audio/")) return <FileAudio size={size} />;
  if (type?.includes("zip") || type?.includes("archive") || type?.includes("tar") || type?.includes("rar")) {
    return <FileArchive size={size} />;
  }
  return <FileText size={size} />;
}
