-- Add reply_to_id column to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN reply_to_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- Add reply_to_id column to direct_messages
ALTER TABLE public.direct_messages 
ADD COLUMN reply_to_id uuid REFERENCES public.direct_messages(id) ON DELETE SET NULL;