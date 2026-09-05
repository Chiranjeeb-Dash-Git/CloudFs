"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Folder, File, ChevronRight, ChevronDown, Plus, UploadCloud, 
  Trash2, Link2, Share2, Download, Edit2, MoreVertical, FileText, Image, Video, Music, ArrowUp, ArrowDown, Users, Star
} from "lucide-react";
import { api, DriveFile, DriveFolder } from "@/lib/api";
import { useDriveUi } from "@/components/DriveUi";

function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

const getFileIcon = (mime: string) => {
  if (mime.startsWith("image/")) return <Image className="size-4 text-blue-400" />;
  if (mime.startsWith("video/")) return <Video className="size-4 text-purple-400" />;
  if (mime.startsWith("audio/")) return <Music className="size-4 text-yellow-400" />;
  if (mime.includes("pdf")) return <FileText className="size-4 text-red-400" />;
  return <File className="size-4 text-muted-foreground" />;
};

function FolderTreeItem({ folder, allFolders, currentId, onSelect, depth = 0 }: any) {
  const [expanded, setExpanded] = useState(depth < 1);
  const children = allFolders.filter((f: any) => f.parentId === folder.id);
  const hasChildren = children.length > 0;
  const isSelected = currentId === folder.id;

  return (
    <div className="w-full">
      <div 
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${isSelected ? 'bg-primary/20 text-primary' : 'hover:bg-surface-2 text-muted-foreground hover:text-foreground'}`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onSelect(folder.id)}
      >
        <button 
          className="p-0.5 opacity-50 hover:opacity-100 disabled:opacity-0" 
          disabled={!hasChildren}
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
        >
          {hasChildren ? (expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />) : <span className="w-3.5" />}
        </button>
        <Folder className={`size-3.5 ${isSelected ? 'fill-primary text-primary' : 'fill-muted-foreground text-muted-foreground'}`} />
        <span className="text-xs truncate">{folder.name}</span>
      </div>
      {expanded && hasChildren && (
        <div className="flex flex-col">
          {children.map((child: any) => (
            <FolderTreeItem key={child.id} folder={child} allFolders={allFolders} currentId={currentId} onSelect={onSelect} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileBrowser() {
  const ui = useDriveUi();
  const queryClient = useQueryClient();
  const [currentFolderId, setCurrentFolderId] = useState<string>("root");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  
  // Sort state
  const [sortCol, setSortCol] = useState<"name" | "size" | "date">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Selection & Menus
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<{ id: string, type: "file" | "folder", name: string } | null>(null);

  const { data: treeData } = useQuery({
    queryKey: ["folderTree"],
    queryFn: api.folderTree,
  });

  const { data: folderData, isLoading } = useQuery({
    queryKey: ["folder", currentFolderId],
    queryFn: () => api.folder(currentFolderId),
  });

  // Handle outside clicks to close menus
  useEffect(() => {
    const handleGlobalClick = () => setActiveMenuId(null);
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, []);

  // Direct Drag and Drop Handler
  const handleDropFiles = async (files: FileList) => {
    if (!files.length) return;
    try {
      for (const file of Array.from(files)) {
        setUploadStatus(`Uploading ${file.name}…`);
        const init = await api.uploadInit({
          name: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          folderId: currentFolderId === "root" ? null : currentFolderId,
        });
        const url = init.upload.url ?? init.upload.parts?.[0]?.url;
        if (url) {
          const put = await fetch(url, { method: "PUT", body: file, credentials: "include" });
          if (!put.ok) {
            const errText = await put.text().catch(() => "");
            throw new Error(`Upload failed (${put.status}): ${errText || put.statusText}`);
          }
          const etag = put.headers.get("etag") ?? `"${file.size}"`;
          await api.uploadComplete({ fileId: init.fileId, parts: [{ partNumber: 1, etag }] });
        } else {
          await api.uploadComplete({ fileId: init.fileId, parts: [] });
        }
      }
      setUploadStatus("Upload complete!");
      setTimeout(() => setUploadStatus(""), 3000);
      queryClient.invalidateQueries({ queryKey: ["folder", currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ["recent"] });
      queryClient.invalidateQueries({ queryKey: ["storage"] });
    } catch (err) {
      setUploadStatus(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleRename = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && renameTarget) {
      try {
        if (renameTarget.type === "file") {
          await api.renameFile(renameTarget.id, renameTarget.name);
        } else {
          await api.renameFolder(renameTarget.id, renameTarget.name);
          queryClient.invalidateQueries({ queryKey: ["folderTree"] });
        }
        setRenameTarget(null);
        queryClient.invalidateQueries({ queryKey: ["folder", currentFolderId] });
      } catch (err) {
        console.error(err);
      }
    } else if (e.key === "Escape") {
      setRenameTarget(null);
    }
  };

  const handleDelete = async (id: string, type: "file" | "folder") => {
    try {
      if (type === "file") await api.deleteFile(id);
      else await api.deleteFolder(id);
      queryClient.invalidateQueries({ queryKey: ["folder", currentFolderId] });
      queryClient.invalidateQueries({ queryKey: ["folderTree"] });
    } catch (err) {
      console.error(err);
    }
  };

  // Combine and sort contents
  let contents: any[] = [];
  if (folderData) {
    contents = [
      ...folderData.children.folders.map(f => ({ ...f, _type: "folder" })),
      ...folderData.children.files.map(f => ({ ...f, _type: "file" }))
    ];
    
    contents.sort((a, b) => {
      // Folders always first
      if (a._type === "folder" && b._type === "file") return -1;
      if (a._type === "file" && b._type === "folder") return 1;
      
      let cmp = 0;
      if (sortCol === "name") {
        cmp = a.name.localeCompare(b.name);
      } else if (sortCol === "size") {
        const sa = a.sizeBytes || 0;
        const sb = b.sizeBytes || 0;
        cmp = sa - sb;
      } else if (sortCol === "date") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }

  const toggleSort = (col: "name" | "size" | "date") => {
    if (sortCol === col) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortCol !== col) return null;
    return sortDir === "asc" ? <ArrowUp className="size-3 inline-block ml-1" /> : <ArrowDown className="size-3 inline-block ml-1" />;
  };

  const rootFolders = treeData?.folders?.filter(f => !f.parentId) ?? [];

  return (
    <div className="flex h-[800px] max-h-[85vh] w-full rounded-2xl border border-hairline bg-surface/50 overflow-hidden backdrop-blur-md">
      
      {/* Sidebar Tree */}
      <div className="w-64 border-r border-hairline bg-surface/30 flex flex-col hidden md:flex shrink-0">
        <div className="p-4 border-b border-hairline">
          <button 
            onClick={() => ui.openUpload(currentFolderId === "root" ? undefined : currentFolderId)}
            className="sheen relative flex w-full h-[40px] items-center justify-center gap-2 overflow-hidden rounded-full border border-hairline bg-secondary px-6 text-sm font-medium transition-transform duration-500 hover:-translate-y-0.5"
          >
            <UploadCloud className="size-4 relative z-10" />
            <span className="relative z-10">Upload Here</span>
          </button>
        </div>
        
        <div className="p-3 overflow-y-auto flex-1 custom-scrollbar flex flex-col gap-4">
          <div>
            <div className="px-2 mb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Locations</div>
            <div 
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors mb-1 ${currentFolderId === 'root' ? 'bg-primary/20 text-primary font-medium' : 'hover:bg-surface-2 text-muted-foreground'}`}
              onClick={() => setCurrentFolderId("root")}
            >
              <Folder className={`size-4 ${currentFolderId === 'root' ? 'fill-primary' : 'fill-muted-foreground'}`} />
              <span className="text-xs">My Drive</span>
            </div>
            
            <div className="ml-1 pl-2 border-l border-hairline flex flex-col gap-0.5">
              {rootFolders.map((f: any) => (
                <FolderTreeItem 
                  key={f.id} 
                  folder={f} 
                  allFolders={treeData?.folders ?? []} 
                  currentId={currentFolderId} 
                  onSelect={setCurrentFolderId} 
                />
              ))}
            </div>
          </div>

          <div className="border-t border-hairline pt-3">
            <div className="px-2 mb-2 text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Quick Access</div>
            <Link href="/shared" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors mb-0.5">
              <Users className="size-4" /> Shared with me
            </Link>
            <Link href="/trash" className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-surface-2 hover:text-foreground transition-colors">
              <Trash2 className="size-4" /> Trash / Deleted
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content Area (With Drag & Drop Zone) */}
      <div 
        className={`flex-1 flex flex-col min-w-0 bg-[#0a0a0a] relative ${isDraggingOver ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}`}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDraggingOver(false);
          if (e.dataTransfer.files) handleDropFiles(e.dataTransfer.files);
        }}
      >
        {/* Drag Overlay Indicator */}
        {isDraggingOver && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary m-2 rounded-xl pointer-events-none">
            <UploadCloud className="size-12 text-primary animate-bounce" />
            <p className="text-lg font-medium text-white">Drop files to upload into current folder</p>
          </div>
        )}

        {uploadStatus && (
          <div className="bg-primary/20 border-b border-primary/40 px-4 py-2 text-xs font-mono text-primary flex items-center justify-between">
            <span>{uploadStatus}</span>
          </div>
        )}
        
        {/* Top bar & Breadcrumbs */}
        <div className="flex items-center justify-between p-4 border-b border-hairline bg-surface/50 backdrop-blur-md">
          <div className="flex items-center gap-1 text-sm overflow-hidden whitespace-nowrap">
            <button onClick={() => setCurrentFolderId("root")} className="hover:text-primary transition-colors text-muted-foreground truncate">
              My Drive
            </button>
            {folderData?.path?.map((p) => (
              <div key={p.id} className="flex items-center gap-1 shrink-0">
                <ChevronRight className="size-4 text-muted-foreground/50" />
                <button onClick={() => setCurrentFolderId(p.id)} className="hover:text-primary transition-colors text-muted-foreground">
                  {p.name}
                </button>
              </div>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={() => ui.openFolder(currentFolderId === "root" ? undefined : currentFolderId)} className="p-2 rounded-full hover:bg-surface-2 text-muted-foreground transition-colors" title="New Folder">
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* List Header */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-3 border-b border-hairline bg-surface/20 text-xs font-mono text-muted-foreground uppercase tracking-wider">
          <div className="w-5"></div>
          <button className="flex items-center text-left hover:text-foreground" onClick={() => toggleSort("name")}>Name <SortIcon col="name" /></button>
          <div className="w-24 hidden md:block">Owner</div>
          <button className="w-24 hidden lg:flex items-center hover:text-foreground" onClick={() => toggleSort("date")}>Modified <SortIcon col="date" /></button>
          <button className="w-20 text-right hidden sm:flex items-center justify-end hover:text-foreground" onClick={() => toggleSort("size")}>Size <SortIcon col="size" /></button>
          <div className="w-8"></div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground animate-pulse">
              <span className="font-mono text-sm tracking-widest">LOADING...</span>
            </div>
          ) : contents.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
              <Folder className="size-12 mb-3 stroke-1" />
              <p className="text-sm">This folder is empty</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Drag and drop files here to upload</p>
            </div>
          ) : (
            contents.map((item) => (
              <div 
                key={item.id} 
                className="group grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 items-center px-6 py-3 border-b border-hairline hover:bg-surface-2 transition-colors cursor-pointer"
                onDoubleClick={() => item._type === "folder" ? setCurrentFolderId(item.id) : null}
              >
                <div className="w-5 flex items-center justify-center">
                  {item._type === "folder" ? <Folder className="size-4 fill-primary/20 text-primary" /> : getFileIcon(item.mimeType)}
                </div>
                
                <div className="min-w-0 flex items-center">
                  {renameTarget?.id === item.id ? (
                    <input 
                      autoFocus
                      value={renameTarget?.name ?? ""}
                      onChange={(e) => setRenameTarget(prev => prev ? { ...prev, name: e.target.value } : null)}
                      onKeyDown={handleRename}
                      onBlur={() => setRenameTarget(null)}
                      className="bg-transparent border-b border-primary outline-none text-sm w-full font-medium"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate text-sm font-medium">{item.name}</span>
                  )}
                </div>

                <div className="w-24 hidden md:block text-xs text-muted-foreground truncate">Me</div>
                <div className="w-24 hidden lg:block text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleDateString()}</div>
                <div className="w-20 hidden sm:block text-xs text-muted-foreground text-right">{item._type === "file" ? formatBytes(item.sizeBytes) : "--"}</div>
                
                {/* Actions Menu */}
                <div className="w-8 relative flex justify-end">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === item.id ? null : item.id); }}
                    className="p-1.5 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-surface hover:text-foreground transition-all"
                  >
                    <MoreVertical className="size-4" />
                  </button>
                  
                  {activeMenuId === item.id && (
                    <div className="absolute right-0 top-8 w-48 rounded-xl border border-hairline bg-surface p-1 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                      <button 
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-surface-2"
                        onClick={(e) => { e.stopPropagation(); setRenameTarget({ id: item.id, type: item._type, name: item.name }); setActiveMenuId(null); }}
                      >
                        <Edit2 className="size-3.5" /> Rename
                      </button>
                      <button 
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-surface-2"
                        onClick={(e) => { e.stopPropagation(); ui.openShare({ type: item._type, id: item.id }); setActiveMenuId(null); }}
                      >
                        <Share2 className="size-3.5" /> Share
                      </button>
                      <button 
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-surface-2"
                        onClick={(e) => { e.stopPropagation(); ui.openLinkShare({ type: item._type, id: item.id }); setActiveMenuId(null); }}
                      >
                        <Link2 className="size-3.5" /> Public Link
                      </button>
                      {item._type === "file" && (
                        <a 
                          href={api.downloadUrl(item.id)}
                          download
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-surface-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Download className="size-3.5" /> Download
                        </a>
                      )}
                      <div className="my-1 border-t border-hairline"></div>
                      <button 
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-red-500/10 text-red-400"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item.id, item._type); setActiveMenuId(null); }}
                      >
                        <Trash2 className="size-3.5" /> Move to Trash
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
