const useAppSettings = () => {
  const settings = {};
  settings['idurar_app_email'] = 'noreply@idurarapp.com';
  settings['idurar_base_url'] =
    (process.env.BIZORA_FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
  return settings;
};

module.exports = useAppSettings;
