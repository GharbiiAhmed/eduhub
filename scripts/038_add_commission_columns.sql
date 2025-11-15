-- Add platform commission and creator earnings columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS creator_earnings DECIMAL(10, 2) DEFAULT 0;

-- Add platform commission and creator earnings columns to subscriptions table (for subscription payments)
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS platform_commission DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS creator_earnings DECIMAL(10, 2) DEFAULT 0;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_payments_creator_earnings ON public.payments(creator_earnings);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator_earnings ON public.subscriptions(creator_earnings);

