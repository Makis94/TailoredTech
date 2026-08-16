-- CreateEnum
CREATE TYPE "ShareResourceType" AS ENUM ('DATA_ROOM', 'FOLDER', 'FILE');

-- CreateEnum
CREATE TYPE "ShareMode" AS ENUM ('PUBLIC', 'PERMISSIONED');

-- CreateEnum
CREATE TYPE "ShareRole" AS ENUM ('VIEWER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_rooms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "parentId" TEXT,
    "parentKey" TEXT NOT NULL DEFAULT 'ROOT',
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "folderId" TEXT,
    "folderKey" TEXT NOT NULL DEFAULT 'ROOT',
    "ownerId" TEXT NOT NULL,
    "currentVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_versions" (
    "id" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shares" (
    "id" TEXT NOT NULL,
    "resourceType" "ShareResourceType" NOT NULL,
    "dataRoomId" TEXT,
    "folderId" TEXT,
    "fileId" TEXT,
    "mode" "ShareMode" NOT NULL,
    "token" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "shares_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_grants" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "role" "ShareRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_grants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "data_rooms_ownerId_idx" ON "data_rooms"("ownerId");

-- CreateIndex
CREATE INDEX "folders_dataRoomId_parentId_idx" ON "folders"("dataRoomId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "folders_dataRoomId_parentKey_name_key" ON "folders"("dataRoomId", "parentKey", "name");

-- CreateIndex
CREATE UNIQUE INDEX "files_currentVersionId_key" ON "files"("currentVersionId");

-- CreateIndex
CREATE INDEX "files_dataRoomId_folderId_idx" ON "files"("dataRoomId", "folderId");

-- CreateIndex
CREATE UNIQUE INDEX "files_dataRoomId_folderKey_name_key" ON "files"("dataRoomId", "folderKey", "name");

-- CreateIndex
CREATE UNIQUE INDEX "file_versions_fileId_versionNumber_key" ON "file_versions"("fileId", "versionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "shares_token_key" ON "shares"("token");

-- CreateIndex
CREATE INDEX "shares_dataRoomId_idx" ON "shares"("dataRoomId");

-- CreateIndex
CREATE INDEX "shares_folderId_idx" ON "shares"("folderId");

-- CreateIndex
CREATE INDEX "shares_fileId_idx" ON "shares"("fileId");

-- CreateIndex
CREATE INDEX "share_grants_userId_idx" ON "share_grants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "share_grants_shareId_email_key" ON "share_grants"("shareId", "email");

-- AddForeignKey
ALTER TABLE "data_rooms" ADD CONSTRAINT "data_rooms_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "data_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "data_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_currentVersionId_fkey" FOREIGN KEY ("currentVersionId") REFERENCES "file_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_versions" ADD CONSTRAINT "file_versions_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "data_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shares" ADD CONSTRAINT "shares_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "shares"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_grants" ADD CONSTRAINT "share_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

