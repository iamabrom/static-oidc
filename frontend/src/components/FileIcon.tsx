import { File, Folder, Image, Video, Music, FileText, Code, Archive } from 'lucide-react';

interface FileIconProps {
  mimeType: string | null;
  isDirectory: boolean;
  size?: number;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4'];
const TEXT_TYPES = ['text/plain', 'text/markdown', 'text/html', 'text/css', 'text/yaml'];
const CODE_TYPES = ['application/json', 'application/javascript', 'application/typescript',
  'application/x-sh', 'application/xml', 'text/xml'];
const ARCHIVE_TYPES = ['application/zip', 'application/x-tar', 'application/gzip',
  'application/x-7z-compressed', 'application/x-rar-compressed'];
const PDF_TYPES = ['application/pdf'];

export function FileIcon({ mimeType, isDirectory, size = 16 }: FileIconProps) {
  const props = { size, strokeWidth: 1.5 };
  const color = 'var(--text-secondary)';

  if (isDirectory) return <Folder {...props} color="var(--accent)" />;
  if (!mimeType) return <File {...props} color={color} />;
  if (IMAGE_TYPES.includes(mimeType)) return <Image {...props} color={color} />;
  if (VIDEO_TYPES.includes(mimeType)) return <Video {...props} color={color} />;
  if (AUDIO_TYPES.includes(mimeType)) return <Music {...props} color={color} />;
  if (PDF_TYPES.includes(mimeType)) return <FileText {...props} color={color} />;
  if ([...TEXT_TYPES, ...CODE_TYPES].some(t => mimeType.startsWith(t.split('/')[0]) || mimeType === t)) {
    return <Code {...props} color={color} />;
  }
  if (ARCHIVE_TYPES.includes(mimeType)) return <Archive {...props} color={color} />;
  return <File {...props} color={color} />;
}

export function isPreviewable(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return (
    IMAGE_TYPES.includes(mimeType) ||
    VIDEO_TYPES.includes(mimeType) ||
    AUDIO_TYPES.includes(mimeType) ||
    mimeType.startsWith('text/') ||
    CODE_TYPES.some(t => mimeType === t)
  );
}

export function isImage(mimeType: string | null): boolean {
  return !!mimeType && IMAGE_TYPES.includes(mimeType);
}

export function isVideo(mimeType: string | null): boolean {
  return !!mimeType && VIDEO_TYPES.includes(mimeType);
}

export function isAudio(mimeType: string | null): boolean {
  return !!mimeType && AUDIO_TYPES.includes(mimeType);
}

export function isText(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('text/') || CODE_TYPES.some(t => mimeType === t);
}
