const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const code = fs.readFileSync('server.js', 'utf8');

const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: []
});

const groups = {
    auth: ['register', 'login'],
    users: ['users', 'user-info'],
    product: ['products-detail', 'products', 'nhap-kho', 'kho'],
    receipt: ['phieu-nhap', 'phieu-xuat', 'hoa-don', 'tong-phieu-nhap-xuat'],
    warehouse: ['khu-vuc', 'kiem-ke', 'khu_vuc_suc_chua', 'tong_gia_tri_ton_kho', 'doanh_thu', 'nha_cung_cap', 'vi-tri-con-trong', 'thong-ke', 'log-tru-hang', 'suppliers']
};

function getGroup(apiPath) {
    for (const [group, keywords] of Object.entries(groups)) {
        for (const kw of keywords) {
            if (apiPath.includes(`/${kw}`)) return group;
        }
    }
    return 'index';
}

const routes = {};
const controllers = {};

let appUseMiddles = [];
let otherCodeNodes = [];

traverse(ast, {
    CallExpression(pathNode) {
        const callee = pathNode.node.callee;
        if (callee.type === 'MemberExpression' && callee.object.name === 'app') {
            const method = callee.property.name;
            if (['get', 'post', 'put', 'delete'].includes(method)) {
                const args = pathNode.node.arguments;
                if (args.length >= 2 && args[0].type === 'StringLiteral') {
                    const apiPath = args[0].value;
                    const group = getGroup(apiPath);
                    if (!routes[group]) {
                        routes[group] = [];
                        controllers[group] = [];
                    }
                    
                    // We need the original code of the callback(s)
                    const callbackNodes = args.slice(1);
                    const callbacksCode = callbackNodes.map(n => code.slice(n.start, n.end));
                    
                    // Route path relative to group
                    // Let's not strip prefix to be safe, just mount group at /
                    
                    // Function name
                    const fnName = method + '_' + apiPath.replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/_$/, '');
                    
                    routes[group].push({ method, apiPath, fnName, callbacksCode, hasUpload: callbacksCode.length > 1 });
                    controllers[group].push({ fnName, callbacksCode });
                }
            }
        }
    }
});

// Setup directories
const dirs = ['config', 'routes', 'controllers', 'services', 'repositories', 'middlewares', 'utils'];
dirs.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d);
});

// Create routes and controllers
for (const group in routes) {
    let routeContent = `const express = require('express');\nconst router = express.Router();\nconst controller = require('../controllers/${group}.controller');\n`;
    
    // Check if upload is used
    if (routes[group].some(r => r.hasUpload)) {
        routeContent += `const upload = require('../config/multer');\n`;
    }
    
    let ctrlContent = `const db = require('../config/db');\nconst bcrypt = require('bcryptjs');\nconst jwt = require('jsonwebtoken');\nconst path = require('path');\nconst fs = require('fs');\nconst axios = require('axios');\nconst ExcelJS = require('exceljs');\nconst ProductService = require('../services/product.service');\nconst UserProfileService = require('../services/user.service');\n\n`;
    
    for (const r of routes[group]) {
        if (r.callbacksCode.length === 1) {
            routeContent += `router.${r.method}('${r.apiPath}', controller.${r.fnName});\n`;
            ctrlContent += `exports.${r.fnName} = ${r.callbacksCode[0]};\n\n`;
        } else {
            // Has middleware (like upload.single)
            const middleCode = r.callbacksCode.slice(0, -1).join(', ');
            // Need to make sure upload is defined. But wait, `upload` is defined in multer.js.
            // If the middle code contains `upload.`, we use it.
            routeContent += `router.${r.method}('${r.apiPath}', ${middleCode}, controller.${r.fnName});\n`;
            ctrlContent += `exports.${r.fnName} = ${r.callbacksCode[r.callbacksCode.length - 1]};\n\n`;
        }
    }
    
    routeContent += `module.exports = router;\n`;
    fs.writeFileSync(`routes/${group}.routes.js`, routeContent);
    fs.writeFileSync(`controllers/${group}.controller.js`, ctrlContent);
}

// Extract Services manually (ProductService, UserProfileService)
const psStart = code.indexOf('const ProductService = {');
const psEnd = code.indexOf('const UserProfileService = {');
const upsEnd = code.indexOf('// ========================== AUTH ==========================');

if (psStart !== -1 && psEnd !== -1) {
    fs.writeFileSync('services/product.service.js', `const db = require('../config/db');\n` + code.slice(psStart, psEnd) + `\nmodule.exports = ProductService;\n`);
}
if (psEnd !== -1 && upsEnd !== -1) {
    fs.writeFileSync('services/user.service.js', `const db = require('../config/db');\n` + code.slice(psEnd, upsEnd) + `\nmodule.exports = UserProfileService;\n`);
}

// Make config files
fs.writeFileSync('config/env.js', `require('dotenv').config();\n`);
fs.writeFileSync('config/db.js', `
const mysql = require('mysql2');
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT
});

db.connect(err => {
  if (err) {
    console.error('❌ DB connect failed:', err.message);
  } else {
    console.log('✅ Connected to DB');
  }
});
module.exports = db;
`);

fs.writeFileSync('config/multer.js', `
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = \`\${Date.now()}-\${Math.round(Math.random() * 1e9)}\`;
    cb(null, \`\${file.fieldname}_\${uniqueSuffix}\${ext}\`);
  }
});
const upload = multer({
  storage,
  limits: { fieldSize: 100 * 1024 * 1024, fileSize: 50 * 1024 * 1024, files: 20 }
});
module.exports = upload;
`);

// utils/generateCode.js
fs.writeFileSync('utils/generateCode.js', `// Placeholder for generateCode utility\n`);
fs.writeFileSync('utils/jwt.js', `// Placeholder for jwt utility\n`);

// middlewares/auth.middleware.js
fs.writeFileSync('middlewares/auth.middleware.js', `// Placeholder for auth middleware\n`);
fs.writeFileSync('middlewares/role.middleware.js', `// Placeholder for role middleware\n`);

// repositories
fs.writeFileSync('repositories/product.repo.js', `// Product Repo\n`);
fs.writeFileSync('repositories/receipt.repo.js', `// Receipt Repo\n`);
fs.writeFileSync('repositories/warehouse.repo.js', `// Warehouse Repo\n`);


// Build app.js
let appJs = `
require('./config/env');
const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use('/uploads', express.static('uploads'));

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const productRoutes = require('./routes/product.routes');
const receiptRoutes = require('./routes/receipt.routes');
const warehouseRoutes = require('./routes/warehouse.routes');
const indexRoutes = require('./routes/index.routes');

app.use('/', authRoutes);
app.use('/', usersRoutes);
app.use('/', productRoutes);
app.use('/', receiptRoutes);
app.use('/', warehouseRoutes);
app.use('/', indexRoutes);

// Admin account creation logic
const bcrypt = require('bcryptjs');
const db = require('./config/db');
const createAdminAccount = async () => {
  const adminEmail = 'admin@gmail.com';
  db.query('SELECT * FROM users WHERE email = ?', [adminEmail], async (err, results) => {
    if (results && results.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      db.query('INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)', ['Administrator', adminEmail, hashedPassword, 'admin', 'active']);
    }
  });
};
createAdminAccount();

module.exports = app;
`;
fs.writeFileSync('app.js', appJs);

// Build new server.js
let serverJs = `
require('./config/env');
const app = require('./app');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
`;
fs.writeFileSync('server.js', serverJs);

console.log('Refactoring complete.');
