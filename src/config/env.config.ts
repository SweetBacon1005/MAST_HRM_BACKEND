export const envConfig = {
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-super-secret-refresh-jwt-key-here',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  app: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  faceIdentificationUrl: {
    url: process.env.FACE_IDENTIFICATION_URL || 'http://localhost:4000',
  },
  workTime: {
    startMorningWorkTime: process.env.START_MORNING_WORK_TIME || '8:30',
    endMorningWorkTime: process.env.END_MORNING_WORK_TIME || '12:00',
    startAfternoonWorkTime: process.env.START_AFTERNOON_WORK_TIME || '13:00',
    endAfternoonWorkTime: process.env.END_AFTERNOON_WORK_TIME || '17:30',
  },
};
