# 日常選物：靜態商品網站

直接開啟 `dist/index.html` 即可使用，不需安裝套件。圖片需要網路。

包含六款示範商品、分類與搜尋、商品款式、購物袋、台灣宅配與 7-ELEVEN／全家取貨表單、免付款示範訂單與明細下載。手機與桌面皆可使用。

網站現已串接 Supabase；請先依 [啟用步驟](supabase/README.md) 執行 [setup.sql](supabase/setup.sql)。成功送出後，訂單會儲存在 Supabase 的 `storefront_orders`，不再把收件資料存入瀏覽器。商品目前仍為示範，請使用測試資料。超商門市手動填寫，未串接電子地圖。宅配運費 NT$100，超商 NT$60。

價格、名稱、款式與庫存由 Supabase 的 `storefront_products` 管理；圖片、介紹及新增商品的版面資料在 `dist/app.js` 的 `products` 陣列。整體配色與版面在 `dist/style.css`。正式營業前需替換真實商品資料、運費與退換貨政策，確認 Supabase 訂單儲存流程。

示範照片來源（Unsplash License）：
- https://unsplash.com/photos/white-ceramic-mug-nDd3dIkkOLo
- https://unsplash.com/photos/a-white-bag-hanging-on-a-white-door-AFCo5H6rFEE
- https://unsplash.com/photos/opened-notebook-zwmkMkJ2Qi4
