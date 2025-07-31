/*
Copyright 2025 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import protofiles from 'google-proto-files';

let loggingClient;

/**
 * Fetches logs from Google Cloud Logging using a custom filter.
 * This is a generic logs tool similar to the Logs Explorer in Google Cloud Console.
 * 
 * @param {string} projectId - The Google Cloud project ID.
 * @param {object} options - Query options
 * @param {string} [options.filter] - Cloud Logging filter query
 * @param {string} [options.resourceType] - Resource type filter (e.g., 'cloud_run_revision', 'gce_instance', 'k8s_container')
 * @param {string} [options.severity] - Minimum log severity (DEFAULT, INFO, WARNING, ERROR, CRITICAL)
 * @param {string} [options.timeRange] - Time range for logs (e.g., '1h', '24h', '7d')
 * @param {number} [options.limit] - Maximum number of log entries to return (default: 100, max: 1000)
 * @param {string} [options.orderBy] - Sort order ('timestamp desc' or 'timestamp asc')
 * @param {string} [options.pageToken] - Token for pagination
 * @returns {Promise<{logs: Array<object>, nextPageToken?: string, totalCount: number}>}
 */
export async function getLogs(projectId, options = {}) {
  if (!loggingClient) {
    const { Logging } = await import('@google-cloud/logging');
    loggingClient = new Logging({ projectId });
  }

  try {
    const {
      filter,
      resourceType,
      severity = 'DEFAULT',
      timeRange,
      limit = 100,
      orderBy = 'timestamp desc',
      pageToken
    } = options;

    // Build the filter query
    let filterQuery = '';
    const filterParts = [];

    // Add custom filter if provided
    if (filter) {
      filterParts.push(`(${filter})`);
    }

    // Add resource type filter
    if (resourceType) {
      filterParts.push(`resource.type="${resourceType}"`);
    }

    // Add severity filter
    if (severity && severity !== 'DEFAULT') {
      filterParts.push(`severity>=${severity}`);
    }

    // Add time range filter
    if (timeRange) {
      const timeFilter = buildTimeRangeFilter(timeRange);
      if (timeFilter) {
        filterParts.push(timeFilter);
      }
    }

    filterQuery = filterParts.join(' AND ');

    console.log(`Fetching logs for project ${projectId} with filter: ${filterQuery}`);

    // Prepare request options
    const requestOptions = {
      filter: filterQuery,
      orderBy: orderBy,
      pageSize: Math.min(limit, 1000), // Cap at 1000 as per API limits
    };

    if (pageToken) {
      requestOptions.pageToken = pageToken;
      // When using pageToken, we need to use the same filter and orderBy as the original request
      // The pageToken is tied to the specific query parameters
    }

    // Fetch logs
    const [entries, nextRequestOptions, apiResponse] = await loggingClient.getEntries(requestOptions);

    // Format log entries
    const formattedLogs = entries.map(entry => formatLogEntry(entry));

    return {
      logs: formattedLogs,
      nextPageToken: apiResponse?.nextPageToken,
      totalCount: entries.length,
      query: filterQuery
    };

  } catch (error) {
    console.error(`Error fetching logs for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Gets available resource types for logging filters.
 * @param {string} projectId - The Google Cloud project ID.
 * @returns {Promise<Array<string>>} - Array of available resource types
 */
export async function getResourceTypes(projectId) {
  if (!loggingClient) {
    const { Logging } = await import('@google-cloud/logging');
    loggingClient = new Logging({ projectId });
  }

  try {
    // Common GCP resource types for logging
    const commonResourceTypes = [
      'cloud_run_revision',
      'gce_instance',
      'k8s_container',
      'k8s_cluster',
      'k8s_node',
      'k8s_pod',
      'gae_app',
      'cloud_function',
      'cloud_sql_database',
      'gcs_bucket',
      'pubsub_topic',
      'pubsub_subscription',
      'bigquery_resource',
      'dataflow_job',
      'compute_network',
      'global',
      'project'
    ];

    return commonResourceTypes;
  } catch (error) {
    console.error(`Error getting resource types for project ${projectId}:`, error);
    throw error;
  }
}

/**
 * Builds a time range filter for the logs query.
 * @param {string} timeRange - Time range string (e.g., '1h', '24h', '7d')
 * @returns {string} - Time filter string for the logs query
 */
function buildTimeRangeFilter(timeRange) {
  const now = new Date();
  let startTime;

  // Parse time range
  const match = timeRange.match(/^(\d+)([hmd])$/);
  if (!match) {
    console.warn(`Invalid time range format: ${timeRange}. Expected format: '1h', '24h', '7d'`);
    return null;
  }

  const [, amount, unit] = match;
  const value = parseInt(amount);

  switch (unit) {
    case 'h': // hours
      startTime = new Date(now.getTime() - (value * 60 * 60 * 1000));
      break;
    case 'd': // days
      startTime = new Date(now.getTime() - (value * 24 * 60 * 60 * 1000));
      break;
    case 'm': // minutes
      startTime = new Date(now.getTime() - (value * 60 * 1000));
      break;
    default:
      console.warn(`Unsupported time unit: ${unit}`);
      return null;
  }

  return `timestamp>="${startTime.toISOString()}"`;
}

/**
 * Formats a single log entry for display.
 * @param {object} entry - A log entry object from the Cloud Logging API.
 * @returns {object} - A formatted log entry object.
 */
function formatLogEntry(entry) {
  const timestamp = entry.metadata.timestamp ? entry.metadata.timestamp.toISOString() : 'N/A';
  const severity = entry.metadata.severity || 'DEFAULT';
  const resource = entry.metadata.resource || {};
  const resourceType = resource.type || 'unknown';
  const resourceLabels = resource.labels || {};

  // Extract HTTP request information if available
  let httpRequest = null;
  if (entry.metadata.httpRequest) {
    const req = entry.metadata.httpRequest;
    httpRequest = {
      method: req.requestMethod,
      url: req.requestUrl,
      status: req.status,
      responseSize: req.responseSize,
      userAgent: req.userAgent,
      remoteIp: req.remoteIp
    };
  }

  // Extract log data
  let logData = '';
  let structuredData = null;

  if (entry.data && entry.data.value) {
    // Handle protobuf data (like audit logs)
    try {
      const protopath = protofiles.getProtoPath('../google/cloud/audit/audit_log.proto');
      const root = protofiles.loadSync(protopath);
      const type = root.lookupType('google.cloud.audit.AuditLog');
      const value = type.decode(entry.data.value);
      logData = `${value.methodName}: ${value.status?.message || ''}${value.authenticationInfo?.principalEmail || ''}`;
      structuredData = value;
    } catch (error) {
      logData = '[Binary/Protobuf data]';
    }
  } else if (typeof entry.data === 'object') {
    // Handle structured JSON data
    structuredData = entry.data;
    logData = JSON.stringify(entry.data, null, 2);
  } else if (entry.data) {
    // Handle plain text data
    logData = entry.data.toString();
  }

  // Extract labels
  const labels = entry.metadata.labels || {};

  return {
    timestamp,
    severity,
    resourceType,
    resourceLabels,
    httpRequest,
    logData,
    structuredData,
    labels,
    insertId: entry.metadata.insertId,
    logName: entry.metadata.logName
  };
}

/**
 * Formats log entries for text display.
 * @param {Array<object>} logEntries - Array of formatted log entries
 * @param {string} [format='text'] - Output format ('text', 'json', 'table')
 * @returns {string} - Formatted string representation
 */
export function formatLogsForDisplay(logEntries, format = 'text') {
  if (!logEntries || logEntries.length === 0) {
    return 'No logs found.';
  }

  switch (format) {
    case 'json':
      return JSON.stringify(logEntries, null, 2);
    
    case 'table':
      return formatLogsAsTable(logEntries);
    
    case 'text':
    default:
      return logEntries.map(entry => {
        const resourceInfo = entry.resourceType === 'unknown' ? '' : ` [${entry.resourceType}]`;
        const httpInfo = entry.httpRequest ? 
          ` ${entry.httpRequest.method} ${entry.httpRequest.status} ${entry.httpRequest.url}` : '';
        
        return `[${entry.timestamp}] [${entry.severity}]${resourceInfo}${httpInfo} ${entry.logData}`;
      }).join('\n');
  }
}

/**
 * Formats log entries as a table.
 * @param {Array<object>} logEntries - Array of formatted log entries
 * @returns {string} - Table formatted string
 */
function formatLogsAsTable(logEntries) {
  if (logEntries.length === 0) return 'No logs found.';

  const headers = ['Timestamp', 'Severity', 'Resource', 'Message'];
  const rows = logEntries.map(entry => [
    entry.timestamp.substring(0, 19), // Truncate timestamp
    entry.severity,
    entry.resourceType,
    entry.logData.substring(0, 100) + (entry.logData.length > 100 ? '...' : '') // Truncate message
  ]);

  // Calculate column widths
  const colWidths = headers.map((header, i) => 
    Math.max(header.length, ...rows.map(row => row[i].length))
  );

  // Format header
  const headerRow = headers.map((header, i) => header.padEnd(colWidths[i])).join(' | ');
  const separator = colWidths.map(width => '-'.repeat(width)).join('-+-');

  // Format rows
  const dataRows = rows.map(row => 
    row.map((cell, i) => cell.padEnd(colWidths[i])).join(' | ')
  );

  return [headerRow, separator, ...dataRows].join('\n');
}