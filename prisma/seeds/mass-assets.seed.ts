import { PrismaClient } from '@prisma/client';

// Danh sách tài sản công ty
const ASSET_DATA = {
  LAPTOP: {
    brands: ['Dell', 'HP', 'Lenovo', 'ASUS', 'Acer', 'MacBook'],
    models: {
      'Dell': ['Latitude 5520', 'Inspiron 15 3000', 'XPS 13', 'Vostro 3510', 'Precision 3560'],
      'HP': ['EliteBook 840', 'Pavilion 15', 'ProBook 450', 'Envy x360', 'ZBook Studio'],
      'Lenovo': ['ThinkPad E15', 'IdeaPad 3', 'Legion 5', 'ThinkBook 15', 'Yoga Slim 7'],
      'ASUS': ['VivoBook 15', 'ZenBook 14', 'ROG Strix G15', 'ExpertBook B1', 'TUF Gaming'],
      'Acer': ['Aspire 5', 'Swift 3', 'Nitro 5', 'TravelMate P2', 'ConceptD 3'],
      'MacBook': ['Air M1', 'Air M2', 'Pro 13 M1', 'Pro 14 M1', 'Pro 16 M1']
    }
  },
  DESKTOP: {
    brands: ['Dell', 'HP', 'Lenovo', 'ASUS'],
    models: {
      'Dell': ['OptiPlex 3080', 'Vostro 3681', 'Inspiron 3881', 'Precision 3640'],
      'HP': ['EliteDesk 800', 'ProDesk 400', 'Pavilion TP01', 'Z2 Tower G5'],
      'Lenovo': ['ThinkCentre M70q', 'IdeaCentre 3', 'Legion T5', 'ThinkStation P340'],
      'ASUS': ['ExpertCenter D5', 'VivoPC VM65', 'ROG Strix GT15', 'ProArt Station']
    }
  },
  MONITOR: {
    brands: ['Dell', 'HP', 'LG', 'Samsung', 'ASUS'],
    models: {
      'Dell': ['S2721DS 27"', 'P2419H 24"', 'U2720Q 27"', 'S2422HZ 24"'],
      'HP': ['E24 G5 24"', 'Z27 27"', 'EliteDisplay E243 24"', 'V28 28"'],
      'LG': ['27UP850 27"', '24MK430H 24"', '32UN650 32"', '27GL850 27"'],
      'Samsung': ['F24T450FQE 24"', 'M7 32"', 'Odyssey G5 27"', 'S24R350 24"'],
      'ASUS': ['VA24EHE 24"', 'ProArt PA278QV 27"', 'TUF Gaming VG27AQ 27"', 'ZenScreen MB16AC 15.6"']
    }
  },
  KEYBOARD: {
    brands: ['Logitech', 'Dell', 'HP', 'Microsoft', 'Razer'],
    models: {
      'Logitech': ['K380', 'MX Keys', 'K120', 'G Pro X', 'K780'],
      'Dell': ['KB216', 'KM636', 'KB522', 'KM117'],
      'HP': ['K1500', '230', 'Pavilion 600', 'Elite v2'],
      'Microsoft': ['Wired 600', 'Surface Keyboard', 'Ergonomic Keyboard'],
      'Razer': ['DeathStalker V2', 'BlackWidow V3', 'Ornata V3', 'Pro Type Ultra']
    }
  },
  MOUSE: {
    brands: ['Logitech', 'Dell', 'HP', 'Microsoft', 'Razer'],
    models: {
      'Logitech': ['M100', 'MX Master 3', 'M705', 'G502', 'M220'],
      'Dell': ['MS116', 'WM126', 'MS5120W', 'MS3320W'],
      'HP': ['X500', 'Z3700', 'Pavilion 300', 'Elite v2'],
      'Microsoft': ['Basic Optical', 'Surface Mobile', 'Bluetooth Mouse'],
      'Razer': ['DeathAdder V3', 'Basilisk V3', 'Viper V2', 'Orochi V2']
    }
  },
  HEADPHONE: {
    brands: ['Sony', 'JBL', 'Logitech', 'Plantronics', 'Jabra'],
    models: {
      'Sony': ['WH-1000XM4', 'WH-CH720N', 'MDR-ZX110', 'WF-1000XM4'],
      'JBL': ['Tune 760NC', 'Live 460NC', 'Quantum 100', 'Club One'],
      'Logitech': ['H390', 'Zone Wireless', 'G435', 'H540'],
      'Plantronics': ['Voyager Focus 2', 'BackBeat Go 810', 'Savi 7220'],
      'Jabra': ['Elite 85h', 'Evolve2 65', 'Elite Active 75t', 'Talk 45']
    }
  },
  PHONE: {
    brands: ['iPhone', 'Samsung', 'Xiaomi', 'Oppo', 'Vivo'],
    models: {
      'iPhone': ['13', '14', '15', 'SE 2022', '12'],
      'Samsung': ['Galaxy S23', 'Galaxy A54', 'Galaxy S22', 'Galaxy A34', 'Galaxy Note 20'],
      'Xiaomi': ['Redmi Note 12', 'Mi 11', 'Redmi 10', 'Poco X5', 'Mi 12'],
      'Oppo': ['Reno8', 'A77s', 'Find X5', 'A57', 'Reno7'],
      'Vivo': ['V25', 'Y35', 'X80', 'Y22s', 'V23']
    }
  }
};

// Hàm tạo serial number
function generateSerialNumber(category: string, index: number): string {
  const prefix = category.substring(0, 3).toUpperCase();
  return `${prefix}${new Date().getFullYear()}${(index + 1000).toString()}`;
}

// Hàm tạo asset code
function generateAssetCode(category: string, index: number): string {
  const prefix = category.substring(0, 2).toUpperCase();
  return `${prefix}-${(index + 1).toString().padStart(4, '0')}`;
}

// Hàm tạo giá mua ngẫu nhiên theo loại tài sản
function generatePrice(category: string): number {
  const priceRanges = {
    LAPTOP: { min: 15000000, max: 50000000 }, // 15-50 triệu
    DESKTOP: { min: 10000000, max: 30000000 }, // 10-30 triệu
    MONITOR: { min: 3000000, max: 15000000 },  // 3-15 triệu
    KEYBOARD: { min: 200000, max: 2000000 },   // 200k-2 triệu
    MOUSE: { min: 150000, max: 1500000 },      // 150k-1.5 triệu
    HEADPHONE: { min: 500000, max: 8000000 },  // 500k-8 triệu
    PHONE: { min: 5000000, max: 30000000 },    // 5-30 triệu
    TABLET: { min: 8000000, max: 25000000 },   // 8-25 triệu
    FURNITURE: { min: 2000000, max: 20000000 }, // 2-20 triệu
    EQUIPMENT: { min: 5000000, max: 100000000 }, // 5-100 triệu
    OTHER: { min: 500000, max: 10000000 }      // 500k-10 triệu
  };

  const range = priceRanges[category as keyof typeof priceRanges] || priceRanges.OTHER;
  return Math.floor(Math.random() * (range.max - range.min) + range.min);
}

// Hàm tạo ngày mua ngẫu nhiên
function generatePurchaseDate(): Date {
  const now = new Date();
  const threeYearsAgo = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
  const randomTime = threeYearsAgo.getTime() + Math.random() * (now.getTime() - threeYearsAgo.getTime());
  return new Date(randomTime);
}

// Hàm tạo ngày hết hạn bảo hành
function generateWarrantyEndDate(purchaseDate: Date): Date {
  const warrantyMonths = Math.floor(Math.random() * 24) + 12; // 12-36 months
  const warrantyEnd = new Date(purchaseDate);
  warrantyEnd.setMonth(warrantyEnd.getMonth() + warrantyMonths);
  return warrantyEnd;
}

export async function seedMassAssets(prisma: PrismaClient, seedData: any) {
  console.log('💻 Seeding mass assets and asset requests...');

  const { massUsers, users: originalUsers } = seedData;
  const allUsers = [...(originalUsers || []), ...(massUsers || [])];

  // Lấy admin users để làm creator
  const adminUsers = await prisma.user_information.findMany({
    where: {
      role: {
        name: { in: ['admin', 'manager'] }
      }
    },
    include: { user: true }
  });

  const locations = [
    'Tầng 1 - Phòng IT', 'Tầng 2 - Phòng Dev', 'Tầng 3 - Phòng QA',
    'Tầng 4 - Phòng PM', 'Tầng 5 - Phòng Admin', 'Kho tài sản',
    'Phòng họp A', 'Phòng họp B', 'Phòng training', 'Reception'
  ];

  // 1. TẠO ASSETS
  console.log('💻 Tạo assets...');
  const assetData: any[] = [];
  let assetIndex = 0;

  // Tạo assets cho từng category
  for (const [category, data] of Object.entries(ASSET_DATA)) {
    const categoryAssetCount = Math.floor(Math.random() * 50) + 30; // 30-80 assets per category
    
    for (let i = 0; i < categoryAssetCount; i++) {
      const brand = data.brands[Math.floor(Math.random() * data.brands.length)];
      const models = (data.models as any)[brand] || [];
      const model = models.length > 0 ? models[Math.floor(Math.random() * models.length)] : 'Unknown Model';
      
      const purchaseDate = generatePurchaseDate();
      const price = generatePrice(category);
      const status = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED'][Math.floor(Math.random() * 4)] as any;
      
      // Nếu status là ASSIGNED, random assign cho user
      const assignedUser = status === 'ASSIGNED' ? 
        allUsers[Math.floor(Math.random() * allUsers.length)] : null;
      
      const creator = adminUsers[Math.floor(Math.random() * adminUsers.length)];

      assetData.push({
        name: `${brand} ${model}`,
        description: `${category.toLowerCase()} ${brand} ${model} for office use`,
        asset_code: generateAssetCode(category, assetIndex),
        category: category as any,
        brand,
        model,
        serial_number: generateSerialNumber(category, assetIndex),
        purchase_date: purchaseDate,
        purchase_price: price,
        warranty_end_date: generateWarrantyEndDate(purchaseDate),
        location: locations[Math.floor(Math.random() * locations.length)],
        status,
        assigned_to: assignedUser?.id || null,
        assigned_date: assignedUser ? purchaseDate : null,
        notes: status === 'MAINTENANCE' ? 'Đang bảo trì định kỳ' : 
               status === 'RETIRED' ? 'Đã hết hạn sử dụng' : null,
        created_by: creator.user_id,
      });
      
      assetIndex++;
    }
  }

  // Thêm một số assets khác
  const otherAssets = [
    { name: 'Bàn làm việc gỗ', category: 'FURNITURE', brand: 'Hòa Phát', model: 'HP-120' },
    { name: 'Ghế xoay văn phòng', category: 'FURNITURE', brand: 'Hòa Phát', model: 'GL-203' },
    { name: 'Tủ tài liệu', category: 'FURNITURE', brand: 'Fami', model: 'FM-180' },
    { name: 'Máy in laser', category: 'EQUIPMENT', brand: 'Canon', model: 'LBP2900' },
    { name: 'Máy photocopy', category: 'EQUIPMENT', brand: 'Ricoh', model: 'MP-2014' },
    { name: 'Máy chiếu', category: 'EQUIPMENT', brand: 'Epson', model: 'EB-X41' },
    { name: 'Camera an ninh', category: 'EQUIPMENT', brand: 'Hikvision', model: 'DS-2CE16' },
    { name: 'Router WiFi', category: 'EQUIPMENT', brand: 'TP-Link', model: 'Archer C6' },
  ];

  for (let i = 0; i < 50; i++) {
    const asset = otherAssets[i % otherAssets.length];
    const purchaseDate = generatePurchaseDate();
    const price = generatePrice(asset.category);
    const status = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE'][Math.floor(Math.random() * 3)] as any;
    const assignedUser = status === 'ASSIGNED' ? 
      allUsers[Math.floor(Math.random() * allUsers.length)] : null;
    const creator = adminUsers[Math.floor(Math.random() * adminUsers.length)];

    assetData.push({
      name: asset.name,
      description: `${asset.name} for office use`,
      asset_code: generateAssetCode(asset.category, assetIndex),
      category: asset.category as any,
      brand: asset.brand,
      model: asset.model,
      serial_number: generateSerialNumber(asset.category, assetIndex),
      purchase_date: purchaseDate,
      purchase_price: price,
      warranty_end_date: generateWarrantyEndDate(purchaseDate),
      location: locations[Math.floor(Math.random() * locations.length)],
      status,
      assigned_to: assignedUser?.id || null,
      assigned_date: assignedUser ? purchaseDate : null,
      notes: status === 'MAINTENANCE' ? 'Đang bảo trì' : null,
      created_by: creator.user_id,
    });
    
    assetIndex++;
  }

  console.log(`💻 Tạo ${assetData.length} assets...`);
  
  // Batch create assets
  const batchSize = 50;
  const createdAssets: any[] = [];
  
  for (let i = 0; i < assetData.length; i += batchSize) {
    const batch = assetData.slice(i, i + batchSize);
    const batchAssets = await Promise.all(
      batch.map((asset) =>
        prisma.assets.upsert({
          where: { asset_code: asset.asset_code },
          update: {},
          create: asset,
        }),
      ),
    );
    createdAssets.push(...batchAssets);
    console.log(`✓ Created assets batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assetData.length / batchSize)}`);
  }

  // 2. TẠO ASSET REQUESTS
  console.log('📝 Tạo asset requests...');
  const assetRequestData: any[] = [];

  // Lấy managers để làm approver
  const managers = await prisma.user_information.findMany({
    where: {
      role: {
        name: { in: ['admin', 'manager'] }
      }
    },
    include: { user: true }
  });

  for (const user of allUsers) {
    // Mỗi user có 2-5 asset requests
    const requestCount = Math.floor(Math.random() * 4) + 2;
    
    for (let i = 0; i < requestCount; i++) {
      const requestType = ['REQUEST', 'RETURN', 'MAINTENANCE'][Math.floor(Math.random() * 3)] as any;
      const category = Object.keys(ASSET_DATA)[Math.floor(Math.random() * Object.keys(ASSET_DATA).length)] as any;
      const status = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED'][Math.floor(Math.random() * 4)] as any;
      const priority = ['LOW', 'NORMAL', 'HIGH', 'URGENT'][Math.floor(Math.random() * 4)] as any;
      const approver = managers[Math.floor(Math.random() * managers.length)];
      
      // Chọn asset ngẫu nhiên cho RETURN và MAINTENANCE requests
      const asset = requestType !== 'REQUEST' ? 
        createdAssets.filter(a => a.category === category)[Math.floor(Math.random() * createdAssets.filter(a => a.category === category).length)] : 
        null;

      const requestDate = new Date();
      requestDate.setDate(requestDate.getDate() - Math.floor(Math.random() * 90)); // Last 3 months

      const expectedDate = new Date(requestDate);
      expectedDate.setDate(expectedDate.getDate() + Math.floor(Math.random() * 14) + 1); // 1-14 days later

      assetRequestData.push({
        user_id: user.id,
        asset_id: asset?.id || null,
        request_type: requestType,
        category,
        description: requestType === 'REQUEST' ? 
          `Yêu cầu cấp phát ${category.toLowerCase()} cho công việc` :
          requestType === 'RETURN' ? 
          `Trả lại ${category.toLowerCase()} do không sử dụng` :
          `Yêu cầu bảo trì ${category.toLowerCase()}`,
        justification: requestType === 'REQUEST' ? 
          'Cần thiết cho công việc hàng ngày' :
          requestType === 'RETURN' ? 
          'Đã hoàn thành dự án, không cần sử dụng nữa' :
          'Thiết bị gặp sự cố, cần bảo trì',
        priority,
        expected_date: expectedDate,
        status,
        approved_by: status !== 'PENDING' ? approver.user_id : null,
        approved_at: status !== 'PENDING' ? new Date(requestDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000) : null,
        rejection_reason: status === 'REJECTED' ? 'Không đủ ngân sách hoặc không cần thiết' : null,
        fulfilled_at: status === 'FULFILLED' ? new Date(requestDate.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000) : null,
        returned_at: status === 'FULFILLED' && requestType === 'RETURN' ? new Date(requestDate.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000) : null,
        notes: priority === 'URGENT' ? 'Yêu cầu xử lý gấp' : null,
      });
    }
  }

  console.log(`📝 Tạo ${assetRequestData.length} asset requests...`);
  
  // Batch create asset requests
  for (let i = 0; i < assetRequestData.length; i += batchSize) {
    const batch = assetRequestData.slice(i, i + batchSize);
    await prisma.asset_requests.createMany({
      data: batch,
      skipDuplicates: true,
    });
    console.log(`✓ Created asset requests batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(assetRequestData.length / batchSize)}`);
  }

  return {
    totalAssets: assetData.length,
    totalAssetRequests: assetRequestData.length,
    assetsByCategory: Object.keys(ASSET_DATA).reduce((acc, category) => {
      acc[category] = assetData.filter(a => a.category === category).length;
      return acc;
    }, {} as Record<string, number>)
  };
}
