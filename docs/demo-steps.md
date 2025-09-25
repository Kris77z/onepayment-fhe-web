OnePay 演示步骤（端到端）

> 本文用于现场演示向商户展示如何集成与跑通一次 USDT 支付闭环。

准备
- 账号：可登录 OnePay Dashboard 的演示账号
- 域名：商户项目可公网访问的域名（或使用 ngrok 将本地 API 暴露出去）
- 钱包：移动钱包或浏览器插件钱包（含少量演示资金）

步骤一：Dashboard 配置
1. 登录 Dashboard → 进入 `Dashboard / Settings`
2. 在 Webhook Settings：
   - Webhook URL 填入商户侧回调地址，如 `https://merchant.example.com/api/onepay/webhook`
   - 点击 “Reveal secret”，复制明文 Webhook Secret
3. 在 API Snippet Generator：
   - 选择 Mode（Per-order 或 Static），选择 Chain/Token/Amount
   - 点击 Generate，复制 cURL/Node/Express/HTML 片段（视商户技术栈选择）

步骤二：商户项目配置（最小三件套）
在商户后端（例如 Next.js API 或 Express）设置环境变量：

```
ONEPAY_BASE_URL=https://api.onepayment.pro
ONEPAY_API_KEY=<Dashboard 分配的商户 API Key>
ONEPAY_WEBHOOK_SECRET=<步骤一 Reveal 的明文>
```

说明：链/代币参数由 Snippet 的请求体传参即可，通常无需在环境变量预置。

步骤三：商户侧接入
- 方式 A（最简 Express）：将 Snippet 中的 `createOnePayHandlers` 片段拷贝到现有服务中，挂载两个路由：
  - `POST /onepay/create-payment`
  - `POST /onepay/webhook`
- 方式 B（Next.js v0 模板已内置）：
  - `POST /api/onepay/orders` 创建订单
  - `POST /api/onepay/attempt` 记录支付尝试（推荐）
  - `GET  /api/onepay/status` 前端查询状态（推荐）
  - `POST /api/onepay/notify` 成功兜底（推荐）
  - `POST /api/onepay/webhook` 接收平台回调（必需）

步骤四：跑一笔
1. 打开商户前台，加入购物车，点击 “Pay with OnePay (USDT)”
2. 使用手机扫码或浏览器钱包发送 ERC‑20 `transfer`
3. 等待平台确认并投递 Webhook，前端状态从 pending 变为 success
4. 如需演示兜底，点击前端按钮触发 `/api/onepay/notify`

常见问题
- 状态一直 pending：检查 Webhook URL 是否公网可达；本地演示请使用 ngrok
- 验签失败：确认服务端 `ONEPAY_WEBHOOK_SECRET` 为 Dashboard 最新 Reveal 的明文
- 金额/代币不匹配：确认 Snippet 传参与实际支付一致（symbol/address/decimals/amount）

—
以上步骤 5–10 分钟即可完成一次端到端演示。

