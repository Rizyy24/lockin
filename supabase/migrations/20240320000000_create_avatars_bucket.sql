insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true);

create policy "Avatar images are publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'avatars' );

create policy "Users can upload their own avatar image"
  on storage.objects for insert
  with check ( bucket_id = 'avatars' AND auth.uid() = owner );

create policy "Users can update their own avatar image"
  on storage.objects for update
  using ( bucket_id = 'avatars' AND auth.uid() = owner );

create policy "Users can delete their own avatar image"
  on storage.objects for delete
  using ( bucket_id = 'avatars' AND auth.uid() = owner );