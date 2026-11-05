/**
 * One-off upgrade for databases created before the Phase 4 domain model.
 * Expand → backfill → contract. Afterwards `npm run db:push` only has additions left, so it can't
 * mistake a new column for a renamed old one (and never asks interactive questions):
 *
 *   npx tsx scripts/upgrade/2026-11-domain-model.ts && npm run db:push
 *
 * Safe to run more than once. Does nothing on a fresh database.
 */
import "dotenv/config";
import { createPool } from "@/server/db/pool";

const STEPS: { name: string; sql: string }[] = [
  {
    name: "countries table",
    sql: `
      create table if not exists countries (
        code char(2) primary key, name varchar(80) not null, currency char(3) not null,
        sort_order integer not null default 0, is_active boolean not null default true);
      insert into countries (code, name, currency, sort_order) values ('EG', 'Egypt', 'EGP', 0), ('JO', 'Jordan', 'JOD', 1)
      on conflict (code) do nothing;`,
  },
  {
    name: "destinations.country_code",
    sql: `
      do $$ begin
        if exists (select 1 from information_schema.columns where table_name = 'destinations' and column_name = 'country') then
          alter table destinations add column if not exists country_code char(2);
          update destinations d set country_code = c.code from countries c where c.name = d.country::text and d.country_code is null;
        end if;
      end $$;`,
  },
  {
    name: "products: price_cents, currency, duration_minutes",
    sql: `
      do $$ begin
        if exists (select 1 from information_schema.columns where table_name = 'products' and column_name = 'price') then
          alter table products add column if not exists price_cents integer;
          alter table products add column if not exists currency char(3) not null default 'USD';
          alter table products add column if not exists duration_minutes integer;
          update products set price_cents = round(price * 100) where price_cents is null;
          update products set duration_minutes = duration_hours * 60 where duration_minutes is null;
        end if;
      end $$;`,
  },
  {
    name: "bookings: money in cents, customer_* columns",
    sql: `
      do $$ begin
        if exists (select 1 from information_schema.columns where table_name = 'bookings' and column_name = 'total') then
          alter table bookings add column if not exists unit_price_cents integer;
          alter table bookings add column if not exists subtotal_cents integer;
          alter table bookings add column if not exists total_cents integer;
          alter table bookings add column if not exists deposit_cents integer not null default 0;
          update bookings set unit_price_cents = round(unit_price * 100), subtotal_cents = round(total * 100),
            total_cents = round(total * 100), deposit_cents = round(deposit * 100) where total_cents is null;
        end if;
        if exists (select 1 from information_schema.columns where table_name = 'bookings' and column_name = 'email') then
          alter table bookings add column if not exists customer_email varchar(200);
          alter table bookings add column if not exists customer_phone varchar(40);
          alter table bookings add column if not exists customer_country varchar(80) not null default '';
          update bookings set customer_email = email, customer_phone = phone, customer_country = country
            where customer_email is null;
        end if;
      end $$;`,
  },
  {
    name: "drop legacy columns (data is now in the new ones)",
    sql: `
      do $$ begin
        if not exists (select 1 from destinations where country_code is null) then
          alter table destinations drop column if exists country;
          drop type if exists country;
        end if;
        if not exists (select 1 from products where price_cents is null or duration_minutes is null) then
          alter table products drop column if exists price, drop column if exists duration_hours;
        end if;
        if exists (select 1 from information_schema.columns where table_name = 'bookings' and column_name = 'total_cents')
           and not exists (select 1 from bookings where total_cents is null or customer_email is null) then
          alter table bookings drop column if exists unit_price, drop column if exists total, drop column if exists deposit,
            drop column if exists email, drop column if exists phone, drop column if exists country,
            drop column if exists access_token;
        end if;
      end $$;`,
  },
];

async function main() {
  const pool = createPool(process.env.DATABASE_URL, { max: 1 });
  for (const step of STEPS) {
    await pool.query(step.sql);
    console.log(`✓ ${step.name}`);
  }
  await pool.end();
  console.log("Done. Now run: npm run db:push");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
