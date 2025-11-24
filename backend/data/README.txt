Auto Dealer Mini Data Warehouse (Synthetic Sample)
=================================================

What this is
------------
A set of CSVs that mimic a US auto dealership's DMS + CRM core subject areas.
All data is 100% synthetic—safe to share, no real PII.

How it's organized (star-ish schema)
------------------------------------
Dimensions (lookups):
- dim_store, dim_employee, dim_lender, dim_vendor, dim_product, dim_oem_program,
  dim_customer, dim_vehicle, dim_date

Facts (events / measures):
- fact_leads, fact_bdc_interactions, fact_appointments, fact_showroom_visits,
  fact_deals, fact_finance_contracts, fact_fi_products, fact_trades_appraisals,
  fact_inventory_daily, fact_service_ros, fact_parts_tickets, fact_technician_time,
  fact_reviews_csi, fact_marketing_spend, fact_recon, fact_we_owe, fact_oem_progress,
  fact_floorplan

Start here
----------
- data_dictionary.csv documents every column, basic types, and key relationships.
- fact_* tables reference the dim_* tables via foreign keys, so you can practice joins.
- Dates are ISO 8601 timestamps; date_key is YYYYMMDD integer.

Example joins
-------------
- Deals with vehicles and customers:
  SELECT d.*, v.make, v.model, c.first_name, c.last_name
  FROM fact_deals d
  JOIN dim_vehicle v ON d.vehicle_id = v.vehicle_id
  JOIN dim_customer c ON d.customer_id = c.customer_id;

- CIT risk view:
  SELECT fc.*, d.deal_date, v.stock_no
  FROM fact_finance_contracts fc
  JOIN fact_deals d ON fc.deal_id = d.deal_id
  JOIN dim_vehicle v ON d.vehicle_id = v.vehicle_id
  WHERE fc.funding_status = 'In CIT';

- Price-to-market & VDP trend (inventory):
  SELECT i.*, v.year, v.make, v.model
  FROM fact_inventory_daily i
  JOIN dim_vehicle v ON i.vehicle_id = v.vehicle_id;

License
-------
Use freely for demos, tests, or internal training. No warranties.
