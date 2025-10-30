-- =============================================
-- MAST HRM - TEST DATA SQL
-- =============================================
-- Chạy file này để thêm data test sau khi đã seed basic data
-- Sử dụng: mysql -u username -p database_name < test-data.sql

-- Hoặc import trực tiếp vào MySQL Workbench/phpMyAdmin

-- =============================================
-- MASS USERS DATA
-- =============================================

-- Thêm 150+ users với thông tin chi tiết
-- (Sẽ được generate bằng script riêng)

-- =============================================
-- MASS PROJECTS DATA  
-- =============================================

-- Thêm 50+ projects với tasks và assignments
-- (Sẽ được generate bằng script riêng)

-- =============================================
-- MASS ATTENDANCE DATA
-- =============================================

-- Thêm 3 tháng dữ liệu attendance cho tất cả users
-- (Sẽ được generate bằng script riêng)

-- =============================================
-- MASS REQUESTS DATA
-- =============================================

-- Thêm hàng nghìn requests các loại
-- (Sẽ được generate bằng script riêng)

-- =============================================
-- MASS ASSETS DATA
-- =============================================

-- Thêm hàng trăm assets và requests
-- (Sẽ được generate bằng script riêng)

-- =============================================
-- MASS REPORTS DATA
-- =============================================

-- Thêm daily reports, PM reports, evaluations
-- (Sẽ được generate bằng script riêng)

-- =============================================
-- ADDITIONAL TEST DATA
-- =============================================

-- Skills, certificates, education, experience, holidays
-- (Sẽ được generate bằng script riêng)

-- =============================================
-- HƯỚNG DẪN SỬ DỤNG
-- =============================================

/*
1. Chạy seed cơ bản trước:
   npm run db:seed

2. Sau đó import file SQL này để có data test:
   mysql -u username -p database_name < test-data.sql

3. Hoặc sử dụng script Node.js:
   node generate-test-data.js

4. Để xóa tất cả data test:
   node clear-test-data.js
*/
