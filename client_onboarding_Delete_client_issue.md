ClientOnboardingList.tsx:84 Failed to delete client: 
{status: 500, message: 'Failed to delete client: (sqlalchemy.dialects.post… on this error at: https://sqlalche.me/e/20/gkpj)', data: {…}}
data
: 
detail
: 
"Failed to delete client: (sqlalchemy.dialects.postgresql.asyncpg.IntegrityError) <class 'asyncpg.exceptions.ForeignKeyViolationError'>: update or delete on table \"users\" violates foreign key constraint \"income_adjustments_created_by_fkey\" on table \"income_adjustments\"\nDETAIL:  Key (id)=(1e896a7f-3d0f-4db2-8ab1-fc717b725fd7) is still referenced from table \"income_adjustments\".\n[SQL: DELETE FROM \"denpay-dev\".users WHERE \"denpay-dev\".users.id = $1::UUID]\n[parameters: (UUID('1e896a7f-3d0f-4db2-8ab1-fc717b725fd7'),)]\n(Background on this error at: https://sqlalche.me/e/20/gkpj)"
[[Prototype]]
: 
Object
message
: 
"Failed to delete client: (sqlalchemy.dialects.postgresql.asyncpg.IntegrityError) <class 'asyncpg.exceptions.ForeignKeyViolationError'>: update or delete on table \"users\" violates foreign key constraint \"income_adjustments_created_by_fkey\" on table \"income_adjustments\"\nDETAIL:  Key (id)=(1e896a7f-3d0f-4db2-8ab1-fc717b725fd7) is still referenced from table \"income_adjustments\".\n[SQL: DELETE FROM \"denpay-dev\".users WHERE \"denpay-dev\".users.id = $1::UUID]\n[parameters: (UUID('1e896a7f-3d0f-4db2-8ab1-fc717b725fd7'),)]\n(Background on this error at: https://sqlalche.me/e/20/gkpj)"
status
: 
500
[[Prototype]]
: 
Object





------------------------------------------------------------------------------------------------------------------------------
2 - Clients are creating but throwing this error due :
ClientOnboardingCreate.tsx:256 Failed to create client: 
{status: 500, message: 'Failed to create client: (sqlalchemy.dialects.post… on this error at: https://sqlalche.me/e/20/gkpj)', data: {…}}
data
: 
detail
: 
"Failed to create client: (sqlalchemy.dialects.postgresql.asyncpg.IntegrityError) <class 'asyncpg.exceptions.UniqueViolationError'>: duplicate key value violates unique constraint \"users_email_key\"\nDETAIL:  Key (email)=(adminLTD@email.com) already exists.\n[SQL: INSERT INTO \"denpay-dev\".users (id, email, name, avatar, client_id) VALUES ($1::UUID, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::UUID) RETURNING \"denpay-dev\".users.created_at, \"denpay-dev\".users.updated_at]\n[parameters: (UUID('ea0bfaf4-c720-4fc9-a84f-d7fb2d016050'), 'adminLTD@email.com', 'ltd_admin_full_name', None, UUID('7baf4d1a-56b6-48af-a5b9-f4b287c2e16b'))]\n(Background on this error at: https://sqlalche.me/e/20/gkpj)"
[[Prototype]]
: 
Object
message
: 
"Failed to create client: (sqlalchemy.dialects.postgresql.asyncpg.IntegrityError) <class 'asyncpg.exceptions.UniqueViolationError'>: duplicate key value violates unique constraint \"users_email_key\"\nDETAIL:  Key (email)=(adminLTD@email.com) already exists.\n[SQL: INSERT INTO \"denpay-dev\".users (id, email, name, avatar, client_id) VALUES ($1::UUID, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::UUID) RETURNING \"denpay-dev\".users.created_at, \"denpay-dev\".users.updated_at]\n[parameters: (UUID('ea0bfaf4-c720-4fc9-a84f-d7fb2d016050'), 'adminLTD@email.com', 'ltd_admin_full_name', None, UUID('7baf4d1a-56b6-48af-a5b9-f4b287c2e16b'))]\n(Background on this error at: https://sqlalche.me/e/20/gkpj)"
status
: 
500
[[Prototype]]
: 
Object
ClientOnboardingCreate.tsx:257 Error data: 
{detail: 'Failed to create client: (sqlalchemy.dialects.post… on this error at: https://sqlalche.me/e/20/gkpj)'}
detail
: 
"Failed to create client: (sqlalchemy.dialects.postgresql.asyncpg.IntegrityError) <class 'asyncpg.exceptions.UniqueViolationError'>: duplicate key value violates unique constraint \"users_email_key\"\nDETAIL:  Key (email)=(adminLTD@email.com) already exists.\n[SQL: INSERT INTO \"denpay-dev\".users (id, email, name, avatar, client_id) VALUES ($1::UUID, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::UUID) RETURNING \"denpay-dev\".users.created_at, \"denpay-dev\".users.updated_at]\n[parameters: (UUID('ea0bfaf4-c720-4fc9-a84f-d7fb2d016050'), 'adminLTD@email.com', 'ltd_admin_full_name', None, UUID('7baf4d1a-56b6-48af-a5b9-f4b287c2e16b'))]\n(Background on this error at: https://sqlalche.me/e/20/gkpj)"
[[Prototype]]
: 
Object
ClientOnboardingCreate.tsx:258 Error message: Failed to create client: (sqlalchemy.dialects.postgresql.asyncpg.IntegrityError) <class 'asyncpg.exceptions.UniqueViolationError'>: duplicate key value violates unique constraint "users_email_key"
DETAIL:  Key (email)=(adminLTD@email.com) already exists.
[SQL: INSERT INTO "denpay-dev".users (id, email, name, avatar, client_id) VALUES ($1::UUID, $2::VARCHAR, $3::VARCHAR, $4::VARCHAR, $5::UUID) RETURNING "denpay-dev".users.created_at, "denpay-dev".users.updated_at]
[parameters: (UUID('ea0bfaf4-c720-4fc9-a84f-d7fb2d016050'), 'adminLTD@email.com', 'ltd_admin_full_name', None, UUID('7baf4d1a-56b6-48af-a5b9-f4b287c2e16b'))]
(Background on this error at: https://sqlalche.me/e/20/gkpj)
ClientOnboardingCreate.tsx:259 Payload sent: 
{legal_client_trading_name: 'ABCgame', workfin_legal_entity_reference: 'REF-1768224967763', client_type: 'partnership', company_registration: null, xero_vat_type: null, …}

﻿




-- this was the error i am getting when clicking the submit button only Once :

Failed to create client: Object
handleSubmit @ ClientOnboardingCreate.tsx:256Understand this error
ClientOnboardingCreate.tsx:257 Error data: Object
handleSubmit @ ClientOnboardingCreate.tsx:257Understand this error
ClientOnboardingCreate.tsx:258 Error message: Failed to create client: 1 validation error for ClientResponse
users
  Error extracting attribute: MissingGreenlet: greenlet_spawn has not been called; can't call await_only() here. Was IO attempted in an unexpected place? (Background on this error at: https://sqlalche.me/e/20/xd2s) [type=get_attribute_error, input_value=<app.db.models.Client obj...t at 0x000001E933FDD610>, input_type=Client]
    For further information visit https://errors.pydantic.dev/2.10/v/get_attribute_error
handleSubmit @ ClientOnboardingCreate.tsx:258Understand this error
ClientOnboardingCreate.tsx:259 Payload sent: Object
handleSubmit @ ClientOnboardingCreate.tsx:259Understand this error