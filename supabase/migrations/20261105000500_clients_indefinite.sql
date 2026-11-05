-- Contract van onbepaalde duur (bv. Tempus: vanaf 1/11/2026, 2 maanden opzeg). contract_end blijft
-- een echte datum (of leeg); onbepaalde duur = eigen vlag, zonder einddatum. Bestaande klanten: false.
alter table public.clients add column if not exists contract_indefinite boolean not null default false;
alter table public.clients drop constraint if exists clients_indefinite_no_end;
alter table public.clients add constraint clients_indefinite_no_end check (not contract_indefinite or contract_end is null);
