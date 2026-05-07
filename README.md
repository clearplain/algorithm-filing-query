# 算法备案查询系统

一个纯 GitHub 托管的个人学习用备案查询站点：React 静态前端、仓库内 JSON/CSV 数据、GitHub Actions 刷新和部署。

## 本地使用

```powershell
npm install
npm run data:build
npm run dev
```

数据输出在 `public/data/`：

- `records.json`：查询页使用的结构化备案记录
- `records.csv`：可下载表格
- `facets.json`：筛选项
- `laws.json`：法条结构化文本
- `sources.json`：来源文件和公告记录

## 数据口径

- 境内互联网信息服务算法备案：优先解析本地 `境内互联网信息服务算法备案清单（已下载）` 目录中的 18 份 DOCX。
- 深度合成服务算法备案：解析 `深度合成算法备案信息（未下载）` 目录中的 DOCX；运行 `npm run data:refresh` 时会尝试从公告页增量下载。
- 所在省：从备案编号 `网信算备` 后 6 位行政区划码的前两位映射省级地区。
- 应用领域：根据应用产品、主要用途、算法类别的确定性关键词规则生成；官方原始字段完整保留。
- 法条：《互联网信息服务算法推荐管理规定》《互联网信息服务深度合成管理规定》从 12377 官方页面解析。

## GitHub 部署

1. 在支持私有 GitHub Pages 的 GitHub Enterprise Cloud 组织下创建私有仓库。
2. 上传本目录全部文件，包括本地 DOCX 数据源。
3. 在仓库 Settings → Pages 中选择 GitHub Actions 作为发布来源，并按组织能力启用私有 Pages 访问控制。
4. 运行 `build-and-deploy` workflow。
5. 页面上的“更新抓取”按钮会打开 `refresh-data` workflow；可输入新增公告 URL 后手动运行。

如果普通私有仓库不具备私有 Pages 权限，仓库仍可私密，但 Pages 站点不一定能限制到仅本人可见。
