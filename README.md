# English Quest — Hành trình chinh phục tiếng Anh

App học từ vựng tiếng Anh trình độ **A1 → B1**: 100 level, mỗi level 50 câu hỏi
(trắc nghiệm nghĩa, điền từ, đúng/sai, nghe & chọn), có nút **Gợi ý**, hiện
nghĩa ngay sau khi trả lời, và cần đúng tối thiểu **30/50** để mở khoá level
tiếp theo. Tiến độ được lưu trên máy (localStorage), có nút xuất/nhập file để
sao lưu.

Đây là một **web app thuần HTML/CSS/JS** (không cần build tool, không cần
Node.js) — mở thẳng `index.html` là chạy được. Repo cũng có sẵn
`manifest.json` + `sw.js` để cài như PWA và đóng gói thành **APK** thật.

## Cấu trúc project

```
english-quest-app/
├── index.html      # giao diện
├── style.css        # style "hộ chiếu hành trình học tập"
├── vocab.js          # 240 từ vựng A1-B1, chia theo 12 chủ đề, gắn level 1-100
├── game.js            # sinh 50 câu hỏi/level, chấm điểm, lưu tiến độ
├── ui.js               # điều khiển màn hình (bản đồ / học / kết quả)
├── manifest.json        # cấu hình PWA
├── sw.js                 # service worker (chạy offline)
└── icons/                 # icon app
```

## 1. Chạy thử ở máy tính

Không cần cài gì cả — chỉ cần mở `index.html` bằng trình duyệt. Nếu muốn
chạy qua local server (để service worker hoạt động đúng):

```bash
cd english-quest-app
python3 -m http.server 8000
# rồi mở http://localhost:8000
```

## 2. Đưa code lên GitHub

```bash
cd english-quest-app
git init
git add .
git commit -m "English Quest app"
git branch -M main
git remote add origin https://github.com/<username>/<ten-repo>.git
git push -u origin main
```

## 3. Deploy miễn phí bằng GitHub Pages

1. Vào repo trên GitHub → **Settings → Pages**.
2. Ở mục **Build and deployment**, chọn **Source: Deploy from a branch**.
3. Chọn branch `main`, thư mục `/ (root)` → **Save**.
4. Sau 1-2 phút, app sẽ chạy tại:
   `https://<username>.github.io/<ten-repo>/`

Từ giờ ai vào link đó cũng chơi được app trên trình duyệt điện thoại, và có
thể "Thêm vào màn hình chính" để dùng như một app thật (PWA).

## 4. Đóng gói thành file APK thật

Lưu ý: file `.apk` là định dạng đóng gói riêng của Android, phải build bằng
công cụ của Google/Android — không thể tạo trực tiếp từ HTML thuần mà không
qua một bước "wrap" như dưới đây.

**Cách dễ nhất — PWABuilder (không cần cài gì, làm trên web):**

1. Deploy app lên GitHub Pages như bước 3.
2. Vào [https://www.pwabuilder.com](https://www.pwabuilder.com), dán link
   GitHub Pages của bạn vào và bấm **Start**.
3. PWABuilder sẽ đọc `manifest.json` có sẵn trong repo, kiểm tra rồi cho phép
   bạn tải gói **Android package (.apk / .aab)**.
4. Tải file `.apk` về, cài thử lên điện thoại Android (bật "Cài từ nguồn
   không xác định" nếu máy chặn) để kiểm tra.

**Cách khác — Bubblewrap CLI (nếu muốn tự build bằng máy, cần Node.js + JDK):**

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://<username>.github.io/<ten-repo>/manifest.json
bubblewrap build
```

Lệnh `build` sẽ tạo ra file `app-release-signed.apk` trong thư mục dự án.

## 5. Mở rộng nội dung

- Thêm từ mới: mở `vocab.js`, thêm object `{id, word, meaning, example, topic, level}`
  vào mảng `VOCAB` (mỗi `id` phải là số duy nhất, `level` từ 1-100).
- Đổi số câu hỏi mỗi level, điểm đạt: sửa `QUESTIONS_PER_LEVEL` và
  `PASS_THRESHOLD` ở đầu file `game.js`.
- Thêm dạng câu hỏi mới: viết thêm một hàm `buildXxx(word, pool, rnd)` theo
  mẫu các hàm có sẵn, rồi thêm vào mảng `BUILDERS` trong `game.js`.

## Ghi chú kỹ thuật

- Câu hỏi mỗi level được **sinh tự động** từ ngân hàng từ vựng bằng thuật
  toán có seed cố định theo số level, nên mỗi lần vào cùng một level sẽ ra
  đúng bộ 50 câu đó (không bị đổi lung tung, dễ kiểm tra/sửa).
- Phần nghe (🔊) dùng Web Speech API có sẵn trong trình duyệt — không cần
  file âm thanh, nhưng cần thiết bị có hỗ trợ TTS tiếng Anh (hầu hết điện
  thoại Android/iOS đều có).
- Tiến độ lưu trong `localStorage` của trình duyệt/APK. Nếu đổi máy hoặc gỡ
  cài đặt, dùng nút **"Xuất tiến độ"** trên màn hình bản đồ để tải file sao
  lưu, và **"Nhập tiến độ"** để khôi phục lại.
