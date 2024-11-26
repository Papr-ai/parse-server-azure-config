const path = require('path');
const AzurePushAdapter = require('@shawkatkabbara/parse-server-azure-push');
const { AzureStorageAdapter } = require('@shawkatkabbara/parse-server-azure-storage');
const { FilesAdapter: DefaultFilesAdapter } = require('parse-server/lib/Adapters/Files/FilesAdapter');
const { PushAdapter: DefaultPushAdapter } = require('parse-server/lib/Adapters/Push/PushAdapter');
const util = require('util');

module.exports = (siteRoot, options) => {
  options = options || {};

  const pushConfig = {
    HubName: process.env.MS_NotificationHubName || (process.env.WEBSITE_SITE_NAME ? `${process.env.WEBSITE_SITE_NAME}-hub` : undefined),
    ConnectionString: process.env.CUSTOMCONNSTR_MS_NotificationHubConnectionString
  };

  const storageConfig = {
    name: process.env.STORAGE_NAME,
    container: process.env.STORAGE_CONTAINER || 'parse',
    accessKey: process.env.STORAGE_KEY,
    directAccess: true
  };

  const serverConfig = {
    appId: process.env.APP_ID || 'appId',
    masterKey: process.env.MASTER_KEY || 'masterKey',
    databaseURI: process.env.DATABASE_URI || 'mongodb://localhost:27017/dev',
    serverURL: `${process.env.SERVER_URL || 'http://localhost:1337'}/parse`,
    cloud: path.join(siteRoot, 'cloud', 'main.js'),
    filesAdapter: () => {
      if (validate(storageConfig, ['name', 'container', 'accessKey'])) {
        return new AzureStorageAdapter(
          storageConfig.name,
          storageConfig.container,
          {
            accessKey: storageConfig.accessKey,
            directAccess: storageConfig.directAccess
          }
        );
      } else {
        return new DefaultFilesAdapter();
      }
    },
    push: { 
      adapter: () => {
        if (validate(pushConfig, ['HubName', 'ConnectionString'])) {
          return new AzurePushAdapter({
            HubName: pushConfig.HubName,
            ConnectionString: pushConfig.ConnectionString
          });
        } else {
          return new DefaultPushAdapter();
        }
      }
    }
  };

  // Initialize dashboard users map
  const dashboardUsers = new Map();
  // It's better to avoid hardcoding users. Consider using environment variables or a secure method.
  // Here's an example of adding a single user. Modify as needed.
  dashboardUsers.set(serverConfig.appId, serverConfig.masterKey);

  const dashboardConfig = {
    apps: [
      {
        appId: serverConfig.appId,
        serverURL: serverConfig.serverURL,
        masterKey: serverConfig.masterKey,
        appName: process.env.WEBSITE_SITE_NAME || 'Parse Server Azure'
      }
    ],
    users: Array.from(dashboardUsers, ([user, pass]) => ({ user, pass }))
  };

  const apiConfig = {
    server: serverConfig,
    dashboard: dashboardConfig,
    push: pushConfig,
    storage: storageConfig
  };

  console.log('parse-server-azure-config generated the following configuration:');
  console.log(util.inspect(apiConfig, { showHidden: false, depth: 4 }));

  return apiConfig;

  /**
   * Validates that the required properties are present in the given config object.
   * @param {Object} config - The configuration object to validate.
   * @param {Array<String>} props - The list of required properties.
   * @returns {Boolean} - Returns true if all properties are present, else false.
   */
  function validate(config, props) {
    return props.every(prop => {
      if (!config[prop]) {
        console.log(`Missing required property '${prop}' in configuration`);
        return false;
      }
      return true;
    });
  }
};
