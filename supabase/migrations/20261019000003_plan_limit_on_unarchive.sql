-- BUG-002: o limite de projetos ativos do plano grátis também vale ao
-- desarquivar (antes só era conferido na criação).

create or replace function enforce_project_limit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p text;
  n integer;
begin
  -- só conta quando um projeto passa a ser ativo: criação, ou saída de "arquivado"
  if tg_op = 'UPDATE' and not (old.status = 'arquivado' and new.status <> 'arquivado') then
    return new;
  end if;
  if tg_op = 'INSERT' and new.status = 'arquivado' then
    return new;
  end if;
  select plan into p from profiles where id = new.user_id for update;
  if p = 'free' then
    select count(*) into n from projects
      where user_id = new.user_id and status <> 'arquivado' and id <> new.id;
    if n >= 3 then
      raise exception 'plan_limit_reached' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;

create trigger projects_limit_unarchive before update of status on projects
  for each row execute function enforce_project_limit();
