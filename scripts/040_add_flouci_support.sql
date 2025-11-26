-- Add Flouci support to payments table
-- This migration adds support for Flouci payment gateway alongside Stripe

-- Make stripe_payment_id nullable and add flouci_payment_id
ALTER TABLE public.payments 
  ALTER COLUMN stripe_payment_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS flouci_payment_id TEXT UNIQUE;

-- Add index for flouci_payment_id
CREATE INDEX IF NOT EXISTS idx_payments_flouci_payment_id ON public.payments(flouci_payment_id);

-- Add check constraint to ensure at least one payment ID exists
ALTER TABLE public.payments 
  DROP CONSTRAINT IF EXISTS payments_payment_id_check,
  ADD CONSTRAINT payments_payment_id_check 
    CHECK (stripe_payment_id IS NOT NULL OR flouci_payment_id IS NOT NULL);

-- Update currency default to support TND
-- Note: You may want to change the default based on your primary payment method
-- ALTER TABLE public.payments ALTER COLUMN currency SET DEFAULT 'TND';






