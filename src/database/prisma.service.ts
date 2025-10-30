import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development' 
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'info' },
            { emit: 'event', level: 'warn' },
          ]
        : [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Log queries in development
    if (process.env.NODE_ENV === 'development') {
      this.$on('query' as never, (e: any) => {
        this.logger.debug(`Query: ${e.query}`);
        this.logger.debug(`Duration: ${e.duration}ms`);
      });
    }

    // Log errors
    this.$on('error' as never, (e: any) => {
      this.logger.error('Prisma Error:', e);
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('✅ Database connected successfully');
    } catch (error) {
      this.logger.error('❌ Failed to connect to database:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      await this.$disconnect();
      this.logger.log('👋 Database disconnected');
    } catch (error) {
      this.logger.error('❌ Error disconnecting from database:', error);
    }
  }

  /**
   * Kiểm tra và cleanup connections cho serverless
   * Gọi method này sau mỗi cron job
   */
  async cleanupConnections() {
    try {
      // Disconnect và reconnect để release connections
      await this.$disconnect();
      await this.$connect();
      this.logger.debug('🔄 Database connections cleaned up');
    } catch (error) {
      this.logger.error('❌ Error cleaning up connections:', error);
    }
  }

  /**
   * Kiểm tra số lượng connection hiện tại
   */
  async checkConnectionCount() {
    try {
      const result = await this.$queryRaw`
        SELECT 
          COUNT(*) as total_connections,
          SUM(CASE WHEN COMMAND != 'Sleep' THEN 1 ELSE 0 END) as active_connections,
          SUM(CASE WHEN COMMAND = 'Sleep' THEN 1 ELSE 0 END) as idle_connections
        FROM INFORMATION_SCHEMA.PROCESSLIST
        WHERE DB = DATABASE()
      ` as any[];

      const stats = result[0];
      this.logger.log(`📊 DB Connections - Total: ${stats.total_connections}, Active: ${stats.active_connections}, Idle: ${stats.idle_connections}`);
      
      // Cảnh báo nếu có quá nhiều connection
      if (stats.total_connections > 50) {
        this.logger.warn(`⚠️  Too many database connections: ${stats.total_connections}`);
      }

      return stats;
    } catch (error) {
      this.logger.error('❌ Error checking connection count:', error);
      return null;
    }
  }

  /**
   * Force close idle connections
   */
  async closeIdleConnections() {
    try {
      await this.$queryRaw`
        SELECT CONCAT('KILL ', id, ';') as kill_query
        FROM INFORMATION_SCHEMA.PROCESSLIST 
        WHERE COMMAND = 'Sleep' 
        AND TIME > 300 
        AND DB = DATABASE()
      `;
      this.logger.log('🧹 Closed idle connections');
    } catch (error) {
      this.logger.error('❌ Error closing idle connections:', error);
    }
  }
}
