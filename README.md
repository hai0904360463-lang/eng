# App học từ vựng tiếng Anh B1 (kiểu flashcard giống Duolingo)

## Nội dung app
- 25 cấp độ, mỗi cấp 1 chủ đề từ vựng B1 (Daily Routines, Food & Cooking, Travel, Work, Health...)
- Mỗi cấp có 25 câu hỏi trắc nghiệm: cho 1 từ tiếng Anh, chọn đúng nghĩa tiếng Việt trong 4 lựa chọn
- Mỗi câu đúng: 2 điểm. Tối đa 1 cấp: 50 điểm (25 câu x 2đ)
- Cần đạt tối thiểu **30/50 điểm** ở cấp hiện tại mới mở khóa cấp tiếp theo
- Điểm cao nhất từng cấp được lưu lại trên máy (không mất khi tắt app), tổng điểm XP hiện ở góc trên app

## Các file trong gói này
- `main.dart` — toàn bộ giao diện + logic app (màn hình bản đồ cấp độ, màn hình làm bài, tính điểm, lưu tiến trình)
- `levels_data.dart` — dữ liệu 625 từ vựng (25 chủ đề x 25 từ), sinh tự động, không cần sửa tay
- `pubspec.yaml` — khai báo package `shared_preferences` (dùng để lưu điểm trên máy)
- `.github/workflows/build-apk.yml` — tự động build ra file APK cài được lên Android

## Cách build ra file APK (không cần cài Flutter, không cần máy tính mạnh)
1. Tạo repo GitHub mới (hoặc dùng repo cũ, nhưng khuyên dùng repo mới để tránh lẫn với project trước)
2. Upload đủ các file trên lên đúng cấu trúc thư mục (đặc biệt `.github/workflows/build-apk.yml` phải đúng đường dẫn đó)
3. GitHub tự động chạy: cài Flutter → sinh khung project Android → build ra file `app-release.apk`
4. Vào tab **Actions** trên GitHub → đợi dấu tích xanh ✅ → vào mục **Artifacts** → tải file `english_b1_app-apk` về → giải nén ra `app-release.apk`

## Cách cài lên điện thoại Android
Khác hẳn iPhone — **không cần jailbreak, không cần AppSync, không cần máy tính**:
1. Copy file `app-release.apk` vào điện thoại Android (qua cáp USB, Zalo, email, Google Drive... đều được)
2. Trên điện thoại, mở file đó lên
3. Nếu lần đầu cài app ngoài Google Play, máy sẽ hỏi "Cho phép cài đặt từ nguồn này" → bấm Cho phép/Settings → bật lên → quay lại cài tiếp
4. Cài xong, mở app và học thôi

## Ghi chú
- Bộ câu hỏi (625 từ) mình tự soạn theo các chủ đề từ vựng B1 phổ biến. Nếu phát hiện từ nào dịch chưa chuẩn/chưa hay, cứ báo để chỉnh lại — sửa 1 chỗ trong `levels_data.dart`, build lại là xong.
- Mỗi lần vào lại 1 cấp đã hoàn thành, câu hỏi và thứ tự đáp án sẽ được xáo trộn ngẫu nhiên lại, không học vẹt theo thứ tự cũ được.
