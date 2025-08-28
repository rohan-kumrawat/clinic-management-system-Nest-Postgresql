export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
};

export const getDatabaseConfig = (): string => {
  if (isProduction() && process.env.DATABASE_URL) {
    return 'Using production database (Render.com)';
  } else {
    return 'Using local development database';
  }
};