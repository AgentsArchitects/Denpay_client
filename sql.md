-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE denpay-dev.bad_debts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  clinician_id uuid NOT NULL,
  pay_period character varying NOT NULL,
  original_invoice_id character varying NOT NULL,
  debt_amount numeric NOT NULL CHECK (debt_amount >= 0::numeric),
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  write_off_date date,
  status USER-DEFINED NOT NULL DEFAULT 'Draft'::"denpay-dev".approval_status,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bad_debts_pkey PRIMARY KEY (id),
  CONSTRAINT bad_debts_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id),
  CONSTRAINT bad_debts_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT bad_debts_created_by_fkey FOREIGN KEY (created_by) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.client_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  line1 character varying NOT NULL,
  line2 character varying,
  city character varying NOT NULL,
  county character varying,
  postcode character varying NOT NULL,
  country character varying NOT NULL DEFAULT 'United Kingdom'::character varying,
  CONSTRAINT client_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT client_addresses_client_id_fkey FOREIGN KEY (client_id) REFERENCES denpay-dev.clients(id)
);
CREATE TABLE denpay-dev.clients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  legal_trading_name character varying NOT NULL,
  workfin_reference character varying NOT NULL UNIQUE,
  contact_email character varying NOT NULL,
  contact_phone character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Active'::"denpay-dev".entity_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clients_pkey PRIMARY KEY (id)
);
CREATE TABLE denpay-dev.clinician_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinician_id uuid NOT NULL UNIQUE,
  line1 character varying NOT NULL,
  line2 character varying,
  city character varying NOT NULL,
  county character varying,
  postcode character varying NOT NULL,
  country character varying NOT NULL DEFAULT 'United Kingdom'::character varying,
  CONSTRAINT clinician_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT clinician_addresses_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id)
);
CREATE TABLE denpay-dev.clinician_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinician_id uuid NOT NULL,
  start_date date NOT NULL,
  end_date date,
  primary_practice_id uuid NOT NULL,
  hours_per_week numeric NOT NULL CHECK (hours_per_week > 0::numeric),
  notice_period character varying,
  holiday_entitlement integer,
  pension_scheme boolean NOT NULL DEFAULT false,
  additional_terms text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinician_contracts_pkey PRIMARY KEY (id),
  CONSTRAINT clinician_contracts_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT clinician_contracts_primary_practice_id_fkey FOREIGN KEY (primary_practice_id) REFERENCES denpay-dev.practices(id)
);
CREATE TABLE denpay-dev.clinician_other_details (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinician_id uuid NOT NULL UNIQUE,
  national_insurance_number character varying,
  bank_sort_code character varying,
  bank_account_number character varying,
  bank_account_name character varying,
  tax_reference character varying,
  emergency_contact_name character varying,
  emergency_contact_phone character varying,
  emergency_contact_relationship character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinician_other_details_pkey PRIMARY KEY (id),
  CONSTRAINT clinician_other_details_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id)
);
CREATE TABLE denpay-dev.clinician_practices (
  clinician_id uuid NOT NULL,
  practice_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinician_practices_pkey PRIMARY KEY (clinician_id, practice_id),
  CONSTRAINT clinician_practices_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT clinician_practices_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id)
);
CREATE TABLE denpay-dev.clinicians (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title USER-DEFINED NOT NULL,
  first_name character varying NOT NULL,
  last_name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone character varying,
  gender USER-DEFINED NOT NULL,
  nationality character varying NOT NULL,
  contractual_status USER-DEFINED NOT NULL,
  designation USER-DEFINED NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Active'::"denpay-dev".entity_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  reporting_manager character varying,
  pms_ref_no character varying,
  start_date date,
  end_date date,
  CONSTRAINT clinicians_pkey PRIMARY KEY (id)
);
CREATE TABLE denpay-dev.compass_dates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  month character varying NOT NULL UNIQUE,
  schedule_period character varying NOT NULL,
  adjustment_deadline date NOT NULL,
  processing_cutoff date NOT NULL,
  pay_statements_available date NOT NULL,
  pay_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT compass_dates_pkey PRIMARY KEY (id)
);
CREATE TABLE denpay-dev.contract_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  clinician_id uuid NOT NULL,
  clinician_reference_no character varying NOT NULL,
  pms_unique_ref_no character varying NOT NULL,
  joining_date date NOT NULL,
  date_of_leaving date,
  working_here_currently boolean DEFAULT true,
  worfin_dentist_pay_system character varying NOT NULL,
  supplier_system_lab_ref character varying,
  default_room character varying,
  number_of_days integer DEFAULT 4,
  contracted_hours numeric,
  working_days jsonb,
  minimum_contract_tenure integer,
  mandatory_contract_end_date date,
  course_fee numeric,
  course_fee_deduction numeric,
  welcome_bonus numeric,
  welcome_bonus_deduction numeric,
  visa_support numeric,
  visa_support_deduction numeric,
  date_withholding date,
  amount_withholding_fee numeric,
  first_release_month date,
  first_release_payment_amount numeric,
  second_release_month date,
  second_release_payment_amount numeric,
  third_release_month date,
  third_release_payment_amount numeric,
  clinician_ref_finance_system character varying,
  status character varying DEFAULT 'Active'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contract_definitions_pkey PRIMARY KEY (id),
  CONSTRAINT contract_definitions_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id),
  CONSTRAINT contract_definitions_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id)
);
CREATE TABLE denpay-dev.contract_secondary_practices (
  contract_id uuid NOT NULL,
  practice_id uuid NOT NULL,
  CONSTRAINT contract_secondary_practices_pkey PRIMARY KEY (contract_id, practice_id),
  CONSTRAINT contract_secondary_practices_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES denpay-dev.clinician_contracts(id),
  CONSTRAINT contract_secondary_practices_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id)
);
CREATE TABLE denpay-dev.contract_working_days (
  contract_id uuid NOT NULL,
  day USER-DEFINED NOT NULL,
  CONSTRAINT contract_working_days_pkey PRIMARY KEY (contract_id, day),
  CONSTRAINT contract_working_days_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES denpay-dev.clinician_contracts(id)
);
CREATE TABLE denpay-dev.cross_charges (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  pay_period character varying NOT NULL,
  treatment_end_period character varying,
  type USER-DEFINED NOT NULL,
  contract_id uuid,
  plan_provider character varying,
  from_clinician_id uuid NOT NULL,
  from_unit_type USER-DEFINED NOT NULL,
  from_number_of_units numeric NOT NULL CHECK (from_number_of_units > 0::numeric),
  to_clinician_id uuid NOT NULL,
  to_unit_type character varying NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0::numeric),
  status USER-DEFINED NOT NULL DEFAULT 'Draft'::"denpay-dev".approval_status,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT cross_charges_pkey PRIMARY KEY (id),
  CONSTRAINT cross_charges_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id),
  CONSTRAINT cross_charges_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES denpay-dev.nhs_contracts(id),
  CONSTRAINT cross_charges_from_clinician_id_fkey FOREIGN KEY (from_clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT cross_charges_to_clinician_id_fkey FOREIGN KEY (to_clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT cross_charges_created_by_fkey FOREIGN KEY (created_by) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.deduction_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinician_id uuid NOT NULL,
  practice_id uuid NOT NULL,
  deduction_type character varying NOT NULL,
  income_type character varying NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  payment_type USER-DEFINED NOT NULL,
  from_unit_type USER-DEFINED NOT NULL,
  from_number_of_units numeric CHECK (from_number_of_units IS NULL OR from_number_of_units > 0::numeric),
  rate numeric NOT NULL CHECK (rate >= 0::numeric),
  status USER-DEFINED NOT NULL DEFAULT 'Active'::"denpay-dev".entity_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT deduction_rates_pkey PRIMARY KEY (id),
  CONSTRAINT deduction_rates_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT deduction_rates_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id)
);
CREATE TABLE denpay-dev.gl_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  category USER-DEFINED NOT NULL,
  code character varying NOT NULL UNIQUE,
  description text,
  status USER-DEFINED NOT NULL DEFAULT 'Pending'::"denpay-dev".approval_status,
  effective_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT gl_codes_pkey PRIMARY KEY (id)
);
CREATE TABLE denpay-dev.income_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  clinician_id uuid NOT NULL,
  pay_period character varying NOT NULL,
  adjustment_type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  reason text NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Draft'::"denpay-dev".approval_status,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT income_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT income_adjustments_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id),
  CONSTRAINT income_adjustments_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT income_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.income_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinician_id uuid NOT NULL,
  practice_id uuid NOT NULL,
  income_type USER-DEFINED NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  nhs_contract_id uuid,
  payment_type USER-DEFINED NOT NULL,
  from_unit_type USER-DEFINED NOT NULL,
  from_number_of_units numeric CHECK (from_number_of_units IS NULL OR from_number_of_units > 0::numeric),
  to_unit_type character varying,
  rate numeric NOT NULL CHECK (rate >= 0::numeric),
  status USER-DEFINED NOT NULL DEFAULT 'Active'::"denpay-dev".entity_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT income_rates_pkey PRIMARY KEY (id),
  CONSTRAINT income_rates_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT income_rates_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id),
  CONSTRAINT income_rates_nhs_contract_id_fkey FOREIGN KEY (nhs_contract_id) REFERENCES denpay-dev.nhs_contracts(id)
);
CREATE TABLE denpay-dev.lab_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  clinician_id uuid NOT NULL,
  pay_period character varying NOT NULL,
  treatment_end_period character varying,
  lab_name character varying NOT NULL,
  lab_invoice_number character varying NOT NULL,
  lab_cost numeric NOT NULL CHECK (lab_cost >= 0::numeric),
  amount numeric NOT NULL CHECK (amount >= 0::numeric),
  status USER-DEFINED NOT NULL DEFAULT 'Draft'::"denpay-dev".approval_status,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT lab_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT lab_adjustments_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id),
  CONSTRAINT lab_adjustments_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT lab_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.miscellaneous_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  clinician_id uuid NOT NULL,
  pay_period character varying NOT NULL,
  category character varying NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Draft'::"denpay-dev".approval_status,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT miscellaneous_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT miscellaneous_adjustments_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id),
  CONSTRAINT miscellaneous_adjustments_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT miscellaneous_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.nhs_contracts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  contract_number character varying NOT NULL,
  start_date date NOT NULL,
  end_date date,
  status USER-DEFINED NOT NULL DEFAULT 'Active'::"denpay-dev".entity_status,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT nhs_contracts_pkey PRIMARY KEY (id),
  CONSTRAINT nhs_contracts_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id)
);
CREATE TABLE denpay-dev.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  title character varying NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  link character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.paysheet_approval_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paysheet_id uuid NOT NULL,
  action USER-DEFINED NOT NULL,
  performed_by uuid NOT NULL,
  performed_at timestamp with time zone NOT NULL DEFAULT now(),
  comment text,
  CONSTRAINT paysheet_approval_history_pkey PRIMARY KEY (id),
  CONSTRAINT paysheet_approval_history_paysheet_id_fkey FOREIGN KEY (paysheet_id) REFERENCES denpay-dev.paysheets(id),
  CONSTRAINT paysheet_approval_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.paysheet_line_items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paysheet_section_id uuid NOT NULL,
  description character varying NOT NULL,
  reference character varying,
  details text,
  type character varying NOT NULL,
  unit character varying NOT NULL,
  rate numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  is_subtotal boolean NOT NULL DEFAULT false,
  line_order integer NOT NULL,
  CONSTRAINT paysheet_line_items_pkey PRIMARY KEY (id),
  CONSTRAINT paysheet_line_items_paysheet_section_id_fkey FOREIGN KEY (paysheet_section_id) REFERENCES denpay-dev.paysheet_sections(id)
);
CREATE TABLE denpay-dev.paysheet_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  paysheet_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  subtotal numeric NOT NULL DEFAULT 0,
  section_order integer NOT NULL,
  CONSTRAINT paysheet_sections_pkey PRIMARY KEY (id),
  CONSTRAINT paysheet_sections_paysheet_id_fkey FOREIGN KEY (paysheet_id) REFERENCES denpay-dev.paysheets(id)
);
CREATE TABLE denpay-dev.paysheets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  practice_name character varying NOT NULL,
  clinician_id uuid NOT NULL,
  clinician_name character varying NOT NULL,
  pay_period character varying NOT NULL,
  net_pay numeric NOT NULL DEFAULT 0,
  status USER-DEFINED NOT NULL DEFAULT 'Draft'::"denpay-dev".paysheet_status,
  last_modified_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT paysheets_pkey PRIMARY KEY (id),
  CONSTRAINT paysheets_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id),
  CONSTRAINT paysheets_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT paysheets_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  resource character varying NOT NULL,
  action character varying NOT NULL,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT permissions_pkey PRIMARY KEY (id)
);
CREATE TABLE denpay-dev.practice_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL UNIQUE,
  line1 character varying NOT NULL,
  line2 character varying,
  city character varying NOT NULL,
  county character varying,
  postcode character varying NOT NULL,
  country character varying NOT NULL DEFAULT 'United Kingdom'::character varying,
  CONSTRAINT practice_addresses_pkey PRIMARY KEY (id),
  CONSTRAINT practice_addresses_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id)
);
CREATE TABLE denpay-dev.practice_users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL,
  email character varying NOT NULL,
  practice_ids ARRAY DEFAULT '{}'::text[],
  roles ARRAY DEFAULT '{}'::text[],
  status character varying DEFAULT 'Active'::character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT practice_users_pkey PRIMARY KEY (id)
);
CREATE TABLE denpay-dev.practices (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  name character varying NOT NULL,
  location_id character varying NOT NULL,
  acquisition_date date NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Active'::"denpay-dev".entity_status,
  integration_id character varying NOT NULL,
  external_system_id character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT practices_pkey PRIMARY KEY (id),
  CONSTRAINT practices_client_id_fkey FOREIGN KEY (client_id) REFERENCES denpay-dev.clients(id)
);
CREATE TABLE denpay-dev.recent_activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  type USER-DEFINED NOT NULL,
  description text NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  actor_name character varying NOT NULL,
  practice_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT recent_activities_pkey PRIMARY KEY (id),
  CONSTRAINT recent_activities_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id)
);
CREATE TABLE denpay-dev.role_permissions (
  role_id uuid NOT NULL,
  permission_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT role_permissions_pkey PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_id_fkey FOREIGN KEY (role_id) REFERENCES denpay-dev.roles(id),
  CONSTRAINT role_permissions_permission_id_fkey FOREIGN KEY (permission_id) REFERENCES denpay-dev.permissions(id)
);
CREATE TABLE denpay-dev.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name character varying NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT roles_pkey PRIMARY KEY (id)
);
CREATE TABLE denpay-dev.session_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  practice_id uuid NOT NULL,
  clinician_id uuid NOT NULL,
  pay_period character varying NOT NULL,
  session_date date NOT NULL,
  adjustment_type USER-DEFINED NOT NULL,
  amount numeric NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Draft'::"denpay-dev".approval_status,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT session_adjustments_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id),
  CONSTRAINT session_adjustments_clinician_id_fkey FOREIGN KEY (clinician_id) REFERENCES denpay-dev.clinicians(id),
  CONSTRAINT session_adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.synapse_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL UNIQUE,
  tenant_id character varying NOT NULL,
  workspace_name character varying NOT NULL,
  sql_endpoint character varying NOT NULL,
  connection_status USER-DEFINED NOT NULL DEFAULT 'Disconnected'::"denpay-dev".connection_status,
  last_sync_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT synapse_configs_pkey PRIMARY KEY (id),
  CONSTRAINT synapse_configs_client_id_fkey FOREIGN KEY (client_id) REFERENCES denpay-dev.clients(id)
);
CREATE TABLE denpay-dev.sync_jobs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  endpoint character varying NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'Pending'::"denpay-dev".sync_job_status,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  records_processed integer NOT NULL DEFAULT 0,
  duration integer,
  error_message text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT sync_jobs_pkey PRIMARY KEY (id),
  CONSTRAINT sync_jobs_client_id_fkey FOREIGN KEY (client_id) REFERENCES denpay-dev.clients(id)
);
CREATE TABLE denpay-dev.user_practices (
  user_id uuid NOT NULL,
  practice_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_practices_pkey PRIMARY KEY (user_id, practice_id),
  CONSTRAINT user_practices_user_id_fkey FOREIGN KEY (user_id) REFERENCES denpay-dev.users(id),
  CONSTRAINT user_practices_practice_id_fkey FOREIGN KEY (practice_id) REFERENCES denpay-dev.practices(id)
);
CREATE TABLE denpay-dev.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES denpay-dev.users(id)
);
CREATE TABLE denpay-dev.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email character varying NOT NULL UNIQUE,
  name character varying NOT NULL,
  avatar character varying,
  client_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_client_id_fkey FOREIGN KEY (client_id) REFERENCES denpay-dev.clients(id)
);