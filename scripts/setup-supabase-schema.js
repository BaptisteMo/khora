import fetch from 'node-fetch';

const SUPABASE_PROJECT_URL = 'https://pnzhpmfxgzvqululzzqe.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBuemhwbWZ4Z3p2cXVsdWx6enFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NDgxNjI2MiwiZXhwIjoyMDYwMzkyMjYyfQ.4OHJoUChW0Xbw2zay8o8WF7zoQX7Mt7y0avUG6qEIAs';

const sql = `
-- Users table
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  username text unique,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Games table
create table if not exists public.games (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid references public.users(id),
  game_url text unique not null,
  created_at timestamp with time zone default timezone('utc'::text, now()),
  ended_at timestamp with time zone,
  title text not null,
  status text default 'pending',
  settings jsonb,
  winner_id uuid references public.users(id)
);

-- Game Participants table
create table if not exists public.game_participants (
  id uuid primary key default uuid_generate_v4(),
  game_id uuid references public.games(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamp with time zone default timezone('utc'::text, now()),
  score integer,
  status text default 'active'
);

-- User statistics table
create table if not exists public.user_statistics (
  user_id uuid primary key references public.users(id) on delete cascade,
  games_played integer default 0,
  games_won integer default 0,
  win_rate numeric default 0,
  average_score numeric default 0
);

-- Trigger to initialize user statistics
create or replace function public.init_user_statistics()
returns trigger as $$
begin
  insert into public.user_statistics (user_id) values (new.id);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_init_user_statistics on public.users;

create trigger trigger_init_user_statistics
after insert on public.users
for each row execute procedure public.init_user_statistics();
`;

async function runSQL() {
  const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/rpc/execute_sql`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Failed to execute SQL: ${error}`);
  }

  const data = await res.json();
  console.log('SQL executed successfully:', data);
}

runSQL().catch(console.error); 