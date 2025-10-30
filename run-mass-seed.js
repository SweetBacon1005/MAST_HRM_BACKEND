const { execSync } = require('child_process');
const path = require('path');

console.log('🌱 =================================');
console.log('🌱 CHẠY MASS SEED DATA CHO HRM');
console.log('🌱 =================================\n');

console.log('📋 Thông tin seed:');
console.log('• 150+ users với tên Việt Nam thực tế');
console.log('• 50+ projects với tasks chi tiết');
console.log('• 3 tháng dữ liệu attendance (timesheets, sessions, logs)');
console.log('• Hàng nghìn requests (day-off, remote work, overtime, late/early)');
console.log('• Hàng trăm assets và asset requests');
console.log('• Daily reports, PM reports, evaluations');
console.log('• Leave balances và transactions\n');

console.log('⚠️  LƯU Ý:');
console.log('• Quá trình này có thể mất 5-10 phút');
console.log('• Đảm bảo database đã được tạo và migrate');
console.log('• Backup database nếu cần thiết\n');

// Hỏi xác nhận
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Bạn có muốn tiếp tục? (y/N): ', (answer) => {
  if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
    console.log('❌ Đã hủy seed process.');
    rl.close();
    return;
  }

  console.log('\n🚀 Bắt đầu seed process...\n');
  
  try {
    // Chạy seed command
    const startTime = Date.now();
    
    execSync('npx prisma db seed', {
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
    console.log('🔑 Sử dụng các tài khoản sau để đăng nhập:');
    console.log('   • admin@company.com / 123456 (Admin)');
    console.log('   • hr.manager@company.com / 123456 (HR Manager)');
    console.log('   • user@example.com / Mast@123 (Test User)');
    console.log('   • john.doe@company.com / 123456 (Developer)');
    console.log('   • Và 150+ tài khoản khác với mật khẩu: 123456\n');
    
    console.log('🎯 Dữ liệu đã tạo bao gồm:');
    console.log('✓ Hệ thống users và phân quyền hoàn chỉnh');
    console.log('✓ Projects, tasks và phân bổ nhân sự');
    console.log('✓ Attendance data với timesheets chi tiết');
    console.log('✓ Requests đa dạng (nghỉ phép, remote work, tăng ca)');
    console.log('✓ Assets management và requests');
    console.log('✓ Reports và evaluations');
    console.log('✓ Leave management system\n');
    
  } catch (error) {
    console.error('\n❌ =================================');
    console.error('❌ SEED THẤT BẠI!');
    console.error('❌ =================================\n');
    console.error('Lỗi:', error.message);
    console.error('\n🔧 Các bước khắc phục:');
    console.error('1. Kiểm tra kết nối database');
    console.error('2. Chạy: npx prisma migrate dev');
    console.error('3. Kiểm tra file .env có DATABASE_URL đúng');
    console.error('4. Thử chạy lại: node run-mass-seed.js\n');
  }
  
  rl.close();
});
