"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SearchModal } from "@/components/SearchModal";
import { UploadModal } from "@/components/UploadModal";
import { ShareModal } from "@/components/ShareModal";
import { FolderModal } from "@/components/FolderModal";
import { LinkShareModal } from "@/components/LinkShareModal";

type ResourceTarget = { type: "file" | "folder"; id: string } | null;

type DriveUi = {
  openSearch: () => void;
  openUpload: (folderId?: string) => void;
  openShare: (target?: ResourceTarget) => void;
  openFolder: (parentId?: string) => void;
  openLinkShare: (target: ResourceTarget) => void;
};

const Ctx = createContext<DriveUi | null>(null);

export function useDriveUi() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDriveUi must be used within DriveUiProvider");
  return value;
}

export function DriveUiProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState(false);
  const [uploadFolderId, setUploadFolderId] = useState<string | undefined>(undefined);
  const [upload, setUpload] = useState(false);
  
  const [shareTarget, setShareTarget] = useState<ResourceTarget>(null);
  const [share, setShare] = useState(false);
  
  const [linkShareTarget, setLinkShareTarget] = useState<ResourceTarget>(null);
  const [linkShare, setLinkShare] = useState(false);

  const [folderParentId, setFolderParentId] = useState<string | undefined>(undefined);
  const [folder, setFolder] = useState(false);

  const api = useMemo<DriveUi>(
    () => ({
      openSearch: () => setSearch(true),
      openUpload: (folderId?: string) => { setUploadFolderId(folderId); setUpload(true); },
      openShare: (target?: ResourceTarget) => { setShareTarget(target ?? null); setShare(true); },
      openFolder: (parentId?: string) => { setFolderParentId(parentId); setFolder(true); },
      openLinkShare: (target: ResourceTarget) => { setLinkShareTarget(target); setLinkShare(true); }
    }),
    [],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {search && <SearchModal onClose={() => setSearch(false)} />}
      {upload && <UploadModal folderId={uploadFolderId} onClose={() => setUpload(false)} />}
      {share && <ShareModal target={shareTarget} onClose={() => setShare(false)} />}
      {linkShare && <LinkShareModal target={linkShareTarget} onClose={() => setLinkShare(false)} />}
      {folder && <FolderModal parentId={folderParentId} onClose={() => setFolder(false)} />}
    </Ctx.Provider>
  );
}
