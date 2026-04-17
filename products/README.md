# Products Directory

All product builds must live under `products/`.

## Naming Rule

Create one folder per product using lowercase kebab-case:

```text
products/<product-slug>/
```

Example:

```text
products/product-a-is-the-best/
```

## Standard Product Folder Structure

Recommended structure for each product:

```text
products/<product-slug>/
├── README.md
├── context/
├── planning/
├── architecture/
├── implementation/
├── qa/
├── ops/
└── handoffs/
```

## Intent of Each Folder

- `README.md`: product summary, goals, and current status
- `context/`: source context, research, business notes, and references
- `planning/`: scope, user stories, requirements, acceptance criteria
- `architecture/`: solution design, diagrams, API and data decisions
- `implementation/`: build notes, technical tasks, and product-specific code references
- `qa/`: test plans, defects, validation notes, release checks
- `ops/`: deployment notes, environment setup, build and release material
- `handoffs/`: role-to-role outputs stored as markdown records

## Rule

Do not place product-specific files at the repo root when they belong to a single product. Put them inside that product's folder.
