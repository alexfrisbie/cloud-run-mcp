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

/**
 * Tools available in local/stdio mode
 */
export const LOCAL_TOOLS = [
  'list_projects',
  'create_project', 
  'list_services',
  'get_service',
  'get_service_log',
  'deploy_local_files',
  'deploy_local_folder', 
  'deploy_file_contents'
];

/**
 * Tools available in remote/GCP mode
 */
export const REMOTE_TOOLS = [
  'list_services',
  'get_service', 
  'get_service_log',
  'deploy_file_contents'
];

/**
 * Validate tool names and create a filter function
 * @param {string[]|null} enabledTools - List of tools to enable (null means all)
 * @param {string[]|null} disabledTools - List of tools to disable (null means none)
 * @param {boolean} isRemote - Whether running in remote mode
 * @returns {Function} Filter function that takes a tool name and returns boolean
 */
export function createToolFilter(enabledTools, disabledTools, isRemote = false) {
  const availableTools = isRemote ? REMOTE_TOOLS : LOCAL_TOOLS;
  
  // Validate enabled tools
  if (enabledTools && enabledTools.length > 0) {
    const invalidEnabled = enabledTools.filter(tool => !availableTools.includes(tool));
    if (invalidEnabled.length > 0) {
      const mode = isRemote ? 'remote' : 'local';
      throw new Error(
        `Invalid tool names in --enabled-tools: ${invalidEnabled.join(', ')}. ` +
        `Available tools in ${mode} mode: ${availableTools.join(', ')}`
      );
    }
  }
  
  // Validate disabled tools
  if (disabledTools && disabledTools.length > 0) {
    const invalidDisabled = disabledTools.filter(tool => !availableTools.includes(tool));
    if (invalidDisabled.length > 0) {
      const mode = isRemote ? 'remote' : 'local';
      throw new Error(
        `Invalid tool names in --disabled-tools: ${invalidDisabled.join(', ')}. ` +
        `Available tools in ${mode} mode: ${availableTools.join(', ')}`
      );
    }
  }
  
  // Return filter function
  return function shouldRegisterTool(toolName) {
    // If enabled tools are specified, only register those
    if (enabledTools && enabledTools.length > 0) {
      return enabledTools.includes(toolName);
    }
    
    // If disabled tools are specified, register all except those
    if (disabledTools && disabledTools.length > 0) {
      return !disabledTools.includes(toolName);
    }
    
    // Default: register all tools
    return true;
  };
}

/**
 * Get a human-readable list of available tools for error messages
 * @param {boolean} isRemote - Whether running in remote mode
 * @returns {string} Formatted list of available tools
 */
export function getAvailableToolsList(isRemote = false) {
  const tools = isRemote ? REMOTE_TOOLS : LOCAL_TOOLS;
  const mode = isRemote ? 'remote' : 'local';
  return `Available tools in ${mode} mode: ${tools.join(', ')}`;
}