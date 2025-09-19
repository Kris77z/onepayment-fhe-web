OnePay Web Landing (Next.js + Tailwind v4)

## Features
- Pure landing page: Navbar, Hero, FAQ, Footer
- Added Auth dialog (Login/Signup) via shadcn block
- Added Contact Support dialog (used in Hero and Footer)
- English only, no payment/i18n
- Responsive layout with Tailwind CSS v4

## Tech Stack
- Next.js 15 (App Router)
- React 19 + TypeScript
- Tailwind CSS v4
- three.js + @react-three/fiber + @react-three/drei
- gsap + @gsap/react + split-type

## Development
```bash
npm install
npm run dev
# open http://localhost:3000
```

### 本地开发页面
- `/dev`：开发者测试页（仅在 `NODE_ENV=development` 可访问）。
  - 复用 `dashboard/components/test-page.tsx`，动态导入且禁用 SSR。
  - 线上环境会直接返回 404。

## Build
```bash
npm run build
npm start
```

## Project Structure
```
src/
  app/
    (dev-only)/
      dev/
        page.tsx              # 本地开发专用页（/dev）
    dashboard/
      test/                   # 已屏蔽旧路由（/dashboard/test → 404）
    layout.tsx
    page.tsx          # Assemble sections
    globals.css       # Tailwind v4 theme vars
  components/
    sections/
      navbar.tsx
      faq.tsx
      footer.tsx
    ui/
      hero.tsx                # PremiumHero (Header area)
      login-signup.tsx        # Auth form block
      contact-2.tsx           # Contact block
public/
  images/onepay.png
  avatar/{2,4,5}.png
```

## Usage: Auth Dialog
- Navbar 右上角按钮文案为 "Get Started"，点击后弹出登录/注册对话框。
- 相关文件：`src/components/sections/navbar.tsx`，`src/components/ui/login-signup.tsx`，`src/components/ui/dialog.tsx`。

## Usage: Contact Support Dialog
- Hero 区域的 "Contact Support" 按钮触发联系支持弹窗。
- 页脚新增 "Need more support?" 卡片，点击 "Contact Support" 触发相同弹窗。
- 相关文件：`src/components/ui/hero.tsx`，`src/components/sections/footer.tsx`，`src/components/ui/contact-2.tsx`，`src/components/ui/dialog.tsx`。

## Notes
- 已移除 `pricing.tsx` 组件及入口。
- 文案可直接在对应组件中调整。
