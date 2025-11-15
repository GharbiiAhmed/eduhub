-- Add RLS policies for conversations table
-- Enable RLS if not already enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Conversations SELECT policy: Users can see conversations they're a participant in
CREATE POLICY "conversations_select_participant" ON public.conversations FOR SELECT USING (
  participant_1_id = auth.uid() OR participant_2_id = auth.uid()
);

-- Conversations INSERT policy: Users can create conversations where they are a participant
CREATE POLICY "conversations_insert_participant" ON public.conversations FOR INSERT WITH CHECK (
  participant_1_id = auth.uid() OR participant_2_id = auth.uid()
);

-- Conversations UPDATE policy: Users can update conversations they're a participant in
CREATE POLICY "conversations_update_participant" ON public.conversations FOR UPDATE USING (
  participant_1_id = auth.uid() OR participant_2_id = auth.uid()
);

-- Conversations DELETE policy: Users can delete conversations they're a participant in
CREATE POLICY "conversations_delete_participant" ON public.conversations FOR DELETE USING (
  participant_1_id = auth.uid() OR participant_2_id = auth.uid()
);


