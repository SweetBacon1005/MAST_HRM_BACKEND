const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Database configuration from environment
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || '3306';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'mast_hrm';

async function importTestData() {
  console.log('📥 Importing SQL test data...');
  console.log('⚡ This is much faster than TypeScript seeding!\n');

  const sqlFile = path.join(__dirname, 'test-data-complete.sql');
  
  // Check if SQL file exists
  if (!fs.existsSync(sqlFile)) {
    console.error('❌ SQL file not found!');
    console.log('💡 Run: node test-data-generator.js first');
    process.exit(1);
  }

  const fileSize = (fs.statSync(sqlFile).size / 1024 / 1024).toFixed(2);
  console.log(`📁 SQL file: test-data-complete.sql (${fileSize} MB)`);

  // Build MySQL command
  const mysqlCmd = `mysql -h ${DB_HOST} -P ${DB_PORT} -u ${DB_USER} ${DB_PASSWORD ? `-p${DB_PASSWORD}` : ''} ${DB_NAME} < "${sqlFile}"`;
  
  console.log('🚀 Importing data...');
  console.log('⏳ This may take 30-60 seconds...\n');

  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    exec(mysqlCmd, (error, stdout, stderr) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (error) {
        console.error('❌ Import failed:', error.message);
        
        // Provide helpful error messages
        if (error.message.includes('Access denied')) {
          console.log('\n💡 Database connection failed. Please check:');
          console.log('   - Database credentials in .env file');
          console.log('   - MySQL server is running');
          console.log('   - Database exists');
        } else if (error.message.includes('command not found')) {
          console.log('\n💡 MySQL client not found. Please:');
          console.log('   - Install MySQL client');
          console.log('   - Or use MySQL Workbench/phpMyAdmin to import manually');
        }
        
        reject(error);
        return;
      }

      if (stderr && !stderr.includes('Warning')) {
        console.warn('⚠️  Warnings:', stderr);
      }

      console.log('✅ =================================');
      console.log('✅ TEST DATA IMPORTED SUCCESSFULLY!');
      console.log('✅ =================================\n');

      console.log(`⚡ Import completed in ${duration} seconds`);
      console.log('📊 Test data imported:');
      console.log('   - 150+ additional users');
      console.log('   - 50+ projects with tasks');
      console.log('   - 3 months attendance data');
      console.log('   - Thousands of related records\n');

      console.log('🎯 Your database now has comprehensive test data!');
      console.log('🚀 Much faster than TypeScript seeding!');

      resolve();
    });
  });
}

// Alternative method using Prisma raw queries (if MySQL client not available)
async function importWithPrisma() {
  console.log('📥 Importing via Prisma (alternative method)...');
  
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();

  try {
    const sqlFile = path.join(__dirname, 'test-data-complete.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split SQL into individual statements
    const statements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('SET'));

    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < statements.length; i++) {
      if (statements[i]) {
        try {
          await prisma.$executeRawUnsafe(statements[i]);
          if ((i + 1) % 100 === 0) {
            console.log(`   ✓ Executed ${i + 1}/${statements.length} statements`);
          }
        } catch (error) {
          console.warn(`   ⚠️  Skipped statement ${i + 1}:`, error.message.substring(0, 100));
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n✅ Import completed via Prisma!');
    console.log(`⚡ Completed in ${duration} seconds`);
    
  } catch (error) {
    console.error('❌ Prisma import failed:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
async function main() {
  try {
    // Try MySQL client first (faster)
    await importTestData();
  } catch (error) {
    console.log('\n🔄 MySQL client failed, trying Prisma method...');
    try {
      await importWithPrisma();
    } catch (prismaError) {
      console.error('\n❌ Both import methods failed!');
      console.log('\n💡 Manual import options:');
      console.log('   1. Use MySQL Workbench: File > Run SQL Script');
      console.log('   2. Use phpMyAdmin: Import tab');
      console.log('   3. Use command line: mysql -u user -p database < test-data-complete.sql');
      process.exit(1);
    }
  }
}

// Check if running directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { importTestData, importWithPrisma };
