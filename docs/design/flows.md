# Thiết kế luồng nghiệp vụ — SanBong.vn

> Nguồn: `PRD.docx` (Đặt sân bóng đá trực tuyến thông minh). File này chuyển toàn bộ
> Happy Case + Edge Case của PRD thành sơ đồ luồng (flowchart) cú pháp **Mermaid**, để
> AI/dev đọc thiết kế trước khi code thay vì phải mở lại file Word.
>
> Khi implement một chức năng, đọc đúng mục tương ứng bên dưới trước, đối chiếu với
> module backend đang có (`backend/src/modules/*`) rồi mới viết code.

## Mục lục

- [1. Người chơi / Đội bóng](#1-người-chơi--đội-bóng)
  - [1.1 Đăng ký / Đăng nhập & cập nhật hồ sơ](#11-đăng-ký--đăng-nhập--cập-nhật-hồ-sơ) — module `auth`
  - [1.2 Tìm kiếm & gợi ý sân](#12-tìm-kiếm--gợi-ý-sân) — module `venues`
  - [1.3 Đặt sân lẻ real-time](#13-đặt-sân-lẻ-real-time) — module `bookings`, `payments`
  - [1.4 Đặt sân định kỳ](#14-đặt-sân-định-kỳ) — module `bookings`
  - [1.5 Ghép đối giao hữu (Team vs Team)](#15-ghép-đối-giao-hữu-team-vs-team) — module `community`
  - [1.6 Ghép người chơi lẻ (Team vs Freelance)](#16-ghép-người-chơi-lẻ-team-vs-freelance) — module `community`
  - [1.7 Quản lý lịch & đánh giá](#17-quản-lý-lịch--đánh-giá) — module `bookings`
- [2. Chủ sân (Owner)](#2-chủ-sân-owner)
  - [2.1 Đăng ký cụm sân](#21-đăng-ký-cụm-sân) — module `venues`
  - [2.2 Khóa sân nhanh (1-tap Lock)](#22-khóa-sân-nhanh-1-tap-lock) — module `bookings`
  - [2.3 Dynamic Pricing & Flash Sale](#23-dynamic-pricing--flash-sale) — module `venues`
  - [2.4 Dashboard báo cáo chủ sân](#24-dashboard-báo-cáo-chủ-sân)
- [3. Admin](#3-admin)
  - [3.1 Duyệt cụm sân & quản lý tài khoản](#31-duyệt-cụm-sân--quản-lý-tài-khoản)
  - [3.2 Xử lý khiếu nại](#32-xử-lý-khiếu-nại)
  - [3.3 Báo cáo toàn hệ thống](#33-báo-cáo-toàn-hệ-thống)

---

## 1. Người chơi / Đội bóng

### 1.1 Đăng ký / Đăng nhập & cập nhật hồ sơ

```mermaid
flowchart TD
    A([Bắt đầu]) --> B[Truy cập web responsive]
    B --> C{Chọn Đăng ký / Đăng nhập}
    C --> D["Nhập SĐT/Email + Mật khẩu<br/>hoặc OAuth Google/Facebook"]
    D --> E{SĐT hợp lệ?<br/>đúng 10 số, đầu số VN}
    E -->|Không| E1["Lỗi: Số điện thoại phải bao gồm<br/>đúng 10 chữ số (VD: 0912345678)"]
    E1 --> D
    E -->|Có| F{Mật khẩu ≥ 8 ký tự<br/>có cả chữ và số?}
    F -->|Không| F1["Lỗi: Mật khẩu quá yếu!<br/>Dùng ít nhất 8 ký tự gồm chữ và số"]
    F1 --> D
    F -->|Có| G{Xác nhận mật khẩu khớp?}
    G -->|Không| G1["Lỗi: Mật khẩu xác nhận<br/>không trùng khớp!"]
    G1 --> D
    G -->|Có| H[Gửi OTP xác minh]
    H --> I{Nhập OTP đúng?}
    I -->|Sai, còn lượt| H
    I -->|Sai quá 5 lần| I1["Khóa gửi OTP 15 phút"]
    I1 --> Z1([Kết thúc])
    I -->|Đúng| J{Lần đầu đăng nhập?}
    J -->|Có| K["Chuyển hướng trang<br/>Cập nhật hồ sơ"]
    K --> L["Điền: Tên, SĐT, Tên đội bóng,<br/>Khu vực (Quận/Huyện), Trình độ,<br/>Vị trí sở trường"]
    L --> M{"Ảnh đại diện hợp lệ?<br/>≤5MB, .jpg/.png"}
    M -->|Không| M1["Lỗi: Chỉ chấp nhận file ảnh<br/>(.jpg, .png) dưới 5MB!"]
    M1 --> L
    M -->|Có/bỏ qua| N[Xác nhận lưu]
    N --> O[Chuyển về Trang chủ]
    J -->|Không| O
    O --> Z2([Kết thúc])
```

### 1.2 Tìm kiếm & gợi ý sân

```mermaid
flowchart TD
    A([Bắt đầu]) --> B{Cách tìm kiếm}
    B -->|A: Gợi ý GPS| C[Hệ thống xin quyền vị trí]
    C --> D{Người dùng cho phép?}
    D -->|Từ chối| D1["Banner: Không thể lấy vị trí hiện tại.<br/>Đã chuyển sang chọn Khu vực thủ công"]
    D1 --> E
    D -->|Đồng ý| F["Xác định GPS + kết hợp<br/>lịch sử đặt sân"]
    F --> G["Đề xuất sân gần nhất,<br/>tối ưu chi phí"]
    B -->|B: Lọc thủ công| E["Lọc theo Khu vực, Loại sân (5/7/11),<br/>Khung giờ, Mức giá"]
    E --> H[Hiển thị danh sách sân phù hợp]
    G --> I{Có kết quả?}
    H --> I
    I -->|Không| I1["Empty state: Không tìm thấy sân phù hợp.<br/>Thử mở rộng bán kính / đổi khung giờ"]
    I -->|Có| J["Chọn sân → xem chi tiết,<br/>hình ảnh, đánh giá"]
    J --> Z([Kết thúc])
    I1 --> Z
```

### 1.3 Đặt sân lẻ real-time

**Bước 1 — Chọn giờ & giữ chỗ**

```mermaid
flowchart TD
    A([Bắt đầu]) --> B["Vào chi tiết sân<br/>→ Lịch sân real-time"]
    B --> C[Chọn Ngày]
    C --> D{Khung giờ đã trôi qua?}
    D -->|Có| D1["Disable slot quá hạn.<br/>Nếu cố chọn qua URL/API → Lỗi:<br/>Không thể chọn khung giờ đã trôi qua!"]
    D1 --> C
    D -->|Không| E["Chọn khung giờ trống<br/>+ vị trí sân con"]
    E --> F{"Ô giờ đang bị giữ<br/>(Redis Lock) bởi người khác?"}
    F -->|Có| F1["Lỗi: Khung giờ này đang có người<br/>thanh toán. Thử lại sau 5 phút!"]
    F1 --> C
    F -->|Không| G["Giữ chỗ bằng Redis Lock 5 phút<br/>cho người bấm trước"]
    G --> H["Tính giá tự động<br/>(áp Flash Sale / Giờ vàng nếu có)"]
    H --> I[Hiển thị số tiền cọc]
    I --> J([Sang Bước 2: Thanh toán])
```

**Bước 2 — Thanh toán & xác nhận**

```mermaid
flowchart TD
    A([Từ Bước 1: Giữ chỗ]) --> B["Chọn phương thức:<br/>VNPay / MOMO / ZaloPay / Chuyển khoản"]
    B --> C{Hoàn tất trong 5 phút?}
    C -->|Hết hạn| C1["Tự động nhả Lock.<br/>Trạng thái: Đã hủy do hết hạn"]
    C1 --> Z1([Kết thúc])
    C -->|Còn hạn| D{Phương thức?}
    D -->|"Ví điện tử / Cổng TT"| E[Thanh toán qua cổng]
    E --> F{Thành công?}
    F -->|Có| G["Khóa ô giờ trên sơ đồ<br/>+ cấp mã QR đặt sân<br/>+ gửi SMS/Notification 2 bên"]
    F -->|Không| B
    D -->|Chuyển khoản| H[Chuyển khoản cọc qua ngân hàng]
    H --> I{Nội dung CK đúng Mã đơn?}
    I -->|Thiếu/sai| I1["Chuyển trạng thái 'Chờ xác minh'.<br/>Hiện nút 'Tải lên bill chuyển khoản'<br/>→ Admin/Chủ sân duyệt thủ công"]
    I -->|Đúng| G
    G --> Z2([Kết thúc])
    I1 --> Z2
```

### 1.4 Đặt sân định kỳ

```mermaid
flowchart TD
    A([Bắt đầu]) --> B[Chọn tab Đặt sân định kỳ]
    B --> C["Chọn chu kỳ đá<br/>(VD: Thứ 3 & Thứ 5, 19:00-20:30)"]
    C --> D["Chọn thời hạn<br/>(1 tháng hoặc 3 tháng)"]
    D --> E[Quét toàn bộ lịch trong chu kỳ]
    E --> F{Có ngày nào trùng lịch?}
    F -->|Không| G[Áp dụng chiết khấu hợp đồng dài hạn]
    G --> H[Thanh toán cọc hợp đồng]
    H --> I["Khóa toàn bộ khung giờ<br/>tương ứng trong chu kỳ"]
    I --> Z1([Kết thúc])
    F -->|"Có (VD 2/12 buổi)"| J["Lỗi: Khung giờ ngày [DD/MM] và [DD/MM]<br/>đã có người đặt"]
    J --> K{Người dùng chọn}
    K -->|Lựa chọn A| L["Đổi sân con khác /<br/>lệch giờ 30 phút cho ngày trùng"]
    L --> G
    K -->|Lựa chọn B| M["Bỏ qua ngày trùng,<br/>chỉ ký hợp đồng ngày còn lại"]
    M --> G
```

### 1.5 Ghép đối giao hữu (Team vs Team)

```mermaid
flowchart TD
    A([Đội chủ nhà đặt sân thành công]) --> B{Còn ≥ 30 phút trước giờ đá?}
    B -->|Không| B1["Lỗi: Trận đấu sắp diễn ra,<br/>không đủ thời gian tìm đối thủ!"]
    B1 --> Z1([Kết thúc])
    B -->|Có| C["Bật 'Tìm đối giao hữu'.<br/>Nhập trình độ mong muốn + kèo giao hữu"]
    C --> D[Đăng bài công khai]
    D --> E["Đội khách lọc theo<br/>khu vực/thời gian"]
    E --> F[Bấm Gửi yêu cầu giao hữu]
    F --> G{Đã gửi yêu cầu cho trận này rồi?}
    G -->|Có| G1["Khóa nút: Đã gửi yêu cầu giao hữu<br/>cho trận đấu này. Vui lòng chờ phản hồi!"]
    G -->|Chưa| H{"Đội khách trùng lịch đá khác<br/>cùng khung giờ?"}
    H -->|Có| H1["Lỗi: Đội của bạn đã có<br/>một lịch đá khác vào khung giờ này!"]
    H -->|Không| I[Đội chủ nhà nhận thông báo]
    I --> J["Duyệt hồ sơ / điểm uy tín<br/>Đội khách"]
    J --> K{Chấp nhận đội nào?}
    K -->|Chấp nhận Đội A| L["Đóng bài đăng<br/>Mở khung chat kết nối<br/>Thông báo cho cả 2 bên"]
    L --> M["Đội B, C còn lại tự động<br/>chuyển trạng thái 'Từ chối'<br/>+ nhận thông báo"]
    M --> Z2([Kết thúc])
```

### 1.6 Ghép người chơi lẻ (Team vs Freelance)

**1.6.1 — Đội thiếu người đăng tin tuyển**

```mermaid
flowchart TD
    A(["Đội trưởng đặt sân thành công<br/>(hoặc mở đơn có sẵn)"]) --> B["Chọn 'Đăng bài tìm chân lẻ'"]
    B --> C["Thiết lập: số lượng cần tìm,<br/>vị trí ưu tiên, yêu cầu trình độ,<br/>chi phí share"]
    C --> D{Số lượng ≤ 10 người?}
    D -->|Không| D1["Lỗi: Số lượng người chơi lẻ<br/>cần tuyển tối đa là 10 người/bài đăng"]
    D1 --> C
    D -->|Có| E["Đăng bài công khai ở tab<br/>'Đội bóng tìm người'"]
    E --> F{Đủ người trước giờ bóng lăn?}
    F -->|Không| F1["Tự động đóng bài.<br/>Trạng thái: Đã hết hạn tuyển<br/>+ nhắc Đội trưởng"]
    F1 --> Z1([Kết thúc])
    F -->|Có người xin tham gia| G[Đội trưởng nhận Notification]
    G --> H["Xem hồ sơ: điểm uy tín,<br/>vị trí sở trường, trình độ"]
    H --> I{Chấp nhận?}
    I -->|Có| J["Trừ số lượng vị trí cần tuyển<br/>+ thêm vào danh sách điểm danh"]
    I -->|Không| F
    J --> K{"Người chơi lẻ hủy tham gia<br/>< 1 tiếng trước giờ đá?"}
    K -->|Có| K1["Trừ 5 điểm uy tín người đó.<br/>Đẩy bài đăng tuyển lên đầu<br/>danh sách ưu tiên"]
    K -->|Không| F
```

**1.6.2 — Người chơi lẻ, Cách 1: chủ động tìm đội**

```mermaid
flowchart TD
    A([Bắt đầu]) --> B["Chọn 'Giao lưu & Ghép đội'<br/>→ tab 'Đội bóng tìm người'"]
    B --> C["Lọc theo Khu vực, Khung giờ,<br/>Trình độ, Chi phí"]
    C --> D[Chọn trận phù hợp]
    D --> E{Trình độ bản thân thấp hơn yêu cầu?}
    E -->|Có| E1["Cảnh báo: Trình độ của bạn chưa đạt<br/>yêu cầu bài đăng. Vẫn muốn gửi yêu cầu?"]
    E1 --> F
    E -->|Không| F["Nhấn 'Xin tham gia' + lời nhắn"]
    F --> G{Bài đăng vừa đủ người đúng lúc?}
    G -->|Có| G1["Lỗi: Đội bóng đã tuyển đủ người.<br/>Vui lòng chọn bài đăng khác!"]
    G1 --> Z1([Kết thúc])
    G -->|Không| H[Đội trưởng nhận yêu cầu]
    H --> I{Chấp nhận?}
    I -->|Có| J["Hiện địa chỉ sân, SĐT đội trưởng.<br/>Thêm trận vào Lịch cá nhân"]
    I -->|Không| Z2([Kết thúc])
    J --> Z3([Kết thúc])
```

**1.6.2 — Cách 2: đăng tin, thụ động chờ đội mời**

```mermaid
flowchart TD
    A([Bắt đầu]) --> B["Chọn khung giờ rảnh, Khu vực mong muốn,<br/>Vị trí sở trường & Trình độ"]
    B --> C{Đã có bài đăng trùng khung giờ này?}
    C -->|Có| C1["Lỗi: Bạn đã có bài đăng tìm đội<br/>trong khoảng thời gian này!"]
    C1 --> B
    C -->|Không| D["Đăng tin tìm đội<br/>→ tab 'Người chơi tìm đội'"]
    D --> E[Đội bóng thiếu người lướt danh sách]
    E --> F{Đội bóng thấy phù hợp?}
    F -->|Có| G["Bấm 'Mời vào đội'"]
    G --> H{Người chơi phản hồi trong 30 phút?}
    H -->|Không| H1["Lời mời tự động hết hạn.<br/>Đội chủ động tìm người khác"]
    H1 --> Z1([Kết thúc])
    H -->|Chấp nhận| I["Xem thông tin sân, chi phí<br/>→ Ghép trận thành công"]
    I --> Z2([Kết thúc])
    F -->|Chưa| E
```

### 1.7 Quản lý lịch & đánh giá

```mermaid
flowchart TD
    A([Truy cập Quản lý lịch]) --> B{Xem theo tab}
    B -->|Sắp đá| C{Muốn hủy đơn?}
    C -->|Có| D{Thỏa chính sách hoàn cọc của chủ sân?}
    D -->|Không, sát giờ| D1["Thông báo: Hủy lịch sát giờ,<br/>không hoàn lại tiền cọc [X VNĐ].<br/>Bạn vẫn muốn hủy?"]
    D1 --> E{Xác nhận hủy?}
    E -->|Có| F[Hủy đơn, không hoàn cọc]
    E -->|Không| G([Giữ nguyên đơn])
    D -->|Có| H[Hủy đơn, hoàn cọc theo chính sách]
    B -->|Đã hoàn thành| I{Đã đánh giá chưa?}
    I -->|Rồi| I1["Ẩn nút Đánh giá,<br/>hiện lại sao + phản hồi đã gửi"]
    I -->|Chưa| J["Bấm Đánh giá/Rating<br/>→ chọn 1-5 sao + nhập phản hồi"]
    J --> K[Bấm Gửi]
    K --> Z1([Kết thúc])
    B -->|Đã hủy| L[Xem lịch sử, không thao tác thêm]
```

---

## 2. Chủ sân (Owner)

### 2.1 Đăng ký cụm sân

```mermaid
flowchart TD
    A([Đăng ký tài khoản vai trò OWNER]) --> B["Vào Quản lý sân<br/>→ Thêm cụm sân mới"]
    B --> C["Nhập: Tên cụm sân, Địa chỉ,<br/>Tiện ích (Đèn, Wifi, Căng tin, Bãi xe...)"]
    C --> D["Khai báo sân con (Sân 5/7/11)<br/>+ Số tài khoản nhận cọc"]
    D --> E[Bấm Gửi duyệt]
    E --> F["Trạng thái: Chờ Admin duyệt"]
    F --> G{Admin duyệt?}
    G -->|Từ chối| H["Gửi Notification/Email<br/>ghi rõ lý do (địa chỉ sai / thiếu ảnh sân)"]
    H --> I[Chủ sân cập nhật lại hồ sơ]
    I --> E
    G -->|Duyệt| J[Cụm sân được Public lên sàn]
    J --> Z([Kết thúc])
```

### 2.2 Khóa sân nhanh (1-tap Lock)

```mermaid
flowchart TD
    A(["Chủ sân xem Sơ đồ lịch<br/>(Gantt/Calendar)"]) --> B[Có khách gọi ngoài đặt sân]
    B --> C["Chọn ô thời gian<br/>→ Thao tác 1-tap Khóa sân"]
    C --> D{"Ô giờ vừa có khách online<br/>thanh toán cọc thành công?"}
    D -->|Có, xung đột| D1["Không cho khóa.<br/>Lỗi: Khung giờ này vừa có khách<br/>đặt trực tuyến, không thể thay đổi!"]
    D1 --> Z1([Kết thúc])
    D -->|Không| E["Nhập tên/SĐT khách vãng lai<br/>+ chọn lý do (Khách gọi ngoài/Bảo trì)"]
    E --> F["Ô giờ đổi màu xám 'Đã khóa'.<br/>Chặn đặt online trên Web"]
    F --> Z2([Kết thúc])
```

### 2.3 Dynamic Pricing & Flash Sale

```mermaid
flowchart TD
    A([Bắt đầu]) --> B["Cấu hình bảng giá chuẩn:<br/>Giờ vàng vs Thấp điểm,<br/>Ngày thường vs Cuối tuần"]
    B --> C{Khung giờ mới nhập có chồng lấp?}
    C -->|Có| C1["Lỗi tại dòng trùng:<br/>Khung giờ cài đặt giá bị chồng lấp<br/>(HH:MM-HH:MM). Vui lòng kiểm tra lại!"]
    C1 --> B
    C -->|Không| D[Lưu bảng giá]
    D --> E["Bật 'Tự động Flash Sale giờ chót'<br/>(VD: Trống trước 2 tiếng → giảm 20%)"]
    E --> F[Hệ thống quét tự động định kỳ]
    F --> G{Slot thỏa điều kiện Flash Sale?}
    G -->|Có| H["Cập nhật giá đã giảm<br/>lên danh sách tìm kiếm"]
    G -->|Không| F
    H --> Z([Kết thúc])
```

### 2.4 Dashboard báo cáo chủ sân

```mermaid
flowchart TD
    A([Truy cập Dashboard]) --> B["Chọn mốc thời gian:<br/>Ngày / Tuần / Tháng"]
    B --> C{Có dữ liệu trong khoảng chọn?}
    C -->|Không| C1["Báo cáo rỗng:<br/>Chưa có dữ liệu doanh thu<br/>trong khoảng thời gian này"]
    C -->|Có| D["Hiển thị biểu đồ: tổng lượt đặt,<br/>tổng doanh thu cọc,<br/>tỷ lệ lấp đầy sân theo khung giờ"]
    D --> Z([Kết thúc])
    C1 --> Z
```

---

## 3. Admin

### 3.1 Duyệt cụm sân & quản lý tài khoản

```mermaid
flowchart TD
    A([Admin đăng nhập Dashboard]) --> B{Tác vụ}
    B -->|Duyệt cụm sân| C["Mở danh sách<br/>'Cụm sân chờ duyệt'"]
    C --> D[Kiểm tra thông tin pháp lý/sân]
    D --> E{Phê duyệt?}
    E -->|Duyệt| F[Public sân lên sàn]
    E -->|Từ chối| G[Nhập lý do từ chối]
    B -->|Quản lý tài khoản| H[Tìm kiếm tài khoản vi phạm]
    H --> I{Khóa hay Mở khóa?}
    I -->|Khóa| J{"Chủ sân đang có đơn đặt<br/>chưa diễn ra?"}
    J -->|Có| J1["Cảnh báo: Chủ sân này đang có<br/>N đơn đặt chưa diễn ra. Khóa sẽ gửi<br/>thông báo hủy đơn đến người chơi.<br/>Bạn chắc chắn muốn khóa?"]
    J1 --> K{Xác nhận?}
    K -->|Có| L["Khóa tài khoản<br/>+ gửi thông báo hủy đơn"]
    K -->|Không| Z1([Hủy thao tác])
    J -->|Không| L
    I -->|Mở khóa| M[Mở khóa tài khoản]
    F --> Z2([Kết thúc])
    G --> Z2
    L --> Z2
    M --> Z2
```

### 3.2 Xử lý khiếu nại

```mermaid
flowchart TD
    A(["Admin tiếp nhận Ticket<br/>từ Trung tâm khiếu nại"]) --> B["Xem lịch sử đơn đặt sân,<br/>giao dịch cọc, Nhật ký Chat"]
    B --> C{Đủ bằng chứng xác minh?}
    C -->|Thiếu| D["Bấm 'Yêu cầu bổ sung thông tin'.<br/>Tự động hẹn phản hồi trong 24h"]
    D --> E{Người dùng bổ sung trong 24h?}
    E -->|Có| B
    E -->|Không| F["Xử lý theo dữ liệu hiện có /<br/>đóng ticket không đủ căn cứ"]
    C -->|Đủ| G["Đưa ra phán quyết:<br/>Hoàn tiền cọc / Trừ điểm uy tín /<br/>Khóa tài khoản vi phạm"]
    G --> H[Cập nhật và Đóng ticket]
    H --> Z([Kết thúc])
    F --> Z
```

### 3.3 Báo cáo toàn hệ thống

```mermaid
flowchart TD
    A([Admin truy cập Báo cáo hệ thống]) --> B[Chọn bộ lọc mốc thời gian]
    B --> C{Khoảng dữ liệu lớn (nhiều năm)?}
    C -->|Có| D[Xử lý ngầm - background job]
    D --> E["Gửi link tải file Excel<br/>qua Email Admin khi hoàn tất"]
    C -->|Không| F["Xuất báo cáo trực tiếp:<br/>tổng lượt đặt toàn sàn, tổng doanh thu,<br/>tỷ lệ lấp đầy sân trung bình"]
    F --> Z([Kết thúc])
    E --> Z
```
