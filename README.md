# 个人作品集｜GitHub Pages 发布版

这是可直接发布的原生 HTML、CSS、JavaScript 网站，无需构建步骤。首页动画、红黑马赛克、四张作品的滚动切换、视频封面和完整案例弹窗均在浏览器中运行；上传到 GitHub Pages 后仍可互动。

## 文件说明

- `index.html`：首页、个人介绍、四张作品卡片和联系方式。
- `styles.css`、`gallery.css`、`footer.css`：对应页面样式。
- `hero-mask.js`、`hero.js`、`script.js`、`gallery.js`、`footer.js`：动画、交互与 PDF 预览。
- `work-03-case.html`：第三个作品的完整互动网页案例。
- `assets/`：个人照片、作品封面、视频和 PDF 案例。
- `vendor/pdfjs/`：PDF 浏览所需的本地库及许可文件。
- `.nojekyll`：让 GitHub Pages 直接发布文件，保留 `vendor/` 下的 PDF 库。
- `scripts/serve.mjs`：本地预览工具；不会影响线上网站。

网站使用相对路径，可部署在 `https://用户名.github.io/仓库名/`，也可部署在用户名主页根目录。公开版包含已提供的电话、微信和个人照片。

## 发布到 GitHub Pages

1. 在 GitHub 新建一个**公开**仓库，例如 `portfolio`。如果准备使用下面的 Git 命令，创建仓库时不要勾选自动添加 README。
2. 把**此文件夹内的所有文件和文件夹**上传到仓库根目录；不要只上传外层文件夹或一个 ZIP。上传后，仓库首页应直接看到 `index.html` 和 `.nojekyll`。
3. 打开仓库的 **Settings → Pages**。
4. 在 **Build and deployment** 中选 **Deploy from a branch**，分支选 `main`，目录选 `/(root)`，然后点 **Save**。
5. 发布完成后，地址通常是 `https://你的用户名.github.io/portfolio/`。准确地址以 Pages 设置页显示的链接为准。

也可以在此文件夹打开 PowerShell，用 Git 推送到刚创建的空仓库：

```powershell
git init
git branch -M main
git add .
git commit -m "Publish portfolio"
git remote add origin https://github.com/你的用户名/portfolio.git
git push -u origin main
```

之后修改文件并执行 `git add .`、`git commit -m "Update portfolio"`、`git push`，GitHub Pages 会重新发布。

## 本地检查

安装 Node.js 后，在此文件夹运行：

```powershell
node scripts/serve.mjs
```

打开 `http://localhost:4173/`。要模拟 GitHub 仓库子路径，可运行 `node scripts/serve.mjs /portfolio/`，再打开 `http://localhost:4173/portfolio/`。请通过本地服务器预览；直接双击 HTML 文件可能使浏览器限制 PDF 模块加载。

## 文件大小

最大的 `work-03-case.html` 约 23.6 MiB，低于 GitHub 网页上传的单文件 25 MiB 限制。GitHub Pages 不支持从 Git LFS 提供页面资源，因此本目录的作品文件均作为普通仓库文件上传。

这个目录是当前公开网站的独立发布副本；以后在其他托管平台修改网站时，需同步改动到这里并推送 GitHub。

参考：[配置 GitHub Pages 发布来源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[通过浏览器上传文件](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)。
