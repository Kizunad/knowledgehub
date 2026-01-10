-- ============================================================
-- Add source_type column to directory_sources
-- ============================================================
-- This migration adds a source_type field to distinguish between
-- 'code' and 'study' sources, allowing proper filtering in the UI

-- Add source_type column with default 'code' for backward compatibility
ALTER TABLE directory_sources
ADD COLUMN IF NOT EXISTS source_type VARCHAR(20) NOT NULL DEFAULT 'code'
CHECK (source_type IN ('code', 'study'));

-- Create index for quick filtering by source_type
CREATE INDEX IF NOT EXISTS idx_directory_sources_source_type ON directory_sources(source_type);

-- Update existing sources based on their associations:
-- Sources linked to study_spaces should be 'study' type
UPDATE directory_sources ds
SET source_type = 'study'
WHERE EXISTS (
    SELECT 1 FROM study_spaces ss
    WHERE ss.directory_source_id = ds.id
);

-- Sources linked to code_projects should remain 'code' type (already default)
-- No action needed for code_projects

-- Add comment for documentation
COMMENT ON COLUMN directory_sources.source_type IS 'Type of source: code for Code Projects, study for Study Spaces';
