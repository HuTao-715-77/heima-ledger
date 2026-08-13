// ===== 生成黑马记账应用图标 =====
// 用 Electron 离屏渲染一张"深蓝圆角底 + 白马 + 黑马记账"的图，
// 再转换成 Windows 的 .ico 图标文件。
// 运行方式：electron scripts/gen-icon.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('fs')
const path = require('path')

const OUT_DIR = path.join(__dirname, '..', 'build')

// 图标设计：深蓝渐变圆角方块 + 白色马形 + 应用名
const HTML = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  html, body { margin: 0; padding: 0; background: transparent; }
  .icon {
    width: 1024px; height: 1024px;
    border-radius: 220px;
    background: linear-gradient(135deg, #1b2740 0%, #2c3e63 55%, #3d5a80 100%);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    box-shadow: inset 0 -8px 24px rgba(0,0,0,0.25);
  }
  .horse {
    font-size: 500px; line-height: 1;
    filter: grayscale(1) brightness(8) contrast(12);
  }
  .name {
    margin-top: 48px;
    font-family: "Microsoft YaHei", sans-serif;
    font-size: 92px; font-weight: 700; color: #ffffff;
    letter-spacing: 12px; text-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }
</style></head>
<body>
  <div class="icon">
    <div class="horse">🐎</div>
    <div class="name">黑马记账</div>
  </div>
</body>
</html>
`

app.whenReady().then(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true, backgroundThrottling: false }
  })
  await win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(HTML))
  await new Promise((r) => setTimeout(r, 1200)) // 等字体与渲染完成

  const img = await win.webContents.capturePage()
  const master = img.resize({ width: 1024, height: 1024 })
  fs.writeFileSync(path.join(OUT_DIR, 'icon.png'), master.toPNG())

  // 生成多尺寸 PNG，供转 .ico 使用
  const sizes = [16, 32, 48, 64, 128, 256]
  const pngs = sizes.map((s) => img.resize({ width: s, height: s }).toPNG())

  const { default: pngToIco } = await import('png-to-ico')
  const ico = await pngToIco(pngs)
  fs.writeFileSync(path.join(OUT_DIR, 'icon.ico'), ico)
  console.log('✅ 图标已生成：build/icon.png (1024) + build/icon.ico')
  app.exit(0)
})
