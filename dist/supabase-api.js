/* This file uses a publishable key only. Never put a secret/service_role key here. */
(() => {
  const config = window.SUPABASE_CONFIG;
  const messages = {
    INVALID_REQUEST: '訂單資料不完整，請重新確認。',
    INVALID_CUSTOMER: '請確認姓名、手機及電子郵件格式。',
    INVALID_ADDRESS: '請填寫完整的宅配地址。',
    INVALID_STORE: '請填寫門市名稱及 6 碼門市代碼。',
    INVALID_ITEM: '商品數量不正確，請重新選購。',
    DUPLICATE_ITEM: '商品資料重複，請重新整理購物袋。',
    PRODUCT_UNAVAILABLE: '部分商品已下架，請重新確認購物袋。',
    OUT_OF_STOCK: '商品庫存不足，請減少數量後重試。',
    INVALID_VARIANT: '商品款式已更新，請重新選擇。',
    PRICE_CHANGED: '商品價格已更新，請確認新的金額後再送出。',
    REQUEST_CONFLICT: '此送出編號已有不同的訂單內容，請重新整理後再試。'
  };
  async function request(path, body) {
    if (!config?.url || !config.publishableKey?.startsWith('sb_publishable_')) {
      throw new Error('訂購服務尚未設定完成，請稍後再試。');
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(config.url + '/rest/v1/' + path, {
        method: body ? 'POST' : 'GET',
        headers: { apikey: config.publishableKey, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        cache: 'no-store'
      });
      const data = await response.json();
      if (!response.ok) {
        const message = messages[data.message] ||
          (['PGRST202', 'PGRST205'].includes(data.code)
            ? '訂購服務尚未啟用，請稍後再試。'
            : '暫時無法送出訂單，請稍後重試。');
        const error = new Error(message);
        error.code = data.message || data.code;
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError' || error instanceof TypeError) {
        throw new Error('連線中斷，尚無法確認訂單結果。請保持內容不變並重試，以避免重複建立訂單。');
      }
      throw error;
    } finally { clearTimeout(timer); }
  }
  window.storefrontApi = {
    async products() {
      const rows = await request('storefront_products?select=id,name,price,variants,stock,is_demo&active=eq.true');
      if (!Array.isArray(rows)) throw new Error('商品資料暫時無法讀取。');
      return rows;
    },
    placeOrder: (payload) => request('rpc/storefront_place_order', payload)
  };
})();
