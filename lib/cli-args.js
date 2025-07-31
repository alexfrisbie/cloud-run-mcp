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

import minimist from 'minimist';

/**
 * Parse CLI arguments for tool filtering
 * @returns {Object} Configuration object with enabledTools and disabledTools arrays
 */
export function parseCliArgs() {
  const args = minimist(process.argv.slice(2), {
    string: ['enabled-tools', 'disabled-tools'],
    alias: {
      'enabled-tools': ['enabled_tools'],
      'disabled-tools': ['disabled_tools']
    }
  });
  
  // Parse comma-separated tool lists
  const enabledTools = args['enabled-tools'] 
    ? args['enabled-tools'].split(',').map(t => t.trim()).filter(t => t.length > 0)
    : null;
    
  const disabledTools = args['disabled-tools']
    ? args['disabled-tools'].split(',').map(t => t.trim()).filter(t => t.length > 0)
    : null;
    
  // Validate that both enabled and disabled tools are not specified
  if (enabledTools && enabledTools.length > 0 && disabledTools && disabledTools.length > 0) {
    throw new Error('Cannot specify both --enabled-tools and --disabled-tools. Please use only one.');
  }
    
  return { enabledTools, disabledTools };
}