# Nezha

[![Release](https://img.shields.io/github/v/release/nuomiiiii/nezha?label=release)](https://github.com/nuomiiiii/nezha/releases)
[![Komari Theme](https://img.shields.io/badge/Komari-Theme-6366F1)](https://github.com/komari-monitor/theme-market)
[![License](https://img.shields.io/github/license/nuomiiiii/nezha)](LICENSE)

面向 [Komari Monitor](https://github.com/nuomiiiii/komari) 的信息密集型大屏主题，基于 [BITJEBE/nezha-BITJEBE](https://github.com/BITJEBE/nezha-BITJEBE) 二次开发。它将服务器状态、资源占用、网络质量、流量与账单信息集中到一套适合桌面和移动端使用的界面中。

![Nezha 主题预览](preview.png)

## 主要能力

| 模块 | 内容 |
| --- | --- |
| 首页概览 | 在线状态、CPU、内存、磁盘、实时速率、上下行总量、标签、账单和到期时间 |
| 网络监测 | 最近一小时平均延迟、丢包率与趋势，多 Ping 任务按 Komari 后台顺序展示 |
| 服务器详情 | 资源趋势、网络图表、任务切换以及 30 天服务可用性视图 |
| 流量与账单 | 流量进度、重置倒计时、五种统计方式、多币种价格与资产汇总 |
| 外观与布局 | 三种服务器卡片布局、亮暗模式、背景、Logo、插图、国旗、分组和导航定制 |

### 网络数据与跳转

- 首页延迟监测默认开启，缺失记录、完全丢包和部分丢包使用不同状态表达，不会把无数据误判为故障。
- 详情页使用 raw/rollup 历史指标；旧版 Komari 缺少新版指标接口时自动回退到公开延迟记录接口。
- 支持直接进入服务器详情、网络总览或指定 Ping 任务。Komari 仪表盘可以通过主题清单声明的导航路径完成跳转。
- 刷新时保留当前会话最近一次成功结果并在后台更新，减少卡片延后出现和重复骨架屏。

### 流量与账单

- 支持 `sum`、`max`、`min`、`up`、`down` 五种流量统计方式。
- 可显示流量百分比、距离下次重置的天数和当前计费方式。
- 支持 CNY、JPY、USD、EUR、HKD、TWD、KRW、SGD、CAD、AUD 等币种，并允许按服务器覆盖。
- 资产卡片可以汇总服务器账单、剩余价值和币种换算；到期不足 14 天时提供醒目提醒。

### 外观与布局

- 支持默认、固定左侧服务器名称、固定顶部服务器名称三种卡片布局。
- 支持自定义桌面/移动背景、Logo、首页插图、顶部链接和分组顺序。
- 站点 Logo 默认跟随 Komari 后台站点图标；用户设置的自定义 Logo 会继续保留，并在加载失败时稳定回退。
- 支持亮色、暗色和跟随系统模式；SVG 国旗、流量条、资产卡片、服务监控和全球地图均可单独控制。

## 兼容性

主题同时兼顾当前 Komari、上游版本和仍在使用旧公共接口的历史版本。

| 场景 | 处理方式 |
| --- | --- |
| 提供 `public:queryMetrics` 的 Komari | 使用支持 raw/rollup 的 V4 指标查询 |
| `1.1.8`、`1.2.5-fix2` 等旧版本 | 自动回退到访客可用的 `/api/records/ping` |
| 当前服务器标识 | 支持 UUID |
| 历史主题链接 | 保留数字 ID、`/instance/:id` 和原有 `ping_task` 参数兼容 |
| 仪表盘平均延迟/抖动排行 | 通过 `/server/{uuid}?view=network` 进入网络总览 |
| 指定监测任务 | 通过 `ping_task` 进入网络面板并选中对应任务 |

回退仅在方法不存在或旧版公共 RPC 不可用时触发。真实的存储、网络或权限错误仍会明确显示，不会被误判成版本兼容问题。

## 安装与更新

### Komari 主题市场

进入 Komari 后台的“市场/主题市场”，找到 `Nezha` 后安装。市场同步 GitHub Release 可能存在一定延迟。

### 手动安装

1. 从 [Releases](https://github.com/nuomiiiii/nezha/releases) 下载最新的 `nezha-v*.zip`。
2. 进入 Komari 后台的“主题管理”。
3. 上传 ZIP；已安装旧版本时可以直接覆盖更新。

请勿下载 GitHub 自动生成的 Source code ZIP，它不是可安装的主题包。

## 常用配置

### 延迟监测

使用前需要在 Komari 后台创建延迟监测任务并分配服务器。“显示首页延迟监测”关闭后，首页不仅会隐藏对应内容，也会停止相关数据查询。

### 流量限制与重置日

在 Komari 后台为服务器配置：

- `traffic_limit`：流量上限，单位为字节
- `traffic_limit_type`：`sum`、`max`、`min`、`up` 或 `down`

新版 Komari 会直接提供流量重置日。旧版可以在服务器标签中加入 `<TRD:n>`，例如 `<TRD:1>`，也可以在主题设置的“流量重置日覆盖”中按 UUID、卡片 ID 或名称配置。

重置日优先级为：服务器字段 > `<TRD:n>` 标签 > 主题覆盖。`expired_at` 表示套餐到期日期，不是流量重置日。

### 标签与币种

```text
So-net<red>;1Gbps<green>;CN2 GIA<blue>;<JPY>
```

- 普通标签使用 `;` 分隔，`<red>`、`<blue>` 等后缀用于控制颜色。
- `<CNY>`、`<JPY>`、`<USD>` 等独立元标签用于指定服务器币种，不会显示为普通标签。
- 币种优先级为：主题 JSON 覆盖 > 标签元数据 > 默认账单货币 > Komari 后端字段。

## 从源码构建

```bash
git clone https://github.com/nuomiiiii/nezha.git
cd nezha
npm install
npm run build
```

构建产物位于 `dist/`。手工打包时，`komari-theme.json`、清单指定的预览图和 `dist/` 必须位于 ZIP 根目录。

## 文档与反馈

- [完整更新日志](CHANGELOG.md)
- [版本发布与安装包](https://github.com/nuomiiiii/nezha/releases)
- [Komari Monitor](https://github.com/nuomiiiii/komari)

## 致谢

- 上游主题：[BITJEBE/nezha-BITJEBE](https://github.com/BITJEBE/nezha-BITJEBE)，作者 [BITJEBE](https://github.com/BITJEBE)
- 监控项目：[Komari Monitor](https://github.com/nuomiiiii/komari)
- 项目维护：[nuomiiiii](https://github.com/nuomiiiii)

## 许可证

[Apache License 2.0](LICENSE)
