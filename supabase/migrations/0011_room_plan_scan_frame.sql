alter table public.room_plans
  add column scan_set_id uuid,
  add column frame_transform jsonb;

comment on column public.room_plans.scan_set_id is
  'the .scans set this plan was derived from, so later scans can be registered into the same coordinate frame';
comment on column public.room_plans.frame_transform is
  'transform from the scan reconstruction frame into plan metres, null while the plan is hand drawn';
