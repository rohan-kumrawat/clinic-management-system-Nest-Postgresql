export const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export const isDevelopment = (): boolean => {
  return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
};

export const getDatabaseConfig = (): string => {
  // ✅ Check for Render.com production database indicators
  const isRenderProductionDB = (
    process.env.DB_HOST && 
    (process.env.DB_HOST.includes('render.com') || 
     process.env.DB_HOST.includes('dpg-')) // Render.com database host pattern
  );
  
  const hasProductionDB = process.env.DATABASE_URL || isRenderProductionDB;
  
  if (isProduction() && hasProductionDB) {
    return 'Using production database (Render.com)';
  } else if (isProduction()) {
    return 'Production environment but using local database configuration';
  } else {
    return 'Using local development database';
  }
};