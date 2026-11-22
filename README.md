# SunPower Solutions — Solar Installation Management System

The operating system for a rooftop solar company: enquiry → survey → quote → order → serial-scanned
dispatch → signed installation → warranty and service → invoices, subsidy, payroll and director reporting.

## Run it

```bash
npm install
npm run dev
```

- App: http://localhost:5173
- API: http://localhost:8787
- Data: `data/db.json` (created and seeded on first run)

Production build:

```bash
npm run build   # typecheck + Vite build into dist/
npm start       # Express serves the API and dist/
```

Reset the demo week at any time with **Reset demo data** in the sidebar, or `npm run reset`.

## Who uses what

Use the **Viewing as** switch in the header to see each role's navigation.

| Role | Screens |
| --- | --- |
| Director | Dashboard, reports, everything |
| Sales team | Enquiries, surveys, quotes, orders |
| Warehouse | Dispatch queue, inventory and serials |
| Crew lead | Installations and service tickets |
| Support desk | Tickets, serial/warranty lookup, orders |

The public intake form is at `/enquire` (also linked from the sidebar footer).

## How the rules are enforced

- A quote cannot be generated until the site survey is **approved** (server-side check).
- An order cannot be confirmed without an **advance or full payment**.
- Every serial-tracked unit must be **scanned** before dispatch; a wrong serial is rejected.
- Warranty starts **automatically on dispatch** per product: 20 years panels, 2 years inverter/battery,
  controller and 5 years structure/wiring as catalogued.
- Resolving a ticket outside warranty **creates a service invoice** for parts, labour and the visit charge.
  In-warranty work records the cost the company absorbs instead.
- A ticket closes only after the **customer confirms** the repair.
- Installation sign-off requires at least one photo, a customer signature and crew hours; those hours
  become technician pay and the job's real labour cost.

## Packages

Bills of materials are generated from the catalogue for 1–5 kW:

- **On-Grid** — panels, inverter, MPPT controller, stands, DCDB/ACDB, DC & AC cable, MC4 connectors,
  earthing, lightning arrester, installation.
- **Off-Grid** — everything above plus 5.12 kWh lithium batteries sized to the system.
- **Solar Panel Set (hardware)** — panels, stands, connectors, cable and earthing only.

Subsidy follows PM Surya Ghar residential slabs (₹30k/₹60k/₹78k for 1/2/≥3 kW) and is tracked as a
separate file with its own document checklist.

## Demo data

21 enquiries across every pipeline stage, 14 orders (closed, installed, dispatched, awaiting dispatch),
7 service tickets (in and out of warranty, overdue and closed), 15 technicians, 10 subsidy files,
24 expenses and a full serial register. Dates are relative to the day the database is seeded, so
"today", "this week" and "this month" always have numbers.

## Stack

React 19 + React Router + Tailwind v4 (Vite) on the client, Express + a JSON document store on the
server. Shared domain types and the bill-of-materials engine live in `shared/`. No external services
or API keys are required.

## Logins

There are exactly two logins — SunPower staff and customer.

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Admin (staff) | `admin@sunpower.in` | `admin123` | `/` — the full operations console |
| Customer | `nagaraj.hegde@gmail.com` | `customer123` | `/portal` — shop and order tracking |

Three more seeded customer logins use the same password: `ramesh.iyer@outlook.com`, `suresh.gowda@gmail.com`, `anita.desai@gmail.com`.

A customer builds a cart from the packages and accessories in `/portal` and sends the order. It arrives in the admin **Orders → Requests** tab (and as a dashboard alert) with the status *Awaiting confirmation*. Staff confirm it with the advance received — that reserves serial numbers, raises the invoice, opens the subsidy file and schedules the installation crew.
