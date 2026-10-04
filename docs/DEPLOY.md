# Deploy LearnHub lên Vercel (miễn phí)

| Môi trường | Trên Vercel | Nhánh git | Database |
|---|---|---|---|
| **prod** | Production | `main` | Neon – nhánh `main` |
| **demo** | Preview | `demo` (và mọi nhánh khác ngoài `main`) | Neon – nhánh `demo` |

Push lên `main` sẽ tự deploy prod, push lên `demo` sẽ tự deploy demo.

Vì sao cần Neon: ổ đĩa trên Vercel chỉ cho đọc, nên SQLite không lưu được dữ liệu. Neon là
Postgres miễn phí (1 GB mỗi project, 100 giờ compute mỗi tháng). Database tự "ngủ" sau 5 phút
không có ai dùng, nên request đầu tiên sau khi ngủ sẽ chậm hơn một chút.

## 1. Tạo project trên Vercel

1. Vào <https://vercel.com/signup>, chọn **Continue with GitHub**, gói **Hobby**.
2. **Add New… → Project**, chọn repo `learnhub`, bấm **Import**.
3. Giữ nguyên các mục *Framework Preset* (FastAPI), *Root Directory* (`./`) và *Build Command*,
   vì `vercel.json` đã cấu hình sẵn. Chưa bấm Deploy vội, làm bước 2 trước.

## 2. Tạo database Neon

1. Trong project trên Vercel: tab **Storage → Create Database → Neon**, chọn gói **Free**.
2. Khi được hỏi gắn vào môi trường nào, **chỉ chọn Production**. Neon sẽ tự thêm biến
   `DATABASE_URL` cho prod.
3. Bấm **Open in Neon**. Trong Neon, vào **Branches → New branch**, đặt tên `demo`.
   Mở nhánh `demo`, bấm **Connect** và copy connection string (dạng `postgresql://...`).

## 3. Biến môi trường

Vào **Settings → Environment Variables**:

| Tên | Giá trị | Môi trường |
|---|---|---|
| `LEARNHUB_ENV` | `prod` | Production |
| `LEARNHUB_ADMIN_TOKEN` | một chuỗi ngẫu nhiên, tạo bằng `[guid]::NewGuid()` trong PowerShell | Production |
| `LEARNHUB_ENV` | `demo` | Preview |
| `LEARNHUB_DATABASE_URL` | connection string của nhánh Neon `demo` | Preview |

`LEARNHUB_DATABASE_URL` được ưu tiên hơn `DATABASE_URL`, nên demo không bao giờ ghi vào database prod.
Nếu thiếu cả hai biến database, app sẽ báo lỗi ngay khi khởi động thay vì chạy sai.

## 4. Deploy

- **Prod:** bấm **Deploy** (hoặc push lên `main`). Địa chỉ có dạng `https://learnhub-xxx.vercel.app`.
- **Demo:** push lên nhánh `demo`. Địa chỉ cố định của nhánh này có dạng
  `https://learnhub-git-demo-<tên-tài-khoản>.vercel.app` (xem trong tab **Deployments**).

**Để người khác xem được demo:** mặc định Vercel bắt đăng nhập mới xem được bản Preview. Muốn mở
công khai, vào **Settings → Deployment Protection** và tắt **Vercel Authentication**.

## Công việc hằng ngày

```powershell
# Thử nội dung mới trên demo
git checkout demo; git merge main; git push        # -> demo tự deploy

# Ổn rồi thì đưa lên prod
git checkout main; git merge demo; git push        # -> prod tự deploy
```

Mỗi lần push, GitHub Actions ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) tự chạy test, lint
và kiểm tra cấu hình Vercel. Kết quả xem ở tab **Actions** trên GitHub. Vercel không đợi CI, nên hãy
đợi CI báo ✅ trên `demo` rồi mới merge vào `main`.

Xoá toàn bộ tiến độ học trên demo (lệnh này từ chối chạy khi `LEARNHUB_ENV=prod`):

```powershell
cd backend
$env:LEARNHUB_ENV = 'demo'
$env:LEARNHUB_DATABASE_URL = '<connection string nhánh demo>'
uv run learnhub reset-db --yes
```

Nội dung khoá học nằm sẵn trong code, nên sửa bài xong chỉ cần push. Trên Vercel không cần gọi
`/api/content/reload`.

## Lưu ý

- Gói Hobby chỉ dành cho **mục đích cá nhân, phi thương mại**.
- Mỗi trình duyệt có một mã người học ẩn danh riêng (lưu trong `localStorage`). Xoá dữ liệu trình
  duyệt hoặc đổi máy thì sẽ bắt đầu lại từ đầu. Chưa có tài khoản đăng nhập.
- Sau khi thêm hoặc đổi thư viện Python trong `backend/`, chạy lại lệnh `uv export ...` ghi ở đầu
  `requirements.txt` để Vercel cài đúng phiên bản.
