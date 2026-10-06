#!/usr/bin/env bash
# 部署 3D 简历到 kaogong 服务器（114.134.185.16）→ https://jianli.cauai.fun
#
# 用法：
#   bash deploy/deploy.sh              # 完整部署（构建 → 上传 → nginx → 证书）
#   bash deploy/deploy.sh --no-cert    # 跳过证书步骤（仅更新静态文件）
#
# 前置：本机已配好 ssh 别名 kaogong；域名 jianli.cauai.fun 已解析到服务器。
set -euo pipefail

# 沙箱里必须用 Git 自带的 ssh，系统自带的会静默失败（退出码 255、无报错）
SSH="/c/Program Files/Git/usr/bin/ssh.exe"
[ -x "$SSH" ] || SSH="ssh"

HOST="kaogong"
DOMAIN="jianli.cauai.fun"
REMOTE_ROOT="/var/www/jianli"
VHOST="/etc/nginx/sites-available/$DOMAIN"
SKIP_CERT=0
[[ "${1:-}" == "--no-cert" ]] && SKIP_CERT=1

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

say() { printf '\n\033[1;36m▸ %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m  ⚠ %s\033[0m\n' "$1"; }

rsh() { "$SSH" -o BatchMode=yes -o ConnectTimeout=20 "$HOST" "$@"; }

say "0/6 连通性检查"
rsh "echo OK" >/dev/null || { echo "无法连接 $HOST，请检查 ssh 配置"; exit 1; }
echo "  $HOST 可达"

say "1/6 质量门 + 构建"
# verify 已串联 typecheck → lint → build；不要再重复 build，
# 否则 Windows 回收站 shim 可能在清空已有 dist/ 时超时。
npm run verify

say "2/6 备份现有版本"
rsh "if [ -d $REMOTE_ROOT ]; then
       cp -r $REMOTE_ROOT /var/www/jianli.bak.\$(date +%Y%m%d-%H%M%S)
       ls -dt /var/www/jianli.bak.* 2>/dev/null | tail -n +4 | xargs -r rm -rf
       echo backup-done
     else
       echo no-existing-site
     fi"

say "3/6 上传静态文件"
# 服务器无 rsync，改用 tar over ssh（保留目录树与权限）
tar czf - -C dist . | rsh "rm -rf $REMOTE_ROOT/* && mkdir -p $REMOTE_ROOT && tar xzf - -C $REMOTE_ROOT && chown -R www-data:www-data $REMOTE_ROOT && echo UPLOADED"

say "4/6 预压缩静态资源（供 nginx gzip_static 直接发送）"
# 对 JS/CSS/HTML/JSON 与模型做 gzip -9 预压缩；nginx 开启 gzip_static 后
# 可直接发送 .gz，省掉每次请求的实时压缩开销。.gz 必须与源文件同目录同名。
#
# 注意：只压 me.bin（≈395KB，可选带 meshopt，gzip 仍能省一点）。
#       city.webp 不必压——WebP 本身已压缩，gzip 只会徒增 CPU 与体积。
rsh "cd $REMOTE_ROOT && \
     find . -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' \) ! -name '*.gz' \
       -exec sh -c 'gzip -9 -c \"\$1\" > \"\$1.gz\"' _ {} \; && \
     [ -f assets/models/me.bin ] && gzip -9 -k -f assets/models/me.bin || true && \
     chown -R www-data:www-data $REMOTE_ROOT && \
     echo \"gz 文件数: \$(find . -name '*.gz' | wc -l)\" && \
     du -sh $REMOTE_ROOT"

say "5/6 写入 nginx 配置"
CERT_EXISTS=$(rsh "[ -d /etc/letsencrypt/live/$DOMAIN ] && echo yes || echo no")

if [[ "$CERT_EXISTS" == "yes" ]]; then
  rsh "cat > $VHOST" < deploy/jianli.cauai.fun.nginx.conf
  echo "  已写入正式配置（含 SSL）"
else
  echo "  证书尚不存在，先写入临时 HTTP 配置以便 certbot 完成 HTTP-01 验证"
  rsh "cat > $VHOST" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN;
    root $REMOTE_ROOT;
    index index.html;

    access_log /var/log/nginx/jianli.access.log;
    error_log  /var/log/nginx/jianli.error.log;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;

    location / { try_files \$uri \$uri/ /index.html; }

    location = /index.html {
        add_header Cache-Control "no-cache, must-revalidate" always;
    }

    location ~* ^/assets/(index|react|r3f|three)-[A-Za-z0-9_-]+\.(js|css)\$ {
        expires 1y;
        add_header Cache-Control "public, immutable" always;
        access_log off;
    }

    location /assets/models/ {
        expires 30d;
        add_header Cache-Control "public" always;
        gzip_static on;
        default_type model/gltf-binary;
    }

    location /assets/stickers/ {
        expires 30d;
        add_header Cache-Control "public" always;
        access_log off;
    }

    location /assets/thumbs/ {
        expires 30d;
        add_header Cache-Control "public" always;
        access_log off;
    }

    location /assets/env/ {
        expires 30d;
        add_header Cache-Control "public" always;
        default_type application/octet-stream;
        access_log off;
    }
}
EOF
fi

rsh "ln -sfn $VHOST /etc/nginx/sites-enabled/$DOMAIN && nginx -t && systemctl reload nginx && echo RELOADED"

say "6/6 证书"
if [[ "$SKIP_CERT" == "1" ]]; then
  echo "  已按 --no-cert 跳过"
elif [[ "$CERT_EXISTS" == "yes" ]]; then
  echo "  证书已存在，certbot 会自动续期，无需干预"
else
  # DNS 必须先解析到本机，否则 HTTP-01 验证会失败
  RESOLVED=$(rsh "getent hosts $DOMAIN | awk '{print \$1}' | head -1" || true)
  if [[ "$RESOLVED" == "114.134.185.16" ]]; then
    rsh "certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect" \
      && rsh "cat > $VHOST" < deploy/jianli.cauai.fun.nginx.conf \
      && rsh "nginx -t && systemctl reload nginx" \
      && echo "  证书签发成功，已切换为 HTTPS"
  else
    warn "DNS 尚未生效（解析结果：${RESOLVED:-空}）"
    warn "请先在 Cloudflare 添加 A 记录：jianli → 114.134.185.16"
    warn "DNS 生效后重跑本脚本即可自动签发证书。"
  fi
fi

say "完成"
echo "  https://$DOMAIN"
rsh "df -h / | tail -1"
