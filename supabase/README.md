# Supabase 啟用步驟

1. 在 Supabase 專案的 SQL Editor 開啟 New query。
2. 將 `setup.sql` 全部貼上並執行。重跑不覆蓋商品修改或既有訂單。
3. 重新整理購物網站，應顯示「已連接雲端訂購服務」。
4. 使用測試資料下單，到 Table Editor 的 `storefront_orders` 查看訂單。

未執行 SQL 時，網站可瀏覽示範商品，但不會接受下單或誤報成功。

## 設定

`dist/supabase-config.js` 只有專案 URL 與可公開的 publishable key。不可放入 secret、service_role、資料庫密碼或管理 API token。

`storefront_products` 管理價格、名稱、款式、庫存、上下架狀態。照片與介紹在 `dist/app.js`；新增商品時需一併補上。初始商品 `is_demo=true`，含示範商品的訂單也會標示 `is_demo=true`。

`storefront_orders` 存放聯絡及收件資料、商品明細與金額。請用 Supabase 後台查看。尚未串接付款、物流或通知服務；超商門市需手動填寫。宅配運費 NT$100、超商 NT$60，調整運費需同時更新 SQL 與前端顯示。

## 權限與訂單完整性

- 訂單表啟用 RLS，訪客不能直接讀取或修改。
- 下單函式依資料庫價格計算金額、驗證款式、檢查庫存，並在同一交易扣庫存及存入訂單。
- 重試相同請求不會重複建立訂單或扣庫存；逾時後請保持表單內容不變再重試。
- 聯絡及收件資料不再保存於 localStorage。購物袋仍保存在瀏覽器。
- 目前未加入 CAPTCHA／伺服器頻率限制；大量公開營運前應加上防濫用機制並替換示範商品與售後政策。
- 取消訂單的庫存回補目前由商家手動處理。

## 測試

`tests/supabase.test.mjs` 以 PGlite 在本機測試 schema、RLS、價格驗證、庫存、重試及失敗回滾，不使用線上資料庫。執行方式：安裝 `@electric-sql/pglite`，以 `PGLITE_MODULE` 指定其 ESM 入口檔，再用 Node 執行測試。
