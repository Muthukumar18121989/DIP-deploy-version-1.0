export interface ConnectorField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface ConnectorDef {
  key: string;
  label: string;
  category: string;
  fields: ConnectorField[];
}

export const SOURCE_CONNECTORS: ConnectorDef[] = [
  { key: "excel", label: "Upload Excel", category: "Files", fields: [{ key: "sheet_name", label: "Sheet name", placeholder: "Sheet1" }] },
  { key: "json", label: "JSON", category: "Files", fields: [{ key: "root_path", label: "Root path", placeholder: "$.data" }] },
  { key: "sql_database", label: "SQL Database", category: "Databases", fields: [
    { key: "host", label: "Host", placeholder: "db.company.internal" },
    { key: "database", label: "Database", placeholder: "analytics" },
    { key: "table", label: "Table", placeholder: "sales_transactions" },
  ]},
  { key: "snowflake", label: "Snowflake", category: "Warehouses", fields: [
    { key: "account", label: "Account identifier", placeholder: "xy12345.us-east-1" },
    { key: "warehouse", label: "Warehouse", placeholder: "COMPUTE_WH" },
    { key: "database", label: "Database", placeholder: "SALES_DB" },
  ]},
  { key: "bigquery", label: "BigQuery", category: "Warehouses", fields: [
    { key: "project_id", label: "Project ID", placeholder: "my-gcp-project" },
    { key: "dataset", label: "Dataset", placeholder: "sales_analytics" },
  ]},
  { key: "aws_s3", label: "AWS S3", category: "Cloud Storage", fields: [
    { key: "bucket", label: "Bucket", placeholder: "company-data-lake" },
    { key: "prefix", label: "Prefix", placeholder: "sales/2025/" },
  ]},
  { key: "azure_blob", label: "Azure Blob", category: "Cloud Storage", fields: [
    { key: "account_name", label: "Storage account", placeholder: "companydata" },
    { key: "container", label: "Container", placeholder: "sales-raw" },
  ]},
  { key: "google_drive", label: "Google Drive", category: "Cloud Storage", fields: [
    { key: "folder_id", label: "Folder ID", placeholder: "1AbCdEfGhIjKlMnOp" },
  ]},
  { key: "rest_api", label: "REST APIs", category: "APIs", fields: [
    { key: "base_url", label: "Base URL", placeholder: "https://api.company.com/v1" },
    { key: "auth_header", label: "Auth header", placeholder: "Bearer ..." },
  ]},
  { key: "streaming_api", label: "Streaming APIs", category: "APIs", fields: [
    { key: "endpoint", label: "Endpoint", placeholder: "wss://stream.company.com" },
  ]},
  { key: "sap", label: "SAP", category: "Enterprise", fields: [
    { key: "system_id", label: "System ID", placeholder: "PRD" },
    { key: "client", label: "Client", placeholder: "100" },
  ]},
  { key: "salesforce", label: "Salesforce", category: "Enterprise", fields: [
    { key: "instance_url", label: "Instance URL", placeholder: "https://company.my.salesforce.com" },
  ]},
  { key: "power_bi", label: "Power BI", category: "BI Tools", fields: [
    { key: "workspace_id", label: "Workspace ID", placeholder: "00000000-0000-0000-0000-000000000000" },
  ]},
  { key: "tableau", label: "Tableau", category: "BI Tools", fields: [
    { key: "server_url", label: "Server URL", placeholder: "https://tableau.company.com" },
    { key: "site", label: "Site", placeholder: "sales" },
  ]},
  { key: "microsoft_fabric", label: "Microsoft Fabric", category: "BI Tools", fields: [
    { key: "workspace_id", label: "Workspace ID", placeholder: "fabric-workspace-01" },
  ]},
  { key: "databricks", label: "Databricks", category: "Warehouses", fields: [
    { key: "workspace_url", label: "Workspace URL", placeholder: "https://company.cloud.databricks.com" },
    { key: "cluster_id", label: "Cluster ID", placeholder: "0521-112233-abcd123" },
  ]},
  { key: "kafka", label: "Kafka", category: "Streaming", fields: [
    { key: "bootstrap_servers", label: "Bootstrap servers", placeholder: "broker1:9092,broker2:9092" },
    { key: "topic", label: "Topic", placeholder: "sales.transactions" },
  ]},
  { key: "custom_api", label: "Custom APIs", category: "APIs", fields: [
    { key: "base_url", label: "Base URL", placeholder: "https://internal-api.company.com" },
  ]},
];

export const PUBLISH_CONNECTORS: ConnectorDef[] = [
  { key: "power_bi_publish", label: "Power BI", category: "BI Tools", fields: [{ key: "workspace_id", label: "Workspace ID" }] },
  { key: "slack", label: "Slack", category: "Messaging", fields: [{ key: "channel", label: "Channel", placeholder: "#exec-updates" }] },
  { key: "teams", label: "Microsoft Teams", category: "Messaging", fields: [{ key: "channel", label: "Channel", placeholder: "Leadership" }] },
  { key: "email", label: "Email", category: "Messaging", fields: [{ key: "recipients", label: "Recipients", placeholder: "exec-team@company.com" }] },
  { key: "webhook", label: "Webhook", category: "APIs", fields: [{ key: "url", label: "Webhook URL", placeholder: "https://hooks.company.com/..." }] },
  { key: "embedded_dashboard", label: "Embedded Dashboard", category: "BI Tools", fields: [{ key: "embed_domain", label: "Allowed domain", placeholder: "portal.company.com" }] },
];
