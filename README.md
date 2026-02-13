# Coffee Slap

扫码即玩的 3D 小游戏：倒计时后在 QTE 时机拍桌，把咖啡豆震飞并结算分数。

## 已实现

- Three.js + React Three Fiber 场景
- InstancedMesh 咖啡豆 + 轻量物理
- 倒计时 -> QTE -> 拍击 -> 结算完整单局流程
- Perfect / Good / Miss 三档冲击反馈（物理、镜头、视觉、音效、震动）
- 命中位置分区（中心 / 边缘 / 角落）影响冲击效果
- Perfect 二段冲击
- 基础埋点接口（open/start/slap/result/loadTime）
- 设备弱性能降档（减少豆子数量）

## 本地运行

1. `npm install`
2. `npm run dev`

## 构建

- `npm run build`
