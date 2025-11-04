const fs = require('fs-extra');
const path = require('path');

async function build() {
    const srcDir = path.join(__dirname, 'src');
    const distDir = path.join(__dirname, 'dist');

    console.log('开始构建前端项目...');

    // 清空并创建 dist 目录
    await fs.emptyDir(distDir);

    // 复制 HTML 文件
    await fs.copy(path.join(srcDir, 'index.html'), path.join(distDir, 'index.html'));
    console.log('✓ 复制 HTML 文件');

    // 复制 CSS 文件
    const cssDir = path.join(distDir, 'css');
    await fs.ensureDir(cssDir);
    await fs.copy(path.join(srcDir, 'css'), cssDir);
    console.log('✓ 复制 CSS 文件');

    // 复制 JS 文件
    const jsDir = path.join(distDir, 'js');
    await fs.ensureDir(jsDir);
    await fs.copy(path.join(srcDir, 'js'), jsDir);
    console.log('✓ 复制 JS 文件');

    console.log('前端构建完成！输出目录:', distDir);
}

build().catch(err => {
    console.error('构建失败:', err);
    process.exit(1);
});

