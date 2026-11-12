-- Sales-ppt per call (leeg = de standaard-ppt uit de code).
alter table public.calls add column if not exists sales_ppt_url text check (sales_ppt_url is null or sales_ppt_url ~ '^https://');
