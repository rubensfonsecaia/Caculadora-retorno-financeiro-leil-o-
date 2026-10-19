-- BUG-002: o limite de 3 projetos ativos do plano grátis vale também ao desarquivar.
\set ON_ERROR_STOP on
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'c1@exemplo.invalid');
set local role authenticated;
set local request.jwt.claim.role = 'authenticated';
set local request.jwt.claim.sub = '00000000-0000-0000-0000-0000000000c1';
insert into projects (user_id, name, status) values (auth.uid(), 'arquivado', 'arquivado');
insert into projects (user_id, name) values (auth.uid(), 'a1'), (auth.uid(), 'a2'), (auth.uid(), 'a3');
do $$
begin
  update projects set status = 'estudo' where name = 'arquivado';
  raise exception 'FALHOU: desarquivou com 3 ativos';
exception when others then
  if sqlerrm <> 'plan_limit_reached' then raise; end if;
  raise notice 'ok: desarquivar recusado no limite';
end $$;
-- arquivar outro libera a vaga
update projects set status = 'arquivado' where name = 'a1';
update projects set status = 'estudo' where name = 'arquivado';
-- editar um projeto ativo (sem mudar de arquivado) continua livre no limite
update projects set name = 'a2 renomeado' where name = 'a2';
do $$ begin raise notice 'ok: arquivar libera e editar no limite funciona'; end $$;
rollback;
