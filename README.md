# WarehouseTCH - Hệ Thống Quản Lý Kho Thông Minh

WarehouseTCH là một ứng dụng quản lý kho toàn diện được xây dựng trên nền tảng Web, giúp doanh nghiệp tối ưu hóa quy trình nhập, xuất, kiểm kê và theo dõi hàng hóa một cách hiệu quả và chính xác.

## Tính năng chính

### 1. Quản lý Nhập kho (Goods Receipt)
- Lập phiếu nhập kho chi tiết với thông tin nhà cung cấp, sản phẩm, số lượng, đơn giá.
- Theo dõi trạng thái phiếu nhập: Đã gửi, Đã duyệt, Đã nhập kho, Đã hủy.
- Hỗ trợ tải lên ảnh sản phẩm và logo nhà cung cấp.

### 2. Quản lý Xuất kho (Goods Issue)
- Tạo phiếu xuất kho cho khách hàng/người nhận.
- Tự động trừ tồn kho khi xuất hàng.
- Quản lý trạng thái xuất hàng chuyên nghiệp.

### 3. Quản lý Kho & Vị trí
- Phân chia kho theo khu vực: Đồ ăn & Đồ uống, Mỹ phẩm, Thời trang, Điện tử, Đồ dùng gia đình.
- Theo dõi sức chứa (Weight & Area) của từng khu vực và toàn bộ kho.
- Quản lý vị trí pallet/kệ hàng chi tiết.

### 4. Kiểm kê Kho (Inventory Audit)
- Tạo các đợt kiểm kê định kỳ.
- Đối soát số lượng thực tế và số lượng trên hệ thống.
- Lưu lại lịch sử kiểm kê chi tiết.

### 5. Báo cáo & Phân tích
- Dashboard trực quan với biểu đồ thống kê (Chart.js).
- Xuất báo cáo PDF, hóa đơn (jsPDF, html2pdf).
- **Tích hợp AI (Google Gemini)**: Tự động tóm tắt tình hình kho bãi và đưa ra nhận xét thông minh.

### 6. Quản lý Người dùng & Phân quyền
- Phân quyền rõ ràng: **Admin**, **Staff**, và **User**.
- Bảo mật thông tin với JWT và Bcrypt.

## Công nghệ sử dụng

### Frontend
- **Framework**: Angular 19
- **UI/UX**: Bootstrap 5, AOS (Animate on Scroll), Swiper
- **Biểu đồ**: Chart.js, Ng2-charts
- **Tiện ích**: JsBarcode, jsPDF, html2pdf.js

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **AI Integration**: Google Gemini API
- **Auth**: JSON Web Token (JWT), Bcryptjs
- **File Upload**: Multer

## Cấu trúc dự án

```text
WarehouseTCH/
├── backend/            # Mã nguồn server (Node.js/Express)
│   ├── config/         # Cấu hình DB, Multer, Env
│   ├── controllers/    # Xử lý logic nghiệp vụ
│   ├── routes/         # Định nghĩa các API endpoints
│   ├── services/       # Các dịch vụ bổ trợ
│   └── uploads/        # Thư mục lưu trữ hình ảnh
├── frontend/           # Mã nguồn client (Angular 19)
│   ├── src/app/        # Components, Services, Guards
│   └── ...
└── warehouse_db.sql    # Script khởi tạo cơ sở dữ liệu
```

## Cài đặt & Chạy ứng dụng

### 1. Yêu cầu hệ thống
- Node.js (v18+)
- MySQL
- Angular CLI

### 2. Thiết lập Cơ sở dữ liệu
- Tạo database tên `warehouse_db` trong MySQL.
- Import file `warehouse_db.sql` vào database vừa tạo.

### 3. Cấu hình Backend
- Di chuyển vào thư mục `backend/`.
- Cài đặt dependency: `npm install`.
- Chỉnh sửa file `.env` với thông tin kết nối DB của bạn và API Key Gemini.
- Chạy server: `npm start`.
- *Mặc định server chạy tại: http://localhost:3000*
- *Tài khoản admin mặc định: admin@gmail.com / admin123*

### 4. Cấu hình Frontend
- Di chuyển vào thư mục `frontend/`.
- Cài đặt dependency: `npm install`.
- Chạy ứng dụng: `ng serve`.
- *Truy cập tại: http://localhost:4200*

## Giấy phép
Dự án được phát triển cho mục đích học tập và quản lý kho nội bộ.

---
**WarehouseTCH** - *Giải pháp quản lý kho tối ưu cho doanh nghiệp của bạn.*
