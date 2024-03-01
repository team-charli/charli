
| policyname               | permissive | roles    | cmd    | qual                                          | with_check                                    |
| ------------------------ | ---------- | -------- | ------ | --------------------------------------------- | --------------------------------------------- |
~~| User can access own data | PERMISSIVE | {public} | SELECT | ((auth.jwt() ->> 'sub'::text) = user_address) |                                               |~~
| User can insert own data | PERMISSIVE | {public} | INSERT |                                               | ((auth.jwt() ->> 'sub'::text) = user_address) |
| User can update own data | PERMISSIVE | {public} | UPDATE | 
((auth.jwt() ->> 'sub'::text) = user_address) | ((auth.jwt() ->> 'sub'::text) = user_address) |
