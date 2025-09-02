Planned migration: Add marketplace orders, messages, and vendor_admins

Up (SQL sketch):

1) marketplace_orders
   CREATE TABLE public.marketplace_orders (
     id serial PRIMARY KEY,
     created_at timestamp(6) NOT NULL DEFAULT now(),
     updated_at timestamp(6) NOT NULL DEFAULT now(),
     vendor_id varchar(100) NOT NULL,
     product_id integer NOT NULL,
     status varchar(20) NOT NULL,
     total_cents integer NOT NULL,
     currency varchar(10) NOT NULL
   );
   CREATE INDEX idx_marketplace_order_vendor ON public.marketplace_orders(vendor_id);
   CREATE INDEX idx_marketplace_order_status_created ON public.marketplace_orders(status, created_at);

2) marketplace_messages
   CREATE TABLE public.marketplace_messages (
     id serial PRIMARY KEY,
     created_at timestamp(6) NOT NULL DEFAULT now(),
     vendor_id varchar(100) NOT NULL,
     sender_id varchar(100),
     status varchar(20) NOT NULL,
     subject varchar(255),
     body varchar(2000)
   );
   CREATE INDEX idx_marketplace_message_vendor_status ON public.marketplace_messages(vendor_id, status);
   CREATE INDEX idx_marketplace_message_vendor_created ON public.marketplace_messages(vendor_id, created_at);

3) vendor_admins
   CREATE TABLE public.vendor_admins (
     id serial PRIMARY KEY,
     vendor_id varchar(100) NOT NULL,
     user_id varchar(50) NOT NULL,
     role varchar(20) NOT NULL,
     created_at timestamp(6) NOT NULL DEFAULT now()
   );
   CREATE UNIQUE INDEX uq_vendor_user ON public.vendor_admins(vendor_id, user_id);
   CREATE INDEX idx_vendor_admin_user ON public.vendor_admins(user_id);

Down (rollback):

   DROP TABLE IF EXISTS public.marketplace_messages;
   DROP TABLE IF EXISTS public.marketplace_orders;
   DROP TABLE IF EXISTS public.vendor_admins;

Notes:
- Choose correct foreign keys if you want referential integrity (e.g., product_id -> marketplace.id, user_id -> users.id). They are omitted here due to cross-service constraints.
- Consider enum types for status with a reversible strategy (create type + drop type on rollback if no dependencies).
- Add retention/archival strategy for messages if high-volume.
