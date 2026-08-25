"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SearchModal } from "@/components/SearchModal";
import { UploadModal } from "@/components/UploadModal";
import { ShareModal } from "@/components/ShareModal";
import { FolderModal } from "@/components/FolderModal";

type DriveUi = {
  openSearch: () => void;
  openUpload: () => void;
  openShare: () => void;
  openFolder: () => void;
};

const Ctx = createContext<DriveUi | null>(null);

export function useDriveUi() {
  const value = useContext(Ctx);
  if (!value) throw new Error("useDriveUi must be used within DriveUiProvider");
  return value;
}

export function DriveUiProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState(false);
  const [upload, setUpload] = useState(false);
  const [share, setShare] = useState(false);
  const [folder, setFolder] = useState(false);

  const api = useMemo<DriveUi>(
    () => ({
      openSearch: () => setSearch(true),
      openUpload: () => setUpload(true),
      openShare: () => setShare(true),
      openFolder: () => setFolder(true),
    }),
    [],
  );

  return (
    <Ctx.Provider value={api}>
      {children}
      {search ? <SearchModal onClose={() => setSearch(false)} /> : null}
      {upload ? <UploadModal onClose={() => setUpload(false)} /> : null}
      {share ? <ShareModal onClose={() => setShare(false)} /> : null}
      {folder ? <FolderModal onClose={() => setFolder(false)} /> : null}
    </Ctx.Provider>
  );
}
