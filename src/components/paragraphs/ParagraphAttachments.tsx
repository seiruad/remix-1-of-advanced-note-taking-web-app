import { FileText, File, Image, Music, Video, Unlink } from 'lucide-react';
import { Button } from '../Button';
import type { FileItem } from '../../types/database';

export function ParagraphAttachments({ files, onOpenFile, onDetach }: {
  files: FileItem[];
  onOpenFile: (file: FileItem) => void;
  onDetach?: (id: string) => void;
}) {
  return <div className="flex flex-wrap gap-1.5">
    {files.map(file => {
      const Icon = file.file_type.startsWith('image/') ? Image : file.file_type.startsWith('audio/') ? Music : file.file_type.startsWith('video/') ? Video : file.file_type === 'application/pdf' ? FileText : File;
      return <span key={file.id} className="inline-flex max-w-full items-center h-7 gap-1 rounded-full border border-border/30 bg-muted/40 pl-2 pr-1">
        <Button onClick={() => onOpenFile(file)} title={file.filename} className="min-w-0 h-6 gap-1.5 px-0 hover:bg-transparent text-muted-foreground text-[11px]">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate max-w-[160px]">{file.filename}</span>
        </Button>
        {onDetach && <Button onClick={() => onDetach(file.id)} aria-label={`Unlink ${file.filename}`} title="Unlink from paragraph" className="h-6 w-6 shrink-0 rounded-full hover:text-destructive"><Unlink className="h-3.5 w-3.5" /></Button>}
      </span>;
    })}
  </div>;
}