# MCP server to deploy code to Google Cloud Run

Enable MCP-compatible AI agents to deploy apps to Cloud Run.

```json
"mcpServers":{
  "cloud-run": {
    "command": "npx",
    "args": ["-y", "https://github.com/GoogleCloudPlatform/cloud-run-mcp"]
  }
}
```

Deploy from AI-powered IDEs:

<img src="https://github.com/user-attachments/assets/9fdcec30-2b38-4362-9eb1-54cab09e99d4" width="800">

Deploy from AI assistant apps: 

<img src="https://github.com/user-attachments/assets/b10f0335-b332-4640-af38-ea015b46b57c" width="800">

Deploy from agent SDKs, like the [Google Gen AI SDK](https://ai.google.dev/gemini-api/docs/function-calling?example=meeting#use_model_context_protocol_mcp) or [Agent Development Kit](https://google.github.io/adk-docs/tools/mcp-tools/). 

> [!NOTE]  
> This is the repository of an MCP server to deploy code to Cloud Run, to learn how to **host** MCP servers on Cloud Run, [visit the Cloud Run documentation](https://cloud.google.com/run/docs/host-mcp-servers).

## Tools

- `deploy-file-contents`: Deploys files to Cloud Run by providing their contents directly.
- `list-services`: Lists Cloud Run services in a given project and region.
- `get-service`: Gets details for a specific Cloud Run service.
- `get-service-log`: Gets Logs and Error Messages for a specific Cloud Run service.
- `get-logs`: Gets logs from Google Cloud Logging using custom filters. Similar to the Logs Explorer in Google Cloud Console. Allows querying logs across all services and resources, not limited to Cloud Run.
- `get-log-resource-types`: Gets available resource types for Google Cloud Logging filters. Useful for understanding what resources you can filter logs by.
- `deploy-local-files`*: Deploys files from the local file system to a Google Cloud Run service.
- `deploy-local-folder`*: Deploys a local folder to a Google Cloud Run service.
- `list-projects`*: Lists available GCP projects.
- `create-project`*: Creates a new GCP project and attach it to the first available billing account. A project ID can be optionally specified.

_\* only available when running locally_

### Generic Logs Tool (`get-logs`)

The `get-logs` tool provides powerful log querying capabilities similar to the Google Cloud Logs Explorer. Unlike `get-service-log` which is limited to Cloud Run services, this tool can query logs from any Google Cloud resource.

**Key Features:**
- Query logs across all GCP resources (Cloud Run, Compute Engine, Kubernetes, Cloud Functions, etc.)
- Custom filter queries using Cloud Logging filter syntax
- Time range filtering (e.g., '1h', '24h', '7d', '30m')
- Severity level filtering (DEFAULT, INFO, WARNING, ERROR, CRITICAL)
- Multiple output formats (text, json, table)
- Pagination support for large result sets
- Resource type filtering

**Example Usage:**
- Get all error logs from the last hour: `severity=ERROR, timeRange=1h`
- Get Cloud Run logs: `resourceType=cloud_run_revision, timeRange=24h`
- Custom filter: `filter=resource.type="gce_instance" AND severity>=WARNING`
- Get logs in table format: `format=table, limit=50`

**Supported Resource Types:**
- `cloud_run_revision` - Cloud Run services
- `gce_instance` - Compute Engine instances
- `k8s_container` - Kubernetes containers
- `cloud_function` - Cloud Functions
- `gae_app` - App Engine applications
- `cloud_sql_database` - Cloud SQL databases
- `gcs_bucket` - Cloud Storage buckets
- `pubsub_topic` - Pub/Sub topics
- And many more...

Use `get-log-resource-types` to see all available resource types for your project.

## Use as local MCP server

Run the Cloud Run MCP server on your local machine using local Google Cloud credentials. This is best if you are using an AI-assisted IDE (e.g. Cursor) or a desktop AI application (e.g. Claude).

0. Install [Node.js](https://nodejs.org/en/download/) (LTS version recommended).

1. Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and authenticate with your Google account.

2. Log in to your Google Cloud account using the command:
   ```bash
   gcloud auth login
   ```

3. Set up application credentials using the command:
   ```bash
   gcloud auth application-default login
   ```
4. Update the MCP configuration file of your MCP client with the following:

   ```json 
      "cloud-run": {
        "command": "npx",
        "args": ["-y", "https://github.com/GoogleCloudPlatform/cloud-run-mcp"]
      }
   ```

## Tool Filtering

You can control which tools are available by using the `--enabled-tools` or `--disabled-tools` arguments:

### Enable only specific tools:
```json
"cloud-run": {
  "command": "npx",
  "args": [
    "-y", 
    "https://github.com/GoogleCloudPlatform/cloud-run-mcp",
    "--enabled-tools=deploy_file_contents,list_services"
  ]
}
```

### Disable specific tools:
```json
"cloud-run": {
  "command": "npx",
  "args": [
    "-y",
    "https://github.com/GoogleCloudPlatform/cloud-run-mcp", 
    "--disabled-tools=create_project,list_projects"
  ]
}
```

**Available tool names:**
- Local mode: `list_projects`, `create_project`, `list_services`, `get_service`, `get_service_log`, `get_logs`, `get_log_resource_types`, `deploy_local_files`, `deploy_local_folder`, `deploy_file_contents`
- Remote mode: `list_services`, `get_service`, `get_service_log`, `get_logs`, `get_log_resource_types`, `deploy_file_contents`

**Note:** You cannot specify both `--enabled-tools` and `--disabled-tools` at the same time.
5. [Optional] Add default configurations

   ```json 
      "cloud-run": {
         "command": "npx",
         "args": ["-y", "https://github.com/GoogleCloudPlatform/cloud-run-mcp"],
         "env": {
               "GOOGLE_CLOUD_PROJECT": "PROJECT_NAME",
               "GOOGLE_CLOUD_REGION": "PROJECT_REGION",
               "DEFAULT_SERVICE_NAME": "SERVICE_NAME",
               "SKIP_IAM_CHECK": "false"
         }
      }
   ```

## Use as remote MCP server

> [!WARNING]  
> Do not use the remote MCP server without authentication. In the following instructions, we will use IAM authentication to secure the connection to the MCP server from your local machine. This is important to prevent unauthorized access to your Google Cloud resources.

Run the Cloud Run MCP server itself on Cloud Run with connection from your local machine authenticated via IAM.
With this option, you will only be able to deploy code to the same Google Cloud project as where the MCP server is running.

1. Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) and authenticate with your Google account.

2. Log in to your Google Cloud account using the command:
   ```bash
   gcloud auth login
   ```

3. Set your Google Cloud project ID using the command:
   ```bash
   gcloud config set project YOUR_PROJECT_ID
   ```
4. Deploy the Cloud Run MCP server to Cloud Run:
   ```bash
   gcloud run deploy cloud-run-mcp --image us-docker.pkg.dev/cloudrun/container/mcp --no-allow-unauthenticated
   ```
   When prompted, pick a region, for example `europe-west1`.

   Note that the MCP server is *not* publicly accessible, it requires authentication via IAM.

5. [Optional] Add default configurations

   ```bash 
   gcloud run services update cloud-run-mcp --region=REGION --update-env-vars GOOGLE_CLOUD_PROJECT=PROJECT_NAME,GOOGLE_CLOUD_REGION=PROJECT_REGION,DEFAULT_SERVICE_NAME=SERVICE_NAME,SKIP_IAM_CHECK=false
   ```

6. Run a Cloud Run proxy on your local machine to connect securely using your identity to the remote MCP server running on Cloud Run:
   ```bash
   gcloud run services proxy cloud-run-mcp --port=3000 --region=REGION --project=PROJECT_ID
   ```
   This will create a local proxy on port 3000 that forwards requests to the remote MCP server and injects your identity.

7. Update the MCP configuration file of your MCP client with the following:

   ```json 
      "cloud-run": {
        "url": "http://localhost:3000/sse"
      }

   ```
   If your MCP client does not support the `url` attribute, you can use [mcp-remote](https://www.npmjs.com/package/mcp-remote):

   ```json 
      "cloud-run": {
        "command": "npx",
        "args": ["-y", "mcp-remote", "http://localhost:3000/sse"]
      }
   ```
