# WorkFin – Power BI Embedded RLS Guide  
**Stack:** Python backend + Postgres + Power BI Embedded  

---

## Core concept
Power BI does not know our users.

Our backend decides what a user can see and tells Power BI which dataset role they have.

RLS lives inside the Power BI dataset.  
Our app maps:

User → Reporting Group → Power BI Role

When generating the embed token we pass:
- user email  
- role names  

Power BI then filters the data.

---

## Mental model

User opens report  
→ backend identifies user  
→ backend resolves roles  
→ backend generates embed token  
→ token includes email + roles  
→ Power BI applies RLS  
→ report renders filtered data  

---

## Architecture flow

1. Frontend requests embed config  
2. Backend looks up user  
3. Backend finds reporting groups  
4. Backend maps groups → dataset roles  
5. Backend generates embed token  
6. Token returned to frontend  
7. Report loads with RLS applied  

---

## tables (conceptual)

### users
- id  
- email  

### reporting_groups
- id  
- name  

### user_reporting_groups
- user_id  
- reporting_group_id  

### powerbi_role_mappings
Maps reporting groups → dataset roles

- id  
- dataset_id  
- reporting_group_id  
- role_name  

Example:
- dataset_id: sales_dataset  
- reporting_group_id: 2  
- role_name: Tenant_User  

---

## Runtime queries (conceptual)

Get user reporting groups:

SELECT reporting_group_id  
FROM user_reporting_groups  
WHERE user_id = $1;

Resolve Power BI roles:

SELECT role_name  
FROM powerbi_role_mappings  
WHERE reporting_group_id = ANY($1)  
AND dataset_id = $2;

Result example:

["Tenant_User"]

---

## Embed token generation

When generating the embed token we send:

- username = user email  
- roles = dataset roles  
- datasetId  

Power BI then applies RLS for that role.

---

## Python example (conceptual)

def get_embed_config(user_id, report_id):
    user = get_user(user_id)
    dataset_id = get_dataset_for_report(report_id)

    groups = get_user_reporting_groups(user_id)
    roles = get_roles_for_groups(groups, dataset_id)

    token = generate_embed_token(
        dataset_id=dataset_id,
        report_id=report_id,
        username=user["email"],
        roles=roles
    )

    return token

---

## Effective identity payload

{
  "identities": [
    {
      "username": "user@email.com",
      "roles": ["Tenant_User"],
      "datasets": ["dataset_id"]
    }
  ]
}

This tells Power BI which RLS role to apply.

---

## Recommended SaaS RLS design

Do not hardcode emails in dataset.

Use tenant/practice ID.

Dataset column:
- TenantId

RLS filter:
TenantId = CUSTOMDATA()

Embed token sends:
customData = tenant_id

This is the cleanest SaaS approach.

---

## Common mistakes

Role name mismatch  
Must match dataset exactly.

No roles passed  
User may see wrong data.

Mapping table out of sync  
Update if dataset roles change.

RLS is dataset-level  
Not report-level.

---

## One sentence summary

Backend determines user roles, sends them in the embed token, and Power BI enforces RLS.

---

## Implementation checklist

- Create mapping tables in Postgres  
- Build role resolution query  
- Implement embed token service  
- Pass email + roles in identity  
- Test multiple users  
- Validate filtering  

---
