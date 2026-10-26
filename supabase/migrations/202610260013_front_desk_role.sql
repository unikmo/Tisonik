-- Narrow role for hotel front-desk staff: can create stays and work the guest inbox,
-- cannot void stays or change hotel settings. Kept in its own file because a new enum
-- value cannot be used in the transaction that adds it.
alter type public.member_role add value if not exists 'front_desk';
