-- Optional PDF (or file) that instructor can attach to an assignment for students to download.
-- Students see "Download assignment PDF" when this is set; they can then submit their answer (file or text).

ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

COMMENT ON COLUMN public.assignments.attachment_url IS 'Optional: URL to a PDF/file for students to download (e.g. worksheet).';
