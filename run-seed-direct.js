const { execSync } = require('child_process');

console.log('🌱 =================================');
console.log('🌱 CHẠY MASS SEED DATA CHO HRM');
console.log('🌱 =================================\n');

console.log('🚀 Bắt đầu seed process...\n');

try {
  const startTime = Date.now();
  
  // Chạy seed command trực tiếp
  console.log('📦 Compiling and running seed...');
  execSync('npx tsx prisma/seed.ts', {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  const endTime = Date.now();
  const duration = Math.round((endTime - startTime) / 1000);
  
  console.log('\n🎉 =================================');
  console.log('✅ SEED HOÀN THÀNH THÀNH CÔNG!');
  console.log('🎉 =================================\n');
  
  console.log(`⏱️  Thời gian thực hiện: ${duration} giây`);
  console.log('📊 Database đã được seed với hàng nghìn records');
  
} catch (error) {
  console.error('\n❌ =================================');
  console.error('❌ SEED THẤT BẠI!');
  console.error('❌ =================================\n');
  console.error('Lỗi:', error.message);
  
  // Thử với ts-node
  console.log('\n🔄 Thử lại với ts-node...');
  try {
    execSync('npx ts-node prisma/seed.ts', {
      stdio: 'inherit',
      cwd: __dirname
    });
    console.log('\n✅ Seed thành công với ts-node!');
  } catch (error2) {
    console.error('❌ Ts-node cũng thất bại:', error2.message);
    
    // Thử compile trước
    console.log('\n🔄 Thử compile trước...');
    try {
      execSync('npx tsc prisma/seed.ts --outDir dist --target es2020 --module commonjs --esModuleInterop', {
        stdio: 'inherit',
        cwd: __dirname
      });
      
      execSync('node dist/seed.js', {
        stdio: 'inherit',
        cwd: __dirname
      });
      
      console.log('\n✅ Seed thành công sau khi compile!');
    } catch (error3) {
      console.error('❌ Compile cũng thất bại:', error3.message);
    }
  }
}
