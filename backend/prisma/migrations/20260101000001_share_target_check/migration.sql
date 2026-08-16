-- Prisma has no native "polymorphic FK" concept, so Share.resourceType selects
-- which of dataRoomId/folderId/fileId is meaningful. Enforce at the DB level
-- that exactly one of them is set and that it matches resourceType, so a bug
-- in application code can't silently create an ambiguous share.
ALTER TABLE "shares"
  ADD CONSTRAINT "shares_exactly_one_target_chk"
  CHECK (
    (
      ("resourceType" = 'DATA_ROOM' AND "dataRoomId" IS NOT NULL AND "folderId" IS NULL AND "fileId" IS NULL) OR
      ("resourceType" = 'FOLDER'    AND "folderId" IS NOT NULL AND "dataRoomId" IS NULL AND "fileId" IS NULL) OR
      ("resourceType" = 'FILE'      AND "fileId" IS NOT NULL AND "dataRoomId" IS NULL AND "folderId" IS NULL)
    )
  );

-- Case-insensitive lookups for the (email, share) uniqueness are handled in
-- application code (emails are normalized to lowercase before writes), so no
-- extra index is needed here beyond the one Prisma already created.
