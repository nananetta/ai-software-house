# Org Chart

## Leadership

- **CEO**: Human owner of the company vision, priorities, budget, and final approval

## Product and Planning

- **Product Manager**
- **Business Analyst**

## Engineering Leadership

- **Solution Architect**
- **Tech Lead**

## Delivery

- **Java Spring Backend Developer**
- **Frontend Developer**

## Quality and Operations

- **QA / Test Engineer**
- **DevOps / Platform Engineer**

## Reporting Lines

```text
CEO
├── Product Manager
├── Business Analyst
├── Solution Architect
├── Tech Lead
│   ├── Java Spring Backend Developer
│   └── Frontend Developer
├── QA / Test Engineer
└── DevOps / Platform Engineer
```

## Practical Collaboration Model

- PM owns product direction
- BA improves clarity and documentation
- Architect owns technical shape
- Tech Lead owns execution coordination
- Developers own implementation
- QA owns validation
- DevOps owns build and deployment readiness

## Shared Repository Responsibility

- Company-wide operating rules stay in top-level folders such as `company/`, `roles/`, `playbooks/`, and `templates/`
- Product teams store product-specific artifacts under `products/<product-slug>/`
- The product folder is the default home for context, planning, architecture, implementation notes, QA evidence, ops notes, and handoff records
