import { FileText, File as FileIcon, Image, Music, Video, Unlink } from 'lucide-react';
import type { FileItem } from '../../types/database';

function iconFor(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.startsWith('audio/')) return Music;
  if (type.startsWith('video/')) return Video;
  if (type === 'application/pdf') return FileText;
  return FileIcon;
}

function shortName(name: string, max = 14) {
  if (name.length <= max) return name;
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot) : '';
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base.slice(0, Math.max(3, max - ext.length - 1))}…${ext}`;
}

export function ParagraphAttachments({ files, onOpenFile, onDetach }: {
  files: FileItem[];
  onOpenFile: (file: FileItem) => void;
  onDetach?: (id: string) => void;
}) {
  return <div className="flex flex-wrap gap-1.5">
    {files.map(file => {
      const Icon = iconFor(file.file_type);
      return (
        <span
          key={file.id}
          className="inline-flex items-center gap-2 h-7 pl-2.5 pr-2.5 rounded-full bg-slate-700/40 border border-slate-600/30 hover:bg-slate-700/60 transition-colors"
        >
          <button
            type="button"
            onClick={() => onOpenFile(file)}
            className="inline-flex items-center gap-2 min-w-0 text-[11px] font-medium text-slate-300"
            title={file.filename}
          >
            <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="truncate max-w-[120px]">{shortName(file.filename)}</span>
          </button>
          {onDetach && (
            <button
              type="button"
              onClick={() => onDetach(file.id)}
              aria-label={`Unlink ${file.filename}`}
              title="Unlink from paragraph"
              className="w-6 h-6 rounded-full flex items-center justify-center text-slate-500 hover:text-red-400 hover:bg-slate-600/40 transition-colors"
            >
              <Unlink className="w-3.5 h-3.5" />
            </button>
          )}
        </span>
      );
    })}
  </div>;
}
