begin;
insert into auth.users(id,email,aud,role) values
 ('a018e32a-c0b0-4f51-8f2d-000000000001','gatekampen-smoke-1@example.invalid','authenticated','authenticated'),
 ('a018e32a-c0b0-4f51-8f2d-000000000002','gatekampen-smoke-2@example.invalid','authenticated','authenticated'),
 ('a018e32a-c0b0-4f51-8f2d-000000000003','gatekampen-smoke-3@example.invalid','authenticated','authenticated');
do $$
declare ids uuid[]=array['a018e32a-c0b0-4f51-8f2d-000000000001','a018e32a-c0b0-4f51-8f2d-000000000002','a018e32a-c0b0-4f51-8f2d-000000000003']::uuid[]; actor uuid; c uuid; g uuid; s uuid; code text; board jsonb; rejected boolean; n integer;
begin
 insert into public.catalogues(name,source_version,streets,published_at) values('ROLLBACK test','test','[{"id":"street/test","kind":"street"}]',now()) returning id into c;
 foreach actor in array ids loop
  perform set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.save_profile('Rollback test');
  execute 'reset role';
 end loop;
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[1],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 g=public.create_group('ROLLBACK vennegruppe',c);code=public.create_invite(g);
 select id into s from public.seasons where group_id=g;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[3],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if exists(select 1 from public.groups where id=g) then raise exception 'FAIL: outsider sees group';end if;
 rejected=false;begin perform public.group_board(g);exception when raise_exception then rejected=true;end;
 if not rejected then raise exception 'FAIL: outsider reads board';end if;
 rejected=false;begin insert into public.memberships(group_id,player_id) values(g,ids[3]);exception when insufficient_privilege then rejected=true;end;
 if not rejected then raise exception 'FAIL: outsider creates membership';end if;
 rejected=false;begin perform public.accept_evidence(s,ids[3],'faked','hash','[]');exception when insufficient_privilege then rejected=true;end;
 if not rejected then raise exception 'FAIL: client writes score';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[2],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 if public.join_group(code) is distinct from g then raise exception 'FAIL: invite join';end if;
 board=public.group_board(g);if jsonb_array_length(board->'players')<>2 then raise exception 'FAIL: board members';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 execute 'set local role service_role';
 n=public.accept_evidence(s,ids[1],'walk-test','hash',jsonb_build_array(jsonb_build_object('street_id','street/test','completed_at',now())));
 if n<>1 then raise exception 'FAIL: verified score';end if;
 n=public.accept_evidence(s,ids[1],'walk-test','hash',jsonb_build_array(jsonb_build_object('street_id','street/test','completed_at',now())));
 if n<>0 then raise exception 'FAIL: replay duplicated score';end if;
 execute 'reset role';
 perform set_config('request.jwt.claims',jsonb_build_object('sub',ids[2],'role','authenticated')::text,true);
 execute 'set local role authenticated';
 board=public.group_board(g);if (board->>'team')::integer<>1 then raise exception 'FAIL: team progress';end if;
 execute 'reset role';
end $$;
rollback;
select 'PASS: live PostgreSQL roles, RLS, private groups, invitation join, verified score, replay, team coverage; fixtures rolled back' as result;
