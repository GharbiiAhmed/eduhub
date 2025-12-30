-- Add delivery tracking fields to book_purchases table
ALTER TABLE public.book_purchases
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'processing', 'shipped', 'in_transit', 'delivered', 'cancelled')),
ADD COLUMN IF NOT EXISTS tracking_number TEXT,
ADD COLUMN IF NOT EXISTS shipping_address TEXT,
ADD COLUMN IF NOT EXISTS shipped_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS carrier_name TEXT;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_book_purchases_delivery_status ON public.book_purchases(delivery_status);
CREATE INDEX IF NOT EXISTS idx_book_purchases_tracking_number ON public.book_purchases(tracking_number);

-- Add comment
COMMENT ON COLUMN public.book_purchases.delivery_status IS 'Status of physical book delivery: pending, processing, shipped, in_transit, delivered, cancelled';
COMMENT ON COLUMN public.book_purchases.tracking_number IS 'Tracking number for the shipment';
COMMENT ON COLUMN public.book_purchases.shipping_address IS 'Shipping address for physical book delivery';
COMMENT ON COLUMN public.book_purchases.shipped_at IS 'Timestamp when the book was shipped';
COMMENT ON COLUMN public.book_purchases.delivered_at IS 'Timestamp when the book was delivered';
COMMENT ON COLUMN public.book_purchases.carrier_name IS 'Name of the shipping carrier (e.g., DHL, FedEx, UPS)';











