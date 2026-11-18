-- =====================================================================
-- V29: Dữ liệu ban đầu cho kho tri thức trợ lý đặt sân
-- Nội dung bám theo chức năng / route đang có trên web (frontend/src/App.jsx)
-- và quy tắc trong backend. Admin sửa tiếp tại /quan-tri/tro-ly.
-- =====================================================================

INSERT INTO kb_article (slug, title, category, audience, route, keywords, content) VALUES

-- ----------------------------- Chung -----------------------------
('gioi-thieu-sanbong', 'SanBong.vn là gì', 'GENERAL', ARRAY['GUEST', 'PLAYER', 'OWNER', 'ADMIN'], '/',
 'gioi thieu, website, nen tang, chuc nang, lam duoc gi',
 'SanBong.vn là nền tảng đặt sân bóng đá trực tuyến. Người chơi xem lịch trống theo thời gian thực, đặt sân và đặt cọc qua VietQR, đặt sân định kỳ, săn Kèo gấp giá hời, cáp kèo giao hữu với đội khác, ghép chân lẻ, chia tiền trận, xem bảng xếp hạng Elo và đăng ký giải đấu. Chủ sân quản lý cụm sân, bảng giá, lịch sân, đơn đặt, căng-tin và gói thành viên. Quản trị viên duyệt chủ sân, cụm sân và xử lý khiếu nại. Ba vai trò dùng giao diện riêng, không chuyển qua lại được.'),

('dang-ky-dang-nhap', 'Đăng ký và đăng nhập tài khoản', 'ACCOUNT', ARRAY['GUEST', 'PLAYER', 'OWNER'], NULL,
 'tao tai khoan, dang ky, dang nhap, quen mat khau, otp, google, login',
 'Bấm Đăng nhập trên thanh menu để mở hộp thoại đăng nhập / đăng ký. Có thể đăng ký bằng số điện thoại (đúng 10 chữ số, đầu số di động Việt Nam, VD 0912345678) hoặc email kèm mã OTP gửi về email, hoặc đăng nhập bằng Google. Mật khẩu phải có ít nhất 8 ký tự gồm cả chữ và số. Nhập sai OTP quá 5 lần sẽ bị tạm khóa gửi OTP 15 phút. Quên mật khẩu: chọn Quên mật khẩu, nhận OTP qua email rồi đặt mật khẩu mới. Lần đầu đăng nhập nên cập nhật hồ sơ (tên, khu vực, đội bóng, trình độ, vị trí).'),

('tim-kiem-san', 'Tìm sân và lọc sân', 'BOOKING', ARRAY['GUEST', 'PLAYER'], '/',
 'tim san, loc san, gan nhat, gps, quan, khu vuc, loai san, gia re, tien ich',
 'Trang chủ có mục Tìm sân: lọc theo quận/huyện, loại sân (sân 5, sân 7, sân 11), mức giá tối đa, điểm đánh giá và tiện ích (đèn, wifi, bãi xe, căng tin...). Có nút Tìm sân gần nhất dùng GPS; nếu từ chối quyền vị trí thì chọn khu vực thủ công. Bấm vào thẻ sân để mở trang chi tiết /san/{id} xem địa chỉ, giờ mở cửa, bảng giá, tiện ích và lịch trống.'),

-- ----------------------------- Đặt sân -----------------------------
('dat-san-le', 'Cách đặt sân lẻ', 'BOOKING', ARRAY['GUEST', 'PLAYER'], '/',
 'dat san, book san, giu cho, cach dat, quy trinh dat san, dat 1 tran',
 'Các bước đặt một trận: (1) Mở trang chi tiết sân /san/{id}. (2) Chọn ngày (xem được hôm nay và 6 ngày tới). (3) Chọn sân con (VD Sân 7 - 1). (4) Chọn ca trống; mỗi ca dài 90 phút, ca đã qua giờ hoặc đã có người đặt bị khóa. (5) Điền tên người đặt, số điện thoại, tên đội; có thể chọn thêm dịch vụ (nước, áo bib, bóng...). (6) Chọn đặt cọc theo tỷ lệ của sân (thường 30%) hoặc thanh toán toàn bộ. (7) Bấm đặt sân: hệ thống giữ chỗ khoảng 15 phút và hiện mã VietQR để chuyển khoản. Phải đăng nhập mới đặt được. Trợ lý chat chỉ gợi ý ca và gửi link, người dùng tự xác nhận và trả cọc trên trang sân.'),

('gia-san-gio-vang', 'Giá sân, giờ vàng và cách tính tiền', 'BOOKING', ARRAY['GUEST', 'PLAYER'], '/',
 'gia san, bao nhieu tien, gio vang, cuoi tuan, ngay thuong, bang gia, tinh tien',
 'Mỗi cụm sân có bảng giá riêng theo loại sân (5/7/11 người), ngày thường hay cuối tuần (thứ 7, chủ nhật) và khung giờ. Khung giờ đông khách được gắn nhãn Giờ vàng và đắt hơn. Giá một ca = giá mỗi giờ x 1,5 vì mỗi ca dài 90 phút. Nếu chủ sân chưa cấu hình giá cho một loại sân hoặc một ngày thì ca đó không hiển thị và không đặt được. Flash Sale (nếu có) được trừ trực tiếp trên giá ca. Tiền dịch vụ thêm (nước, thuê đồ) cộng riêng.'),

('keo-gap-flash-sale', 'Kèo gấp giá hời (Flash Sale)', 'BOOKING', ARRAY['GUEST', 'PLAYER'], '/keo-gap',
 'flash sale, giam gia, keo gap, gio chot, san re, khuyen mai, uu dai',
 'Trang Kèo gấp giá hời (/keo-gap) gom các ca còn trống sát giờ đang được giảm giá hôm nay và ngày mai. Chủ sân bật Flash Sale theo quy tắc: ca còn trống trước giờ đá N tiếng thì giảm X%, có thể kèm giá sàn và chỉ áp dụng cho một số khung giờ hoặc loại sân. Giá giảm được tính lại ở máy chủ khi đặt, nên giá cuối cùng là giá hiển thị trên trang sân lúc bấm đặt.'),

('dat-dinh-ky', 'Đặt sân định kỳ (hợp đồng dài hạn)', 'BOOKING', ARRAY['GUEST', 'PLAYER'], '/dat-dinh-ky',
 'dinh ky, co dinh, hang tuan, hop dong, thang, chiet khau, giam gia dai han, da thuong xuyen',
 'Trang Đặt định kỳ (/dat-dinh-ky) cho phép giữ cùng một khung giờ hằng tuần, VD thứ 3 và thứ 5 lúc 19:00, trong 1 tháng hoặc 3 tháng. Hệ thống quét toàn bộ các buổi; nếu có buổi đã bị đặt sẽ báo các ngày trùng để đổi sân con, lệch giờ hoặc bỏ qua ngày đó. Chiết khấu hợp đồng mặc định: 10% khi đặt từ 1 tháng, 15% khi từ 3 tháng; nếu chủ sân tự cấu hình chiết khấu thì theo cấu hình của sân. Sau khi trả cọc hợp đồng, toàn bộ các buổi được khóa cho đội.'),

-- ----------------------------- Thanh toán -----------------------------
('thanh-toan-coc-vietqr', 'Thanh toán tiền cọc bằng VietQR', 'PAYMENT', ARRAY['GUEST', 'PLAYER'], '/lich-cua-toi',
 'thanh toan, chuyen khoan, coc, qr, vietqr, ngan hang, xac nhan don, chua xac nhan, sepay',
 'Sau khi giữ chỗ, màn hình hiện mã VietQR với đúng số tiền và nội dung chuyển khoản chứa mã đơn. Quét bằng app ngân hàng và giữ nguyên nội dung. Ngân hàng báo về hệ thống qua webhook trong vài giây, đơn tự chuyển sang Đã xác nhận, không cần chụp bill. Chuyển thiếu: đơn chuyển trạng thái Thanh toán thiếu và báo số tiền còn thiếu, cần chuyển bổ sung trong khoảng 5 phút để giữ chỗ. Quá hạn giữ chỗ mà chưa trả thì đơn tự hủy và nhả sân. Nếu tiền về sau khi đơn đã hủy: sân còn trống thì đơn được khôi phục, sân đã có người khác đặt thì đơn chuyển sang chờ hoàn tiền 100%. Xem trạng thái đơn ở Lịch của tôi.'),

('vi-hoi-vien', 'Gói thành viên và ví hội viên của cụm sân', 'PAYMENT', ARRAY['GUEST', 'PLAYER'], '/',
 'goi thanh vien, the hoi vien, nap tien, vi, tra truoc, silver, gold, giam gia thanh vien',
 'Một số cụm sân bán gói thành viên trả trước ngay trên trang chi tiết sân, VD nạp 1.000.000đ tặng 100.000đ, gói cao hơn được giảm % tiền sân. Mua gói bằng chuyển khoản VietQR; tiền nạp cộng tiền tặng vào Ví hội viên của riêng cụm sân đó (không dùng được ở sân khác). Khi đặt sân tại cụm có ví, có thể trả bằng ví; ví không đủ thì dùng hết số dư và chuyển khoản phần còn thiếu. Nếu cụm sân ngừng hoạt động khi ví còn tiền, ví bị đóng băng và quản trị viên làm thủ tục hoàn trả.'),

-- ----------------------------- Chính sách -----------------------------
('huy-don-hoan-coc', 'Hủy đơn đặt sân và tiền cọc', 'POLICY', ARRAY['GUEST', 'PLAYER'], '/lich-cua-toi',
 'huy san, huy don, hoan coc, hoan tien, doi lich, khong da nua, tra lai tien',
 'Hủy đơn tại Lịch của tôi (/lich-cua-toi), tab Sắp đá. Chỉ hủy được khi đơn đang giữ chỗ, chờ xác minh hoặc đã xác nhận, và trận chưa bắt đầu; đã qua giờ bắt đầu thì không hủy được nữa. Khi hủy, sân được nhả cho người khác và bài tìm đối / tuyển người của trận cũng đóng lại. Việc hoàn tiền cọc theo chính sách riêng của từng chủ sân, hủy sát giờ thường không được hoàn. Hệ thống chưa tự động hoàn cọc khi người chơi tự hủy; nếu có tranh chấp, gửi khiếu nại kèm mã đơn tại /khieu-nai. Trường hợp tiền về sau khi đơn hết hạn và sân đã bị người khác đặt thì được hoàn 100%.'),

('diem-uy-tin', 'Điểm uy tín và hồ sơ cá nhân', 'POLICY', ARRAY['GUEST', 'PLAYER'], '/ho-so',
 'uy tin, diem uy tin, tru diem, ho so, profile, trinh do, vi tri, fair play',
 'Mỗi người chơi có điểm uy tín hiển thị trên hồ sơ (/ho-so); đội trưởng và các đội khác dựa vào đây để duyệt khi ghép trận. Điểm bị trừ khi vi phạm, VD chân lẻ hủy tham gia khi còn dưới 1 tiếng trước giờ đá bị trừ 5 điểm; đội tự ý bỏ trận trong giải bị trừ 20 điểm uy tín và cấm đăng ký giải 30 ngày; quản trị viên có thể trừ điểm khi xử lý khiếu nại. Hồ sơ còn có tên, khu vực, trình độ, vị trí sở trường, ảnh đại diện và đội bóng.'),

('khieu-nai', 'Gửi và theo dõi khiếu nại', 'POLICY', ARRAY['PLAYER'], '/khieu-nai',
 'khieu nai, to cao, tranh chap, bi lua, chu san khong cho da, phan anh, ho tro',
 'Gửi khiếu nại cho một đơn của mình tại trang Khiếu nại của tôi (/khieu-nai): chọn mã đơn, nhập tiêu đề, nội dung và tối đa 5 đường dẫn ảnh bằng chứng. Quản trị viên xem lịch sử đơn, giao dịch cọc và tin nhắn để xử lý; nếu thiếu bằng chứng sẽ yêu cầu bổ sung và bạn cần phản hồi trong 24 giờ. Kết quả có thể là hoàn cọc, trừ điểm uy tín hoặc khóa tài khoản bên vi phạm. Theo dõi trạng thái ngay trên trang này.'),

-- ----------------------------- Cộng đồng -----------------------------
('lich-cua-toi-danh-gia', 'Lịch đã đặt và đánh giá sân', 'BOOKING', ARRAY['PLAYER'], '/lich-cua-toi',
 'lich cua toi, don cua toi, xem don, danh gia, rating, sao, nhan xet',
 'Lịch của tôi (/lich-cua-toi) có 3 tab: Sắp đá, Đã đá, Đã hủy. Tab Sắp đá xem mã đơn, trạng thái thanh toán, hủy đơn, chia tiền trận. Sau khi trận hoàn thành, tab Đã đá có nút Đánh giá: chọn 1 đến 5 sao và viết nhận xét; mỗi trận chỉ đánh giá một lần, đã đánh giá thì hiện lại số sao đã gửi.'),

('giao-huu-cap-keo', 'Cáp kèo, tìm đối giao hữu', 'COMMUNITY', ARRAY['GUEST', 'PLAYER'], '/giao-huu',
 'giao huu, cap keo, tim doi, doi thu, da keo, thach dau, team vs team, elo',
 'Trang Cáp kèo & Tìm đối (/giao-huu) liệt kê các trận đội chủ nhà đang tìm đối thủ. Muốn đăng tin, đội cần có đơn đặt sân và còn ít nhất 30 phút trước giờ đá, rồi vào /giao-huu/dang-tin để chọn trận, trình độ mong muốn và kèo chia tiền sân: chia đôi 50/50, thua trả 60%, 70% hoặc 100%. Đội khách gửi yêu cầu (mỗi trận chỉ gửi một lần, không trùng lịch đá khác của đội). Chủ nhà chấp nhận một đội thì bài đóng, nhóm chat mở cho hai đội, các đội còn lại tự bị từ chối. Sau trận, chủ sân nhập tỷ số để tính Elo và chia tiền sân theo kèo.'),

('ghep-chan-le', 'Ghép chân lẻ: đội tìm người, người tìm đội', 'COMMUNITY', ARRAY['GUEST', 'PLAYER'], '/ghep-chan-le',
 'chan le, thieu nguoi, tuyen nguoi, tim doi, da ghep, freelance, xin tham gia, moi vao doi',
 'Trang Ghép chân lẻ (/ghep-chan-le) có 3 tab: Đội tìm người, Người tìm đội, Của tôi. Đội thiếu người đăng tuyển tại /ghep-chan-le/dang-tuyen: số người cần (tối đa 10 mỗi bài), vị trí, trình độ, chi phí chia; bài tự đóng khi đến giờ bóng lăn mà chưa đủ. Người chơi lẻ có thể bấm Xin tham gia (trình độ thấp hơn yêu cầu sẽ được cảnh báo) hoặc đăng tin tìm đội tại /ghep-chan-le/dang-tin theo khung giờ rảnh; không được có 2 bài trùng khung giờ. Lời mời vào đội hết hạn sau 30 phút không phản hồi. Được nhận thì thấy địa chỉ sân, số điện thoại đội trưởng và trận vào lịch cá nhân. Hủy khi còn dưới 1 tiếng trước giờ đá bị trừ 5 điểm uy tín.'),

('tin-nhan', 'Tin nhắn nhóm trận đấu', 'COMMUNITY', ARRAY['PLAYER'], '/tin-nhan',
 'chat, nhan tin, tin nhan, lien lac doi ban, nhom chat',
 'Trang Tin nhắn (/tin-nhan) chứa các nhóm chat tự tạo khi chốt kèo giao hữu hoặc ghép chân lẻ thành công, để các bên trao đổi giờ giấc, áo đấu, chia tiền. Cần đăng nhập.'),

('chia-tien-tran', 'Sổ quỹ và chia tiền trận', 'COMMUNITY', ARRAY['PLAYER'], '/lich-cua-toi',
 'chia tien, split bill, gop tien, quy doi, thu tien dong doi, ai chua dong',
 'Đội trưởng mở đơn trong Lịch của tôi và bấm Chia tiền trận đấu (trang /chia-tien/{mã đơn}). Tổng chi phí = tiền sân + dịch vụ. Chọn người tham gia và cách chia: chia đều, đội trưởng tài trợ một phần %, hoặc nhập số tiền từng người (tổng phải khớp). Chia lẻ thì làm tròn lên hàng nghìn, phần dư vào quỹ đội. Mỗi người nhận một mã VietQR riêng đúng số tiền; chuyển khoản xong được gạch nợ tự động, quá hạn thì hệ thống nhắc. Cả đội cùng xem được danh sách đã đóng / chưa đóng.'),

('bang-xep-hang-giai-dau', 'Bảng xếp hạng Elo và giải đấu phong trào', 'COMMUNITY', ARRAY['GUEST', 'PLAYER'], '/bang-xep-hang',
 'xep hang, elo, bang xep hang, giai dau, dang ky giai, top doi',
 'Bảng xếp hạng (/bang-xep-hang) xếp các đội theo Elo, số trận thắng, chuỗi thắng hoặc uy tín, lọc theo quận hoặc toàn hệ thống. Elo chỉ thay đổi qua trận cáp kèo đã chốt, do chủ sân nhập tỷ số. Tab Giải đấu (/bang-xep-hang?tab=giai-dau) liệt kê giải do chủ sân tổ chức; mở /giai-dau/{id} để xem thể thức, lệ phí, hạn đăng ký và bấm Đăng ký tham gia, sau đó chuyển khoản lệ phí qua VietQR. Giải đủ đội sẽ báo lỗi Giải đã đủ số đội; đội đang bị cấm không đăng ký được.'),

('tro-thanh-chu-san', 'Muốn đưa sân của mình lên SanBong.vn', 'ACCOUNT', ARRAY['GUEST', 'PLAYER'], NULL,
 'chu san, dang ky chu san, hop tac, dua san len, kinh doanh san, owner',
 'Chủ sân cần một tài khoản vai trò Chủ sân: đăng ký và gửi yêu cầu làm chủ sân, quản trị viên duyệt tại mục Duyệt chủ sân. Sau khi được duyệt, đăng nhập sẽ vào giao diện chủ sân để đăng ký cụm sân (tên, địa chỉ, tiện ích, sân con, tài khoản nhận cọc) và gửi duyệt. Cụm sân chỉ hiện cho người chơi sau khi quản trị viên duyệt.'),

-- ----------------------------- Chủ sân -----------------------------
('owner-tong-quan', 'Giao diện chủ sân: các trang quản lý', 'OWNER', ARRAY['OWNER'], '/',
 'dashboard, trang chu chu san, quan ly, menu chu san, doanh thu',
 'Trang chủ của chủ sân là Dashboard: lượt đặt, doanh thu cọc, tỷ lệ lấp đầy theo khung giờ. Các trang quản lý: Đơn đặt (/chu-san/don-dat), Lịch sân (/chu-san/lich), Bảng giá (/chu-san/bang-gia), Cụm sân (/chu-san/cum-san), Dịch vụ & căng-tin (/chu-san/dich-vu), Gói thành viên (/chu-san/goi-thanh-vien), Giải đấu (/chu-san/giai-dau).'),

('owner-cum-san', 'Đăng ký và sửa cụm sân', 'OWNER', ARRAY['OWNER'], '/chu-san/cum-san',
 'them cum san, dang ky san, sua san, gui duyet, bi tu choi, san con, tai khoan nhan coc',
 'Vào Cụm sân (/chu-san/cum-san), bấm thêm mới (/chu-san/cum-san/moi): nhập tên, địa chỉ, quận, số điện thoại 10 số, giờ mở/đóng cửa, tỷ lệ cọc (0 đến 1, mặc định 0,3), tiện ích, danh sách sân con (loại F5, F7, F11) và tài khoản ngân hàng nhận cọc, rồi gửi duyệt. Trạng thái Chờ duyệt cho đến khi quản trị viên duyệt; bị từ chối sẽ kèm lý do, sửa tại /chu-san/cum-san/{id} và gửi duyệt lại.'),

('owner-bang-gia', 'Cấu hình bảng giá và Flash Sale', 'OWNER', ARRAY['OWNER'], '/chu-san/bang-gia',
 'bang gia, cai gia, gio vang, flash sale, giam gia, chong lap, chiet khau dinh ky',
 'Tại Bảng giá (/chu-san/bang-gia), khai báo giá mỗi giờ theo loại sân, ngày thường / cuối tuần và khung giờ; các khung giờ của cùng loại sân và loại ngày không được chồng lấp (sẽ báo lỗi khung giờ bị chồng lấp). Loại sân hoặc ngày nào chưa có giá thì người chơi không đặt được ca đó. Có thể bật Flash Sale giờ chót (VD ca còn trống trước 2 tiếng giảm 20%, kèm giá sàn) và chiết khấu cho hợp đồng định kỳ; chưa cấu hình chiết khấu định kỳ thì dùng mặc định 10% / 15%.'),

('owner-lich-khoa-san', 'Lịch sân và khóa sân nhanh', 'OWNER', ARRAY['OWNER'], '/chu-san/lich',
 'lich san, khoa san, khach vang lai, bao tri, khach goi dien, chan dat online',
 'Trang Lịch sân (/chu-san/lich) hiển thị lịch từng sân con theo ngày. Khi có khách gọi điện hoặc cần bảo trì, chọn ô giờ và khóa nhanh, nhập tên / số điện thoại khách và lý do; ô chuyển xám và người chơi không đặt online được. Không khóa được ô vừa có khách đặt và trả cọc online. Cũng có thể thêm hoặc xóa sân con ở đây.'),

('owner-don-dat', 'Quản lý đơn đặt, nhập tỷ số và check-out', 'OWNER', ARRAY['OWNER'], '/chu-san/don-dat',
 'don dat, xac nhan don, check out, nhap ty so, ket qua tran, tra do, doi soat',
 'Trang Đơn đặt (/chu-san/don-dat) liệt kê đơn của các cụm sân. Đơn trả cọc qua VietQR được xác nhận tự động khi tiền về. Với trận cáp kèo, sau khi trận kết thúc chủ sân nhập tỷ số (trong 14 ngày) để tính Elo và chia tiền sân theo kèo. Khi hoàn tất đơn (check-out), nếu đơn có đồ cho thuê thì phải kiểm tra khách đã trả đủ đồ; sau đó thu phần tiền còn lại (tiền sân + dịch vụ ghi nợ).'),

('owner-dich-vu', 'Căng-tin POS và kho dịch vụ', 'OWNER', ARRAY['OWNER'], '/chu-san/dich-vu',
 'can tin, pos, ban nuoc, kho, ton kho, cho thue giay, ao bib, dich vu',
 'Trang Dịch vụ (/chu-san/dich-vu) khai báo mặt hàng theo danh mục (nước, cho thuê giày / áo bib, bóng, trọng tài...) với giá và tồn kho. Người chơi chọn thêm món khi đặt online; món hết hàng tự ẩn. Bán tại quầy qua POS: chọn ô sân đang đá rồi chọn món, trả ngay hoặc cộng vào tiền sân thu lúc check-out. Tồn kho trừ theo thời gian thực, không âm; doanh thu dịch vụ tách riêng với tiền sân.'),

('owner-goi-thanh-vien', 'Tạo gói thành viên trả trước', 'OWNER', ARRAY['OWNER'], '/chu-san/goi-thanh-vien',
 'goi thanh vien, the tra truoc, nap tien, khach quen, vi hoi vien',
 'Trang Gói thành viên (/chu-san/goi-thanh-vien) tạo gói: tên, số tiền nạp, tiền tặng và % giảm giá đặt sân. Gói hiển thị trên trang chi tiết cụm sân; người chơi mua bằng VietQR, tiền vào ví hội viên dùng riêng tại cụm sân của bạn.'),

('owner-giai-dau', 'Tổ chức giải đấu', 'OWNER', ARRAY['OWNER'], '/chu-san/giai-dau',
 'giai dau, to chuc giai, vong tron, chia bang, le phi, lich thi dau',
 'Trang Giải đấu (/chu-san/giai-dau) tạo giải: cụm sân, thể thức, số đội, lệ phí, hạn đăng ký. Các đội đăng ký và trả lệ phí qua VietQR. Hết hạn hoặc đủ đội thì hệ thống chia bảng vòng tròn và xếp lịch vào khung giờ trống của cụm sân (giữ sân như khóa sân). Đội bỏ trận bị xử thua 0-3, trừ 20 điểm uy tín và cấm đăng ký giải 30 ngày.'),

-- ----------------------------- Quản trị -----------------------------
('admin-tong-quan', 'Giao diện quản trị: các trang', 'ADMIN', ARRAY['ADMIN'], '/',
 'admin, quan tri, menu admin, dashboard',
 'Trang chủ quản trị là Dashboard tổng quan. Các trang: Người dùng (/quan-tri/nguoi-dung), Duyệt chủ sân (/quan-tri/chu-san), Cụm sân chờ duyệt (/quan-tri/cum-san), Khiếu nại (/quan-tri/khieu-nai), Báo cáo (/quan-tri/bao-cao), Ví hội viên đóng băng (/quan-tri/vi-hoi-vien), Kho tri thức trợ lý (/quan-tri/tro-ly).'),

('admin-duyet', 'Duyệt chủ sân, cụm sân và khóa tài khoản', 'ADMIN', ARRAY['ADMIN'], '/quan-tri/cum-san',
 'duyet san, duyet chu san, tu choi, khoa tai khoan, mo khoa, phan quyen',
 'Duyệt yêu cầu làm chủ sân tại /quan-tri/chu-san và cụm sân chờ duyệt tại /quan-tri/cum-san; từ chối phải ghi lý do để chủ sân sửa và gửi lại. Quản lý tài khoản tại /quan-tri/nguoi-dung: đổi vai trò, khóa / mở khóa. Khóa chủ sân đang có đơn chưa diễn ra sẽ được cảnh báo số đơn và gửi thông báo hủy đơn tới người chơi khi xác nhận.'),

('admin-khieu-nai', 'Xử lý khiếu nại', 'ADMIN', ARRAY['ADMIN'], '/quan-tri/khieu-nai',
 'khieu nai, ticket, phan quyet, hoan coc, tru diem, yeu cau bo sung',
 'Danh sách khiếu nại ở /quan-tri/khieu-nai, mở từng ticket tại /quan-tri/khieu-nai/{id} để xem lịch sử đơn, giao dịch cọc và tin nhắn. Thiếu bằng chứng: bấm Yêu cầu bổ sung thông tin, người dùng có 24 giờ phản hồi. Phán quyết: hoàn tiền cọc, trừ điểm uy tín hoặc khóa tài khoản bên vi phạm, rồi đóng ticket.'),

('admin-bao-cao-vi', 'Báo cáo hệ thống và ví hội viên đóng băng', 'ADMIN', ARRAY['ADMIN'], '/quan-tri/bao-cao',
 'bao cao, doanh thu, xuat excel, csv, vi dong bang, hoan tra vi',
 'Báo cáo (/quan-tri/bao-cao) xem tổng lượt đặt, doanh thu và tỷ lệ lấp đầy theo khoảng thời gian; khoảng dưới 1 năm tải file trực tiếp, khoảng lớn hơn được xử lý nền và gửi qua email. Ví hội viên đóng băng (/quan-tri/vi-hoi-vien) liệt kê ví còn tiền của cụm sân đã ngừng hoạt động để làm thủ tục hoàn trả cho từng người chơi.'),

('admin-kho-tri-thuc', 'Quản lý kho tri thức của trợ lý', 'ADMIN', ARRAY['ADMIN'], '/quan-tri/tro-ly',
 'tro ly, chatbot, rag, kho tri thuc, bai viet, cap nhat cau tra loi',
 'Trợ lý đặt sân trả lời dựa trên kho tri thức tại /quan-tri/tro-ly. Mỗi bài viết nên ngắn và nói về một chủ đề; điền thêm từ khóa (cách người dùng hay hỏi, viết không dấu cũng được) để tìm kiếm bắt trúng. Chọn đối tượng đọc (khách, người chơi, chủ sân, admin) để trợ lý không đưa hướng dẫn của vai trò khác. Có ô thử truy xuất để xem câu hỏi sẽ lấy được bài nào.');
