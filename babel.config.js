module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module:react-native-dotenv',
        {
          moduleName: '@env',
          path: '.env',
          safe: true,
          allowUndefined: false,
          envName: 'APP_ENV',
        },
      ],
      'react-native-worklets/plugin',
    ],
  };
};